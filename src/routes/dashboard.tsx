import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { BusinessProvider } from "@/components/business-provider";
import { useBusinessContext } from "@/hooks/use-business";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): { business?: string } => ({
    ...(typeof search["business"] === "string" ? { business: search["business"] as string } : {}),
  }),
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
  const { session, loading } = useSession();
  const location = useLocation();
  const search = Route.useSearch();

  if (loading) {
    return (
      <div className="container-page py-8">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" search={{ redirect: location.href }} replace />;
  }

  return (
    <BusinessProvider requestedBusinessId={search.business}>
      <AuthenticatedDashboard />
    </BusinessProvider>
  );
}

function AuthenticatedDashboard() {
  const { activeMembership, businesses, isLoading, error } = useBusinessContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  const activeBusinessId = activeMembership?.business_id;

  useEffect(() => {
    if (isLoading) return;
    if (search.business === activeBusinessId) return;

    void navigate({
      search: (previous) => {
        const { business: _business, ...rest } = previous;
        return activeBusinessId ? { ...rest, business: activeBusinessId } : rest;
      },
      replace: true,
    });
  }, [activeBusinessId, isLoading, navigate, search.business]);

  return (
    <div className="container-page py-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 pb-2">
        <nav aria-label="Dashboard" className="flex flex-wrap gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              search={activeBusinessId ? { business: activeBusinessId } : {}}
              activeOptions={{ exact: "exact" in l }}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {businesses.length > 0 ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Active business</span>
            <select
              aria-label="Active business"
              className="h-9 max-w-64 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={activeBusinessId ?? ""}
              onChange={(event) => {
                void navigate({
                  search: (previous) => ({ ...previous, business: event.target.value }),
                });
              }}
            >
              {businesses.map((membership) => (
                <option key={membership.business_id} value={membership.business_id}>
                  {membership.business.display_name} ·{" "}
                  {membership.membership_role.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading businesses…</p> : null}
      {error ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Your business memberships could not be loaded. Personal account features remain available.
        </p>
      ) : null}
      <Outlet />
    </div>
  );
}
