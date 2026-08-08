import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/businesses/$slug")({
  head: () => ({
    meta: [
      { title: "Business profile — Accountabul" },
      { name: "description", content: "Business profile with properties, services, credentials, and contact." },
      { property: "og:title", content: "Business profile — Accountabul" },
      { property: "og:description", content: "Business profile with properties, services, credentials, and contact." },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { slug } = Route.useParams();
  return (
    <PageShell
      eyebrow="Directory"
      title={"Business profile"}
      description={"Public profile, properties, services, approved credentials, and contact action."}
      audience="Public"
      phase="Phase 1"
    >
      <p className="mb-6 text-sm text-muted-foreground">Route parameter: <code className="rounded bg-secondary px-1.5 py-0.5">{slug}</code></p>
      <ScopeList
        items={[
          "Public profile fields only",
          "Property and service listings for the business",
          "Credentials approved for public display",
          "Follow action for members",
          "Contact action creating a lead",
        ]}
      />
    </PageShell>
  );
}
