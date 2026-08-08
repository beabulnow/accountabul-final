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

export const Route = createFileRoute("/dashboard/properties")({
  head: () => ({
    meta: [
      { title: "Your listings — Accountabul dashboard" },
      {
        name: "description",
        content: "Create listing drafts, add photos, and submit listings for review.",
      },
      { property: "og:title", content: "Your listings — Accountabul dashboard" },
      {
        property: "og:description",
        content: "Create listing drafts, add photos, and submit listings for review.",
      },
    ],
  }),
  component: PropertiesDashboard,
});

const emptyDraft = {
  title: "",
  property_type: "",
  address_city: "",
  address_state: "",
  price: "",
  bedrooms: "",
  bathrooms: "",
  area_sqft: "",
  cover_path: "",
  description: "",
};

function PropertiesDashboard() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const membership = useMyBusiness();
  const businessId = membership.data?.business_id ?? null;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyDraft);

  const listings = useQuery({
    queryKey: ["dashboard-properties", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, status, price_minor, currency, address_city, created_at")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createListing = useMutation({
    mutationFn: async () => {
      if (!businessId || !userId) throw new Error("Create your business profile first.");
      if (!draft.title.trim()) throw new Error("A listing title is required.");
      const { error } = await supabase.from("properties").insert({
        business_id: businessId,
        created_by: userId,
        slug: uniqueSlug(draft.title),
        title: draft.title.trim(),
        property_type: draft.property_type.trim() || null,
        address_city: draft.address_city.trim() || null,
        address_state: draft.address_state.trim() || null,
        price_minor: parseMoneyToMinor(draft.price),
        bedrooms: draft.bedrooms ? Number(draft.bedrooms) : null,
        bathrooms: draft.bathrooms ? Number(draft.bathrooms) : null,
        area_sqft: draft.area_sqft ? Number(draft.area_sqft) : null,
        cover_path: draft.cover_path.trim() || null,
        description: draft.description.trim() || null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(emptyDraft);
      toast.success("Draft listing created.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-properties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "pending_review" | "archived";
    }) => {
      const { error } = await supabase
        .from("properties")
        .update({ status, archived_at: status === "archived" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing updated.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-properties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Checking your session…</p>;
  if (!userId) return <SignedOut />;

  if (!businessId) {
    return (
      <div className="surface-card p-6">
        <h1 className="text-xl font-semibold">Listings need a business</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your business profile first, then you can publish listings.
        </p>
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
          createListing.mutate();
        }}
      >
        <h1 className="text-lg font-semibold">New listing draft</h1>
        <Field
          id="title"
          label="Title"
          value={draft.title}
          onChange={(v) => setDraft({ ...draft, title: v })}
        />
        <Field
          id="property_type"
          label="Property type"
          value={draft.property_type}
          onChange={(v) => setDraft({ ...draft, property_type: v })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="address_city"
            label="City"
            value={draft.address_city}
            onChange={(v) => setDraft({ ...draft, address_city: v })}
          />
          <Field
            id="address_state"
            label="State"
            value={draft.address_state}
            onChange={(v) => setDraft({ ...draft, address_state: v })}
          />
        </div>
        <Field
          id="price"
          label="Price (USD)"
          value={draft.price}
          onChange={(v) => setDraft({ ...draft, price: v })}
        />
        <div className="grid grid-cols-3 gap-3">
          <Field
            id="bedrooms"
            label="Beds"
            value={draft.bedrooms}
            onChange={(v) => setDraft({ ...draft, bedrooms: v })}
          />
          <Field
            id="bathrooms"
            label="Baths"
            value={draft.bathrooms}
            onChange={(v) => setDraft({ ...draft, bathrooms: v })}
          />
          <Field
            id="area_sqft"
            label="Sqft"
            value={draft.area_sqft}
            onChange={(v) => setDraft({ ...draft, area_sqft: v })}
          />
        </div>
        <Field
          id="cover_path"
          label="Cover image URL"
          value={draft.cover_path}
          onChange={(v) => setDraft({ ...draft, cover_path: v })}
        />
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={createListing.isPending}>
          {createListing.isPending ? "Saving…" : "Create draft"}
        </Button>
      </form>

      <section className="surface-card p-6">
        <h2 className="text-lg font-semibold">Your listings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drafts stay private. Submitting sends the listing to the Accountabul review queue.
        </p>
        <ul className="mt-4 space-y-3">
          {listings.isLoading ? <li className="text-sm text-muted-foreground">Loading…</li> : null}
          {listings.data?.length === 0 ? (
            <li className="text-sm text-muted-foreground">No listings yet.</li>
          ) : null}
          {listings.data?.map((l) => (
            <li key={l.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(l.price_minor, l.currency)} · {l.address_city ?? "No city"} ·{" "}
                    {l.status.replace("_", " ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {l.status === "draft" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setStatus.mutate({ id: l.id, status: "pending_review" })}
                    >
                      Submit for review
                    </Button>
                  ) : null}
                  {l.status === "published" ? (
                    <Link
                      to="/properties/$slug"
                      params={{ slug: l.slug }}
                      className="text-sm text-accent underline"
                    >
                      View live
                    </Link>
                  ) : null}
                  {l.status !== "archived" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus.mutate({ id: l.id, status: "archived" })}
                    >
                      Archive
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus.mutate({ id: l.id, status: "draft" })}
                    >
                      Restore draft
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
