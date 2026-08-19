# Accountabul Platform Recovery and Two-Day Core Build Plan

**Date:** 2026-08-18
**Status:** Discovery complete enough to begin reconciliation; no remote write or production data change authorized yet.

## 1. Goal

Use Lovable project `6e1cbcc8-52ab-45f0-97c8-cb50133732aa` and its repository,
`JibreelMuhammad/property-web3-portal`, as the primary implementation base. Use the
smaller `beabulnow/accountabul-final` project as a donor/reference for its clearer
business directory, public marketplace, live-event, chat, and launch-gate patterns.

The two-day deliverable is a deterministic, testable core platform with:

- public home, property marketplace, property details, business/vendor directory,
  business profile, professional-services directory, and live-conference surfaces;
- private personal and business dashboards, saved items, listing management, leads,
  profile/settings, and appropriate payment history;
- separate personal, business, and administrator authorization models;
- a Restream website-player integration with platform-owned event state and chat;
- a documented design system and responsive navigation/layout contract;
- automated type, lint, test, build, RLS, accessibility, and critical route checks.

This plan does **not** represent production approval for token trading, custody,
yield, escrow settlement, KYC/AML, securities activity, or mainnet asset issuance.
Those capabilities remain disabled, admin-only, testnet-only, or explicitly labeled
until legal, operational, and connected-provider gates are satisfied.

## 2. Repository and synchronization evidence

### Primary base: `JibreelMuhammad/property-web3-portal`

- Lovable project: `Accountabul Platform.`
- Lovable latest commit: `3601ff823bedcacdeb9d30e3039eaad49a6d7238`.
- GitHub's newest commit visible through the connected GitHub installation is
  `1a26ddf99c4cb4672d7cc3b89ce817ab75d78f4e`.
- The two Lovable-only edits after that GitHub point are:
  - `b48448f4923228175751943d447cb818d7f982ce`: restore a safe `.env.example` after
    a credential-exposure correction;
  - `3601ff823bedcacdeb9d30e3039eaad49a6d7238`: prototype-safety patch affecting
    24 files, including README/disclaimers, testnet guards, disabled trading UI,
    and a Vitest safety test.
- The base has approximately 500 tracked files, 50+ pages, 60+ edge functions,
  and over 100 migrations. It is a prototype with substantial implementation,
  not a small greenfield app.
- The base currently has only one visible unit-test file and no visible end-to-end
  or CI workflow in the Lovable file inventory. Existing audit documents are useful
  evidence, but several are stale and conflict with later migrations/code.

### Donor/reference: `beabulnow/accountabul-final`

- Local `main` diverged after `3c0edaf`: 9 local-only commits and 22 remote-only
  commits at the time of discovery.
- The worktree contains 20 modified and 9 untracked files.
- The pending batch contains three coherent concerns:
  1. Supabase opaque API-key request handling and tests;
  2. private RLS helper and database index/performance hardening with tests;
  3. local connected-environment launcher, evidence, and documentation updates.
- Full local check result:
  - migration checks: passed for 9 migrations;
  - static QA: 50 passed, 0 failed;
  - type-check: passed;
  - lint: 0 errors, 10 Fast Refresh warnings;
  - tests: 37 total, 33 passed, 4 skipped because connected Supabase credentials
    were unavailable;
  - production build: passed.

## 3. Safe source-control strategy

### Donor/reference repository

1. Created `codex/final-build-recovery-20260818` from the current local `main`.
2. Preserved the dirty work in two reviewable local commits and verified a clean
   worktree:
   - `2aa33d2 fix(supabase): harden clients policies and indexes`
   - `chore(qa): preserve connected launch evidence and recovery plan` (branch `HEAD`)
3. Next, merge `origin/main` into the recovery branch. Do not rebase, amend, squash, or
   force-push published Lovable history.
4. Resolve conflicts on the branch and rerun `npm run check` plus connected tests.
5. Push the recovery branch and use a pull request. Do not push the diverged history
   directly to `main`.
