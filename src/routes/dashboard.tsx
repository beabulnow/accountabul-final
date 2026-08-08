import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const links = [
  { to: "/dashboard", label: "Overview", exact: true },
  { to: "/dashboard/profile", label: "Profile" },
  { to: "/dashboard/business", label: "Business" },
  { to: "/dashboard/properties", label: "Properties" },
  { to: "/dashboard/services", label: "Services" },
  { to: "/dashboard/leads", label: "Leads" },
  { to: "/dashboard/billing", label: "Billing" },
] as const;

function DashboardLayout() {
  return (
    <div className="container-page py-8">
      <nav aria-label="Dashboard" className="mb-2 flex flex-wrap gap-1 pb-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: "exact" in l }}
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground font-medium" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
