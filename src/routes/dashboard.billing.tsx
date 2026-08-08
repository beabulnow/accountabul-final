import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatMoney } from "@/lib/format";
import { SignedOut } from "./dashboard.profile";

export const Route = createFileRoute("/dashboard/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Accountabul" },
      {
        name: "description",
        content: "Tip receipts, payment status, and reconciled payout history.",
      },
      { property: "og:title", content: "Billing — Accountabul" },
      {
        property: "og:description",
        content: "Tip receipts, payment status, and reconciled payout history.",
      },
    ],
  }),
  component: DashboardBilling,
});

function DashboardBilling() {
  const { session, loading } = useSession();

  const sent = useQuery({
    queryKey: ["tips-sent", session?.user.id],
    enabled: Boolean(session?.user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tips")
        .select(
          "id, amount_minor, currency, status, message, created_at, paid_at, events(title, slug)",
        )
        .eq("from_user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const received = useQuery({
    queryKey: ["tips-received", session?.user.id],
    enabled: Boolean(session?.user.id),
    queryFn: async () => {
      const { data: membership } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", session!.user.id)
        .eq("invitation_status", "active")
        .limit(1)
        .maybeSingle();
      if (!membership) return [];
      const { data, error } = await supabase
        .from("tips")
        .select("id, amount_minor, currency, status, message, created_at, paid_at")
        .eq("to_business_id", membership.business_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <SignedOut />;

  const paidReceived = (received.data ?? []).filter((t) => t.status === "paid");
  const receivedTotal = paidReceived.reduce((sum, t) => sum + Number(t.amount_minor), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tip status is written only when the payment provider confirms it — redirects never mark a
        tip as paid.
      </p>

      <section className="surface-card mt-6 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tips you sent
        </h2>
        <ul className="mt-4 space-y-2">
          {sent.data?.length === 0 ? (
            <li className="text-sm text-muted-foreground">No tips yet.</li>
          ) : null}
          {sent.data?.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
            >
              <span>
                {formatMoney(Number(t.amount_minor), t.currency)}
                {t.events?.title ? ` · ${t.events.title}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.status} · {formatDateTime(t.paid_at ?? t.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card mt-6 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tips your business received
        </h2>
        <p className="mt-2 text-sm">
          Confirmed total: <strong>{formatMoney(receivedTotal)}</strong> across{" "}
          {paidReceived.length} tips.
        </p>
        <ul className="mt-4 space-y-2">
          {received.data?.length === 0 ? (
            <li className="text-sm text-muted-foreground">No tips received yet.</li>
          ) : null}
          {received.data?.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
            >
              <span>
                {formatMoney(Number(t.amount_minor), t.currency)}
                {t.message ? ` · “${t.message}”` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.status} · {formatDateTime(t.paid_at ?? t.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
