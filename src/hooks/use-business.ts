import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { BusinessContext } from "@/hooks/business-context";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  sortBusinessMemberships,
  type BusinessMembership,
  type BusinessSummary,
  type MembershipRole,
} from "@/lib/business-access";

export function useMyBusinesses() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["my-business-memberships", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_members")
        .select(
          "membership_role, business_id, permissions, businesses(id, slug, display_name, profile_status, verification_status)",
        )
        .eq("user_id", userId!)
        .eq("invitation_status", "active");
      if (error) throw error;

      const memberships = (data ?? []).flatMap((row) => {
        const business = row.businesses as BusinessSummary | null;
        if (!business) return [];
        return [
          {
            business_id: row.business_id,
            membership_role: row.membership_role as MembershipRole,
            permissions: (row.permissions ?? {}) as Record<string, unknown>,
            business,
          } satisfies BusinessMembership,
        ];
      });

      return sortBusinessMemberships(memberships);
    },
  });
}

export function useBusinessInvitations() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["business-invitations", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_business_invitations");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusinessContext must be used inside BusinessProvider.");
  return context;
}
