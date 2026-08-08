import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyBusiness } from "@/hooks/use-business";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, parseMoneyToMinor, uniqueSlug } from "@/lib/format";
import { SignedOut } from "./dashboard.profile";

export const Route = createFileRoute("/dashboard/services")({
  head: () => ({
    meta: [
      { title: "Your services — Accountabul dashboard" },
      { name: "description", content: "Publish the services your business offers and manage their availability." },
      { property: "og:title", content: "Your services — Accountabul dashboard" },
      { property: "og:description", content: "Publish the services your business offers and manage their availability." },
    ],
  }),
  component: ServicesDashboard,
});

const emptyDraft = { name: "", category: "", price: "", price_note: "", summary: "", description: "", service_areas: "" };

function ServicesDashboard() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const membership = useMyBusiness();
  const businessId = membership.data?.business_id ?? null;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyDraft);

  const services = useQuery({
    queryKey: ["dashboard-services", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, status, price_minor, currency, price_note, created_at")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createService = useMutation({
    mutationFn: async () => {
      if (!businessId || !userId) throw new Error("Create your business profile first.");
      if (!draft.name.trim()) throw new Error("A service name is required.");
      const { error } = await supabase.from("services").insert({
        business_id: businessId,
        created_by: userId,
        slug: uniqueSlug(draft.name),
        name: draft.name.trim(),
        category: draft.category.trim() || null,
        price_minor: parseMoneyToMinor(draft.price),
        price_note: draft.price_note.trim() || null,
        summary: draft.summary.trim() || null,
        description: draft.description.trim() || null,
        service_areas: draft.service_areas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(emptyDraft);
      toast.success("Service draft created.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" | "archived" }) => {
      const { error } = await supabase
        .from("services")
        .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service updated.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Checking your session…</p>;
  if (!userId) return <SignedOut />;

  if (!businessId) {
    return (
      <div className="surface-card p-6">
        <h1 className="text-xl font-semibold">Services need a business</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create your business profile first.</p>
        <Link to="/dashboard/business" className="mt-4 inline-block text-sm text-accent underline">
          Go to business setup
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form
        className="surface-card space-y-3 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          createService.mutate();
        }}
      >
        <h1 className="text-lg font-semibold">New service</h1>
        <div>
          <Label htmlFor="name">Service name</Label>
          <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input id="category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="price">Price (USD)</Label>
            <Input id="price" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="price_note">Price note</Label>
            <Input id="price_note" value={draft.price_note} onChange={(e) => setDraft({ ...draft, price_note: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="summary">Summary</Label>
          <Input id="summary" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="service_areas">Service areas (comma separated)</Label>
          <Input id="service_areas" value={draft.service_areas} onChange={(e) => setDraft({ ...draft, service_areas: e.target.value })} />
        </div>
        <Button type="submit" disabled={createService.isPending}>
          {createService.isPending ? "Saving…" : "Create service"}
        </Button>
      </form>

      <section className="surface-card p-6">
        <h2 className="text-lg font-semibold">Your services</h2>
        <ul className="mt-4 space-y-3">
          {services.isLoading ? <li className="text-sm text-muted-foreground">Loading…</li> : null}
          {services.data?.length === 0 ? <li className="text-sm text-muted-foreground">No services yet.</li> : null}
          {services.data?.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-4">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.category ?? "Uncategorised"} · {s.price_note ?? formatMoney(s.price_minor, s.currency)} · {s.status}
                </p>
              </div>
              <div className="flex gap-2">
                {s.status !== "published" ? (
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: s.id, status: "published" })}>
                    Publish
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: s.id, status: "draft" })}>
                    Unpublish
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: s.id, status: "archived" })}>
                  Archive
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
