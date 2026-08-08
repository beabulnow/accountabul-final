import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/dashboard/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Accountabul" },
      { name: "description", content: "Property and service inquiries for your business." },
      { property: "og:title", content: "Leads — Accountabul" },
      { property: "og:description", content: "Property and service inquiries for your business." },
    ],
  }),
  component: DashboardLeads,
});

function DashboardLeads() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title={"Leads"}
      description={"Property and service inquiries with ownership scoped to your business."}
      audience="Business"
      phase="Phase 2"
    >
      <ScopeList
        items={[
          "Unified lead inbox",
          "Status workflow and assignment",
          "Contact details visible only to permitted members",
          "Response tracking and analytics events",
          "Export with audit logging",
        ]}
      />
    </PageShell>
  );
}
