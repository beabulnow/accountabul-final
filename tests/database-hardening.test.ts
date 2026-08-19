import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const migrationName = readdirSync(new URL("../supabase/migrations/", import.meta.url)).find(
  (name) => name.endsWith("_harden_phase_1_to_3_gates.sql"),
);
assert.ok(migrationName, "hardening migration is missing");

const migration = readFileSync(
  new URL(`../supabase/migrations/${migrationName}`, import.meta.url),
  "utf8",
).toLowerCase();

test("public business and credential reads use narrow projections", () => {
  assert.match(migration, /create or replace view public\.public_businesses/);
  assert.match(migration, /create or replace view public\.public_business_credentials/);
  assert.match(
    migration,
    /revoke all on table public\.public_businesses from public, anon, authenticated/,
  );
  assert.match(migration, /grant select on table public\.public_businesses to anon, authenticated/);
  assert.doesNotMatch(
    migration.match(
      /create or replace view public\.public_businesses[\s\S]*?from public\.businesses/,
    )?.[0] ?? "",
    /legal_name|created_by|created_at|updated_at/,
  );

  for (const route of ["businesses.index.tsx", "businesses.$slug.tsx"]) {
    const source = readFileSync(new URL(`../src/routes/${route}`, import.meta.url), "utf8");
    assert.match(source, /\.from\("public_businesses"\)/);
    assert.doesNotMatch(source, /\.from\("businesses"\)/);
  }

  for (const route of ["marketplace.tsx", "properties.$slug.tsx"]) {
    const source = readFileSync(new URL(`../src/routes/${route}`, import.meta.url), "utf8");
    assert.match(source, /\.from\("public_businesses"\)/);
    assert.doesNotMatch(source, /businesses\s*\(/);
  }
});

test("owner inserts and lifecycle updates cannot publish review-controlled rows", () => {
  assert.match(
    migration,
    /create policy "businesses_insert_own"[\s\S]*?profile_status = 'draft'[\s\S]*?verification_status = 'unverified'/,
  );
  assert.match(
    migration,
    /create policy properties_insert[\s\S]*?status = 'draft'[\s\S]*?published_at is null/,
  );
  assert.match(
    migration,
    /create policy services_insert[\s\S]*?status = 'draft'[\s\S]*?published_at is null/,
  );
  assert.doesNotMatch(migration, /create policy services_write[\s\S]*?for all to authenticated/);
  assert.match(migration, /create policy services_update[\s\S]*?public\.can_manage_business/);
  assert.match(migration, /create policy services_delete[\s\S]*?public\.can_manage_business/);
});

test("reviewers cross explicit least-privilege RPCs and child policies require a public parent", () => {
  for (const target of ["business", "property", "service"]) {
    assert.match(migration, new RegExp(`create or replace function public\\.review_${target}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.review_${target}`));
  }
  assert.match(migration, /create or replace function public\.review_business_credential/);
  assert.match(migration, /create trigger business_credentials_enforce_review_transition/);
  assert.match(
    migration,
    /create policy "business_credentials_insert"[\s\S]*?review_status = 'pending'[\s\S]*?public_display_approved = false/,
  );
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /insert into public\.audit_log/);
  assert.match(migration, /create policy properties_auth_read[\s\S]*?public\.public_businesses/);
  assert.match(migration, /create policy services_auth_read[\s\S]*?public\.public_businesses/);
  assert.match(
    migration,
    /create policy property_media_auth_read[\s\S]*?public\.public_businesses/,
  );
});

test("business creation is an atomic authenticated RPC", () => {
  const definition =
    migration.match(
      /create or replace function public\.create_business_with_owner[\s\S]*?\$\$;/,
    )?.[0] ?? "";
  assert.match(definition, /security definer/);
  assert.match(definition, /auth\.uid\(\)/);
  assert.match(definition, /insert into public\.businesses/);
  assert.match(definition, /insert into public\.business_members/);
  assert.match(definition, /membership_role/);
  assert.match(migration, /grant execute on function public\.create_business_with_owner/);
});
