import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageShell } from "@/components/page-shell";
import { FallbackImage } from "@/components/fallback-image";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, locationLabel } from "@/lib/format";
import { resolvePropertyMediaUrl } from "@/lib/property-media";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved and followed — Accountabul" },
      { name: "description", content: "Your saved listings and followed businesses." },
      { property: "og:title", content: "Saved and followed — Accountabul" },
      {
        property: "og:description",
        content: "Your saved listings and followed businesses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { session, loading } = useSession();
  const userId = session?.user.id;

  const saved = useQuery({
    queryKey: ["saved-list", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_properties")
        .select(
          "id, created_at, properties(id, slug, title, address_city, address_state, price_minor, currency, cover_path, status)",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (row) => ({
          ...row,
          properties: row.properties
            ? {
                ...row.properties,
                cover_path: await resolvePropertyMediaUrl(row.properties.cover_path),
              }
            : null,
        })),
      );
    },
  });

  const followed = useQuery({
    queryKey: ["followed-businesses", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const follows = await supabase
        .from("business_follows")
        .select("business_id, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (follows.error) throw follows.error;
      if (!follows.data?.length) return [];
      const profiles = await supabase
        .from("public_businesses")
        .select("id, slug, display_name, headline, primary_industry, address_city, address_state")
        .in(
          "id",
          follows.data.map((follow) => follow.business_id),
        );
      if (profiles.error) throw profiles.error;
      const byId = new Map((profiles.data ?? []).map((business) => [business.id, business]));
      return follows.data
        .map((follow) => byId.get(follow.business_id))
        .filter((business): business is NonNullable<typeof business> => Boolean(business));
    },
  });

  return (
    <PageShell
      eyebrow="Your account"
      title="Saved and followed"
      description="Listings and businesses you saved. Only you can see these lists."
      audience="Members"
      phase="Phase 2"
    >
      {loading ? <p className="text-sm text-muted-foreground">Checking your session…</p> : null}
      {!loading && !userId ? (
        <p className="text-sm text-muted-foreground">
          <Link to="/login" search={{}} className="text-accent underline">
            Sign in
          </Link>{" "}
          to see listings and businesses you saved.
        </p>
      ) : null}

      {userId ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-labelledby="saved-listings">
          <h2 id="saved-listings" className="col-span-full text-lg font-semibold">
            Saved listings
          </h2>
          {saved.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {saved.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing saved yet. Browse the{" "}
              <Link to="/marketplace" className="text-accent underline">
                marketplace
              </Link>
              .
            </p>
          ) : null}
          {saved.data?.map((row) =>
            row.properties ? (
              <Link
                key={row.id}
                to="/properties/$slug"
                params={{ slug: row.properties.slug }}
                className="surface-card overflow-hidden transition-colors hover:border-accent"
              >
                <div className="aspect-[4/3] w-full bg-secondary">
                  <FallbackImage
                    src={row.properties.cover_path}
                    alt={row.properties.title}
                    fallback="No photo"
                    className="size-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <h2 className="font-semibold">{row.properties.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {locationLabel([row.properties.address_city, row.properties.address_state]) ||
                      "Location on request"}
                  </p>
                  <p className="mt-2 font-semibold">
                    {formatMoney(row.properties.price_minor, row.properties.currency)}
                  </p>
                  {row.properties.status !== "published" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      This listing is no longer published.
                    </p>
                  ) : null}
                </div>
              </Link>
            ) : null,
          )}
        </div>
      ) : null}

      {userId ? (
        <section className="mt-10" aria-labelledby="followed-businesses">
          <h2 id="followed-businesses" className="text-lg font-semibold">
            Followed businesses
          </h2>
          {followed.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading followed businesses…</p>
          ) : null}
          {followed.data?.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No followed businesses yet. Browse the{" "}
              <Link to="/businesses" className="text-accent underline">
                directory
              </Link>
              .
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {followed.data?.map((business) => (
              <Link
                key={business.id}
                to="/businesses/$slug"
                params={{ slug: business.slug }}
                className="surface-card p-5 transition-colors hover:border-accent"
              >
                <p className="text-xs uppercase tracking-wide text-accent">
                  {business.primary_industry ?? "Business"}
                </p>
                <h3 className="mt-1 font-semibold">{business.display_name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {business.headline ?? "Published Accountabul business"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {[business.address_city, business.address_state].filter(Boolean).join(", ") ||
                    "Location not listed"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
