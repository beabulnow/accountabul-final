import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoles, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatMoney, uniqueSlug } from "@/lib/format";
import { SignedOut } from "./dashboard.profile";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Accountabul" },
      {
        name: "description",
        content: "Review business submissions, credentials, and verification decisions.",
      },
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
          <div
            key={b.id}
            className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
          >
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

      <ListingQueue isAdmin={isAdmin} />
      <EventsAdmin isAdmin={isAdmin} />
      <TipsReconciliation isAdmin={isAdmin} />
      <OperationsLog isAdmin={isAdmin} />
    </PageShell>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card mt-8 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ListingQueue({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();

  const listings = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, status, address_city, business_id, businesses(display_name)")
        .in("status", ["pending_review", "published"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase
        .from("properties")
        .update(
          approve
            ? { status: "published" as const, published_at: new Date().toISOString() }
            : { status: "rejected" as const },
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing decision recorded.");
      void queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard
      title="Listing review"
      description="Listings submitted by businesses. Only published listings appear in the marketplace."
    >
      <ul className="space-y-3">
        {listings.data?.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nothing waiting for review.</li>
        ) : null}
        {listings.data?.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
          >
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {p.businesses?.display_name ?? "Unknown business"} · {p.address_city ?? "No city"} ·{" "}
                {p.status}
              </p>
            </div>
            {isAdmin ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: p.id, approve: true })}
                >
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: p.id, approve: false })}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Read-only</span>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function EventsAdmin({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    title: "",
    scheduled_start_at: "",
    embed_url: "",
    description: "",
  });

  const events = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, slug, title, status, scheduled_start_at")
        .order("scheduled_start_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!draft.title.trim()) throw new Error("A title is required.");
      const { error } = await supabase.from("events").insert({
        slug: uniqueSlug(draft.title),
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        scheduled_start_at: draft.scheduled_start_at
          ? new Date(draft.scheduled_start_at).toISOString()
          : null,
        embed_url: draft.embed_url.trim() || null,
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft({ title: "", scheduled_start_at: "", embed_url: "", description: "" });
      toast.success("Event scheduled.");
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "scheduled" | "live" | "ended" | "replay_available" | "canceled";
    }) => {
      const patch: { status: typeof status; actual_start_at?: string; ended_at?: string } = {
        status,
      };
      if (status === "live") patch.actual_start_at = new Date().toISOString();
      if (status === "ended") patch.ended_at = new Date().toISOString();
      const { error } = await supabase.from("events").update(patch).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard
      title="Conference rooms"
      description="Schedule rooms, flip them live, and publish replays."
    >
      {isAdmin ? (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createEvent.mutate();
          }}
        >
          <Input
            placeholder="Room title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            aria-label="Room title"
          />
          <Input
            type="datetime-local"
            value={draft.scheduled_start_at}
            onChange={(e) => setDraft({ ...draft, scheduled_start_at: e.target.value })}
            aria-label="Scheduled start"
          />
          <Input
            placeholder="Player embed URL"
            value={draft.embed_url}
            onChange={(e) => setDraft({ ...draft, embed_url: e.target.value })}
            aria-label="Embed URL"
          />
          <Input
            placeholder="Short description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            aria-label="Description"
          />
          <div>
            <Button type="submit" disabled={createEvent.isPending}>
              Schedule room
            </Button>
          </div>
        </form>
      ) : null}

      <ul className="mt-5 space-y-3">
        {events.data?.length === 0 ? (
          <li className="text-sm text-muted-foreground">No rooms yet.</li>
        ) : null}
        {events.data?.map((ev) => (
          <li
            key={ev.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
          >
            <div>
              <p className="font-medium">{ev.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(ev.scheduled_start_at)} · {ev.status.replace("_", " ")}
              </p>
            </div>
            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                {(["scheduled", "live", "ended", "replay_available", "canceled"] as const).map(
                  (s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={ev.status === s ? "secondary" : "ghost"}
                      onClick={() => setStatus.mutate({ id: ev.id, status: s })}
                    >
                      {s.replace("_", " ")}
                    </Button>
                  ),
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function TipsReconciliation({ isAdmin }: { isAdmin: boolean }) {
  const tips = useQuery({
    queryKey: ["admin-tips"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tips")
        .select(
          "id, amount_minor, currency, status, provider, provider_record_id, created_at, paid_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!isAdmin) return null;

  const paid = (tips.data ?? []).filter((t) => t.status === "paid");
  const total = paid.reduce((sum, t) => sum + Number(t.amount_minor), 0);

  return (
    <SectionCard
      title="Tip reconciliation"
      description="Provider-confirmed tips only. Client redirects never change tip status."
    >
      <p className="text-sm">
        Paid tips: <strong>{paid.length}</strong> · Total confirmed:{" "}
        <strong>{formatMoney(total)}</strong>
      </p>
      <ul className="mt-4 space-y-2">
        {tips.data?.length === 0 ? (
          <li className="text-sm text-muted-foreground">No tips recorded yet.</li>
        ) : null}
        {tips.data?.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
          >
            <span>{formatMoney(Number(t.amount_minor), t.currency)}</span>
            <span className="text-xs text-muted-foreground">
              {t.status} · {t.provider ?? "no provider"} · {formatDateTime(t.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function OperationsLog({ isAdmin }: { isAdmin: boolean }) {
  const audit = useQuery({
    queryKey: ["admin-audit"],
    enabled: isAdmin,
    queryFn: async () => {
      const [log, batches] = await Promise.all([
        supabase
          .from("audit_log")
          .select("id, action, target_table, created_at")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("migration_batches")
          .select("id, source_system, status, dry_run, started_at, finished_at")
          .order("started_at", { ascending: false })
          .limit(10),
      ]);
      if (log.error) throw log.error;
      if (batches.error) throw batches.error;
      return { log: log.data ?? [], batches: batches.data ?? [] };
    },
  });

  if (!isAdmin) return null;

  return (
    <SectionCard
      title="Operations"
      description="Audit history and migration batches. Imports are idempotent and always dry-run first."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent audit entries
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {audit.data?.log.length === 0 ? (
              <li className="text-muted-foreground">No audit entries yet.</li>
            ) : null}
            {audit.data?.log.map((row) => (
              <li key={row.id} className="rounded-md border border-border p-3">
                <span className="font-medium">{row.action}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {row.target_table ?? "—"} · {formatDateTime(row.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Migration batches
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {audit.data?.batches.length === 0 ? (
              <li className="text-muted-foreground">No import batches recorded.</li>
            ) : null}
            {audit.data?.batches.map((b) => (
              <li key={b.id} className="rounded-md border border-border p-3">
                <span className="font-medium">{b.source_system}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {b.status} · {b.dry_run ? "dry run" : "applied"} · {formatDateTime(b.started_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
