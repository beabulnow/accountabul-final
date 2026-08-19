import { createFileRoute } from "@tanstack/react-router";

import {
  buildTipChatMessage,
  getStripeTipId,
  isStripePaymentSuccessEvent,
  parseStripeEvent,
  planTipTransition,
  verifyStripeSignature,
  type TipForReconciliation,
} from "@/lib/stripe-webhook";

/**
 * Stripe webhook. Reconciliation happens here and nowhere else: a client
 * redirect can never mark a tip paid. Repeated deliveries are idempotent
 * because payment_events has a unique (provider, provider_event_id).
 */
export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const signatureHeader = request.headers.get("stripe-signature") ?? "";
        const rawBody = await request.text();

        if (!secret) return new Response("Webhook secret not configured", { status: 503 });
        if (!(await verifyStripeSignature(rawBody, signatureHeader, secret))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event;
        try {
          event = parseStripeEvent(rawBody);
        } catch {
          return new Response("Invalid event", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: ledgerError } = await supabaseAdmin.from("payment_events").insert({
          provider: "stripe",
          provider_event_id: event.id,
          event_type: event.type,
          payload: { type: event.type },
        });
        if (ledgerError?.code === "23505") {
          const { data: existing, error: existingError } = await supabaseAdmin
            .from("payment_events")
            .select("processed_at")
            .eq("provider", "stripe")
            .eq("provider_event_id", event.id)
            .single();
          if (existingError) throw existingError;
          // Only completed events are duplicates. An unprocessed event must retry.
          if (existing.processed_at) return new Response("ok");
        }
        if (ledgerError && ledgerError.code !== "23505") throw ledgerError;

        const tipId = getStripeTipId(event);

        if (tipId) {
          const { data: tip, error: tipError } = await supabaseAdmin
            .from("tips")
            .select(
              "id, event_id, from_user_id, amount_minor, currency, message, provider_record_id, status",
            )
            .eq("id", tipId)
            .single();
          if (tipError) throw tipError;

          const transition = planTipTransition(event, tip as TipForReconciliation);
          let finalStatus = tip.status;
          if (transition) {
            const patch =
              transition.status === "paid"
                ? { status: transition.status, paid_at: new Date().toISOString() }
                : { status: transition.status };
            const { data: updated, error: updateError } = await supabaseAdmin
              .from("tips")
              .update(patch)
              .eq("id", tipId)
              .in("status", transition.allowedCurrentStatuses)
              .select("id")
              .maybeSingle();
            if (updateError) throw updateError;
            if (updated) finalStatus = transition.status;

            if (!updated) {
              const { data: current, error: currentError } = await supabaseAdmin
                .from("tips")
                .select("status")
                .eq("id", tipId)
                .single();
              if (currentError) throw currentError;
              const supersededByTerminalStatus =
                current.status === "refunded" ||
                (transition.status === "failed" && current.status === "paid");
              if (current.status !== transition.status && !supersededByTerminalStatus) {
                throw new Error("Tip status changed during Stripe reconciliation.");
              }
              finalStatus = current.status;
            }
          }

          const tipForChat = { ...tip, status: finalStatus } as TipForReconciliation;
          const chatBody = buildTipChatMessage(tipForChat);
          if (
            finalStatus === "paid" &&
            isStripePaymentSuccessEvent(event) &&
            chatBody &&
            tip.event_id &&
            tip.from_user_id
          ) {
            const { error: chatError } = await supabaseAdmin.from("chat_messages").upsert(
              {
                // A tip creates at most one chat event. Reconciliation retries reuse it.
                id: tip.id,
                event_id: tip.event_id,
                user_id: tip.from_user_id,
                kind: "tip",
                body: chatBody,
              },
              { onConflict: "id", ignoreDuplicates: true },
            );
            if (chatError) throw chatError;
          }
        }

        const { error: processedError } = await supabaseAdmin
          .from("payment_events")
          .update({ tip_id: tipId, processed_at: new Date().toISOString() })
          .eq("provider", "stripe")
          .eq("provider_event_id", event.id);
        if (processedError) throw processedError;

        return new Response("ok");
      },
    },
  },
});
