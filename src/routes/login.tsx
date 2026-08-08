import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Accountabul" },
      { name: "description", content: "Sign in to Accountabul or recover access to your account." },
      { property: "og:title", content: "Log in — Accountabul" },
      {
        property: "og:description",
        content: "Sign in to Accountabul or recover access to your account.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string"
      ? { redirect: search["redirect"] as string }
      : {},

  component: LoginPage,
});

function safePath(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function LoginPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const next = safePath(search.redirect);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: next, replace: true });
  }, [session, navigate, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back.");
    void navigate({ to: next, replace: true });
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: next, replace: true });
  }

  async function handleRecovery() {
    if (!email) {
      toast.error("Enter your email first, then request a reset link.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) toast.error(error.message);
    else toast.success("If that account exists, a reset link is on the way.");
  }

  return (
    <PageShell
      eyebrow="Account"
      title="Log in"
      description="Authentication and account recovery backed by platform identity only."
      audience="Public"
      phase="Phase 1"
    >
      <div className="surface-card max-w-md p-6">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
          Continue with Google
        </Button>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={handleRecovery}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
          <Link to="/signup" className="font-medium text-accent underline-offset-4 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
