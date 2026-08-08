# Phase Status Ledger

Last reviewed: 2026-08-08

This ledger records reproducible evidence. "Credential-free complete" means all safe work
that does not need a connected provider has been implemented and verified; it does not mean
the roadmap's connected gate has passed.

| Phase                        | Credential-free status   | Concrete evidence                                                                                                                                                                                                                  | Connected gate still required                                                                                                                                                                  |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Foundation               | Complete in this branch  | Architecture, route map, schema, threat model, additive migration policy, three phase workflows, migration checks, secret scan, Node 22 CI.                                                                                        | Merge and observe the repository workflows pass on GitHub.                                                                                                                                     |
| 1 — Accounts and businesses  | Complete                 | Atomic business/owner creation, staff membership management, narrow public projections, credential submission/review, audited lifecycle RPCs, RLS and grant hardening. Unit/static gates pass.                                     | Apply migrations and run the two-user/two-business live RLS workflow with Supabase credentials; record anonymous 403/private-field proof.                                                      |
| 2 — Marketplace and services | Complete                 | Listing/service lifecycle, saves, business follows, inquiries, leads, private property media bucket, manager-only writes, signed reads, cleanup and missing-image fallback. Storage policy tests pass.                             | Apply migrations in a disposable project and run the member/owner/outsider/suspended-parent upload lifecycle gate.                                                                             |
| 3 — Live events and chat     | Complete                 | Scheduled/connecting/live/reconnecting/ended/provider-down UI, server-only chat RPC, room/event validation, bans, moderator rules, atomic rate limiting, and direct-insert revocation. Chat tests and static boundary checks pass. | Apply migrations and run the live member/banned/burst/forged-user/moderator/anonymous chat gate; verify the configured streaming provider and replay URLs.                                     |
| 4 — Tips and payments        | Complete                 | Strict server checkout inputs/return origin, signed webhook reconciliation, idempotent paid-tip chat event, failure/expiry/refund handling, audit trail, and focused webhook tests.                                                | Configure Stripe test mode and save checkout, duplicate/reordered webhook, refresh, async failure, wrong amount/currency/session, and refund evidence.                                         |
| 5 — Migration and operations | Complete                 | Deterministic allowlisted importer, safe dry run, forced re-review, money/identity/asset validation, resumable mapping reconciliation, fixtures and reports, plus backup/restore/cutover/rollback/incident runbooks.               | Supply the frozen legacy export and connected scratch project; rehearse database plus Storage restore, run final dry/apply reconciliation, and obtain operator sign-off.                       |
| 6 — Launch QA                | Credential-free complete | Aggregate check passes; static QA 48/48; production-preview route smoke 18/18; production-preview load smoke 100 requests at concurrency 10 with zero failures; production build passes. Evidence is in `artifacts/`.              | Run authenticated role and browser/accessibility matrices against a deployed preview, connected security/payment/storage/chat tests, representative load tests, and trigger monitoring/alerts. |

## Latest local verification

- `npm run check`: passed — 7 migrations inspected, static QA 48/48, typecheck and
  lint with no errors, tests 25 passed/4 credential-dependent skipped, production build
  succeeded.
- `npm run preview` plus `npm run qa:smoke -- http://127.0.0.1:3013`: the pinned
  Cloudflare Worker preview started and 18/18 route shells passed.
- `npm run qa:load -- http://127.0.0.1:3013`: 100 requests, concurrency 10, zero
  failures (p50 216 ms, p95 349 ms, max 359 ms). This is a local smoke result, not a
  production capacity claim.
- The skipped tests are intentionally connected gates and list the exact missing Supabase
  variables in their output.

## Branch baseline

- Canonical repository: `beabulnow/accountabul-final`
- Integration branch: `main`
- Phase work starts from refreshed `origin/main` on a `codex/*` branch.
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
