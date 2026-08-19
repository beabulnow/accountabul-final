import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBusinessInvitations } from "@/hooks/use-business";
import { supabase } from "@/integrations/supabase/client";

export function BusinessInvitations() {
  const invitations = useBusinessInvitations();
  const queryClient = useQueryClient();
  const respond = useMutation({
    mutationFn: async ({ membershipId, accept }: { membershipId: string; accept: boolean }) => {
      const { error } = await supabase.rpc("respond_to_business_invitation", {
        _membership_id: membershipId,
        _accept: accept,
      });
      if (error) throw error;
      return accept;
    },
    onSuccess: (accepted) => {
      toast.success(accepted ? "Business invitation accepted." : "Business invitation declined.");
      void queryClient.invalidateQueries({ queryKey: ["business-invitations"] });
      void queryClient.invalidateQueries({ queryKey: ["my-business-memberships"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (invitations.error) {
    return (
      <p role="alert" className="mb-4 text-sm text-destructive">
        Pending business invitations could not be loaded.
      </p>
    );
  }
  if (!invitations.data?.length) return null;

  return (
    <section className="surface-card mb-6 p-5" aria-labelledby="business-invitations-heading">
      <h2 id="business-invitations-heading" className="font-display text-base font-semibold">
        Business invitations
      </h2>
      <ul className="mt-3 space-y-3">
        {invitations.data.map((invitation) => (
          <li
            key={invitation.membership_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <p className="text-sm">
              <strong>{invitation.business_name}</strong>
              <span className="text-muted-foreground">
                {" "}
                invited you as {invitation.membership_role.replace("_", " ")}.
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  respond.mutate({ membershipId: invitation.membership_id, accept: true })
                }
                disabled={respond.isPending}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  respond.mutate({ membershipId: invitation.membership_id, accept: false })
                }
                disabled={respond.isPending}
              >
                Decline
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
