import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Accountabul" },
      { name: "description", content: "Search and filter accountable real-estate listings on Accountabul." },
      { property: "og:title", content: "Marketplace — Accountabul" },
      { property: "og:description", content: "Search and filter accountable real-estate listings on Accountabul." },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <PageShell
      eyebrow="Marketplace"
      title={"Real-estate marketplace"}
      description={"Searchable and filterable listings from published, non-suspended businesses only."}
      audience="Public"
      phase="Phase 2"
    >
      <ScopeList
        items={[
          "Keyword, location, price, and type filters",
          "Server-side pagination and indexed read paths",
          "Published-only visibility enforced in the database",
          "Image fallbacks for missing media",
          "Empty, loading, and error states",
        ]}
      />
    </PageShell>
  );
}
