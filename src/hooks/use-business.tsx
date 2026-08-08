import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

/** The first active business the signed-in user belongs to, with their membership role. */
export function useMyBusiness() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["my-business-membership", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_members")
        .select("membership_role, business_id, businesses(id, slug, display_name, profile_status)")
        .eq("user_id", userId!)
        .eq("invitation_status", "active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
