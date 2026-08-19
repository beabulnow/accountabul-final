# Accountabul Production Core Definition of Done

**Established:** 2026-08-18
**Status:** Active delivery contract

## Goal

Reconcile the Accountabul production base across Lovable and GitHub, implement the approved
core platform slice, and verify its security, performance, accessibility, connected data
behavior, and deployment readiness. The work is complete only when every required gate in
this document has passed with reviewable evidence.

## Core scope

- Personal signup, login, recovery, logout, profile, and private dashboard.
- Business identity, owner/manager/staff membership, public profile, listings, leads, and
  private business dashboard.
- Server-enforced administrator role and review workflows.
- Public homepage, marketplace, listing details, business directory/profiles, and live-event
  discovery.
- Per-user saved items and authenticated inquiry/chat actions.
- Restream Website Player integration with Accountabul-owned event state, chat, moderation,
  and failure handling.
- A documented design system and responsive, accessible presentation.

## Explicit non-goals for this core release

- Mainnet tokenization, custody, exchange/trading, yield, escrow settlement, or investment
  claims.
- Automated KYC approval or legal/compliance certification.
- Full rewrite of every prototype XRPL, AI, credential, payment, or experimental path.
- Restream scheduling automation beyond the stable Website Player embed.

Non-goals must remain disabled, clearly labeled as unavailable/prototype behavior, or removed
from launch navigation. They cannot silently become production claims.

## Execution order

1. Reconcile the primary Lovable and GitHub trees without rewriting published history.
2. Capture a clean baseline and establish target-repository checks in CI.
3. Freeze the design, route, account, authorization, schema, and data-flow contracts.
4. Implement identity, business membership, admin authority, and RLS first.
5. Implement the public/private route contract and navigation from those authorities.
6. Consolidate marketplace/business data and finish saved items, leads, and dashboards.
7. Implement the Restream-backed live room and Accountabul chat lifecycle.
8. Optimize measured database, network, bundle, and rendering bottlenecks.
9. Run connected security, role, browser, accessibility, and published-build tests.
10. Update operating documentation, open a reviewable PR, and merge only after all gates pass.

## Required completion gates

### G0 — Source control is reconciled

- [ ] The authenticated local checkout is the correct repository:
  `JibreelMuhammad/property-web3-portal`.
- [ ] Lovable commit `3601ff823bedcacdeb9d30e3039eaad49a6d7238` and the GitHub history are both
  preserved; no force-push, published rebase, or destructive history rewrite occurred.
- [ ] The credential-exposure fix and prototype-safety change visible only in Lovable at
  discovery are present in the reconciled tree.
- [ ] No `.env`, service-role key, wallet seed, provider secret, or private credential is
  tracked in the resulting branch or newly introduced history.
- [ ] Feature work occurs on a `codex/` branch from the reconciled base.
- [ ] The tree is clean and the PR shows only intentional changes.

Evidence: repository URL, branch, reconciliation commit graph, secret-scan result, tree diff,
and clean `git status`.

### G1 — A clean checkout is deterministic

- [ ] A fresh checkout installs from the committed lockfile without manual package edits.
- [ ] Type-check passes with no errors.
- [ ] Lint passes with no errors; remaining warnings are enumerated and accepted or fixed.
- [ ] Unit and static tests pass with zero unexpected skips.
- [ ] The production client and server/edge targets build successfully.
- [ ] CI runs the same required commands and passes on the PR.

Evidence: exact Node/npm versions, commands, exit codes, CI run, and build artifact summary.

### G2 — Architecture and design contracts match the code

- [ ] `DESIGN_SYSTEM.md` defines colors, type, spacing, radius, elevation, states,
  responsive breakpoints, accessibility rules, and representative components.
- [ ] The route map labels every route as public, authenticated, business-member, or admin.
- [ ] The architecture document shows browser, application, Supabase, Restream, payment, and
  deployment boundaries.
- [ ] The schema document identifies the source of truth for people, businesses,
  memberships, roles, listings, saves, events, messages, leads, and audit events.
- [ ] Environment and operations documentation lists required configuration without secret
  values.

Evidence: documentation links reviewed against the final code and schema.

### G3 — Identity and authorization are server-enforced

- [ ] A personal account can sign up, verify, sign in, recover access, sign out, and manage
  only its own profile.
- [ ] A business is a separate entity; business access is granted through explicit active
  owner/manager/staff memberships.
