import { createContext } from "react";

import type { BusinessCapabilities, BusinessMembership } from "@/lib/business-access";

export type BusinessContextValue = {
  activeMembership: BusinessMembership | null;
  businesses: BusinessMembership[];
  capabilities: BusinessCapabilities;
  isLoading: boolean;
  error: Error | null;
};

export const BusinessContext = createContext<BusinessContextValue | null>(null);
