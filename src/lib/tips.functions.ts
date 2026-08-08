import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateTipInput = { eventId: string; amountMinor: number; message?: string };

/**
 * Creates a tip intent server-side. Clients can never mark a tip paid:
 * the row is written with the service role at status `created`, and only the
 * verified provider webhook may advance it to `paid`.
 */
export const createTipIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateTipInput) => {
    if (!input || typeof input.eventId !== "string") throw new Error("An event is required.");
    const amount = Math.round(Number(input.amountMinor));
    if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_00) {
      throw new Error("Tip amounts must be between $1 and $100,000.");
    }
    return {
      eventId: input.eventId,
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

    const idempotencyKey = `${context.userId}:${data.eventId}:${data.amountMinor}:${Math.floor(Date.now() / 60000)}`;

    const { data: tip, error } = await supabaseAdmin
      .from("tips")
      .upsert(
        {
          event_id: event.id,
          from_user_id: context.userId,
          to_business_id: event.host_business_id,
          amount_minor: data.amountMinor,
          currency: "USD",
          message: data.message || null,
          status: "created",
          provider: "stripe",
          idempotency_key: idempotencyKey,
        },
        { onConflict: "idempotency_key" },
      )
      .select("id, amount_minor, status")
      .single();
    if (error) throw error;

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
    const session = (await response.json()) as { url?: string; id?: string; error?: { message: string } };
    if (!response.ok) throw new Error(session.error?.message ?? "Checkout could not be started.");

    await supabaseAdmin
      .from("tips")
      .update({ status: "processing", provider_record_id: session.id ?? null })
      .eq("id", tip.id);

    return { tipId: tip.id, status: "processing", checkoutUrl: session.url ?? null, note: "" };
  });
