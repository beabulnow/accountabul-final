import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { PageShell } from "@/components/page-shell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/businesses/")({
  head: () => ({
    meta: [
      { title: "Business directory — Accountabul" },
      { name: "description", content: "Search accountable businesses, services, and verified credentials." },
      { property: "og:title", content: "Business directory — Accountabul" },
      {
        property: "og:description",
        content: "Search accountable businesses, services, and verified credentials.",
      },
    ],
  }),
  component: BusinessesPage,
});

function BusinessesPage() {
  const [term, setTerm] = useState("");

  const listings = useQuery({
    queryKey: ["directory", term],
    queryFn: async () => {
      let query = supabase
        .from("businesses")
        .select(
          "id, slug, display_name, headline, primary_industry, address_city, address_state, verification_status",
        )
        .eq("profile_status", "published")
        .eq("public_profile_enabled", true)
        .order("published_at", { ascending: false })
        .limit(50);

      if (term.trim()) {
        const like = `%${term.trim()}%`;
        query = query.or(
          `display_name.ilike.${like},primary_industry.ilike.${like},address_city.ilike.${like}`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell
      eyebrow="Directory"
      title="Business directory"
      description="Businesses with published public profiles. Verified status is separate from published status."
      audience="Public"
      phase="Phase 1"
    >
      <div className="max-w-md">
        <Input
          placeholder="Search by name, industry, or city"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Search businesses"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {listings.error ? (
          <p className="text-sm text-destructive">The directory could not be loaded.</p>
        ) : null}
        {(listings.data ?? []).map((b) => (
          <Link
            key={b.id}
            to="/businesses/$slug"
            params={{ slug: b.slug }}
            className="surface-card block p-5 transition-colors hover:border-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-base font-semibold">{b.display_name}</h2>
              {b.verification_status === "verified" ? (
                <span className="rounded-full bg-accent/15 px-2 py-1 text-[11px] font-semibold text-accent">
                  Verified
                </span>
              ) : null}
            </div>
            {b.headline ? <p className="mt-2 text-sm text-muted-foreground">{b.headline}</p> : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {[b.primary_industry, b.address_city, b.address_state].filter(Boolean).join(" · ")}
            </p>
          </Link>
        ))}
        {listings.data && listings.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published businesses match that search yet.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
