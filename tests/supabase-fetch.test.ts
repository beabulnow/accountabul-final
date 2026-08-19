import assert from "node:assert/strict";
import test from "node:test";

import { createSupabaseFetch } from "../src/integrations/supabase/fetch.ts";

function captureRequest() {
  let capturedHeaders: Headers | undefined;
  const fetchImplementation: typeof fetch = async (_input, init) => {
    capturedHeaders = new Headers(init?.headers);
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };

  return {
    fetchImplementation,
    headers: () => {
      assert.ok(capturedHeaders);
      return capturedHeaders;
    },
  };
}

for (const key of ["sb_publishable_test", "sb_secret_test"]) {
  test(`opaque ${key.split("_")[1]} key is never sent as a bearer token`, async () => {
    const capture = captureRequest();
    const wrappedFetch = createSupabaseFetch(key, capture.fetchImplementation);

    await wrappedFetch("https://example.supabase.co/auth/v1/settings", {
      headers: { Authorization: `Bearer ${key}` },
    });

    assert.equal(capture.headers().get("apikey"), key);
    assert.equal(capture.headers().get("Authorization"), null);
  });
}

test("a signed-in user's JWT is preserved alongside the publishable key", async () => {
  const key = "sb_publishable_test";
  const userJwt = "header.payload.signature";
  const capture = captureRequest();
  const wrappedFetch = createSupabaseFetch(key, capture.fetchImplementation);

  await wrappedFetch("https://example.supabase.co/rest/v1/profiles", {
    headers: { Authorization: `Bearer ${userJwt}` },
  });

  assert.equal(capture.headers().get("apikey"), key);
  assert.equal(capture.headers().get("Authorization"), `Bearer ${userJwt}`);
});

test("a legacy service-role JWT keeps its bearer fallback", async () => {
  const key = "header.service_role.signature";
  const capture = captureRequest();
  const wrappedFetch = createSupabaseFetch(key, capture.fetchImplementation);

  await wrappedFetch("https://example.supabase.co/rest/v1/audit_log", {
    headers: { Authorization: `Bearer ${key}` },
  });

  assert.equal(capture.headers().get("apikey"), key);
  assert.equal(capture.headers().get("Authorization"), `Bearer ${key}`);
});
