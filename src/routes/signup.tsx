import { createFileRoute } from "@tanstack/react-router";

import { PageShell, ScopeList } from "@/components/page-shell";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Accountabul" },
      { name: "description", content: "Create a member account or begin business onboarding on Accountabul." },
      { property: "og:title", content: "Sign up — Accountabul" },
      { property: "og:description", content: "Create a member account or begin business onboarding on Accountabul." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <PageShell
      eyebrow="Account"
      title={"Create your account"}
      description={"Choose a member account or start business onboarding. Both paths create one personal account first."}
      audience="Public"
      phase="Phase 1"
    >
      <ScopeList
        items={[
          "Member signup with email verification",
          "Business onboarding entry that creates a personal account first",
          "Business draft plus owner membership creation",
          "Zod-validated server action at the untrusted boundary",
          "Accessible form errors and success states",
        ]}
      />
    </PageShell>
  );
}
