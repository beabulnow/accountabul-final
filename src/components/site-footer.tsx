import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type FooterLink = { to: NonNullable<ComponentProps<typeof Link>["to"]>; label: string };

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-base font-semibold">Accountabul</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Real-estate marketplace, verified business pages, and a live conference room in one
            accountable platform.
          </p>
        </div>
        <FooterCol
          title="Explore"
          links={[
            { to: "/marketplace", label: "Marketplace" },
            { to: "/businesses", label: "Business directory" },
            { to: "/live", label: "Live events" },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { to: "/signup", label: "Create account" },
            { to: "/login", label: "Log in" },
            { to: "/saved", label: "Saved items" },
          ]}
        />
        <FooterCol
          title="Manage"
          links={[
            { to: "/dashboard/business", label: "Business settings" },
            { to: "/dashboard/leads", label: "Leads" },
            { to: "/admin", label: "Admin" },
          ]}
        />
      </div>
      <div className="border-t border-border py-6">
        <p className="container-page text-xs text-muted-foreground">
          © {new Date().getFullYear()} Accountabul. Accountable property, business, and live
          experiences in one platform.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={String(l.to)}>
            <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
