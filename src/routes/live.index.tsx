import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Live events — Accountabul" },
      { name: "description", content: "Join the current Accountabul live conference room, see scheduled events, and watch replays." },
      { property: "og:title", content: "Live events — Accountabul" },
      { property: "og:description", content: "Join the current Accountabul live conference room, see scheduled events, and watch replays." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  return (
    <PageShell
      eyebrow="Conference room"
      title={"Live"}
      description={"The current live room, scheduled events, and replays when available."}
      audience="Public"
      phase="Phase 3"
    >
      <ScopeList
        items={[
          "Current live room card with provider status",
          "Scheduled events with reminders",
          "Replay list when recordings are available",
          "Offline and provider-down states",
          "Restream status via a server-side adapter",
        ]}
      />
    </PageShell>
  );
}
