import assert from "node:assert/strict";
import test from "node:test";

import {
  capabilitiesForRole,
  selectActiveBusiness,
  sortBusinessMemberships,
  type BusinessMembership,
  type MembershipRole,
} from "../src/lib/business-access.ts";

function membership(
  businessId: string,
  displayName: string,
  membershipRole: MembershipRole = "viewer",
): BusinessMembership {
  return {
    business_id: businessId,
    membership_role: membershipRole,
    permissions: {},
    business: {
      id: businessId,
      slug: displayName.toLowerCase().replaceAll(" ", "-"),
      display_name: displayName,
      profile_status: "draft",
      verification_status: "unverified",
    },
  };
}

test("business memberships sort deterministically by display name and ID", () => {
  const sorted = sortBusinessMemberships([
    membership("b-2", "Zulu"),
    membership("b-3", "alpha"),
    membership("b-1", "Alpha"),
  ]);

  assert.deepEqual(
    sorted.map((entry) => entry.business_id),
    ["b-1", "b-3", "b-2"],
  );
});

test("requested active business is selected only when it belongs to the user", () => {
  const businesses = [membership("allowed-1", "Alpha"), membership("allowed-2", "Beta")];

  assert.equal(selectActiveBusiness(businesses, "allowed-2")?.business_id, "allowed-2");
  assert.equal(selectActiveBusiness(businesses, "not-authorized")?.business_id, "allowed-1");
  assert.equal(selectActiveBusiness([], "not-authorized"), null);
});

test("UI capabilities mirror current business RLS roles", () => {
  assert.deepEqual(capabilitiesForRole("owner"), {
    manageBusiness: true,
    manageListings: true,
    manageLeads: true,
    manageMembers: true,
  });
  assert.deepEqual(capabilitiesForRole("manager"), {
    manageBusiness: true,
    manageListings: true,
    manageLeads: true,
    manageMembers: false,
  });

  for (const role of ["listing_manager", "lead_manager", "viewer", null] as const) {
    assert.deepEqual(capabilitiesForRole(role), {
      manageBusiness: false,
      manageListings: false,
      manageLeads: false,
      manageMembers: false,
    });
  }
});