- [ ] Business members can access only the businesses and actions allowed by their role.
- [ ] Admin authority comes from a protected server/database role, never a hardcoded email,
  client-editable profile field, or `user_metadata` claim.
- [ ] No public or normal authenticated path can promote a user to admin.
- [ ] UI guards improve navigation but database RLS/RPC/storage policies remain authoritative.
- [ ] Privileged review and role changes produce an audit event.

Required negative tests: anonymous, user A versus user B, member versus nonmember, staff
versus manager/owner, normal user versus admin, suspended membership, and forged client data.

### G4 — Public and private routes have one explicit contract

- [ ] Anonymous visitors can browse the homepage, marketplace, listing details, verified
  business directory/profiles, and public live-event pages.
- [ ] Anonymous visitors cannot read dashboards, saved records, private profiles, leads,
  billing/payment history, moderation tools, or admin data.
- [ ] Attempting a private action while signed out produces a clear sign-in path and returns
  the user to the intended destination when safe.
- [ ] Desktop and mobile navigation expose only appropriate destinations and have no dead or
  contradictory links.
- [ ] Direct URL entry enforces the same contract as navigation clicks.

Evidence: automated route matrix plus anonymous/personal/business/admin browser captures.

### G5 — Marketplace, directory, saves, and leads are correct

- [ ] Businesses/vendors/professionals use one canonical business identity or an explicitly
  documented relationship; duplicate competing sources of truth are removed.
- [ ] Public queries return only publishable fields and verified/published records.
- [ ] Directory and marketplace queries use narrow projections, bounded pagination, stable
  ordering, and indexed filters; no unrestricted `select('*')` remains on core lists.
- [ ] Saved items require authentication and are isolated per user.
- [ ] User A cannot read, alter, or delete user B's saves.
- [ ] A business member can publish/manage only listings owned by an authorized business.
- [ ] Inquiries create the correct business lead without exposing private contact data to
  unrelated users.
- [ ] Empty, loading, error, retry, unpublished, removed, and not-found states are tested.

### G6 — Live events and Restream behave safely

- [ ] The public live index and room use database-backed event records, not hardcoded demo
  state.
- [ ] Restream is embedded through an allowlisted responsive iframe with an accessible title.
- [ ] No Restream password, API secret, stream key, or private RTMP value reaches client code.
- [ ] Scheduled, offline, connecting, live, reconnecting, ended, and provider-unavailable
  states have deterministic UI and tests.
- [ ] Chat reads follow the approved public/member policy; chat writes require authentication.
- [ ] Chat writes pass through a server-controlled path with length validation, moderation,
  ban enforcement, and atomic rate limiting.
- [ ] Event administrators/moderators are authorized by server/database state.
- [ ] Provider failure does not expose secrets, crash the page, or erase event/chat history.

Evidence: test event, approved embed configuration, state test suite, and live-room browser
captures. A placeholder iframe is not sufficient for this gate.

### G7 — Database, storage, and integration security pass

- [ ] Every exposed table/view has intentional privileges and RLS behavior.
- [ ] Public projections exclude private email, phone, billing, identity, moderation, and
  internal workflow fields.
- [ ] Security-definer functions are private where practical, have a fixed `search_path`,
  validate the caller, and have explicit execute grants.
- [ ] Foreign keys and common filter/order paths have supporting indexes verified against
  actual queries.
- [ ] Storage buckets and object policies prevent cross-user and cross-business access.
- [ ] Migrations are forward-only, tested in a non-production environment first, and the
  remote migration list matches the repository.
- [ ] Database advisors and dependency/security scans have no unresolved critical/high issue.
- [ ] OAuth redirects, webhook signatures, replay/idempotency behavior, CORS/CSP, and iframe
  origins are verified in the connected environment.

Evidence: connected RLS tests, advisor output, migration history, storage tests, dependency
scan, secret scan, and provider configuration checklist. UI-only testing cannot pass this gate.

### G8 — Performance and data-use budgets pass

- [ ] Core lists are paginated and do not perform N+1 network/database calls.
- [ ] Request counts and transferred data are captured for homepage, marketplace, directory,
  business profile, saved items, dashboard, and live room.
- [ ] Route-level code splitting prevents admin, wallet, tokenization, and other non-core code
  from loading on public core routes.
