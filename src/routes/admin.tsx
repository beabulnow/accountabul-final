import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useRoles, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { SignedOut } from "./dashboard.profile";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Accountabul" },
      { name: "description", content: "Review business submissions, credentials, and verification decisions." },
      { property: "og:title", content: "Admin — Accountabul" },
      {
        property: "og:description",
        content: "Review business submissions, credentials, and verification decisions.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session, loading } = useSession();
  const roles = useRoles();
  const queryClient = useQueryClient();

  const isAdmin = (roles.data ?? []).includes("admin");
  const isModerator = isAdmin || (roles.data ?? []).includes("moderator");

  const queue = useQuery({
    queryKey: ["admin-queue"],
    enabled: isModerator,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, slug, display_name, profile_status, verification_status, created_at")
        .in("profile_status", ["pending_review", "published"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase
        .from("businesses")
        .update(
          approve
            ? {
                profile_status: "published" as const,
                verification_status: "verified" as const,
                public_profile_enabled: true,
                published_at: new Date().toISOString(),
              }
            : { profile_status: "rejected" as const, verification_status: "rejected" as const },
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded.");
      void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || roles.isLoading) {
    return (
      <div className="container-page py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container-page py-16">
        <SignedOut />
      </div>
    );
  }

  if (!isModerator) {
    return (
      <PageShell
        eyebrow="Operations"
        title="Admin console"
        description="You do not have permission to view review queues."
        audience="Admin and moderator"
      />
    );
  }

  return (
    <PageShell
      eyebrow="Operations"
      title="Admin console"
      description="Business review queue. Access is resolved from server-side roles, never from client metadata."
      audience="Admin and moderator"
      phase="Phase 1"
    >
      <div className="grid gap-3">
        {(queue.data ?? []).map((b) => (
          <div key={b.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{b.display_name}</p>
              <p className="text-xs text-muted-foreground">
                /{b.slug} · {b.profile_status} · {b.verification_status}
              </p>
            </div>
            {isAdmin ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: b.id, approve: true })}
                >
                  Approve & publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: b.id, approve: false })}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Read-only</span>
            )}
          </div>
        ))}
        {queue.data && queue.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
        ) : null}
      </div>
    </PageShell>
  );
}
