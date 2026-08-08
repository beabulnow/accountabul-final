# Phased Roadmap — Accountabul Platform Production

Each phase ends deployable. No phase silently broadens the MVP.

## Phase 0 — Foundation and threat model (this build)

Delivered:

- [x] New standalone application; no existing project or repository reused or connected.
- [x] Architecture decision record — `docs/ARCHITECTURE.md`.
- [x] Route map and design tokens preserved from the approved concept —
      `docs/ROUTE_MAP.md`, `src/styles.css`, all 18 routes as accessible shells.
- [x] Canonical schema diagram and migration skeleton — `docs/SCHEMA.md`.
- [x] Auth/RLS threat model — `docs/RLS_THREAT_MODEL.md`.
- [x] Secret rotation checklist — inside `docs/RLS_THREAT_MODEL.md`.
- [x] Reuse ledger — `REUSE_LEDGER.md`.
- [x] Migration policy — `docs/MIGRATION.md` (no migrations run).
- [ ] CI for types, lint, unit tests, build, migration checks, secret scanning —
      configure at the start of Phase 1 alongside backend enablement.

Gate: no product feature work proceeds until authentication boundaries, business
ownership, and environment secrets are demonstrably correct.

## Phase 1 — Accounts and business pages

Backend enabled; migrations `0001`–`0004`. Member signup/login/recovery, member profile,
business creation and staff membership, public business directory and detail, verification
submission and admin review.

Gate: two test users and two test businesses cannot see or edit each other's private data;
public pages expose only approved columns.

## Phase 2 — Marketplace and services

Migrations `0005`–`0007`. Property drafts, media, submission, review, publication, browse
/search/filter, detail, save, inquiry; business services and service inquiries; lead
dashboard.

Gate: listing lifecycle and storage access tested end-to-end; missing images produce
intentional fallbacks; search never returns drafts or suspended data.

## Phase 3 — Live conference room and unified chat

Migration `0008`. Scheduled/current/replay routes, Restream player and status adapter,
unified chat gateway with normalized UI, server-side rate limits and moderation, reminders
and presence.

Gate: scheduled, live, reconnecting, ended, and provider-down states verified; chat secrets
stay server-side; a banned user cannot bypass moderation with a forged client role.

## Phase 4 — Tips and payment reconciliation

Migration `0009`. Tip UI and amount validation, provider checkout adapter (Stripe first),
signed webhook reconciliation, receipts, tip chat event, failure and refund handling, admin
reconciliation view.

Gate: repeated webhooks and refreshes create exactly one paid tip; client redirects cannot
mark a tip paid; amounts reconcile to the provider.

## Phase 5 — Migration and operations

Migrations `0010`–`0011`. Idempotent importers and mapping tables, dry-run and
reconciliation report, admin queues and audit history, backup/rollback/incident/cutover
runbooks.

Gate: migration reruns safely; unresolved identities and corrupt assets are reported, not
guessed.

## Phase 6 — Launch QA

Responsive visual QA on all routes, accessibility checks, cross-browser smoke tests, load
tests for marketplace reads, chat fan-out, and webhook bursts, security and performance
review, monitoring dashboards and alerts.

Gate: no overlapping buttons, clipped controls, broken navigation, missing images without
fallbacks, console errors, unauthorized data access, or dead-end states.

## Definition of done for every feature

Route and UI states; shared validation; server authorization; database transaction
boundary; safe response contract; analytics event; audit requirement; error and retry
behavior; tests covering each role.
