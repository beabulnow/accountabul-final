import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GoogleIcon } from "@/components/google-icon";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Accountabul" },
      {
        name: "description",
        content:
          "Create an Accountabul member account to save listings, join live rooms, and claim a business.",
      },
      { property: "og:title", content: "Create your account — Accountabul" },
      {
        property: "og:description",
        content:
          "Create an Accountabul member account to save listings, join live rooms, and claim a business.",
      },
    ],
  }),
  component: SignupPage,
});

type AccountType = "individual" | "business";

function SignupPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [businessName, setBusinessName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isBusiness = accountType === "business";

  useEffect(() => {
    if (session) void navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBusiness && !businessName.trim()) {
      toast.error("Add your business name to continue.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0],
          account_type: accountType,
          ...(isBusiness ? { business_name: businessName.trim() } : {}),
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Check your email if confirmation is required.");
    void navigate({ to: isBusiness ? "/dashboard/business" : "/dashboard" });
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      window.sessionStorage.setItem("accountabul:account_type", accountType);
      if (isBusiness) {
        window.sessionStorage.setItem("accountabul:business_name", businessName.trim());
      }
    } catch {
      // storage unavailable — signup still works, business details are collected later
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-up failed. Try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: isBusiness ? "/dashboard/business" : "/dashboard", replace: true });
  }


  return (
    <PageShell
      eyebrow="Account"
      title="Create your account"
      description="One member account unlocks saved listings, live rooms, and business ownership."
      audience="Public"
      phase="Phase 1"
    >
      <div className="surface-card max-w-md p-6">
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-medium">What are you signing up as?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "individual" as const,
                  label: "Individual",
                  hint: "Browse listings, save favorites, join live rooms.",
                },
                {
                  value: "business" as const,
                  label: "Business",
                  hint: "List properties, offer services, get verified.",
                },
              ]
            ).map((option) => {
              const active = accountType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccountType(option.value)}
                  aria-pressed={active}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="mt-3 text-xs text-muted-foreground">
          {isBusiness
            ? "You still get a personal profile — the business is a separate workspace you own."
            : "You can add a business later from your dashboard."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {isBusiness ? (
            <div className="grid gap-2">
              <Label htmlFor="business">Business name</Label>
              <Input
                id="business"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="first">First name</Label>
              <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last">Last name</Label>
              <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy
              ? "Creating account…"
              : isBusiness
                ? "Create business account"
                : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogle}
          disabled={busy}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className="mt-5 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
