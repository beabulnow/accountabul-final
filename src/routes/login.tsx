import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Accountabul" },
      { name: "description", content: "Sign in to Accountabul or recover access to your account." },
      { property: "og:title", content: "Log in — Accountabul" },
      { property: "og:description", content: "Sign in to Accountabul or recover access to your account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <PageShell
      eyebrow="Account"
      title={"Log in"}
      description={"Authentication and account recovery backed by Supabase Auth identity only."}
      audience="Public"
      phase="Phase 1"
    >
      <ScopeList
        items={[
          "Email and password sign-in",
          "Password recovery and re-authentication",
          "Server-side session handling",
          "Role resolution from user_roles, never from editable metadata",
          "Rate limiting and lockout messaging",
        ]}
      />
    </PageShell>
  );
}
