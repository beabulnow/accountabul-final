import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"];
const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const required = process.env["PHASE3_GATE_REQUIRED"] === "1";
const missing = [
  ...(!url ? ["SUPABASE_URL"] : []),
  ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
];

if (required && missing.length > 0) {
  throw new Error(`Phase 3 live chat gate requires: ${missing.join(", ")}`);
}

function client(key: string) {
  return createClient(url!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function createTestUser(admin: SupabaseClient, password: string) {
  const email = `phase3-chat-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  assert.ok(data.user);
  return { email, id: data.user.id };
}

test(
  "Phase 3 chat rejects direct writes, limits bursts, and enforces bans in the RPC",
  { skip: missing.length > 0 ? `live credentials missing: ${missing.join(", ")}` : false },
  async (t) => {
    const admin = client(serviceRoleKey!);
    const password = `P3!${randomBytes(18).toString("base64url")}`;
    const user = await createTestUser(admin, password);
    const eventId = crypto.randomUUID();
    const slug = `phase3-chat-${randomBytes(5).toString("hex")}`;

    t.after(async () => {
      await admin.from("events").delete().eq("id", eventId);
      await admin.auth.admin.deleteUser(user.id);
    });

    const event = await admin.from("events").insert({
      id: eventId,
      slug,
      title: "Phase 3 chat gate",
      status: "live",
      chat_enabled: true,
    });
    assert.ifError(event.error);

    const member = client(publishableKey!);
    assert.ifError((await member.auth.signInWithPassword({ email: user.email, password })).error);

    const direct = await member
      .from("chat_messages")
      .insert({ event_id: eventId, user_id: user.id, body: "direct write" });
    assert.ok(direct.error, "authenticated Data API insert must be revoked");

    for (let index = 0; index < 5; index += 1) {
      const sent = await member.rpc("send_chat_message", {
        _event_id: eventId,
        _body: `allowed ${index}`,
      });
      assert.ifError(sent.error);
      assert.equal(sent.data?.user_id, user.id);
    }

    const limited = await member.rpc("send_chat_message", {
      _event_id: eventId,
      _body: "too fast",
    });
    assert.match(limited.error?.message ?? "", /rate limit/i);

    await admin.from("chat_messages").delete().eq("event_id", eventId);
    const ban = await admin.from("chat_moderation_actions").insert({
      event_id: eventId,
      target_user_id: user.id,
      actor_user_id: user.id,
      action: "ban",
      reason: "integration test",
    });
    assert.ifError(ban.error);

    const banned = await member.rpc("send_chat_message", {
      _event_id: eventId,
      _body: "ban bypass attempt",
    });
    assert.match(banned.error?.message ?? "", /moderation/i);
  },
);
