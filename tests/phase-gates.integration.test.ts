import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseFetch } from "../src/integrations/supabase/fetch.ts";

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
  throw new Error(`Database gate requires: ${missing.join(", ")}`);
}

function client(key: string) {
  return createClient(url!, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createTestUser(admin: SupabaseClient, label: string, password: string) {
  const email = `phase-gate-${label}-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Phase gate ${label}` },
  });
  assert.ifError(error);
  assert.ok(data.user);
  return { email, id: data.user.id };
}

test(
  "database gates enforce public projections, review lifecycles, and parent suspension",
  { skip: missing.length > 0 ? `live credentials missing: ${missing.join(", ")}` : false },
  async (t) => {
    const admin = client(serviceRoleKey!);
    const ownerClient = client(publishableKey!);
    const strangerClient = client(publishableKey!);
    const reviewerClient = client(publishableKey!);
    const anonymous = client(publishableKey!);
    const password = `Gate!${randomBytes(18).toString("base64url")}`;
    const users: string[] = [];
    let businessId: string | null = null;

    t.after(async () => {
      if (businessId) await admin.from("businesses").delete().eq("id", businessId);
      for (const id of users) await admin.auth.admin.deleteUser(id);
    });

    const owner = await createTestUser(admin, "owner", password);
    const stranger = await createTestUser(admin, "stranger", password);
    const reviewer = await createTestUser(admin, "reviewer", password);
    users.push(owner.id, stranger.id, reviewer.id);

    assert.ifError(
      (await admin.from("user_roles").insert({ user_id: reviewer.id, role: "moderator" })).error,
    );
    assert.ifError(
      (await ownerClient.auth.signInWithPassword({ email: owner.email, password })).error,
    );
    assert.ifError(
      (await strangerClient.auth.signInWithPassword({ email: stranger.email, password })).error,
    );
    assert.ifError(
      (await reviewerClient.auth.signInWithPassword({ email: reviewer.email, password })).error,
    );

    const slug = `phase-gate-${randomBytes(6).toString("hex")}`;
    const created = await ownerClient.rpc("create_business_with_owner", {
      _slug: slug,
      _legal_name: "Private Gate LLC",
      _display_name: "Public Gate Business",
    });
    assert.ifError(created.error);
    assert.equal(typeof created.data, "string");
    businessId = created.data as string;

    const ownerPublishedInsert = await ownerClient.from("businesses").insert({
      slug: `${slug}-forbidden`,
      legal_name: "Forbidden LLC",
      display_name: "Forbidden",
      created_by: owner.id,
      profile_status: "published",
      verification_status: "verified",
      public_profile_enabled: true,
      published_at: new Date().toISOString(),
    });
    assert.ok(ownerPublishedInsert.error, "owner must not insert a published business");

    const forbiddenBusinessPublish = await ownerClient
      .from("businesses")
      .update({
        profile_status: "published",
        verification_status: "verified",
        public_profile_enabled: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", businessId);
    assert.ok(forbiddenBusinessPublish.error, "owner must not self-publish a business");

    assert.ifError(
      (
        await ownerClient
          .from("businesses")
          .update({ profile_status: "pending_review", verification_status: "pending" })
          .eq("id", businessId)
      ).error,
    );
    assert.ifError(
      (
        await reviewerClient.rpc("review_business", {
          _business_id: businessId,
          _decision: "approve",
        })
      ).error,
    );

    const privateBaseRow = await strangerClient
      .from("businesses")
      .select("id, legal_name")
      .eq("id", businessId);
    assert.ifError(privateBaseRow.error);
    assert.equal(privateBaseRow.data?.length, 0);

    const signedInPublicRow = await strangerClient
      .from("public_businesses")
      .select("id, display_name")
      .eq("id", businessId);
    assert.ifError(signedInPublicRow.error);
    assert.equal(signedInPublicRow.data?.length, 1);

    const disallowedPublicColumn = await strangerClient
      .from("public_businesses")
      .select("id, legal_name")
      .eq("id", businessId);
    assert.ok(disallowedPublicColumn.error, "public projection must not expose legal_name");

    const anonymousPublicRow = await anonymous
      .from("public_businesses")
      .select("id, display_name")
      .eq("id", businessId);
    assert.ifError(anonymousPublicRow.error);
    assert.equal(anonymousPublicRow.data?.length, 1);

    const forbiddenCredential = await ownerClient.from("business_credentials").insert({
      business_id: businessId,
      credential_type: "Forbidden License",
      identifier: "FORBIDDEN-1",
      review_status: "approved",
      public_display_approved: true,
    });
    assert.ok(forbiddenCredential.error, "owner must not insert an approved credential");

    const credential = await ownerClient
      .from("business_credentials")
      .insert({
        business_id: businessId,
        credential_type: "License",
        issuing_authority: "Gate Authority",
        identifier: "PUBLIC-1",
      })
      .select("id")
      .single();
    assert.ifError(credential.error);
    const credentialId = credential.data!.id;
    assert.ok(
      (
        await ownerClient
          .from("business_credentials")
          .update({ review_status: "approved", public_display_approved: true })
          .eq("id", credentialId)
      ).error,
      "owner must not approve a credential",
    );
    const reviewerCredentialEdit = await reviewerClient
      .from("business_credentials")
      .update({ identifier: "REVIEWER-TAMPERING" })
      .eq("id", credentialId)
      .select("id");
    assert.ifError(reviewerCredentialEdit.error);
    assert.equal(reviewerCredentialEdit.data?.length, 0);
    assert.ifError(
      (
        await reviewerClient.rpc("review_business_credential", {
          _credential_id: credentialId,
          _decision: "approve",
        })
      ).error,
    );
    const publicCredentials = await anonymous
      .from("public_business_credentials")
      .select("identifier")
      .eq("business_id", businessId);
    assert.ifError(publicCredentials.error);
    assert.deepEqual(
      publicCredentials.data?.map((row) => row.identifier),
      ["PUBLIC-1"],
    );

    const forbiddenProperty = await ownerClient.from("properties").insert({
      business_id: businessId,
      slug: `${slug}-forbidden-property`,
      title: "Forbidden property",
      created_by: owner.id,
      status: "published",
      published_at: new Date().toISOString(),
    });
    assert.ok(forbiddenProperty.error, "owner must not insert a published property");

    const property = await ownerClient
      .from("properties")
      .insert({
        business_id: businessId,
        slug: `${slug}-property`,
        title: "Gate property",
        created_by: owner.id,
        status: "draft",
      })
      .select("id")
      .single();
    assert.ifError(property.error);
    const propertyId = property.data!.id;
    assert.ok(
      (
        await ownerClient
          .from("properties")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", propertyId)
      ).error,
      "owner must not self-publish a property",
    );
    assert.ifError(
      (
        await ownerClient
          .from("properties")
          .update({ status: "pending_review", published_at: null })
          .eq("id", propertyId)
      ).error,
    );

    const reviewerContentEdit = await reviewerClient
      .from("properties")
      .update({ title: "Reviewer tampering" })
      .eq("id", propertyId)
      .select("id");
    assert.ifError(reviewerContentEdit.error);
    assert.equal(reviewerContentEdit.data?.length, 0);
    assert.ifError(
      (
        await reviewerClient.rpc("review_property", {
          _property_id: propertyId,
          _decision: "approve",
        })
      ).error,
    );

    const forbiddenService = await ownerClient.from("services").insert({
      business_id: businessId,
      slug: `${slug}-forbidden-service`,
      name: "Forbidden service",
      created_by: owner.id,
      status: "published",
      published_at: new Date().toISOString(),
    });
    assert.ok(forbiddenService.error, "owner must not insert a published service");

    const service = await ownerClient
      .from("services")
      .insert({
        business_id: businessId,
        slug: `${slug}-service`,
        name: "Gate service",
        created_by: owner.id,
        status: "draft",
      })
      .select("id")
      .single();
    assert.ifError(service.error);
    const serviceId = service.data!.id;
    assert.ok(
      (
        await ownerClient
          .from("services")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", serviceId)
      ).error,
      "owner must not self-publish a service",
    );
    assert.ifError(
      (
        await ownerClient
          .from("services")
          .update({ status: "pending_review", published_at: null })
          .eq("id", serviceId)
      ).error,
    );
    assert.ifError(
      (
        await reviewerClient.rpc("review_service", {
          _service_id: serviceId,
          _decision: "approve",
        })
      ).error,
    );

    for (const publicClient of [anonymous, strangerClient]) {
      const visibleProperty = await publicClient
        .from("properties")
        .select("id")
        .eq("id", propertyId);
      assert.ifError(visibleProperty.error);
      assert.equal(visibleProperty.data?.length, 1);
      const visibleService = await publicClient.from("services").select("id").eq("id", serviceId);
      assert.ifError(visibleService.error);
      assert.equal(visibleService.data?.length, 1);
    }

    assert.ifError(
      (
        await admin
          .from("businesses")
          .update({ profile_status: "suspended", public_profile_enabled: false })
          .eq("id", businessId)
      ).error,
    );

    for (const publicClient of [anonymous, strangerClient]) {
      const hiddenProperty = await publicClient
        .from("properties")
        .select("id")
        .eq("id", propertyId);
      assert.ifError(hiddenProperty.error);
      assert.equal(hiddenProperty.data?.length, 0);
      const hiddenService = await publicClient.from("services").select("id").eq("id", serviceId);
      assert.ifError(hiddenService.error);
      assert.equal(hiddenService.data?.length, 0);
    }

    const audit = await admin
      .from("audit_log")
      .select("action")
      .eq("target_id", businessId)
      .in("action", ["business.created", "business.reviewed"]);
    assert.ifError(audit.error);
    assert.equal(audit.data?.length, 2);
  },
);
