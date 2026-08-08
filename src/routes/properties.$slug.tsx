import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, locationLabel } from "@/lib/format";

export const Route = createFileRoute("/properties/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Listing ${params.slug} — Accountabul` },
      { name: "description", content: "Full listing detail, media, and a direct inquiry path to the listing business." },
      { property: "og:title", content: `Listing ${params.slug} — Accountabul` },
      { property: "og:description", content: "Full listing detail, media, and a direct inquiry path to the listing business." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertyPage,
});

function PropertyPage() {
  const { slug } = Route.useParams();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const property = useQuery({
    queryKey: ["property", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          "id, slug, title, description, property_type, address_line1, address_city, address_state, address_country, price_minor, currency, bedrooms, bathrooms, area_sqft, cover_path, business_id, businesses(display_name, slug, public_email), property_media(id, storage_path, alt_text, sort_order)",
        )
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const p = property.data;

  const saved = useQuery({
    queryKey: ["saved", userId, p?.id],
    enabled: Boolean(userId && p?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_properties")
        .select("id")
        .eq("user_id", userId!)
        .eq("property_id", p!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!userId || !p) throw new Error("Sign in to save listings.");
      if (saved.data) {
        const { error } = await supabase.from("saved_properties").delete().eq("id", saved.data.id);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("saved_properties").insert({ user_id: userId, property_id: p.id });
      if (error) throw error;
      return true;
    },
    onSuccess: (isSaved) => {
      toast.success(isSaved ? "Saved to your list." : "Removed from your saved list.");
      void queryClient.invalidateQueries({ queryKey: ["saved"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (property.isLoading) {
    return <PageShell title="Loading listing" description="Fetching this listing." />;
  }

  if (!p) {
    return (
      <PageShell
        eyebrow="Marketplace"
        title="Listing not available"
        description="This listing is not published, or the address has changed."
      >
        <Link to="/marketplace" className="text-sm text-accent underline">
          Back to the marketplace
        </Link>
      </PageShell>
    );
  }

  const media = [...(p.property_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <PageShell
      eyebrow={p.property_type ?? "Property"}
      title={p.title}
      description={locationLabel([p.address_city, p.address_state, p.address_country]) || "Location shared on request"}
    >
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-secondary">
            {p.cover_path ? (
              <img src={p.cover_path} alt={p.title} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                No photo provided for this listing
              </div>
            )}
          </div>

          {media.length ? (
            <div className="grid grid-cols-3 gap-3">
              {media.map((m) => (
                <img
                  key={m.id}
                  src={m.storage_path}
                  alt={m.alt_text ?? p.title}
                  loading="lazy"
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          ) : null}

          <section className="surface-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
              {p.description ?? "This business has not added a description yet."}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Fact label="Price" value={formatMoney(p.price_minor, p.currency)} />
              <Fact label="Bedrooms" value={p.bedrooms ? String(p.bedrooms) : "—"} />
              <Fact label="Bathrooms" value={p.bathrooms ? String(p.bathrooms) : "—"} />
              <Fact label="Area" value={p.area_sqft ? `${p.area_sqft} sqft` : "—"} />
            </dl>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Listed by</p>
            <p className="mt-1 font-semibold">{p.businesses?.display_name ?? "Accountabul business"}</p>
            {p.businesses?.slug ? (
              <Link to="/businesses/$slug" params={{ slug: p.businesses.slug }} className="mt-1 inline-block text-sm text-accent underline">
                View business profile
              </Link>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full"
              disabled={!userId || toggleSave.isPending}
              onClick={() => toggleSave.mutate()}
            >
              {saved.data ? "Saved — remove" : "Save this listing"}
            </Button>
            {!userId ? (
              <p className="mt-2 text-xs text-muted-foreground">
                <Link to="/login" search={{}} className="text-accent underline">
                  Sign in
                </Link>{" "}
                to save listings and send inquiries.
              </p>
            ) : null}
          </div>

          <InquiryForm propertyId={p.id} businessId={p.business_id} />
        </aside>
      </div>
    </PageShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function InquiryForm({ propertyId, businessId }: { propertyId: string; businessId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [form, setForm] = useState({ contact_name: "", contact_email: "", contact_phone: "", message: "" });
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in to send an inquiry.");
      if (!form.contact_name.trim() || !form.contact_email.trim() || !form.message.trim()) {
        throw new Error("Name, email, and message are required.");
      }
      const { error } = await supabase.from("property_inquiries").insert({
        property_id: propertyId,
        business_id: businessId,
        from_user_id: userId,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim() || null,
        message: form.message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Inquiry sent to the listing business.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (sent) {
    return (
      <div className="surface-card p-6">
        <h2 className="font-semibold">Inquiry sent</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The listing team can see your message in their leads dashboard.
        </p>
      </div>
    );
  }

  return (
    <form
      className="surface-card space-y-3 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <h2 className="font-semibold">Contact the business</h2>
      <div>
        <Label htmlFor="contact_name">Your name</Label>
        <Input id="contact_name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="contact_email">Email</Label>
        <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="contact_phone">Phone (optional)</Label>
        <Input id="contact_phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={!userId || submit.isPending}>
        {submit.isPending ? "Sending…" : "Send inquiry"}
      </Button>
      {!userId ? <p className="text-xs text-muted-foreground">Sign in to send this inquiry.</p> : null}
    </form>
  );
}
