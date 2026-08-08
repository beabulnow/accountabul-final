import { createFileRoute } from "@tanstack/react-router";

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

        const event = JSON.parse(rawBody) as {
          id: string;
          type: string;
          data: { object: Record<string, unknown> };
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: ledgerError } = await supabaseAdmin.from("payment_events").insert({
          provider: "stripe",
          provider_event_id: event.id,
          event_type: event.type,
          payload: { type: event.type },
        });
        // Duplicate delivery: already reconciled, acknowledge and stop.
        if (ledgerError && ledgerError.code === "23505") return new Response("ok");
        if (ledgerError) throw ledgerError;

        const object = event.data.object;
        const tipId = (object["client_reference_id"] as string | undefined) ??
          ((object["metadata"] as Record<string, string> | undefined)?.["tip_id"]);

        if (tipId) {
          const status =
            event.type === "checkout.session.completed"
              ? "paid"
              : event.type.startsWith("charge.refunded")
                ? "refunded"
                : event.type.includes("failed")
                  ? "failed"
                  : null;

          if (status) {
            await supabaseAdmin
              .from("tips")
              .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
              .eq("id", tipId);
            await supabaseAdmin
              .from("payment_events")
              .update({ tip_id: tipId, processed_at: new Date().toISOString() })
              .eq("provider", "stripe")
              .eq("provider_event_id", event.id);
          }
        }

        return new Response("ok");
      },
    },
  },
});

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim() ?? "", value ?? ""];
    }),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
