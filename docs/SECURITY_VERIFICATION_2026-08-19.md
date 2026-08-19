# Security verification — 2026-08-19

## Read-only checks

- `npm audit --omit=dev --audit-level=high` completed successfully with **0 vulnerabilities**.
- `supabase db lint --linked --level warning` completed successfully against Supabase project
  `vvrudyzeublgunlfgvlt`. It reported no error-level findings and two classes of existing FXRP
  testnet warnings:
  - the compatibility overload of `reserve_xrp_acceptance` intentionally rejects every incomplete
    split-settlement request, so its named parameters are intentionally unused;
  - `claim_fxrp_acceptance_batch` initializes two `timestamptz` variables from PostgreSQL's valid
    `infinity` literal and retains one unused local variable. The linter recommends explicit casts,
    but this is not a runtime type failure.
- `supabase db push --linked --dry-run --include-all` confirmed exactly three pending migrations:
  legacy probe cleanup, business-member invitation RPCs, and aggregate event presence hardening.

No remote database writes were performed by these checks. The pending migration functions cannot be
linted or exercised against the linked database until an authorized operator approves their normal
forward application. The FXRP warnings belong to the already-applied testnet-only contract and do not
block the Accountabul marketplace/account/live core; any FXRP change requires its own financial-flow
review and connected regression gate.
