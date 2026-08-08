export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

type StripeObject = Record<string, unknown> & {
  id?: string;
  amount?: number;
  amount_refunded?: number;
  amount_total?: number;
  client_reference_id?: string | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
};

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: StripeObject };
};

export type TipForReconciliation = {
  id: string;
  amount_minor: number;
  currency: string;
  provider_record_id: string | null;
  status: "created" | "processing" | "paid" | "failed" | "refunded";
  event_id?: string;
  from_user_id?: string;
  message?: string | null;
};

export type TipTransition = {
  status: "paid" | "failed" | "refunded";
  allowedCurrentStatuses: TipForReconciliation["status"][];
};

export function parseStripeEvent(payload: string): StripeEvent {
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    throw new Error("Invalid Stripe event JSON.");
  }

  if (!isRecord(value) || typeof value["id"] !== "string" || typeof value["type"] !== "string") {
    throw new Error("Invalid Stripe event envelope.");
  }

  const data = value["data"];
  if (!isRecord(data) || !isRecord(data["object"])) {
    throw new Error("Invalid Stripe event data.");
  }

  return {
    id: value["id"],
    type: value["type"],
    data: { object: data["object"] },
  };
}

export function getStripeTipId(event: StripeEvent): string | null {
  const object = event.data.object;
  const value = object.client_reference_id ?? object.metadata?.["tip_id"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function isStripePaymentSuccessEvent(event: StripeEvent) {
  return (
    (event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded") &&
    event.data.object.payment_status === "paid"
  );
}

export function buildTipChatMessage(tip: TipForReconciliation): string | null {
  if (!tip.event_id || !tip.from_user_id) return null;
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: tip.currency,
  }).format(tip.amount_minor / 100);
  const note = tip.message?.trim();
  return `${amount} tip${note ? ` — ${note}` : ""}`.slice(0, 500);
}

export function buildStripeReturnUrls(siteUrl: string | undefined, tipId: string) {
  if (!siteUrl) throw new Error("PUBLIC_SITE_URL is required before Stripe can be enabled.");
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    throw new Error("PUBLIC_SITE_URL must be an absolute URL.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("PUBLIC_SITE_URL must use HTTPS outside local development.");
  }
  const origin = url.origin;
  const encodedTipId = encodeURIComponent(tipId);
  return {
    successUrl: `${origin}/live?tip=success&tip_id=${encodedTipId}`,
    cancelUrl: `${origin}/live?tip=canceled&tip_id=${encodedTipId}`,
  };
}

export function planTipTransition(
  event: StripeEvent,
  tip: TipForReconciliation,
): TipTransition | null {
  const object = event.data.object;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    assertCheckoutSessionMatches(object, tip);

    if (
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      object.payment_status === "paid"
    ) {
      if (tip.status === "paid" || tip.status === "refunded") return null;
      return {
        status: "paid",
        allowedCurrentStatuses: ["created", "processing", "failed"],
      };
    }

    if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.expired"
    ) {
      if (tip.status !== "created" && tip.status !== "processing") return null;
      return { status: "failed", allowedCurrentStatuses: ["created", "processing"] };
    }

    // Some payment methods complete Checkout before funds are available. A later
    // async_payment_succeeded or async_payment_failed event owns the transition.
    return null;
  }

  if (event.type === "charge.refunded") {
    assertChargeRefundMatches(object, tip);
    if (tip.status === "refunded") return null;
    return {
      status: "refunded",
      allowedCurrentStatuses: ["created", "processing", "paid", "failed"],
    };
  }

  return null;
}

export async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  options: { nowMs?: number; toleranceSeconds?: number } = {},
): Promise<boolean> {
  const fields = parseSignatureHeader(header);
  const timestamp = fields.timestamp;
  if (!timestamp || fields.signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;

  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const tolerance = options.toleranceSeconds ?? STRIPE_SIGNATURE_TOLERANCE_SECONDS;
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
  const expected = bytesToHex(new Uint8Array(digest));

  return fields.signatures.some((signature) => constantTimeEqual(expected, signature));
}

function assertCheckoutSessionMatches(object: StripeObject, tip: TipForReconciliation) {
  if (
    typeof object.id !== "string" ||
    object.id !== tip.provider_record_id ||
    object.amount_total !== tip.amount_minor ||
    object.currency?.toUpperCase() !== tip.currency.toUpperCase()
  ) {
    throw new Error("Stripe Checkout Session does not match the recorded tip.");
  }
}

function assertChargeRefundMatches(object: StripeObject, tip: TipForReconciliation) {
  if (
    object.amount !== tip.amount_minor ||
    object.amount_refunded !== object.amount ||
    object.currency?.toUpperCase() !== tip.currency.toUpperCase()
  ) {
    throw new Error("Stripe refund does not match the recorded tip.");
  }
}

function parseSignatureHeader(header: string) {
  let timestamp: string | undefined;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }

  return { timestamp, signatures };
}

function constantTimeEqual(expected: string, actual: string) {
  if (expected.length !== actual.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return mismatch === 0;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
