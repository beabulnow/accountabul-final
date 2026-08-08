import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Live events — Accountabul" },
      {
        name: "description",
        content:
          "Join the current Accountabul live conference room, see scheduled events, and watch replays.",
      },
      { property: "og:title", content: "Live events — Accountabul" },
      {
        property: "og:description",
        content:
          "Join the current Accountabul live conference room, see scheduled events, and watch replays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { tip?: "success" | "canceled"; tip_id?: string } => ({
    ...(search["tip"] === "success" || search["tip"] === "canceled" ? { tip: search["tip"] } : {}),
    ...(typeof search["tip_id"] === "string" && UUID_PATTERN.test(search["tip_id"])
      ? { tip_id: search["tip_id"] }
      : {}),
  }),
  component: LivePage,
});

function LivePage() {
  const search = Route.useSearch();
  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, slug, title, description, status, scheduled_start_at, ended_at, cover_path")
        .neq("status", "canceled")
        .order("scheduled_start_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const all = events.data ?? [];
  const liveNow = all.filter((e) => e.status === "live");
  const scheduled = all.filter((e) => e.status === "scheduled");
  const replays = all.filter((e) => e.status === "replay_available" || e.status === "ended");

  return (
    <PageShell
      eyebrow="Conference room"
      title="Live"
      description="The current live room, scheduled events, and replays when recordings are available."
      audience="Public"
      phase="Phase 3"
    >
      {search.tip ? (
        <div className="surface-card mb-8 border-accent/40 p-5" role="status" aria-live="polite">
          <h2 className="font-semibold">
            {search.tip === "success" ? "Payment submitted" : "Tip checkout canceled"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {search.tip === "success"
              ? "Your payment provider is confirming the result. A browser redirect never marks a tip paid."
              : "Checkout ended without changing the tip to paid. You can return to a live room and try again."}
          </p>
          {search.tip === "success" ? (
            <Link
              to="/dashboard/billing"
              className="mt-3 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Check receipt status
            </Link>
          ) : null}
          {search.tip_id ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Reference: <span className="font-mono">{search.tip_id}</span>
            </p>
          ) : null}
        </div>
      ) : null}
      {events.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          Loading the schedule…
        </p>
      ) : null}
      {events.isError ? (
        <div className="surface-card p-6" role="alert">
          <h2 className="font-semibold">The event schedule could not be loaded</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection, then try the schedule again.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => void events.refetch()}
          >
            Try again
          </button>
        </div>
      ) : null}
      {!events.isLoading && !events.isError && all.length === 0 ? (
        <div className="surface-card p-6">
          <h2 className="font-semibold">No events scheduled yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When a room is scheduled it appears here with a reminder option, and switches to the
            live player automatically.
          </p>
        </div>
      ) : null}

      {!events.isError ? (
        <>
          <Section title="Live now" empty="No room is live right now." events={liveNow} />
          <Section title="Scheduled" empty="Nothing on the calendar yet." events={scheduled} />
          <Section title="Replays" empty="No replays published yet." events={replays} />
        </>
      ) : null}
    </PageShell>
  );
}

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_start_at: string | null;
  cover_path: string | null;
};

function Section({ title, empty, events }: { title: string; empty: string; events: EventRow[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link
              key={e.id}
              to="/live/$slug"
              params={{ slug: e.slug }}
              className="surface-card p-5 transition-colors hover:border-accent"
            >
              <span className="text-xs uppercase tracking-wide text-accent">
                {e.status.replace("_", " ")}
              </span>
              <h3 className="mt-1 font-semibold">{e.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(e.scheduled_start_at)}
              </p>
              {e.description ? (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{e.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
