import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseFetch } from "../src/integrations/supabase/fetch.ts";

const url = process.env["SUPABASE_URL"];
const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const required = process.env["PHASE2_GATE_REQUIRED"] === "1";
const missing = [
  ...(!url ? ["SUPABASE_URL"] : []),
  ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
];

if (required && missing.length > 0) {
  throw new Error(`Phase 2 storage gate requires: ${missing.join(", ")}`);
}

function client(key: string) {
  return createClient(url!, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createTestUser(admin: SupabaseClient, label: string, password: string) {
  const email = `phase2-${label}-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;
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
  "Phase 2 storage keeps drafts private and rejects cross-business uploads",
  { skip: missing.length > 0 ? `live credentials missing: ${missing.join(", ")}` : false },
  async (t) => {
    const admin = client(serviceRoleKey!);
    const ownerClient = client(publishableKey!);
    const strangerClient = client(publishableKey!);
    const anonymous = client(publishableKey!);
    const password = `P2!${randomBytes(18).toString("base64url")}`;
    const owner = await createTestUser(admin, "owner", password);
    const stranger = await createTestUser(admin, "stranger", password);
    const slug = `phase2-storage-${randomBytes(5).toString("hex")}`;
    let businessId: string | null = null;
    let objectPath: string | null = null;

    t.after(async () => {
      if (objectPath) await admin.storage.from("property-media").remove([objectPath]);
      if (businessId) await admin.from("businesses").delete().eq("id", businessId);
      await admin.auth.admin.deleteUser(owner.id);
      await admin.auth.admin.deleteUser(stranger.id);
    });

    assert.ifError(
      (await ownerClient.auth.signInWithPassword({ email: owner.email, password })).error,
    );
    assert.ifError(
      (await strangerClient.auth.signInWithPassword({ email: stranger.email, password })).error,
    );
    const created = await ownerClient.rpc("create_business_with_owner", {
      _slug: slug,
      _legal_name: "Storage Gate LLC",
      _display_name: "Storage Gate",
    });
    assert.ifError(created.error);
    businessId = created.data as string;
    assert.ifError(
      (
        await admin
          .from("businesses")
          .update({
            profile_status: "published",
            verification_status: "verified",
            public_profile_enabled: true,
            published_at: new Date().toISOString(),
          })
          .eq("id", businessId)
      ).error,
    );

    const property = await ownerClient
      .from("properties")
      .insert({
        business_id: businessId,
        slug: `${slug}-property`,
        title: "Private storage draft",
        created_by: owner.id,
      })
      .select("id")
      .single();
    assert.ifError(property.error);
    objectPath = `${businessId}/${property.data!.id}/cover.png`;
    const body = new Blob(["phase-2-image"], { type: "image/png" });

    const ownerUpload = await ownerClient.storage.from("property-media").upload(objectPath, body, {
      contentType: "image/png",
      upsert: false,
    });
    assert.ifError(ownerUpload.error);

    const draftUrl = await anonymous.storage.from("property-media").createSignedUrl(objectPath, 60);
    assert.ok(draftUrl.error, "anonymous users must not sign draft media URLs");

    const crossBusinessPath = `${businessId}/${property.data!.id}/forbidden.png`;
    const forbiddenUpload = await strangerClient.storage
      .from("property-media")
      .upload(crossBusinessPath, body, { contentType: "image/png", upsert: false });
    assert.ok(forbiddenUpload.error, "another user must not upload into the owner's path");

    assert.ifError(
      (
        await admin
          .from("properties")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", property.data!.id)
      ).error,
    );
    const publicUrl = await anonymous.storage
      .from("property-media")
      .createSignedUrl(objectPath, 60);
    assert.ifError(publicUrl.error);
    assert.match(publicUrl.data!.signedUrl, /^https?:\/\//);
  },
);
