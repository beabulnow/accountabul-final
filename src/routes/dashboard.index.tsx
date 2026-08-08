import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useProfile, useRoles, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { SignedOut } from "./dashboard.profile";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Accountabul" },
      { name: "description", content: "Your personalized Accountabul summary and next actions." },
      { property: "og:title", content: "Dashboard — Accountabul" },
      { property: "og:description", content: "Your personalized Accountabul summary and next actions." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { session, loading } = useSession();
  const profile = useProfile();
  const roles = useRoles();

  const business = useQuery({
    queryKey: ["my-business", session?.user.id],
    enabled: Boolean(session?.user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_members")
        .select("membership_role, businesses(*)")
        .eq("user_id", session!.user.id)
        .eq("invitation_status", "active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <SignedOut />;

  const b = business.data?.businesses ?? null;

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

function Card({ title, body, to, cta }: { title: string; body: string; to: string; cta: string }) {
  return (
    <section className="surface-card p-5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to={to}
        className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        {cta}
      </Link>
    </section>
  );
}
