import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Accountabul" },
      { name: "description", content: "Review queues, live operations, moderation, reporting, and audit access." },
      { property: "og:title", content: "Admin — Accountabul" },
      { property: "og:description", content: "Review queues, live operations, moderation, reporting, and audit access." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <PageShell
      eyebrow="Operations"
      title={"Admin console"}
      description={"Review queues, live operations, moderation, reporting, and audit access."}
      audience="Admin and moderator"
      phase="Phase 1 onward"
    >
      <ScopeList
        items={[
          "Business and listing review queues",
          "Live room moderation tools",
          "Event management",
          "Immutable audit trail inspection",
          "Server-side role checks on every action",
        ]}
      />
    </PageShell>
  );
}
