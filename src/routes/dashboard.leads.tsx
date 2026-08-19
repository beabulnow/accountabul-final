import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBusinessContext } from "@/hooks/use-business";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { SignedOut } from "./dashboard.profile";

export const Route = createFileRoute("/dashboard/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Accountabul dashboard" },
      {
        name: "description",
        content: "Property and service inquiries sent to your business, with status tracking.",
      },
      { property: "og:title", content: "Leads — Accountabul dashboard" },
      {
        property: "og:description",
        content: "Property and service inquiries sent to your business, with status tracking.",
      },
    ],
  }),
  component: LeadsDashboard,
});

type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost" | "spam";
const statuses: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost", "spam"];

function LeadsDashboard() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const { activeMembership, capabilities } = useBusinessContext();
  const businessId = activeMembership?.business_id ?? null;
  const queryClient = useQueryClient();

  const leads = useQuery({
    queryKey: ["leads", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const [propertyLeads, serviceLeads] = await Promise.all([
        supabase
          .from("property_inquiries")
          .select(
            "id, contact_name, contact_email, contact_phone, message, status, created_at, properties(title, slug)",
          )
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("service_inquiries")
          .select(
            "id, contact_name, contact_email, contact_phone, message, status, created_at, services(name)",
          )
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false }),
      ]);
      if (propertyLeads.error) throw propertyLeads.error;
      if (serviceLeads.error) throw serviceLeads.error;
      return [
        ...(propertyLeads.data ?? []).map((l) => ({
          ...l,
          table: "property_inquiries" as const,
          subject: l.properties?.title ?? "Listing",
        })),
        ...(serviceLeads.data ?? []).map((l) => ({
          ...l,
          table: "service_inquiries" as const,
          subject: l.services?.name ?? "Service",
        })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({
      table,
      id,
      status,
    }: {
      table: "property_inquiries" | "service_inquiries";
      id: string;
      status: LeadStatus;
    }) => {
      const { error } =
        table === "property_inquiries"
          ? await supabase.from("property_inquiries").update({ status }).eq("id", id)
          : await supabase.from("service_inquiries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead updated.");
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Checking your session…</p>;
  if (!userId) return <SignedOut />;

  if (!businessId) {
    return (
      <div className="surface-card p-6">
        <h1 className="text-xl font-semibold">Leads need a business</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inquiries arrive once your business has published listings or services.
        </p>
        <Link to="/dashboard/business" className="mt-4 inline-block text-sm text-accent underline">
          Go to business setup
        </Link>
      </div>
    );
  }

  return (
    <section className="surface-card p-6">
      <h1 className="text-lg font-semibold">Leads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every inquiry sent to your business. Only your team and Accountabul admins can read these.
      </p>

      <ul className="mt-5 space-y-3">
        {leads.isLoading ? <li className="text-sm text-muted-foreground">Loading leads…</li> : null}
        {leads.data?.length === 0 ? (
          <li className="text-sm text-muted-foreground">No inquiries yet.</li>
        ) : null}
        {leads.data?.map((lead) => (
          <li key={`${lead.table}-${lead.id}`} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {lead.contact_name} ·{" "}
                  <span className="text-muted-foreground">{lead.subject}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {lead.contact_email}
                  {lead.contact_phone ? ` · ${lead.contact_phone}` : ""} ·{" "}
                  {formatDateTime(lead.created_at)}
                </p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs capitalize">
                {lead.status}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">{lead.message}</p>
            {capabilities.manageLeads ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={lead.status === s ? "secondary" : "ghost"}
                    onClick={() => setStatus.mutate({ table: lead.table, id: lead.id, status: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
