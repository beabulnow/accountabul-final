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
- Before application, `supabase db push --linked --dry-run --include-all` confirmed exactly three
  pending migrations: legacy probe cleanup, business-member invitation RPCs, and aggregate event
  presence hardening.

## Connected release gate

- The authorized normal forward push applied those three migrations successfully. A subsequent dry
  run reports the remote database is up to date, and all 25 local/remote migration records match.
- `npm run test:connected` passed six database/Storage tests with zero failures and zero skips:
  account isolation, public projection and review gates, business-member invitations, property-media
  Storage RLS, chat authorization/moderation/rate limiting, and aggregate event presence.
- Post-application database lint completed with no error-level findings and only the same documented
  FXRP testnet warnings.

The FXRP warnings belong to the already-applied testnet-only contract and do not block the Accountabul
marketplace/account/live core; any FXRP change requires its own financial-flow review and connected
regression gate.
