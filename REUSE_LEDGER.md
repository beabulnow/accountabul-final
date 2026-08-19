# Reuse Ledger — Accountabul Platform Production

Every meaningful extraction from a source project must be recorded here before it lands.

Decisions: `reuse` (reviewed, presentation-only, no secrets/authz/persistence), `adapt`
(UI, types, validation, copy, status labels, provider-neutral concepts), `rewrite`
(auth, authz, database access, chat transport, Restream, payments, uploads, admin,
all server code), `exclude` (dormant tokenization, campaigns, donations, wallet
secrets, broad KYC, unrelated Web3).

| Source project              | Source file                                                                                       | Destination                                                                          | Decision | Reason                                                                                                                         | Security review                         | Test coverage                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------- |
| accountabul-sites-prototype | (visual direction only)                                                                           | `src/styles.css`, `src/components/site-header.tsx`, `src/components/site-footer.tsx` | adapt    | Brand direction, navigation hierarchy, and responsive layout re-expressed as semantic design tokens. No prototype code copied. | N/A — presentation only, no data access | Signed-out Chromium 54/54; authenticated/cross-browser matrix pending |
| accountabul-sites-prototype | route concept                                                                                     | `src/routes/*`                                                                       | adapt    | Route map preserved 1:1; feature implementations were authored in this repository rather than copied from the prototype.       | N/A                                     | Static QA 50/50 and route smoke 18/18; authenticated matrix pending   |
| accountable-stream-platform | Firebase architecture, client-side moderation, embedded credentials, hardcoded Restream fallbacks | —                                                                                    | exclude  | Violates server-side secret and moderation boundaries.                                                                         | Rejected by policy                      | N/A                                                                   |
| property-web3-portal        | tokenization / wallet / campaign modules                                                          | —                                                                                    | exclude  | Out of MVP scope; requires explicit approval.                                                                                  | Rejected by policy                      | N/A                                                                   |

## Status

Phase 0 extracted **no executable code** from any source project. Nothing was reused
as-is. The production application was subsequently connected only to its dedicated
`beabulnow/accountabul-final` repository and Lovable project; the excluded source repositories
remain out of scope and unmodified.