6. Treat donor migrations as design/test references only; never apply them to the
   primary base database because the schema and migration histories differ.

### Primary base repository

1. Restore an authenticated local checkout of `JibreelMuhammad/property-web3-portal`.
2. Re-establish Lovable-to-GitHub synchronization without rewriting history.
3. Export/replay the two Lovable-only commits onto a GitHub branch and verify that
   the resulting tree matches Lovable commit `3601ff82` before feature work.
4. Create `codex/production-core-20260818` from the reconciled commit.
5. Perform all implementation on that branch, with small commits and a draft PR.
6. Merge to `main` only after the acceptance gates below pass. Because `main`
   synchronizes to Lovable, keep every pushed commit buildable.

## 4. Current product assessment

### Already present and worth retaining

- Supabase email/password and Google sign-in.
- Individual and business signup entry points.
- Admin, KYC, vendor, credentials, payments, causes, wallet, and property pages.
- Public property marketplace and detail pages.
- Per-user saved properties; anonymous users are redirected to sign in before saving.
- Public verified-vendor directory and vendor public profiles.
- Vendor onboarding, dashboard, lead inbox, and public contact flow.
- Professional-services directory.
- React Query caching, route-level lazy loading, and some previous performance fixes.
- Shared edge-function CORS and error modules from prior security-hardening work.
- Prototype safety guards that keep mainnet/trading claims from exceeding shipped behavior.

### Structural gaps to fix

- `profiles.account_type` is client-editable and is being used as both presentation
  data and account authority.
- A business account is not a durable organization with owners/memberships; it is
  currently a profile value plus a separate vendor-application/profile workflow.
- `RouteGuard.allowedAccountTypes` is declared but unused.
- Admin UI access combines a database role with a hardcoded email address.
- Route protection is inconsistent: several private pages are not wrapped at the
  router boundary and rely on page-level redirects.
- The navigation defines desktop sections with unconditional `hidden` classes and
  globally hides scrollbars, creating responsiveness and accessibility risks.
- “Professionals” and “Vendors” overlap and need one source-of-truth relationship.
- There is no live-conference route or Restream integration in the primary base.
- Documentation is internally inconsistent about shipped behavior, wallet-secret
  storage, mainnet, and production readiness.
- Test coverage is far below the size and risk of the codebase.

## 5. Target account and authorization model

Authentication identifies a person. Authorization determines what that person may
do. Business ownership must be modeled independently from a person's profile.

| Concern | Source of truth | Rule |
|---|---|---|
| Personal identity | `profiles` keyed by `auth.users.id` | A user owns only their profile and private records. |
| Business entity | `businesses`/`organizations` | A business has its own lifecycle, public profile, and verification state. |
| Business access | `business_memberships` | Owner, manager, staff roles are explicit and server-enforced. |
| Platform admin | `user_roles` or trusted `app_metadata` | No public admin signup and no hardcoded-email authorization. |
| Vendor status | business/vendor application and credential records | Verification is reviewed; it is not inferred from account type. |
| Public publication | reviewed lifecycle fields and narrow public views/RPCs | Draft/private data never becomes public through a client field update. |

Required server/RLS behavior:

- anonymous users can read only explicitly published marketplace, business,
  professional, and live-event projections;
- authenticated users can read/update only their own private records;
- business members can access only businesses for which they hold an active role;
- administrator actions cross explicit server functions and audit records;
- authorization never trusts `user_metadata`, client-supplied account type, email,
  wallet address alone, or UI route guards;
- every exposed table has RLS and least-privilege grants;
- all state-changing financial, review, or publishing operations are idempotent.

## 6. Public/private route contract

### Public

- `/`
- `/auth`, `/auth/individual`, `/auth/business`, `/reset-password`
- `/marketplace`, `/property/:id`
- `/vendors`, `/vendors/:slug`
- `/professionals` (or a unified services directory route)
- `/live`, `/live/:slug`
- approved causes and legal/pricing pages that are intentionally public

### Authenticated personal

