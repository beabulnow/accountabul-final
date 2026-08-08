import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  buildStripeReturnUrls,
  buildTipChatMessage,
  isStripePaymentSuccessEvent,
  parseStripeEvent,
  planTipTransition,
  verifyStripeSignature,
  type StripeEvent,
  type TipForReconciliation,
} from "../src/lib/stripe-webhook.ts";

const nowMs = Date.UTC(2026, 7, 8, 12, 0, 0);
const timestamp = Math.floor(nowMs / 1000);
const secret = "whsec_test";
const payload = JSON.stringify({ id: "evt_1", type: "test.event", data: { object: {} } });

test("accepts any valid v1 signature inside the tolerance", async () => {
  const valid = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const header = `t=${timestamp},v1=${"0".repeat(64)},v1=${valid}`;

  assert.equal(await verifyStripeSignature(payload, header, secret, { nowMs }), true);
});

test("rejects a valid but stale signature", async () => {
  const staleTimestamp = timestamp - 301;
  const valid = createHmac("sha256", secret).update(`${staleTimestamp}.${payload}`).digest("hex");

  assert.equal(
    await verifyStripeSignature(payload, `t=${staleTimestamp},v1=${valid}`, secret, {
      nowMs,
    }),
    false,
  );
});

test("rejects malformed Stripe event envelopes", () => {
  assert.throws(() => parseStripeEvent("{}"), /envelope/);
  assert.throws(() => parseStripeEvent("not json"), /JSON/);
});

test("plans a paid transition only for a matching paid Checkout Session", () => {
  const tip = buildTip();
  const event = buildCheckoutEvent();

  assert.deepEqual(planTipTransition(event, tip), {
    status: "paid",
    allowedCurrentStatuses: ["created", "processing", "failed"],
  });

  assert.throws(
    () =>
      planTipTransition(
        { ...event, data: { object: { ...event.data.object, amount_total: 999 } } },
        tip,
      ),
    /does not match/,
  );
});

test("never lets a late paid event overwrite a refunded tip", () => {
  assert.equal(planTipTransition(buildCheckoutEvent(), buildTip({ status: "refunded" })), null);
});

test("waits for an async event when Checkout completes unpaid", () => {
  const event = buildCheckoutEvent({ payment_status: "unpaid" });
  assert.equal(planTipTransition(event, buildTip()), null);
});

test("maps asynchronous failure and expiration without overwriting paid tips", () => {
  const failed: StripeEvent = {
    ...buildCheckoutEvent(),
    type: "checkout.session.async_payment_failed",
  };
  assert.deepEqual(planTipTransition(failed, buildTip()), {
    status: "failed",
    allowedCurrentStatuses: ["created", "processing"],
  });
  assert.equal(planTipTransition(failed, buildTip({ status: "paid" })), null);

  const expired: StripeEvent = { ...buildCheckoutEvent(), type: "checkout.session.expired" };
  assert.deepEqual(planTipTransition(expired, buildTip({ status: "created" })), {
    status: "failed",
    allowedCurrentStatuses: ["created", "processing"],
  });
});

test("reconciles only complete matching refunds", () => {
  const refund: StripeEvent = {
    id: "evt_refund",
    type: "charge.refunded",
    data: {
      object: {
        amount: 2500,
        amount_refunded: 2500,
        currency: "usd",
        metadata: { tip_id: "tip_1" },
      },
    },
  };
  assert.deepEqual(planTipTransition(refund, buildTip({ status: "paid" })), {
    status: "refunded",
    allowedCurrentStatuses: ["created", "processing", "paid", "failed"],
  });
  assert.throws(
    () =>
      planTipTransition(
        {
          ...refund,
          data: { object: { ...refund.data.object, amount_refunded: 1000 } },
        },
        buildTip({ status: "paid" }),
      ),
    /does not match/,
  );
});

test("creates one bounded chat message only for a paid provider event", () => {
  const tip = buildTip({
    event_id: "event_1",
    from_user_id: "user_1",
    message: "Thank you for hosting",
  });
  const event = buildCheckoutEvent();
  assert.equal(isStripePaymentSuccessEvent(event), true);
  assert.equal(buildTipChatMessage(tip), "$25.00 tip — Thank you for hosting");
  assert.equal(
    isStripePaymentSuccessEvent(buildCheckoutEvent({ payment_status: "unpaid" })),
    false,
  );
  assert.equal(buildTipChatMessage(buildTip()), null);
});

test("requires safe absolute checkout return URLs", () => {
  assert.deepEqual(buildStripeReturnUrls("https://accountabul.example/path", "tip 1"), {
    successUrl: "https://accountabul.example/live?tip=success&tip_id=tip%201",
    cancelUrl: "https://accountabul.example/live?tip=canceled&tip_id=tip%201",
  });
  assert.match(buildStripeReturnUrls("http://localhost:3000", "tip_1").successUrl, /localhost/);
  assert.throws(() => buildStripeReturnUrls(undefined, "tip_1"), /required/);
  assert.throws(() => buildStripeReturnUrls("/relative", "tip_1"), /absolute/);
  assert.throws(() => buildStripeReturnUrls("http://example.com", "tip_1"), /HTTPS/);
});

function buildTip(overrides: Partial<TipForReconciliation> = {}): TipForReconciliation {
  return {
    id: "tip_1",
    amount_minor: 2500,
    currency: "USD",
    provider_record_id: "cs_1",
    status: "processing",
    ...overrides,
  };
}

function buildCheckoutEvent(object: Record<string, unknown> = {}): StripeEvent {
  return {
    id: "evt_checkout",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        amount_total: 2500,
        currency: "usd",
        payment_status: "paid",
        client_reference_id: "tip_1",
        ...object,
      },
    },
  };
}
