import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"];
const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const required = process.env["PHASE1_GATE_REQUIRED"] === "1";
const missing = [
  ...(!url ? ["SUPABASE_URL"] : []),
  ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
];

if (required && missing.length > 0) {
  throw new Error(`Phase 1 live gate requires: ${missing.join(", ")}`);
}

function client(key: string) {
  return createClient(url!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createTestUser(admin: SupabaseClient, label: string, password: string) {
  const email = `phase1-${label}-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Phase 1 ${label}` },
  });
  assert.ifError(error);
  assert.ok(data.user);
  return { email, id: data.user.id };
}

test(
  "Phase 1 keeps profiles and draft businesses isolated between two users",
  { skip: missing.length > 0 ? `live credentials missing: ${missing.join(", ")}` : false },
  async (t) => {
    const admin = client(serviceRoleKey!);
    const password = `P1!${randomBytes(18).toString("base64url")}`;
    const users: string[] = [];
    const businesses: string[] = [];

    t.after(async () => {
      if (businesses.length > 0) {
        await admin.from("businesses").delete().in("id", businesses);
      }
      for (const id of users) await admin.auth.admin.deleteUser(id);
    });

    const userA = await createTestUser(admin, "alpha", password);
    const userB = await createTestUser(admin, "bravo", password);
    users.push(userA.id, userB.id);

    const userAClient = client(publishableKey!);
    const userBClient = client(publishableKey!);
    assert.ifError(
      (await userAClient.auth.signInWithPassword({ email: userA.email, password })).error,
    );
    assert.ifError(
      (await userBClient.auth.signInWithPassword({ email: userB.email, password })).error,
    );

    const ownProfile = await userAClient.from("profiles").select("id").eq("id", userA.id);
    assert.ifError(ownProfile.error);
    assert.equal(ownProfile.data?.length, 1);

    const otherProfile = await userAClient.from("profiles").select("id").eq("id", userB.id);
    assert.ifError(otherProfile.error);
    assert.equal(otherProfile.data?.length, 0);

    async function createBusiness(owner: SupabaseClient, userId: string, label: string) {
      const slug = `phase1-${label}-${randomBytes(5).toString("hex")}`;
      const inserted = await owner
        .from("businesses")
        .insert({
          slug,
          legal_name: `Private ${label} LLC`,
          display_name: `Phase 1 ${label}`,
          created_by: userId,
        })
        .select("id")
        .single();
      assert.ifError(inserted.error);
      businesses.push(inserted.data!.id);

      const membership = await owner.from("business_members").insert({
        business_id: inserted.data!.id,
        user_id: userId,
        membership_role: "owner",
        invitation_status: "active",
        joined_at: new Date().toISOString(),
      });
      assert.ifError(membership.error);
      return inserted.data!.id;
    }

    const businessA = await createBusiness(userAClient, userA.id, "alpha");
    const businessB = await createBusiness(userBClient, userB.id, "bravo");

    const ownDraft = await userAClient.from("businesses").select("id").eq("id", businessA);
    assert.ifError(ownDraft.error);
    assert.equal(ownDraft.data?.length, 1);

    const otherDraft = await userAClient.from("businesses").select("id").eq("id", businessB);
    assert.ifError(otherDraft.error);
    assert.equal(otherDraft.data?.length, 0);

    const forbiddenUpdate = await userAClient
      .from("businesses")
      .update({ headline: "tampered" })
      .eq("id", businessB)
      .select("id");
    assert.ifError(forbiddenUpdate.error);
    assert.equal(forbiddenUpdate.data?.length, 0);

    const anonymous = client(publishableKey!);
    const anonymousDraft = await anonymous.from("businesses").select("id").eq("id", businessA);
    assert.ifError(anonymousDraft.error);
    assert.equal(anonymousDraft.data?.length, 0);
  },
);
