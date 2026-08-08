import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/dashboard/properties")({
  head: () => ({
    meta: [
      { title: "Property listings — Accountabul" },
      { name: "description", content: "Manage property drafts, submissions, published listings, and performance." },
      { property: "og:title", content: "Property listings — Accountabul" },
      { property: "og:description", content: "Manage property drafts, submissions, published listings, and performance." },
    ],
  }),
  component: DashboardProperties,
});

function DashboardProperties() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title={"Properties"}
      description={"Drafts, submissions, published listings, and performance."}
      audience="Business"
      phase="Phase 2"
    >
      <ScopeList
        items={[
          "Draft editor with media uploads",
          "Submit for review workflow",
          "Published listing management and archiving",
          "Per-listing performance metrics",
          "Cross-business access blocked by RLS",
        ]}
      />
    </PageShell>
  );
}
