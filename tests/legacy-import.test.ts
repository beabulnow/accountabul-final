import assert from "node:assert/strict";
import test from "node:test";

import { buildImportPlan, deterministicTargetId } from "../scripts/legacy-import.mjs";

test("legacy target IDs are deterministic and namespace-scoped", () => {
  const a = deterministicTargetId("legacy-a", "businesses", "42");
  assert.equal(a, deterministicTargetId("legacy-a", "businesses", "42"));
  assert.notEqual(a, deterministicTargetId("legacy-b", "businesses", "42"));
  assert.notEqual(a, deterministicTargetId("legacy-a", "services", "42"));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("dry-run plans valid rows and reports unknown identities and corrupt assets", () => {
  const plan = buildImportPlan({
    sourceSystem: "legacy-crm",
    records: [
      {
        legacyId: "business-1",
        targetTable: "businesses",
        data: { slug: "legacy-one", legal_name: "Legacy One LLC", display_name: "Legacy One" },
      },
      {
        legacyId: "property-1",
        targetTable: "properties",
        data: { business_id: "unresolved", slug: "property-one", title: "Property One" },
        unresolvedIdentities: ["owner@example.com"],
        assets: [{ path: "photo.jpg" }],
      },
      {
        legacyId: "broken-service",
        targetTable: "services",
        data: { slug: "broken", name: "Broken" },
      },
    ],
  });

  assert.deepEqual(plan.counts, {
    input: 3,
    accepted: 2,
    skipped: 1,
    unresolvedIdentities: 1,
    assetIssues: 1,
    priceTotalMinor: 0,
  });
  assert.match(plan.skipped[0].reason, /business_id/);
});

test("imports force review lifecycle fields and reconcile integer money", () => {
  const plan = buildImportPlan({
    sourceSystem: "legacy",
    expectedPriceTotalMinor: 12_500,
    records: [
      {
        legacyId: "service-1",
        targetTable: "services",
        data: {
          business_id: "00000000-0000-4000-8000-000000000001",
          slug: "service-one",
          name: "Service One",
          price_minor: 12_500,
          currency: "USD",
        },
      },
    ],
  });
  assert.equal(plan.moneyReconciles, true);
  assert.equal(plan.accepted[0].data.status, "draft");
  assert.equal(plan.accepted[0].data.published_at, null);
});

test("rejects privileged lifecycle fields and money mismatches", () => {
  const plan = buildImportPlan({
    sourceSystem: "legacy",
    expectedPriceTotalMinor: 1,
    records: [
      {
        legacyId: "business-1",
        targetTable: "businesses",
        data: {
          slug: "one",
          legal_name: "One LLC",
          display_name: "One",
          verification_status: "verified",
        },
      },
    ],
  });
  assert.equal(plan.counts.accepted, 0);
  assert.match(plan.skipped[0].reason, /not importable/);
  assert.equal(plan.moneyReconciles, false);
});

test("duplicate legacy identities are reported instead of guessed", () => {
  const record = {
    legacyId: "business-1",
    targetTable: "businesses",
    data: { slug: "one", legal_name: "One LLC", display_name: "One" },
  };
  const plan = buildImportPlan({ sourceSystem: "legacy", records: [record, record] });
  assert.equal(plan.counts.accepted, 1);
  assert.equal(plan.counts.skipped, 1);
  assert.match(plan.skipped[0].reason, /duplicate/);
});
