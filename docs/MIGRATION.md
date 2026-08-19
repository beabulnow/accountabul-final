# Migration Policy and Plan — Accountabul Platform Production

## Current status

The repository contains nine committed migration files covering the Phase 1-5 schema
foundation and later authorization/storage hardening. The Supabase CLI is configured with a
project reference, but the latest linked verification returned HTTP 403. Therefore, the live
applied migration state is **unknown** and must not be inferred from repository files.

No destructive migration is authorized by this document. Before adding a migration, an
authorized operator must verify the linked project and live migration list, create the file
through the current Supabase CLI, apply it to a non-production environment first, and record
the verification in the phase ledger.

## Schema migration rules

1. Forward-only, committed to source control, applied through the migration tool.
2. No dashboard-only schema changes.
3. Each `CREATE TABLE public.x` includes, in order: table, `GRANT`s, `ENABLE ROW LEVEL
SECURITY`, policies.
4. Destructive statements (`DROP`, destructive `ALTER`, data-losing type changes) require
   a written plan, an approved backup, and a rollback runbook before execution.
5. Data changes (`INSERT`/`UPDATE`/`DELETE`) never travel in schema migrations, except
   literal seed rows explicitly required for a first screen.
6. Every schema change is followed by a review of the application code that reads the
   changed tables.

## Data migration (legacy import) rules

Legacy data from the source projects is imported only in Phase 5.

- Importers are **idempotent**: re-running a batch must not duplicate rows.
- Provenance lives in `migration_record_map`: `source_system`, `legacy_id`, target table
  and deterministic target ID, migration batch, and `migrated_at`.
- The unique `(source_system, legacy_id, target_table)` mapping plus deterministic target
  IDs enforce idempotent, resumable writes.
- Every import runs **dry-run first** and emits a reconciliation report: counts in, rows
  created, rows updated, rows skipped, unresolved identities, corrupt or missing assets.
- Unresolved identities and corrupt assets are **reported, never guessed**.
- Money arrives as validated integer minor units and reconciles against
  `expectedPriceTotalMinor` before apply is allowed.
- Media is re-hosted by the cutover operator with checksum verification. The importer
  refuses apply when an asset reference lacks both a path and SHA-256; failed assets are
  reported for intentional fallback instead of guessed.

## Cutover runbook (Phase 5 deliverable)

See `docs/OPERATIONS_RUNBOOK.md` for the operator roles, backup plus Storage export,
restore rehearsal, dry-run/apply commands, cutover, rollback, and incident procedures.
