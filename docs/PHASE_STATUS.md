# Phase Status Ledger

Last reviewed: 2026-08-19

This ledger records reproducible evidence. "Credential-free complete" means all safe work
that does not need a connected provider has been implemented and verified; it does not mean
the roadmap's connected gate has passed.

## Milestone decision

- **Current milestone:** Phase 6 connected launch-gate closure plus targeted
  definition-of-done cleanup.
- **Implemented:** Core Phases 1-5 product workflows and Phase 6 credential-free QA.
- **Repository scope decisions closed:** aggregate live-room presence is implemented;
  external notification preferences and third-party product analytics are explicitly deferred in
  `docs/LAUNCH_SCOPE_DECISIONS_2026-08-19.md` until their delivery, consent, and retention contracts
  exist. Privileged audit logging remains required.
- **Not yet proven:** Connected Supabase/RLS/Storage/chat behavior, Stripe test-mode
  reconciliation, legacy cutover/restore, authenticated roles, the full browser and real
  screen-reader matrix, production-scale load, and monitoring alerts.
- **Launch decision:** Not approved for production launch until the remaining connected
  evidence below is recorded.
- **Delivery state at this review:** recovery work is committed on
  `codex/final-build-recovery-20260818`; GitHub/Lovable do not yet contain those commits.

Status terms used in this ledger:

- **Implemented** means code, migrations, tests, or runbooks exist in the repository.
- **Credential-free verified** means local checks that require no provider credentials pass.
- **Connected gate passed** means the behavior was exercised against the intended external
  environment and durable evidence was recorded.
- **Launch complete** means every required connected gate has passed; this status has not
  been reached.

| Phase                        | Implementation status                       | Concrete evidence                                                                                                                                                                                                                                                                      | Connected gate still required                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Foundation               | Implemented and locally verified            | Architecture, route map, schema, threat model, additive migration policy, three phase workflows, migration checks, secret scan, Node 22 CI.                                                                                                                                            | Push the current reviewed commits normally and observe the repository workflows pass on GitHub/Lovable.                                                                                                                                                    |
| 1 — Accounts and businesses  | Implemented locally; connected gate pending | Atomic business/owner creation, deterministic active-business context, owner-controlled member invitations, narrow public projections, credential submission/review, audited lifecycle RPCs, RLS and grant hardening. Unit/static gates pass.                                          | Apply the two pending local migrations, then run the invitation and two-user/two-business live RLS workflows with Supabase credentials; record denial-path and anonymous/private-field proof.                                                              |
| 2 — Marketplace and services | Complete                                    | Listing/service lifecycle, saves, business follows, inquiries, leads, private property media bucket, manager-only writes, signed reads, cleanup and missing-image fallback. Storage policy tests pass.                                                                                 | Apply migrations in a disposable project and run the member/owner/outsider/suspended-parent upload lifecycle gate.                                                                                                                                         |
| 3 — Live events and chat     | Implemented locally; connected gate pending | Scheduled/connecting/live/reconnecting/ended/provider-down UI, aggregate heartbeat presence, server-only chat RPC, room/event validation, bans, moderator rules, atomic rate limiting, and direct-write revocation.                                                                    | Apply migrations and run the presence plus live member/banned/burst/forged-user/moderator/anonymous chat gates; verify the configured streaming provider and replay URLs.                                                                                  |
| 4 — Tips and payments        | Complete                                    | Strict server checkout inputs/return origin, signed webhook reconciliation, idempotent paid-tip chat event, failure/expiry/refund handling, audit trail, and focused webhook tests.                                                                                                    | Configure Stripe test mode and save checkout, duplicate/reordered webhook, refresh, async failure, wrong amount/currency/session, and refund evidence.                                                                                                     |
| 5 — Migration and operations | Complete                                    | Deterministic allowlisted importer, safe dry run, forced re-review, money/identity/asset validation, resumable mapping reconciliation, fixtures and reports, plus backup/restore/cutover/rollback/incident runbooks.                                                                   | Supply the frozen legacy export and connected scratch project; rehearse database plus Storage restore, run final dry/apply reconciliation, and obtain operator sign-off.                                                                                   |
| 6 — Launch QA                | Credential-free verified; connected QA open | Aggregate check passes; static QA 50/50; signed-out in-app Chromium matrix 54/54 across 18 routes and three exact viewports; production-preview route smoke 18/18; load smoke 100 requests at concurrency 10 with zero failures; production build passes. Evidence is in `artifacts/`. | Run authenticated role and browser/accessibility matrices against a deployed preview, Firefox/Safari/Edge and real screen-reader passes, connected security/payment/storage/chat/presence tests, representative load tests, and trigger monitoring/alerts. |

## Repository scope decisions

The previously open presence, notification, and analytics questions are resolved in
`docs/LAUNCH_SCOPE_DECISIONS_2026-08-19.md`. Presence is an aggregate, authenticated, ephemeral
count. External notification controls and third-party behavioral analytics are post-launch work
because no delivery/consent/retention contract exists. Security-relevant privileged changes remain
audited.

## Latest local verification

- Latest recorded full `npm run check`: passed — 25 migrations inspected, static QA 50/50,
  typecheck and lint with no errors, 47 tests discovered (41 passed and 6
  credential-dependent skipped), and production build succeeded. Ten existing Fast Refresh
  lint warnings remain non-blocking.
- Signed-out in-app Chromium QA passed 54/54 route/viewport combinations at 360x800,
  768x1024, and 1440x900 with no document overflow, clipped interactive controls, error
  shell, undersized interactive target, or captured console warning/error. Mobile menu
  expansion and intentional missing-event/business states were also exercised. See
  `artifacts/phase6-browser-qa.json`.
- `npm run preview` plus `npm run qa:smoke -- http://127.0.0.1:3014`: the pinned
  Cloudflare Worker preview started and 18/18 route shells passed.
- `npm run qa:load -- http://127.0.0.1:3014`: 100 requests, concurrency 10, zero
  failures (p50 286 ms, p95 405 ms, max 452 ms). This is a local smoke result, not a
  production capacity claim.
- The skipped tests are intentionally connected gates and list the exact missing Supabase
  variables in their output.

## Branch baseline

- Canonical repository: `beabulnow/accountabul-final`
- Integration branch: `main`
- The recovery branch includes a normal merge of the refreshed `origin/main` history plus local
  account-context, schema-reconciliation, and invitation checkpoints. Verify with `git status -sb`
  before publishing and push normally after review.
- New phase work starts from refreshed `origin/main` on a `codex/*` branch.
- Never rewrite pushed history. Merge `origin/main` into a long-running phase branch when
  synchronization is needed.
- The already-merged `codex/initial-qa-fixes` branch is historical and should not receive
  new work.

## Inputs needed to close the remaining gates

Use [ENVIRONMENT_HANDOFF.md](./ENVIRONMENT_HANDOFF.md) as the operator checklist. At
minimum, an authorized operator must provide Supabase project access and server-only keys,
Stripe test-mode secrets/dashboard access, the deployed preview origin, disposable role
accounts or permission to create them, representative test records, the frozen legacy
export, and access to hosting/provider logs and alerts. Never paste secrets into source,
issues, screenshots, or chat.
