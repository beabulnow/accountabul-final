# Phased Roadmap — Accountabul Platform Production

Each phase ends deployable. No phase silently broadens the MVP.

Current milestone: **Phase 6 connected launch-gate closure plus targeted
definition-of-done cleanup**. Core product workflows through Phase 5 and the signed-out
Chromium viewport matrix are implemented. Live-room presence wiring, member notification
preferences, and per-feature analytics/audit coverage still require an implementation or
explicit scope decision. Authenticated role, provider, deployed cross-browser, screen-reader,
and monitoring evidence also remains before the launch gate can be marked complete. See
`docs/PHASE_STATUS.md` for the evidence-based status ledger.

The `0001`-`0011` labels below describe the original logical schema groups, not physical
filenames. Implementation consolidated those groups into nine timestamped Supabase migration
files. `docs/SCHEMA.md` maps the logical plan to the committed files. A committed migration is
not evidence that it has been applied to the connected project.

## Phase 0 — Foundation and threat model

Delivered:

- [x] New standalone application; no existing project or repository reused or connected.
- [x] Architecture decision record — `docs/ARCHITECTURE.md`.
- [x] Route map and design tokens preserved from the approved concept —
      `docs/ROUTE_MAP.md`, `src/styles.css`, all 18 routes as accessible shells.
- [x] Canonical schema diagram and migration skeleton — `docs/SCHEMA.md`.
- [x] Auth/RLS threat model — `docs/RLS_THREAT_MODEL.md`.
- [x] Secret rotation checklist — inside `docs/RLS_THREAT_MODEL.md`.
- [x] Reuse ledger — `REUSE_LEDGER.md`.
- [x] Migration policy — `docs/MIGRATION.md` (authored during Phase 0 before later-phase
      migrations were committed).
- [x] CI for types, lint, unit tests, build, migration checks, and secret scanning —
      `.github/workflows/ci.yml`.

Gate: no product feature work proceeds until authentication boundaries, business
ownership, and environment secrets are demonstrably correct.

## Phase 1 — Accounts and business pages

Logical schema groups `0001`-`0004`. Member signup/login/recovery, member profile,
business creation and staff membership, public business directory and detail, verification
submission and admin review.

Gate: two test users and two test businesses cannot see or edit each other's private data;
public pages expose only approved columns.

## Phase 2 — Marketplace and services

Logical schema groups `0005`-`0007`. Property drafts, media, submission, review, publication, browse
/search/filter, detail, save, inquiry; business services and service inquiries; lead
dashboard.

Gate: listing lifecycle and storage access tested end-to-end; missing images produce
intentional fallbacks; search never returns drafts or suspended data.

## Phase 3 — Live conference room and unified chat

Logical schema group `0008`. Scheduled/current/replay routes, provider-neutral player states,
unified chat gateway with normalized UI, server-side rate limits and moderation, reminders
and presence.

Gate: scheduled, live, reconnecting, ended, and provider-down states verified; chat secrets
stay server-side; a banned user cannot bypass moderation with a forged client role.

## Phase 4 — Tips and payment reconciliation

Logical schema group `0009`. Tip UI and amount validation, provider checkout adapter (Stripe first),
signed webhook reconciliation, receipts, tip chat event, failure and refund handling, admin
reconciliation view.

Gate: repeated webhooks and refreshes create exactly one paid tip; client redirects cannot
mark a tip paid; amounts reconcile to the provider.

## Phase 5 — Migration and operations

Logical schema groups `0010`-`0011`. Idempotent importers and mapping tables, dry-run and
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
