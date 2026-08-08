import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/businesses/$slug")({
  head: () => ({
    meta: [
      { title: "Business profile — Accountabul" },
      {
        name: "description",
        content: "Business profile with services, approved credentials, and contact details.",
      },
      { property: "og:title", content: "Business profile — Accountabul" },
      {
        property: "og:description",
        content: "Business profile with services, approved credentials, and contact details.",
      },
    ],
  }),
  component: BusinessDetailPage,
});

function BusinessDetailPage() {
  const { slug } = Route.useParams();

  const business = useQuery({
    queryKey: ["business", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, slug, display_name, headline, description, website_url, public_email, public_phone, primary_industry, address_city, address_state, address_country, verification_status, year_founded, service_areas",
        )
        .eq("slug", slug)
        .eq("profile_status", "published")
        .eq("public_profile_enabled", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (business.isLoading) {
    return (
      <div className="container-page py-16">
        <p className="text-sm text-muted-foreground">Loading business…</p>
      </div>
    );
  }

  if (!business.data) {
    return (
      <PageShell
        eyebrow="Directory"
        title="Business not available"
        description="This business profile is not published, or the link is no longer valid."
        audience="Public"
      >
        <Link to="/businesses" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
          Back to the directory
        </Link>
      </PageShell>
    );
  }

  const b = business.data;

  return (
    <PageShell
      eyebrow={b.primary_industry ?? "Business"}
      title={b.display_name}
      description={b.headline ?? "Published business profile on Accountabul."}
      audience="Public"
      {...(b.verification_status === "verified" ? { phase: "Verified business" } : {})}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface-card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
            {b.description ?? "This business has not added a description yet."}
          </p>
          {b.service_areas?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {b.service_areas.map((area) => (
                <span key={area} className="rounded-full border border-border px-3 py-1 text-xs">
                  {area}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="surface-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contact</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <Row label="Location" value={[b.address_city, b.address_state, b.address_country].filter(Boolean).join(", ")} />
            <Row label="Founded" value={b.year_founded ? String(b.year_founded) : ""} />
            <Row label="Email" value={b.public_email ?? ""} />
            <Row label="Phone" value={b.public_phone ?? ""} />
            <Row label="Website" value={b.website_url ?? ""} />
          </dl>
        </aside>
      </div>

      <BusinessServices businessId={b.id} />
      <BusinessListings businessId={b.id} />
    </PageShell>
  );
}

function BusinessServices({ businessId }: { businessId: string }) {
  const [activeService, setActiveService] = useState<string | null>(null);

  const services = useQuery({
    queryKey: ["business-services", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, summary, category, price_minor, currency, price_note, service_areas")
        .eq("business_id", businessId)
        .eq("status", "published")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!services.data?.length) return null;

  return (
    <section className="surface-card mt-8 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Services</h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {services.data.map((s) => (
          <li key={s.id} className="rounded-lg border border-border p-4">
            <p className="font-medium">{s.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.category ?? "General service"}</p>
            {s.summary ? <p className="mt-2 text-sm leading-relaxed">{s.summary}</p> : null}
            <p className="mt-3 text-sm font-medium">
              {s.price_minor != null ? formatMoney(Number(s.price_minor), s.currency) : (s.price_note ?? "Quote on request")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setActiveService(activeService === s.id ? null : s.id)}
            >
              {activeService === s.id ? "Close" : "Request this service"}
            </Button>
            {activeService === s.id ? <ServiceInquiryForm businessId={businessId} serviceId={s.id} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ServiceInquiryForm({ businessId, serviceId }: { businessId: string; serviceId: string }) {
  const { session } = useSession();
  const [form, setForm] = useState({ contact_name: "", contact_email: "", contact_phone: "", message: "" });

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.contact_name.trim() || !form.contact_email.trim() || !form.message.trim()) {
        throw new Error("Name, email, and message are required.");
      }
      const { error } = await supabase.from("service_inquiries").insert({
        business_id: businessId,
        service_id: serviceId,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim() || null,
        message: form.message.trim(),
        from_user_id: session?.user.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ contact_name: "", contact_email: "", contact_phone: "", message: "" });
      toast.success("Request sent to the business.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="mt-4 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <Input placeholder="Your name" aria-label="Your name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
      <Input type="email" placeholder="Email" aria-label="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
      <Input placeholder="Phone (optional)" aria-label="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
      <Textarea placeholder="What do you need?" aria-label="Message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <Button type="submit" size="sm" disabled={submit.isPending}>
        Send request
      </Button>
    </form>
  );
}

function BusinessListings({ businessId }: { businessId: string }) {
  const listings = useQuery({
    queryKey: ["business-listings", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, address_city, address_state, price_minor, currency")
        .eq("business_id", businessId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!listings.data?.length) return null;

  return (
    <section className="surface-card mt-8 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Listings</h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {listings.data.map((p) => (
          <li key={p.id} className="rounded-lg border border-border p-4">
            <Link to="/properties/$slug" params={{ slug: p.slug }} className="font-medium underline-offset-4 hover:underline">
              {p.title}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {[p.address_city, p.address_state].filter(Boolean).join(", ") || "Location on request"}
            </p>
            <p className="mt-2 text-sm font-medium">
              {p.price_minor != null ? formatMoney(Number(p.price_minor), p.currency) : "Price on request"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}


function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
