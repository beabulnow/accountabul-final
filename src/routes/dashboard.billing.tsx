import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/dashboard/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Accountabul" },
      { name: "description", content: "Tip receipts, subscription information, and invoices." },
      { property: "og:title", content: "Billing — Accountabul" },
      { property: "og:description", content: "Tip receipts, subscription information, and invoices." },
    ],
  }),
  component: DashboardBilling,
});

function DashboardBilling() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title={"Billing"}
      description={"Tip receipts, subscription information, and invoices if introduced."}
      audience="Eligible roles"
      phase="Phase 4"
    >
      <ScopeList
        items={[
          "Tip receipts reconciled to the provider",
          "Money stored as integer minor units",
          "Refund and failure history",
          "Provider-neutral payment adapter",
          "Never trusting client redirects for paid state",
        ]}
      />
    </PageShell>
  );
}
