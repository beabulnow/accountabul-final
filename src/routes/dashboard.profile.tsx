import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Profile settings — Accountabul" },
      { name: "description", content: "Manage your Accountabul profile and notification preferences." },
      { property: "og:title", content: "Profile settings — Accountabul" },
      { property: "og:description", content: "Manage your Accountabul profile and notification preferences." },
    ],
  }),
  component: DashboardProfile,
});

function DashboardProfile() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title={"Profile"}
      description={"Personal profile and notification preferences."}
      audience="Member and business"
      phase="Phase 1"
    >
      <ScopeList
        items={[
          "Profile fields with validation",
          "Avatar upload via short-lived storage permissions",
          "Notification preferences",
          "Email and phone kept private by default",
          "Audit trail on sensitive changes",
        ]}
      />
    </PageShell>
  );
}
