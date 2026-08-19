import assert from "node:assert/strict";
import test from "node:test";

import { isRemoteImageUrl } from "../src/lib/property-media.ts";

test("property media accepts HTTPS and local development URLs only", () => {
  assert.equal(isRemoteImageUrl("https://cdn.example.com/photo.jpg"), true);
  assert.equal(isRemoteImageUrl("http://localhost:3000/photo.jpg"), true);
  assert.equal(isRemoteImageUrl("http://cdn.example.com/photo.jpg"), false);
  assert.equal(isRemoteImageUrl("javascript:alert(1)"), false);
  assert.equal(isRemoteImageUrl("property/business/photo.jpg"), false);
});
