# Phase Status Ledger

Last reviewed: 2026-08-08

This ledger records evidence, not the number of screens present. A phase remains in
progress until its roadmap gate has passed end to end.

| Phase                    | Status                   | Evidence                                                                                                              | Open gate                                                                                                                     |
| ------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0 — Foundation           | Complete in this branch  | Architecture, route map, schema, threat model, migration policy, CI, migration checks, and secret scan are committed. | Merge the CI workflow and observe its first successful run.                                                                   |
| 1 — Accounts/businesses  | Gate closure in progress | Auth, recovery, profiles, businesses, memberships, credentials, directory, detail, and admin review exist.            | Run `.github/workflows/phase-1-gate.yml` with the three Supabase secrets and record the live two-user RLS result.             |
| 2 — Marketplace/services | Partial                  | Listings, services, saves, inquiries, and lead UI exist.                                                              | Storage upload/media workflow and lifecycle/storage end-to-end tests are missing.                                             |
| 3 — Live/chat            | Partial                  | Event routes, player shell, reminders, presence, chat tables, and basic chat exist.                                   | Restream adapter, unified server gateway, rate limits, provider-down/reconnect states, and moderation gate tests are missing. |
| 4 — Tips/payments        | Partial                  | Stripe checkout, signed webhook reconciliation, billing/admin surfaces, and focused webhook unit tests exist.         | Connected-provider idempotency/refund proof and tip-to-chat event are missing.                                                |
| 5 — Migration/operations | Scaffold only            | Audit and migration mapping tables plus an admin shell exist.                                                         | Importers, dry run, reconciliation, and operational runbooks are missing.                                                     |
| 6 — Launch QA            | Partial evidence         | All 18 unauthenticated routes passed an initial smoke review.                                                         | Authenticated, accessibility, cross-browser, load, security, monitoring, and alerting gates are missing.                      |

## Branch baseline

- Canonical repository: `beabulnow/accountabul-final`
- Integration branch: `main`
- Phase work starts from refreshed `origin/main` on a `codex/*` branch.
- Never rewrite pushed history. Merge `origin/main` into a long-running phase branch when
  synchronization is needed.
- The already-merged `codex/initial-qa-fixes` branch is historical and should not receive
  new work.

## Required Phase 1 credentials

Configure these as GitHub Actions repository secrets, then manually run **Phase 1 live
RLS gate**:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The test creates two disposable confirmed users and two draft businesses, verifies
cross-user isolation, and deletes its test data. The service-role key is server/CI-only
and must never use a `VITE_` prefix. The connected Supabase management integration did
not have permission to inspect this project during the 2026-08-08 audit, so the gate
cannot be substituted with an MCP-side test.
