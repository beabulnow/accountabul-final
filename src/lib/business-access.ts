export type MembershipRole = "owner" | "manager" | "listing_manager" | "lead_manager" | "viewer";

export type BusinessSummary = {
  id: string;
  slug: string;
  display_name: string;
  profile_status: string;
  verification_status: string;
};

export type BusinessMembership = {
  business_id: string;
  membership_role: MembershipRole;
  permissions: Record<string, unknown>;
  business: BusinessSummary;
};

export type BusinessCapabilities = {
  manageBusiness: boolean;
  manageListings: boolean;
  manageLeads: boolean;
  manageMembers: boolean;
};

const READ_ONLY: BusinessCapabilities = {
  manageBusiness: false,
  manageListings: false,
  manageLeads: false,
  manageMembers: false,
};

/**
 * Mirrors the current database policies. Keep this conservative: RLS is the authority and the UI
 * must never imply that a role can perform a write that PostgreSQL will reject.
 */
export function capabilitiesForRole(role: MembershipRole | null): BusinessCapabilities {
  if (role === "owner") {
    return {
      manageBusiness: true,
      manageListings: true,
      manageLeads: true,
      manageMembers: true,
    };
  }

  if (role === "manager") {
    return {
      manageBusiness: true,
      manageListings: true,
      manageLeads: true,
      manageMembers: false,
    };
  }

  return READ_ONLY;
}

export function sortBusinessMemberships(
  memberships: readonly BusinessMembership[],
): BusinessMembership[] {
  return [...memberships].sort(
    (left, right) =>
      left.business.display_name.localeCompare(right.business.display_name, undefined, {
        sensitivity: "base",
      }) || left.business_id.localeCompare(right.business_id),
  );
}

/** Select only an active membership already authorized by the membership query. */
export function selectActiveBusiness(
  memberships: readonly BusinessMembership[],
  requestedBusinessId: string | undefined,
): BusinessMembership | null {
  if (requestedBusinessId) {
    const requested = memberships.find(
      (membership) => membership.business_id === requestedBusinessId,
    );
    if (requested) return requested;
  }

  return memberships[0] ?? null;
}
