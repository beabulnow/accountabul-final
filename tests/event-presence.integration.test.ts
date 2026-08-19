import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseFetch } from "../src/integrations/supabase/fetch.ts";

const url = process.env["SUPABASE_URL"];
const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const required = process.env["EVENT_PRESENCE_GATE_REQUIRED"] === "1";
const missing = [
  ...(!url ? ["SUPABASE_URL"] : []),
  ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
];

if (required && missing.length > 0) {
  throw new Error(`Event presence live gate requires: ${missing.join(", ")}`);
}

function client(key: string) {
  return createClient(url!, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createTestUser(admin: SupabaseClient, label: string, password: string) {
  const email = `presence-${label}-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Presence ${label}` },
  });
  assert.ifError(error);
  assert.ok(data.user);
  return { email, id: data.user.id };
}

test(
  "event presence exposes only a recent aggregate to authenticated viewers",
  { skip: missing.length > 0 ? `live credentials missing: ${missing.join(", ")}` : false },
  async (t) => {
    const admin = client(serviceRoleKey!);
    const password = `Presence!${randomBytes(18).toString("base64url")}`;
    const users: string[] = [];
    const cleanup: { eventId?: string } = {};

    t.after(async () => {
      if (cleanup.eventId) await admin.from("events").delete().eq("id", cleanup.eventId);
      for (const id of users) await admin.auth.admin.deleteUser(id);
    });

    const first = await createTestUser(admin, "first", password);
    const second = await createTestUser(admin, "second", password);
    users.push(first.id, second.id);

    const firstClient = client(publishableKey!);
    const secondClient = client(publishableKey!);
    assert.ifError(
      (await firstClient.auth.signInWithPassword({ email: first.email, password })).error,
    );
    assert.ifError(
      (await secondClient.auth.signInWithPassword({ email: second.email, password })).error,
    );

    const event = await admin
      .from("events")
      .insert({
        slug: `presence-gate-${randomBytes(6).toString("hex")}`,
        title: "Presence gate",
        status: "live",
      })
      .select("id")
      .single();
    assert.ifError(event.error);
    cleanup.eventId = event.data.id;

    const directRead = await firstClient.from("event_presence").select("user_id");
    assert.ok(directRead.error, "authenticated clients must not read presence identities");

    const firstHeartbeat = await firstClient.rpc("touch_event_presence", {
      _event_id: event.data.id,
    });
    assert.ifError(firstHeartbeat.error);
    assert.equal(firstHeartbeat.data, 1);

    const secondHeartbeat = await secondClient.rpc("touch_event_presence", {
      _event_id: event.data.id,
    });
    assert.ifError(secondHeartbeat.error);
    assert.equal(secondHeartbeat.data, 2);

    const stale = await admin
      .from("event_presence")
      .update({ last_seen_at: new Date(Date.now() - 120_000).toISOString() })
      .eq("event_id", event.data.id)
      .eq("user_id", first.id);
    assert.ifError(stale.error);

    const afterStale = await secondClient.rpc("touch_event_presence", {
      _event_id: event.data.id,
    });
    assert.ifError(afterStale.error);
    assert.equal(afterStale.data, 1, "viewers older than 90 seconds must not be counted");

    assert.ifError(
      (await admin.from("events").update({ status: "canceled" }).eq("id", event.data.id)).error,
    );
    const canceled = await firstClient.rpc("touch_event_presence", { _event_id: event.data.id });
    assert.ok(canceled.error, "canceled events must reject presence heartbeats");
  },
);
