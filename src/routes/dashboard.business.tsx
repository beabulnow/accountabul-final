import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/dashboard/business")({
  head: () => ({
    meta: [
      { title: "Business settings — Accountabul" },
      { name: "description", content: "Manage business identity, staff, public page, and verification." },
      { property: "og:title", content: "Business settings — Accountabul" },
      { property: "og:description", content: "Manage business identity, staff, public page, and verification." },
    ],
  }),
  component: DashboardBusiness,
});

function DashboardBusiness() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title={"Business"}
      description={"Business identity, staff, public page, verification, and settings."}
      audience="Business"
      phase="Phase 1"
    >
      <ScopeList
        items={[
          "Business identity and public page fields",
          "Staff invitations and membership roles",
          "Verification submission and status",
          "Publish gate on minimum profile requirements",
          "Permissions resolved from business_members",
        ]}
      />
    </PageShell>
  );
}
