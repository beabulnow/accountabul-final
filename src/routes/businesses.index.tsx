import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/businesses")({
  head: () => ({
    meta: [
      { title: "Business directory — Accountabul" },
      { name: "description", content: "Search accountable businesses, services, and verified credentials." },
      { property: "og:title", content: "Business directory — Accountabul" },
      { property: "og:description", content: "Search accountable businesses, services, and verified credentials." },
    ],
  }),
  component: BusinessesPage,
});

function BusinessesPage() {
  return (
    <PageShell
      eyebrow="Directory"
      title={"Business directory"}
      description={"Searchable directory of businesses with published public profiles."}
      audience="Public"
      phase="Phase 1"
    >
      <ScopeList
        items={[
          "Search by name, industry, and service area",
          "Verified badge separate from published state",
          "Only approved public columns exposed",
          "Pagination on indexed read paths",
          "Empty and error states",
        ]}
      />
    </PageShell>
  );
}
