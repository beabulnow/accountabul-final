import assert from "node:assert/strict";
import test from "node:test";

import { hasPublicBusinessIdentity } from "../src/lib/public-business.ts";

test("public business rows require stable route and display identity", () => {
  assert.equal(
    hasPublicBusinessIdentity({ id: "business-id", slug: "alpha", display_name: "Alpha" }),
    true,
  );
  assert.equal(
    hasPublicBusinessIdentity({ id: null, slug: "alpha", display_name: "Alpha" }),
    false,
  );
  assert.equal(
    hasPublicBusinessIdentity({ id: "business-id", slug: null, display_name: "Alpha" }),
    false,
  );
  assert.equal(
    hasPublicBusinessIdentity({ id: "business-id", slug: "alpha", display_name: null }),
    false,
  );
});
