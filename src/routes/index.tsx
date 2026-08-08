import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accountabul — Accountable Real Estate, Business & Live" },
      {
        name: "description",
        content:
          "Browse verified property listings, follow accountable businesses, and join live conference rooms on the Accountabul platform.",
      },
      { property: "og:title", content: "Accountabul — Accountable Real Estate, Business & Live" },
      {
        property: "og:description",
        content:
          "Verified listings, accountable business pages, and live conference rooms in one platform.",
      },
    ],
  }),
  component: Home,
});

const pillars = [
  {
    title: "Marketplace",
    body: "Searchable, filterable real-estate listings attributed to accountable businesses.",
    to: "/marketplace",
  },
  {
    title: "Business pages",
    body: "Public profiles with staff, services, and credentials approved for display.",
    to: "/businesses",
  },
  {
    title: "Conference room",
    body: "Scheduled, live, and replay events with unified chat, moderation, and tipping.",
    to: "/live",
  },
] as const;

function Home() {
  return (
    <>
      <section className="hero-ink">
        <div className="container-page grid gap-10 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
              <span aria-hidden className="size-2 rounded-full bg-live" />
              Phase 0 foundation
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">
              Accountability you can verify — property, business, and live.
            </h1>
            <p className="mt-5 max-w-xl text-base opacity-85 md:text-lg">
              Accountabul brings a real-estate marketplace, verified business identity, and a live
              conference room onto one production platform with server-enforced trust boundaries.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground"
              >
                Create an account
              </Link>
              <Link
                to="/marketplace"
                className="rounded-md border border-white/25 px-5 py-3 text-sm font-semibold"
              >
                Browse marketplace
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Build status
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Route map established for all 18 MVP routes",
                "Design tokens preserved from the approved concept",
                "Architecture, schema, RLS, migration and roadmap docs committed",
                "No backend connected yet — no destructive migrations run",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />
                  <span className="opacity-90">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-2xl font-bold md:text-3xl">Three surfaces, one accountable record</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <Link key={p.to} to={p.to} className="surface-card block p-6 transition-shadow hover:shadow-lift">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-accent">Open →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
