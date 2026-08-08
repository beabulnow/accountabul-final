import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useProfile, useRoles, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/live", label: "Live" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/businesses", label: "Businesses" },
  { to: "/saved", label: "Saved" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session, loading } = useSession();
  const profile = useProfile();
  const roles = useRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setOpen(false);
    void navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Accountabul home">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-sm font-bold">
            A
          </span>
          <span className="font-display text-base font-semibold tracking-tight">Accountabul</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? null : session ? (
            <>
              {(roles.data ?? []).some((r) => r === "admin" || r === "moderator") ? (
                <Link
                  to="/admin"
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  Admin
                </Link>
              ) : null}
              <Link
                to="/dashboard/profile"
                className="max-w-[12rem] truncate rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {profile.data?.display_name ?? session.user.email}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border bg-background md:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col py-2">
            {[
              ...nav,
              ...(session
                ? [{ to: "/dashboard/profile", label: "Profile" }]
                : [
                    { to: "/login", label: "Log in" },
                    { to: "/signup", label: "Get started" },
                  ]),
            ].map(
              (item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  {item.label}
                </Link>
              ),
            )}
            {session ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-secondary"
              >
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
