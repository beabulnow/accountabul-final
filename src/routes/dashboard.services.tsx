import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/dashboard/services")({
  head: () => ({
    meta: [
      { title: "Services — Accountabul" },
      { name: "description", content: "Manage business service listings and availability." },
      { property: "og:title", content: "Services — Accountabul" },
      { property: "og:description", content: "Manage business service listings and availability." },
    ],
  }),
  component: DashboardServices,
});

function DashboardServices() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title={"Services"}
      description={"Service listings and availability."}
      audience="Business"
      phase="Phase 2"
    >
      <ScopeList
        items={[
          "Service create, edit, and archive",
          "Availability and service areas",
          "Public visibility rules",
          "Service inquiry routing",
          "Validation shared between client and server",
        ]}
      />
    </PageShell>
  );
}
