# Operations Runbook

This runbook covers Phase 5 backup, import, cutover, rollback, and incident handling. It
does not authorize destructive production work. Commands that touch a linked project must
be run by an operator who has first confirmed the project ref and environment banner.

## Roles and evidence

- **Incident commander:** owns go/no-go, rollback, and stakeholder updates.
- **Database operator:** verifies the Supabase project, takes backups, and runs migrations.
- **Migration operator:** owns source exports, dry runs, exception resolution, and reports.
- **Application verifier:** runs role-based smoke tests and records results.

Every operation records its UTC start/end, operator, project ref, git commit, input checksum,
command exit code, and output location. Never paste secret values into the record.

## Preflight

1. Confirm `git status --short --branch`, the intended commit, and the Supabase project ref
   in `supabase/config.toml` and the Dashboard. Stop if any identifier disagrees.
2. Run `npm ci`, `npm run check`, and `supabase migration list --linked`. Save the output.
3. Confirm an approved maintenance window, freeze owner, rollback owner, and notification
   channel.
4. Confirm the legacy export is immutable and record its SHA-256 checksum.
5. Verify the latest backup by restoring it into an isolated scratch project. A backup that
   has not been restored is not accepted as rollback evidence.

## Backup and restore rehearsal

The CLI flags below were verified against Supabase CLI 2.107.0. Do not put a database
password in shell history; use an approved secret-injection mechanism.

```sh
supabase db dump --linked --file artifacts/pre-cutover-schema.sql
supabase db dump --linked --data-only --use-copy --file artifacts/pre-cutover-data.sql
supabase migration list --linked > artifacts/pre-cutover-migrations.txt
```

Supabase database backups do not contain Storage objects. Export the `property-media`
bucket separately and reconcile object count, byte count, and SHA-256 checksums.

Restore rehearsal:

1. Create or select a scratch project that cannot receive production traffic.
2. Restore schema, roles/configuration, data, and Storage objects using the Dashboard or the
   approved database recovery procedure for the project plan.
3. Run the anonymous/member/owner/moderator/admin smoke matrix against the scratch project.
4. Compare row counts, money totals, migration list, and sampled asset checksums.
5. Record restore duration. It must fit inside the agreed recovery-time objective.

## Legacy import

The importer defaults to a credential-free dry run. It accepts normalized `businesses`,
`properties`, and `services` records, uses deterministic UUIDs, forces all imported content
back through review, and refuses apply when rows are skipped, identities/assets are
unresolved, or integer-money totals disagree.

```sh
node scripts/legacy-import.mjs legacy-export.json --report artifacts/legacy-dry-run.json
node scripts/legacy-import.mjs legacy-export.json --apply --report artifacts/legacy-apply.json
```

Apply mode additionally requires server-only `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. The input must include `expectedPriceTotalMinor` when it
contains prices. Never use floating-point major units in an import.

The deterministic target ID and unique `(source_system, legacy_id, target_table)` mapping
make a rerun resumable after an interruption. An apply report is accepted only when its
mapping reconciliation equals the accepted input count and a follow-up query verifies the
target rows. If a write fails, the batch is marked `failed`; investigate before rerunning.

## Cutover

1. Announce the window and freeze legacy writes; record the exact UTC freeze time.
2. Capture final database and Storage backups and their checksums.
3. Export the frozen source and compare its checksum with the approved import input.
4. Run the final dry run. Stop for any skipped row, unresolved identity, asset issue, or
   money mismatch.
5. Apply imports in bounded source batches and retain every reconciliation report.
6. Run role-isolation, lifecycle, marketplace, live/chat, and payment smoke tests.
7. Switch traffic only after the incident commander signs the evidence checklist.
8. Keep the legacy system read-only throughout the agreed rollback window.

## Rollback

Rollback triggers include unauthorized data access, unreconciled money, missing/corrupt
assets above the agreed threshold, failed authentication, or an unrecoverable migration
error.

1. Stop traffic and import workers; do not attempt ad-hoc repair on production.
2. Record the last successful batch and preserve logs/reports.
3. Route traffic back to the read-only legacy system.
4. Restore the verified pre-cutover database and Storage snapshot using the same procedure
   rehearsed above.
5. Re-run migration, row-count, checksum, and role-isolation verification.
6. Reopen traffic only after the incident commander signs off.

Do not delete deterministic import rows as a generic rollback. Foreign keys and valid
post-cutover writes can make row deletion unsafe; use the verified environment restore.

## Incident response

1. **Detect and contain:** record UTC time/request IDs, disable the affected feature or
   route traffic away, revoke exposed credentials, and preserve evidence.
2. **Classify:** security/privacy, money reconciliation, availability, or data integrity.
3. **Communicate:** name the incident commander, affected scope, next update time, and
   customer-facing status. Never include secrets or private data in chat/status posts.
4. **Recover:** use the rehearsed rollback or forward fix, then run the full relevant gate.
5. **Close:** document timeline, root cause, affected records, remediation, credential
   rotations, and regression tests; write an `audit_log` entry.

## Routine operations

- Review failed payment events, stale processing tips, failed migration batches, and
  moderation actions daily during launch week.
- Rotate Supabase/provider secrets quarterly and immediately after suspected exposure.
- Test recovery links and webhook signatures after relevant configuration or secret
  changes.
- Rehearse database plus Storage restore at least quarterly.
