import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateTipInput = {
  eventId: string;
  amountMinor: number;
  attemptId: string;
  message?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Creates a tip intent server-side. Clients can never mark a tip paid:
 * the row is written with the service role at status `created`, and only the
 * verified provider webhook may advance it to `paid`.
 */
export const createTipIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: CreateTipInput) => {
    if (!input || typeof input.eventId !== "string") throw new Error("An event is required.");
    if (typeof input.attemptId !== "string" || !UUID_PATTERN.test(input.attemptId)) {
      throw new Error("A valid tip attempt is required.");
    }
    const amount = Math.round(Number(input.amountMinor));
    if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_00) {
      throw new Error("Tip amounts must be between $1 and $100,000.");
    }
    return {
      eventId: input.eventId,
      attemptId: input.attemptId,
      amountMinor: amount,
      message: typeof input.message === "string" ? input.message.slice(0, 280) : "",
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, status, tips_enabled, host_business_id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event || !event.tips_enabled) throw new Error("Tips are not enabled for this event.");
    if (!event.host_business_id) {
      throw new Error("This event does not have a host business configured.");
    }

    // The browser creates one UUID for each explicit submit. Mutation retries reuse
    // that UUID, while two intentional tips always receive different keys.
    const idempotencyKey = `${context.userId}:${data.attemptId}`;

    const tipValues = {
      event_id: event.id,
      from_user_id: context.userId,
      to_business_id: event.host_business_id,
      amount_minor: data.amountMinor,
      currency: "USD",
      message: data.message || null,
      status: "created" as const,
      provider: "stripe",
      idempotency_key: idempotencyKey,
    };

    const { data: insertedTip, error } = await supabaseAdmin
      .from("tips")
      .upsert(tipValues, { onConflict: "idempotency_key", ignoreDuplicates: true })
      .select("id, event_id, from_user_id, amount_minor, currency, message, status")
      .maybeSingle();
    if (error) throw error;

    const { data: existingTip, error: existingTipError } = insertedTip
      ? { data: insertedTip, error: null }
      : await supabaseAdmin
          .from("tips")
          .select("id, event_id, from_user_id, amount_minor, currency, message, status")
          .eq("idempotency_key", idempotencyKey)
          .single();
    if (existingTipError) throw existingTipError;
    if (
      !existingTip ||
      existingTip.event_id !== event.id ||
      existingTip.from_user_id !== context.userId ||
      existingTip.amount_minor !== data.amountMinor ||
      existingTip.currency !== "USD" ||
      existingTip.message !== (data.message || null)
    ) {
      throw new Error("This tip attempt does not match the original request.");
    }
    const tip = existingTip;

    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) {
      return {
        tipId: tip.id,
        status: tip.status,
        checkoutUrl: null as string | null,
        note: "Payment provider is not connected yet — the tip is recorded as pending.",
      };
    }

    // Provider adapter: Stripe Checkout session.
    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(data.amountMinor),
      "line_items[0][price_data][product_data][name]": "Accountabul live tip",
      "line_items[0][quantity]": "1",
      "metadata[tip_id]": tip.id,
      "payment_intent_data[metadata][tip_id]": tip.id,
      client_reference_id: tip.id,
      success_url: `${process.env["PUBLIC_SITE_URL"] ?? ""}/live?tip=success`,
      cancel_url: `${process.env["PUBLIC_SITE_URL"] ?? ""}/live?tip=canceled`,
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body,
    });
    const session = (await response.json()) as {
      url?: string;
      id?: string;
      error?: { message: string };
    };
    if (!response.ok) throw new Error(session.error?.message ?? "Checkout could not be started.");

    if (!session.id || !session.url) {
      throw new Error("Stripe did not return a valid Checkout Session.");
    }

    const { error: updateError } = await supabaseAdmin
      .from("tips")
      .update({ status: "processing", provider_record_id: session.id })
      .eq("id", tip.id);
    if (updateError) throw updateError;

    return { tipId: tip.id, status: "processing", checkoutUrl: session.url, note: "" };
  });
