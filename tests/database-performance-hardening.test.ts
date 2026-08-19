import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260811065051_optimize_rls_and_fk_indexes.sql",
  import.meta.url,
);

test("RLS performance migration optimizes the complete advisor-reported policy set", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /replace\(_policy\.qual, 'auth\.uid\(\)', '\(select auth\.uid\(\)\)'\)/);
  assert.match(migration, /if _processed <> 46 then/);
  assert.match(migration, /raise exception 'Expected to optimize 46 RLS policies/);
});

test("broad write policies are split so authenticated reads evaluate one policy", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const policy of [
    "user_roles_admin_write",
    "events_admin_write",
    "chat_mod_write",
    "property_media_write",
  ]) {
    assert.match(migration, new RegExp(`drop policy "${policy}"`));
  }

  for (const policy of [
    "user_roles_admin_insert",
    "user_roles_admin_update",
    "user_roles_admin_delete",
    "events_admin_insert",
    "events_admin_update",
    "events_admin_delete",
    "chat_mod_insert",
    "chat_mod_update",
    "chat_mod_delete",
    "property_media_insert",
    "property_media_update",
    "property_media_delete",
  ]) {
    assert.match(migration, new RegExp(`create policy "${policy}"`));
  }
});

test("every advisor-reported foreign key receives a supporting index", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const indexes = migration.match(/create index if not exists /g) ?? [];

  assert.equal(indexes.length, 26);
});
