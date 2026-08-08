import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/properties/$slug")({
  head: () => ({
    meta: [
      { title: "Property — Accountabul" },
      { name: "description", content: "Property detail, gallery, business attribution, and inquiry on Accountabul." },
      { property: "og:title", content: "Property — Accountabul" },
      { property: "og:description", content: "Property detail, gallery, business attribution, and inquiry on Accountabul." },
    ],
  }),
  component: PropertyPage,
});

function PropertyPage() {
  const { slug } = Route.useParams();
  return (
    <PageShell
      eyebrow="Marketplace"
      title={"Property detail"}
      description={"Gallery, attribution, save, share, and inquiry for a single listing."}
      audience="Public"
      phase="Phase 2"
    >
      <p className="mb-6 text-sm text-muted-foreground">Route parameter: <code className="rounded bg-secondary px-1.5 py-0.5">{slug}</code></p>
      <ScopeList
        items={[
          "Media gallery with intentional fallbacks",
          "Business attribution linking to the public business page",
          "Save to a member account",
          "Share with a stable slug and redirect handling",
          "Inquiry form creating a lead record",
        ]}
      />
    </PageShell>
  );
}
