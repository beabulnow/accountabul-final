import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseFetch } from "../src/integrations/supabase/fetch.ts";

const url = process.env["SUPABASE_URL"];
const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const required = process.env["MEMBER_INVITATION_GATE_REQUIRED"] === "1";
const missing = [
  ...(!url ? ["SUPABASE_URL"] : []),
  ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
];

if (required && missing.length > 0) {
  throw new Error(`Business invitation live gate requires: ${missing.join(", ")}`);
}

function client(key: string) {
  return createClient(url!, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createTestUser(admin: SupabaseClient, label: string, password: string) {
  const email = `member-invite-${label}-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Invitation ${label}` },
  });
  assert.ifError(error);
  assert.ok(data.user);
  return { email, id: data.user.id };
}

test(
  "business member invitations enforce owner and invited-user boundaries",
  { skip: missing.length > 0 ? `live credentials missing: ${missing.join(", ")}` : false },
  async (t) => {
    const admin = client(serviceRoleKey!);
    const password = `Invite!${randomBytes(18).toString("base64url")}`;
    const users: string[] = [];
    const cleanup: { businessId?: string } = {};

    t.after(async () => {
      if (cleanup.businessId) {
        await admin.from("businesses").delete().eq("id", cleanup.businessId);
      }
      for (const id of users) await admin.auth.admin.deleteUser(id);
    });

    const owner = await createTestUser(admin, "owner", password);
    const invitee = await createTestUser(admin, "invitee", password);
    users.push(owner.id, invitee.id);

    const ownerClient = client(publishableKey!);
    const inviteeClient = client(publishableKey!);
    assert.ifError(
      (await ownerClient.auth.signInWithPassword({ email: owner.email, password })).error,
    );
    assert.ifError(
      (await inviteeClient.auth.signInWithPassword({ email: invitee.email, password })).error,
    );

    const created = await ownerClient.rpc("create_business_with_owner", {
      _slug: `invite-gate-${randomBytes(6).toString("hex")}`,
      _legal_name: "Invitation Gate LLC",
      _display_name: "Invitation Gate",
    });
    assert.ifError(created.error);
    const businessId = created.data as string;
    cleanup.businessId = businessId;

    const directWrite = await ownerClient.from("business_members").insert({
      business_id: businessId,
      user_id: invitee.id,
      membership_role: "viewer",
      invitation_status: "active",
    });
    assert.ok(directWrite.error, "authenticated clients must not write memberships directly");

    const unauthorizedInvite = await inviteeClient.rpc("invite_business_member", {
      _business_id: businessId,
      _email: owner.email,
      _role: "viewer",
    });
    assert.ok(unauthorizedInvite.error, "non-owners must not invite members");

    const invited = await ownerClient.rpc("invite_business_member", {
      _business_id: businessId,
      _email: invitee.email.toUpperCase(),
      _role: "viewer",
    });
    assert.ifError(invited.error);
    const membershipId = invited.data as string;

    const beforeAccept = await inviteeClient.from("businesses").select("id").eq("id", businessId);
    assert.ifError(beforeAccept.error);
    assert.equal(beforeAccept.data?.length, 0, "a pending invitation must not grant access");

    const invitations = await inviteeClient.rpc("get_my_business_invitations");
    assert.ifError(invitations.error);
    assert.deepEqual(
      invitations.data?.map((row) => row.membership_id),
      [membershipId],
    );

    const crossInvitation = await inviteeClient.rpc("respond_to_business_invitation", {
      _membership_id: randomUUID(),
      _accept: true,
    });
    assert.ok(crossInvitation.error, "a member must not respond to another invitation");

    const accepted = await inviteeClient.rpc("respond_to_business_invitation", {
      _membership_id: membershipId,
      _accept: true,
    });
    assert.ifError(accepted.error);
    assert.equal(accepted.data, businessId);

    const afterAccept = await inviteeClient.from("businesses").select("id").eq("id", businessId);
    assert.ifError(afterAccept.error);
    assert.equal(afterAccept.data?.length, 1);

    const unauthorizedRoleChange = await inviteeClient.rpc("update_business_member_role", {
      _membership_id: membershipId,
      _role: "manager",
    });
    assert.ok(unauthorizedRoleChange.error, "non-owners must not change roles");

    const changed = await ownerClient.rpc("update_business_member_role", {
      _membership_id: membershipId,
      _role: "manager",
    });
    assert.ifError(changed.error);

    const revoked = await ownerClient.rpc("revoke_business_member", {
      _membership_id: membershipId,
    });
    assert.ifError(revoked.error);

    const afterRevoke = await inviteeClient.from("businesses").select("id").eq("id", businessId);
    assert.ifError(afterRevoke.error);
    assert.equal(afterRevoke.data?.length, 0, "revocation must remove business access");

    const staleResponse = await inviteeClient.rpc("respond_to_business_invitation", {
      _membership_id: membershipId,
      _accept: true,
    });
    assert.ok(staleResponse.error, "revoked invitations must not be reusable");

    const audit = await admin
      .from("audit_log")
      .select("action")
      .eq("target_id", membershipId)
      .order("created_at");
    assert.ifError(audit.error);
    assert.deepEqual(
      audit.data?.map((row) => row.action),
      [
        "business_member.invited",
        "business_member.accepted",
        "business_member.role_changed",
        "business_member.revoked",
      ],
    );
  },
);
