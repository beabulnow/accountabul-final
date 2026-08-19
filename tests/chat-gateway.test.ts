import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_MESSAGE_MAX_LENGTH,
  normalizeChatMessage,
  resolvePlayerUiState,
} from "../src/lib/chat-gateway.ts";

const eventId = "123e4567-e89b-42d3-a456-426614174000";

test("chat validation trims safe messages and rejects invalid boundaries", () => {
  assert.deepEqual(normalizeChatMessage({ eventId, body: "  hello  " }), {
    eventId,
    body: "hello",
  });
  assert.throws(() => normalizeChatMessage({ eventId: "not-a-uuid", body: "hello" }), /event/);
  assert.throws(() => normalizeChatMessage({ eventId, body: "   " }), /message/i);
  assert.throws(
    () => normalizeChatMessage({ eventId, body: "x".repeat(CHAT_MESSAGE_MAX_LENGTH + 1) }),
    /500/,
  );
});

test("player state distinguishes scheduled, connecting, reconnecting, ended, and provider down", () => {
  const base = { playableUrl: "https://player.example.test/embed", online: true };
  assert.equal(
    resolvePlayerUiState({ ...base, eventStatus: "scheduled", frameStatus: "connecting" }),
    "scheduled",
  );
  assert.equal(
    resolvePlayerUiState({ ...base, eventStatus: "live", frameStatus: "connecting" }),
    "connecting",
  );
  assert.equal(
    resolvePlayerUiState({ ...base, eventStatus: "live", frameStatus: "ready" }),
    "live",
  );
  assert.equal(
    resolvePlayerUiState({ ...base, eventStatus: "live", online: false, frameStatus: "ready" }),
    "reconnecting",
  );
  assert.equal(
    resolvePlayerUiState({ ...base, eventStatus: "ended", frameStatus: "ready" }),
    "ended",
  );
  assert.equal(
    resolvePlayerUiState({
      ...base,
      eventStatus: "live",
      playableUrl: null,
      frameStatus: "connecting",
    }),
    "provider-down",
  );
});
