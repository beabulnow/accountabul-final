import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Accountabul" },
      { name: "description", content: "Your personalized Accountabul summary and next actions." },
      { property: "og:title", content: "Dashboard — Accountabul" },
      { property: "og:description", content: "Your personalized Accountabul summary and next actions." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title={"Overview"}
      description={"Personalized summary and next actions for members and business users."}
      audience="Member and business"
      phase="Phase 1"
    >
      <ScopeList
        items={[
          "Role-aware summary cards",
          "Onboarding and verification next actions",
          "Recent leads and saved activity",
          "Live event reminders",
          "No privileged data in the client payload",
        ]}
      />
    </PageShell>
  );
}
