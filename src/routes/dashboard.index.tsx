import { createFileRoute, Link } from "@tanstack/react-router";

import { useBusinessContext } from "@/hooks/use-business";
import { useProfile, useRoles } from "@/hooks/use-session";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Accountabul" },
      { name: "description", content: "Your personalized Accountabul summary and next actions." },
      { property: "og:title", content: "Dashboard — Accountabul" },
      {
        property: "og:description",
        content: "Your personalized Accountabul summary and next actions.",
      },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const profile = useProfile();
  const roles = useRoles();
  const { activeMembership } = useBusinessContext();
  const b = activeMembership?.business ?? null;
  const businessId = activeMembership?.business_id;

  return (
    <div>
      <h1 className="text-2xl font-bold">
        Welcome{profile.data?.display_name ? `, ${profile.data.display_name}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Roles: {(roles.data ?? []).join(", ") || "member"}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Profile"
          body={
            profile.data?.onboarding_status === "new"
              ? "Add your name and contact details."
              : "Your profile details are up to date."
          }
          to="/dashboard/profile"
          cta="Edit profile"
          businessId={businessId}
        />
        <Card
          title="Business"
          body={
            b
              ? `${b.display_name} · ${b.profile_status} · ${b.verification_status}`
              : "Create a business profile to appear in the directory."
          }
          to="/dashboard/business"
          cta={b ? "Manage business" : "Create business"}
          businessId={businessId}
        />
        <Card
          title="Listings"
          body="Publish and update the properties your business represents."
          to="/dashboard/properties"
          cta="Manage listings"
          businessId={businessId}
        />
        <Card
          title="Leads"
          body="Track inbound property and service inquiries."
          to="/dashboard/leads"
          cta="Open leads"
          businessId={businessId}
        />
        <Card
          title="Billing"
          body="Review tips sent and confirmed tips your business received."
          to="/dashboard/billing"
          cta="View billing"
          businessId={businessId}
        />
        <Card
          title="Directory"
          body="See how published businesses appear to the public."
          to="/businesses"
          cta="Open directory"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  body,
  to,
  cta,
  businessId,
}: {
  title: string;
  body: string;
  to: string;
  cta: string;
  businessId?: string | undefined;
}) {
  return (
    <section className="surface-card p-5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to={to}
        search={(previous) => {
          const { business: _business, ...rest } = previous;
          return businessId ? { ...rest, business: businessId } : rest;
        }}
        className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        {cta}
      </Link>
    </section>
  );
}
