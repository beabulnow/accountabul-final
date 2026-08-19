import type { ReactNode } from "react";

import { BusinessContext } from "@/hooks/business-context";
import { useMyBusinesses } from "@/hooks/use-business";
import { capabilitiesForRole, selectActiveBusiness } from "@/lib/business-access";

export function BusinessProvider({
  requestedBusinessId,
  children,
}: {
  requestedBusinessId?: string | undefined;
  children: ReactNode;
}) {
  const query = useMyBusinesses();
  const businesses = query.data ?? [];
  const activeMembership = selectActiveBusiness(businesses, requestedBusinessId);

  return (
    <BusinessContext.Provider
      value={{
        activeMembership,
        businesses,
        capabilities: capabilitiesForRole(activeMembership?.membership_role ?? null),
        isLoading: query.isLoading,
        error: query.error,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}
