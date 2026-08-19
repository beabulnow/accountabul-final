import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260819120000_secure_event_presence.sql", import.meta.url),
  "utf8",
);
const liveRoom = readFileSync(new URL("../src/routes/live.$slug.tsx", import.meta.url), "utf8");

test("presence hides viewer identities behind one authenticated aggregate RPC", () => {
  assert.match(
    migration,
    /revoke select, insert, update, delete on public\.event_presence from authenticated/i,
  );
  assert.match(migration, /function public\.touch_event_presence\(_event_id uuid\)/i);
  assert.match(migration, /_actor uuid := auth\.uid\(\)/i);
  assert.match(migration, /e\.status <> 'canceled'/i);
  assert.match(migration, /last_seen_at >= now\(\) - interval '90 seconds'/i);
  assert.match(migration, /grant execute on function public\.touch_event_presence\(uuid\)/i);
  assert.doesNotMatch(liveRoom, /\.from\("event_presence"\)/);
});

test("the live room refreshes a bounded aggregate heartbeat", () => {
  assert.match(liveRoom, /supabase\.rpc\("touch_event_presence"/);
  assert.match(liveRoom, /refetchInterval: 45_000/);
  assert.match(liveRoom, /presence\.data === 1 \? "member" : "members"/);
});