- `/dashboard`
- `/saved` or `/marketplace?tab=saved`
- `/settings`, `/account/billing`
- private donation/payment history and credentials
- wallet connection and private portfolio actions

### Authenticated business member

- `/business` or `/business/:id/dashboard`
- listing/service management
- vendor application/profile management
- lead inbox and staff membership controls

### Administrator/compliance

- `/admin/*`
- review queues, role assignment, publishing, moderation, payment reconciliation,
  event management, and audit evidence

Unauthorized routes must redirect to sign-in when unauthenticated and return a clear
forbidden state when authenticated but unauthorized. The database remains the final
enforcement point.

## 7. Restream/live-conference design

Restream's official Website Video Player is an iframe-based integration. The embed
code is stable for the Embed Player channel; an API key is not required for the basic
player. As of 2026-08-18, the feature requires Restream Business or Enterprise, has
up to roughly 60 seconds of latency, and does not provide website-player chat.

Implementation:

1. Store an allowlisted Restream iframe `src` or channel identifier in server-only
   configuration; never store Restream account credentials in a client variable.
2. Create `events` plus a narrow `public_events` projection with lifecycle states:
   `draft`, `scheduled`, `connecting`, `live`, `ended`, `replay`, `cancelled`.
3. Build public `/live` and `/live/:slug` pages with scheduled, offline, connecting,
   live, reconnecting, provider-unavailable, ended, and replay states.
4. Reuse/port the donor repository's server-mediated Supabase chat design because
   Restream's website player has no native chat.
5. Restrict chat writes to authenticated users, while deciding explicitly whether
   anonymous viewers can read chat.
6. Add moderation, atomic rate limiting, bans, bounded messages, audit records, and
   idempotent tip/payment announcements.
7. Add iframe title, responsive aspect ratio, `allow`/`sandbox` policy, CSP
   `frame-src` allowlist, and provider-down fallback.

## 8. Marketplace and directory target

- Marketplace and business/service discovery remain public.
- Saved properties/services are always scoped to the authenticated user.
- Property cards and detail pages consume narrow public projections, not owner or
  review tables.
- Vendor/business profiles are the canonical business-directory records.
- Professionals either reference an approved business/vendor record or are migrated
  into the same verified-service model; do not maintain competing directories.
- Listing creation, publication, verification, and delisting are separate lifecycle
  transitions.
- Search/filter queries are paginated and server-filtered before the dataset grows.
- Images use private upload paths plus reviewed/public delivery paths, file type and
  size limits, and safe fallbacks.

## 9. Design-system document

Create `docs/DESIGN_SYSTEM.md` in the primary base and make it a contract covering:

- Accountabul logo and permitted variants;
- light/dark semantic HSL tokens;
- blue-to-cyan-to-green gradient usage;
- typography scale, measure, and font loading;
- 8-point spacing, container widths, radii, borders, and shadow tiers;
- buttons, forms, cards, badges, tables, empty/error/loading states;
- desktop/mobile navigation behavior and route visibility by auth state;
- marketplace cards, business profiles, dashboard shells, and live-room layout;
- keyboard focus, visible scrollbars, contrast, reduced motion, and screen-reader rules;
- responsive breakpoints and test viewport matrix;
- asset ownership and image optimization rules.

The existing CSS variables are the starting point, but unconditional scrollbar hiding
and inconsistent responsive visibility are not part of the final contract.

## 10. Performance and data-efficiency rules

- Use narrow column projections; avoid `select('*')` on public or frequently mounted paths.
- Use React Query with stable keys, intentional stale times, cancellation, and no
  duplicate raw `useEffect` fetches.
- Eliminate N+1 wallet/property/vendor calls with batch endpoints or joined projections.
- Pause polling when hidden and prefer event-driven invalidation where practical.
- Paginate directories, listings, chat, audit records, and histories.
- Index foreign keys and recurring RLS/filter predicates; use partial indexes for
  active/published/pending subsets when query plans justify them.
- Wrap `auth.uid()` in `select` inside RLS policies and keep security-definer helpers
  in a non-exposed schema with explicit caller checks and grants.
