import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved — Accountabul" },
      { name: "description", content: "Your saved properties and followed businesses on Accountabul." },
      { property: "og:title", content: "Saved — Accountabul" },
      { property: "og:description", content: "Your saved properties and followed businesses on Accountabul." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  return (
    <PageShell
      eyebrow="Member"
      title={"Saved"}
      description={"Saved properties and followed businesses for the signed-in member."}
      audience="Member"
      phase="Phase 2"
    >
      <ScopeList
        items={[
          "Saved property list with unsave",
          "Followed business list with unfollow",
          "Row-level security scoped to the owner",
          "Empty state pointing back to the marketplace",
          "Optimistic updates with server reconciliation",
        ]}
      />
    </PageShell>
  );
}
