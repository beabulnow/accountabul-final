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
    </PageShell>
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