- Lazy-load heavy routes and charts; verify stable vendor chunking and image sizes.
- Add budgets for initial JavaScript, route chunks, request count, Core Web Vitals,
  and critical Supabase call counts.

## 11. Security and QA gate

### Automated baseline

- clean install from committed lockfile;
- migration-order and duplicate-version check;
- TypeScript type-check;
- ESLint with no errors and a documented warning budget;
- unit tests for authorization-independent helpers and state machines;
- integration tests with anonymous, two unrelated users, business owner/staff, and admin;
- RLS/storage tests for cross-user and cross-business denial;
- webhook signature, replay, idempotency, and lifecycle tests;
- route/accessibility metadata checks;
- production build and bundle report;
- dependency audit and secret scan;
- Supabase database/security advisors when connected.

### Manual/connected evidence

- anonymous versus signed-in route matrix;
- personal signup/login/recovery/logout;
- business creation, staff access, publication, and lead handling;
- admin denial and authorized review;
- saved property isolation across two users;
- Restream offline/scheduled/live/ended/provider-down states;
- chat moderation and rate limit behavior;
- mobile, desktop, keyboard, screen-reader, and major-browser smoke tests;
- published-build performance profile, not Lovable's development preview.

## 12. Two-day execution sequence

### Day 1: reconcile, contract, and secure the foundation

1. Restore local access and reconcile Lovable-only commits with GitHub.
2. Create the production branch and capture a baseline build/test/security report.
3. Add `DESIGN_SYSTEM.md`, route map, account model, and current architecture docs.
4. Implement the durable profile/business/membership/admin model with forward-only
   migrations and tested RLS.
5. Centralize route authorization and correct public/private navigation.
6. Unify business/vendor/professional source-of-truth decisions.
7. Commit each vertical change with tests; keep the branch buildable.

### Day 2: core product surfaces and launch evidence

1. Finalize public marketplace, business directory/profile, saved-item isolation,
   business dashboard, and lead flow.
2. Add public live listing/room, Restream embed configuration, platform chat, and
   moderation/state fallbacks.
3. Apply targeted performance work based on request counts and build/bundle evidence.
4. Run full anonymous/personal/business/admin RLS and route tests.
5. Run responsive, accessibility, browser, security, and published-build smoke tests.
6. Update architecture, schema, runbook, environment handoff, and known limitations.
7. Open a draft PR with evidence. Merge to `main` only if every core acceptance
   criterion passes and no required connected gate is unresolved.

## 13. Core acceptance criteria

- Source control has one reconciled primary branch and no lost Lovable-only edits.
- Clean checkout can install, type-check, lint, test, and build deterministically.
- Personal, business membership, and admin authorization are server-enforced.
- Anonymous users cannot access dashboards, saved items, private profiles, leads,
  payment history, or administrative data.
- Public users can browse marketplace, property details, verified businesses/services,
  and live events without signing in.
- Saved items are isolated between users and never global.
- Business users can manage only businesses they actively belong to.
- Admin access has no hardcoded-email dependency and no public self-promotion path.
- Restream video works through an allowlisted responsive iframe; secrets are not in
  the client; the app supplies its own tested chat and event lifecycle.
- RLS/storage tests cover anonymous, cross-user, cross-business, and admin cases.
- No critical/high unresolved security finding is hidden behind a UI guard.
- The design, architecture, schema, environment, and operations documents match the
  implementation at handoff.

## 14. Risks

- The two-day window is achievable only for the defined core slice. A line-by-line
  review of every experimental XRPL, KYC, payment, credential, and AI path plus full
  connected certification is a longer program.
- Lovable and GitHub are currently out of sync for the primary base.
- Local CLI access to the private base repository is not yet authorized.
- Live database catalog/advisor access is currently blocked by an outdated Lovable
  connector permission grant.
- Restream Website Player requires the correct paid plan and manual channel/embed setup.
- Regulated tokenization and financial claims require legal and operational review
  beyond code quality.
