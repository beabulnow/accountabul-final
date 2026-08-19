import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260819110000_business_member_invitations.sql", import.meta.url),
  "utf8",
);
const staffUi = readFileSync(
  new URL("../src/routes/dashboard.business.tsx", import.meta.url),
  "utf8",
);

test("membership writes cross narrow authenticated RPCs", () => {
  assert.match(
    migration,
    /revoke insert, update, delete on public\.business_members from authenticated/i,
  );

  for (const name of [
    "invite_business_member",
    "get_my_business_invitations",
    "respond_to_business_invitation",
    "update_business_member_role",
    "revoke_business_member",
  ]) {
    assert.match(migration, new RegExp(`function public\\.${name}\\(`, "i"));
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}`, "i"));
  }

  assert.doesNotMatch(staffUi, /\.from\("business_members"\)\.insert/);
  assert.doesNotMatch(staffUi, /invited_by\s*:/);
  assert.doesNotMatch(staffUi, /joined_at\s*:/);
});

test("invitation lifecycle derives actors, blocks ownership mutation, and records audits", () => {
  assert.match(migration, /_actor uuid := auth\.uid\(\)/i);
  assert.match(migration, /private\.is_business_owner\(_business_id, _actor\)/i);
  assert.match(migration, /_role is null or _role = 'owner'/i);
  assert.match(migration, /and m\.user_id = _actor[\s\S]*for update/i);
  assert.match(migration, /if _status <> 'invited'/i);

  for (const action of ["invited", "accepted", "declined", "role_changed", "revoked"]) {
    assert.match(migration, new RegExp(`business_member\\.${action}`, "i"));
  }
});
