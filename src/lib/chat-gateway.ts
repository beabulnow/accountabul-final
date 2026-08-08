export const CHAT_MESSAGE_MAX_LENGTH = 500;
export const CHAT_RATE_LIMIT_COUNT = 5;
export const CHAT_RATE_LIMIT_WINDOW_SECONDS = 10;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ChatMessageInput = {
  eventId: string;
  body: string;
};

export function normalizeChatMessage(input: ChatMessageInput) {
  if (!input || typeof input.eventId !== "string" || !UUID_PATTERN.test(input.eventId)) {
    throw new Error("A valid event is required.");
  }
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body) throw new Error("Write a message first.");
  if (body.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new Error(`Messages are limited to ${CHAT_MESSAGE_MAX_LENGTH} characters.`);
  }
  return { eventId: input.eventId, body };
}

export type PlayerUiState =
  "scheduled" | "connecting" | "live" | "reconnecting" | "ended" | "provider-down";

export function resolvePlayerUiState({
  eventStatus,
  playableUrl,
  online,
  frameStatus,
}: {
  eventStatus: string;
  playableUrl: string | null;
  online: boolean;
  frameStatus: "connecting" | "ready" | "failed";
}): PlayerUiState {
  if (eventStatus === "scheduled") return "scheduled";
  if (eventStatus === "ended" || eventStatus === "canceled") return "ended";
  if (!online) return "reconnecting";
  if (!playableUrl || frameStatus === "failed") return "provider-down";
  return frameStatus === "ready" ? "live" : "connecting";
}
