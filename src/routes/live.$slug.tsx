import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/live/$slug")({
  head: () => ({
    meta: [
      { title: "Live event — Accountabul" },
      { name: "description", content: "Watch an Accountabul live event with unified chat, reminders, and tipping." },
      { property: "og:title", content: "Live event — Accountabul" },
      { property: "og:description", content: "Watch an Accountabul live event with unified chat, reminders, and tipping." },
    ],
  }),
  component: LiveEventPage,
});

function LiveEventPage() {
  const { slug } = Route.useParams();
  return (
    <PageShell
      eyebrow="Conference room"
      title={"Event room"}
      description={"Event player, unified chat, event details, reminders, and tips."}
      audience="Public and member"
      phase="Phase 3"
    >
      <p className="mb-6 text-sm text-muted-foreground">Route parameter: <code className="rounded bg-secondary px-1.5 py-0.5">{slug}</code></p>
      <ScopeList
        items={[
          "Restream player behind a provider adapter",
          "Unified chat gateway with normalized message shape",
          "Server-enforced roles, rate limits, and moderation",
          "Reminders and presence tracking",
          "Tip action with server-verified payment state",
        ]}
      />
    </PageShell>
  );
}