- [ ] Images are dimensioned, responsive, compressed, and lazy-loaded below the fold.
- [ ] On three published-build mobile measurements, median LCP is at most 2.5 seconds and CLS
  is at most 0.10 for the homepage, marketplace, directory, and live room.
- [ ] A published/local-production route smoke has zero failures across 100 requests at
  concurrency 10 and p95 response time at most 750 ms in the recorded test environment.
- [ ] No core query has an unexplained sequential scan, unbounded result, or materially slower
  plan after the release migrations.

Evidence must record device/network profile, dataset size, build SHA, tool version, raw
artifact, and before/after values. Development-preview timings do not pass this gate.

### G9 — Responsive accessibility passes

- [ ] Key flows pass at 360x800, 768x1024, and 1440x900 without page-level horizontal
  overflow, clipped controls, hidden navigation, or inaccessible dialogs.
- [ ] Keyboard-only use supports navigation, authentication, save, inquiry, dashboard, live
  chat, and admin review with visible focus and safe focus return.
- [ ] Pages have semantic landmarks, one meaningful page heading, labels, alt text, iframe
  titles, status announcements, and sufficient contrast.
- [ ] Automated accessibility scans have zero critical/serious violations on core routes.
- [ ] A screen-reader smoke covers authentication, marketplace, business profile, dashboard,
  and live room.
- [ ] Global CSS does not suppress focus indicators or hide scrollbars indiscriminately.

Evidence: automated report, viewport matrix, keyboard checklist, and screen-reader notes.

### G10 — Connected end-to-end behavior passes

- [ ] Dedicated non-production personal, second-person, business owner, staff, manager, and
  admin identities exercise the role matrix.
- [ ] Connected Supabase tests run with zero skips and cover success plus meaningful denial
  paths.
- [ ] Browser tests cover current Chromium, Firefox, and WebKit/Safari-equivalent engines.
- [ ] Google/OAuth sign-in and redirect behavior are verified on the published domain if part
  of launch configuration.
- [ ] Restream, Storage, email, payment/webhook, and other enabled provider paths are exercised
  in their safe test modes.
- [ ] Test data is identified and removable without affecting production records.

Evidence: redacted test-identity matrix, test run, browser report, and provider receipts/logs.
The goal cannot be complete while required connected tests are skipped for missing access.

### G11 — Deployment and handoff are ready

- [ ] The published candidate is tied to the reviewed commit SHA.
- [ ] Environment variables, domain/DNS, CSP, OAuth redirects, webhook endpoints, Restream
  origin, monitoring, backup, restore, rollback, and incident ownership are documented.
- [ ] A migration backup and rollback/recovery plan exists before production schema changes.
- [ ] Legal/privacy/terms and regulated-feature limitations are approved by the owner.
- [ ] Known limitations are explicit, assigned, and do not contradict the core acceptance
  criteria.
- [ ] The PR contains the evidence index and is approved before merge to `main`.
- [ ] Post-deployment smoke confirms public routes, authentication, one personal flow, one
  business flow, admin denial/approval, save isolation, directory, and live room.

## Evidence index required at handoff

| Evidence | Required contents |
| --- | --- |
| Source reconciliation | Commit graph, Lovable/GitHub tree comparison, clean status |
| Build and CI | Versions, commands, exit codes, CI link, bundle/build summary |
| Data security | Migration list, RLS/storage test report, advisor output |
| Role matrix | Anonymous, two personal users, staff, manager/owner, admin outcomes |
| Route matrix | Public/private expected status, redirect, and visible navigation |
| Marketplace | Query/request evidence, pagination, saves, leads, failure states |
| Live room | Restream embed proof, event states, moderation/rate-limit evidence |
| Performance | Raw published-build measurements and recorded test conditions |
| Accessibility | Automated scan, viewport matrix, keyboard and screen-reader notes |
| Deployment | Candidate SHA, configuration checklist, smoke and rollback evidence |

Secrets, access tokens, raw private customer data, and wallet material must never appear in
the evidence package.

## Completion rule

The production core may be marked **complete** only when G0 through G11 are all checked,
their evidence is attached or linked, required connected tests have zero skips, the worktree
and CI are clean, and there are no unresolved critical/high security findings.

If code is implemented but access, provider, owner, legal, or deployment verification is
missing, report **implementation ready — launch blocked**, not complete. Optional enhancements
may remain only when they are outside the explicit core scope and do not weaken a required
gate.
