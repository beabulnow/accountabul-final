# Accountabul Platform User Actions

**Date:** 2026-08-18
**Purpose:** Manual access, credential, provider, and business decisions that Codex cannot
complete safely without the account owner. Do not paste secrets into GitHub, Lovable chat,
source files, screenshots, or this document.

## Status update — 2026-08-19

- [x] Local Git access is working for the final repository,
      `beabulnow/accountabul-final`.
- [x] Latest `origin/main` and Lovable account/signup changes were reconciled into
      `codex/final-build-recovery-20260818` without rewriting published history.
- [x] The full credential-free quality gate passes after reconciliation and active-business
      context implementation.
- [ ] In a normal browser, while signed out, open
      `/dashboard/properties?business=not-authorized` and confirm it redirects to
      `/login?redirect=...`. Automated localhost browser control disconnected during this transition;
      the route logic, typecheck, static QA, tests, and production build pass.
- [ ] With two business memberships on a dedicated test account, switch the **Active business**
      selector and confirm the `business` URL value, overview, listings, services, leads, and received
      billing all change together.
- [ ] With a `viewer` membership, confirm business, listing, service, and lead write controls are
      absent while read access remains available.

The older property-platform access items below are historical source-reconciliation notes and are
not blockers for work in the final repository.

## Required before connected implementation/QA

- [ ] **Authorize local Git access to the primary base repository.**
  - Repository: `JibreelMuhammad/property-web3-portal`
  - A local checkout exists at
    `C:\Users\JibreelMuhammad\OneDrive - Accountabul\Documents\Accountabul Platform\property-web3-portal`,
    but its remote refs stop at 2026-05-31. GitHub `main` is 241 commits ahead of that
    checkout's current commit.
  - The checkout contains pre-existing uncommitted shop/vendor work on
    `codex/vendor-onboarding-reentry`. Do not clean, reset, switch, merge, or reuse that
    worktree for production reconciliation.
  - The connected GitHub app is authenticated as `JibreelMuhammad` with repository admin
    permission, but the local CLI/Git credential is `Accountabul-LLC`, which receives
    `Repository not found` for this private repository.
  - Choose one authority path: authenticate GitHub CLI locally as `JibreelMuhammad`, or
    explicitly grant `Accountabul-LLC` repository access. Do not paste a password, token, or
    one-time authorization code into project files or chat.
  - After authorization, clone a clean copy into a new sibling folder; preserve the dirty
    checkout untouched.
  - Verification command: `git ls-remote <repository-url> refs/heads/main` must succeed and
    report GitHub `main` at or beyond `1a26ddf99c4cb4672d7cc3b89ce817ab75d78f4e`.

- [ ] **Re-authorize the Lovable connector with current permissions.**
  - Remove the Lovable app/connector from Codex/ChatGPT settings, then add it again.
  - A simple disconnect/reconnect reuses the old grant and will not add the missing
    `projects:write` scope.
  - This is currently blocking even read-only SQL catalog/advisor inspection through
    Lovable's database action.

- [ ] **Restore Lovable-to-GitHub sync for the base project.**
  - Lovable project: `6e1cbcc8-52ab-45f0-97c8-cb50133732aa`
  - Lovable is at `3601ff823bedcacdeb9d30e3039eaad49a6d7238`.
  - GitHub does not currently contain the August Lovable commits.
  - Do not reconnect by overwriting either side. Preserve both histories and verify the
    exported tree before merging.

- [ ] **Provide connected Supabase QA access through an approved local secret store.**
  - Required capabilities: anonymous/publishable client, authenticated test users,
    service-role test administration, Storage, and database advisors.
  - Never put a service-role or secret key in a `VITE_` environment variable.
  - Prefer a non-production test project for destructive/failure-path integration tests.

## Restream setup

- [ ] Confirm the Restream subscription supports the **Website Video Player**
      (Business or custom Enterprise as of 2026-08-18).
- [ ] In Restream, add an **Embed Player** channel and select a responsive player.
- [ ] Copy the generated iframe embed code into the approved secret/config handoff.
  - Codex needs the iframe `src`/channel URL, not your Restream password.
  - The embed code remains stable for the player channel.
- [ ] Confirm whether the player should display its viewer counter and which offline
      thumbnail should be shown.
- [ ] Confirm whether anonymous visitors may read live chat. Writing chat will require
      sign-in unless explicitly changed after a moderation/privacy review.
- [ ] If automated Restream event scheduling is required later, create an approved OAuth/API
      application separately. The basic website-player embed does not require an API key.

## Product and legal decisions

- [ ] Approve the two-day core scope in `docs/PLATFORM_RECOVERY_PLAN_2026-08-18.md`.
- [ ] Decide whether the public directory label is **Businesses**, **Vendors**, or
      **Professionals & Services**. The database should have one canonical business identity.
- [ ] Decide whether public live rooms are readable by everyone or only signed-in members.
- [ ] Identify the administrator(s) by account/user ID for a controlled role migration.
      Do not use email addresses as the final authorization mechanism.
- [ ] Obtain legal/compliance review before enabling mainnet tokenization, secondary trading,
      custody, yield, investment-return claims, KYC approval automation, or escrow settlement.

## Final launch evidence requiring the account owner

- [ ] Verify Google OAuth redirect origins/domains in the production Supabase/Lovable project.
- [ ] Verify production domain, DNS, CSP/frame allowlist, and Restream iframe behavior.
- [ ] Verify Stripe/provider webhook secrets and replay-safe delivery in provider dashboards.
- [ ] Exercise personal, business, and admin accounts using dedicated test identities.
- [ ] Review and approve public legal copy, privacy policy, terms, financial disclaimers,
      and data-retention policy.
