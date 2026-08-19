# Primary Base Implementation Port Map

**Prepared:** 2026-08-19
**Primary target:** `JibreelMuhammad/property-web3-portal`
**Target snapshot inspected:** Lovable `3601ff823bedcacdeb9d30e3039eaad49a6d7238`
**Donor:** `beabulnow/accountabul-final`, recovery branch

This is a transfer contract, not authorization to copy migrations or overwrite either
repository. It identifies which existing target behavior stays, which donor patterns should
be adapted, and where the production source of truth must live after reconciliation.

## Current target findings that drive the port

- The target has 522 tracked files, more than 50 pages, more than 60 Edge Functions, and over
  100 migrations. It must be reduced by contract and measured changes, not a broad rewrite.
- `src/components/RouteGuard.tsx` declares `allowedAccountTypes` but never enforces it.
- `src/hooks/useTeamAccess.ts` requires a hardcoded administrator email in addition to a
  `user_roles` row. Email must not be a production authority.
- Individual/business signup and `src/pages/Dashboard.tsx` write `profiles.account_type`; a
  person can change that value in the UI. It is presentation metadata, not authorization.
- `/dashboard`, `/list-property`, vendor dashboard/status, billing, settings, credentials,
  cause application/donations, and several other routes are not consistently guarded at the
  router boundary.
- The verified vendor directory queries `vendor_public_profiles.select('*')`, loads the full
  result, filters in the browser, and polls every two minutes.
- A separate `/professionals` directory reads another `professionals` table with
  `select('*')`, creating competing business identities.
- Saved properties are already keyed by the signed-in user and use a narrow lookup RPC. This
  behavior should be retained and proven with two-user RLS tests.
- Desktop navigation containers have unconditional `hidden` classes, while global CSS hides
  every scrollbar. Both require accessible responsive corrections.
- `docs/ARCHITECTURE.md` and `docs/AUTH_SYSTEM.md` still describe legacy/open wallet tables and
  stored wallet secrets that later security migrations removed. Documentation is not a
  reliable current-state contract until rewritten.
- There is no target live-event/Restream route or root `DESIGN_SYSTEM.md` at the inspected
  snapshot.

## Source-of-truth decisions

### Static schema snapshot

The generated target types at the inspected commit expose 61 tables/views/functions. Relevant
tables include `profiles`, `vendor_profiles`, `vendor_credentials`, `vendor_products`,
`vendor_leads`, `professionals`, `service_bookings`, `properties`, `saved_properties`, and
`user_roles`; there is no generated canonical `businesses` or business-membership table.
`properties` currently carries `owner_user_id`, `owner_wallet`, and `vendor_profile_id`.
`app_role` is `admin | moderator | user | compliance_officer`.

The checked-in migration chain already contains later hardening for vendor verification and
saved-user ownership, but the static audit found release-blocking projection/RPC and anonymous
lead issues. See
[`docs/PRIMARY_BASE_STATIC_AUDIT_2026-08-19.md`](PRIMARY_BASE_STATIC_AUDIT_2026-08-19.md).

| Concept | Production authority | Compatibility treatment |
| --- | --- | --- |
| Authenticated person | `auth.users` plus private `profiles` row | `profiles.account_type` may be a display/onboarding preference only |
| Business | One `businesses` entity | Vendor/professional attributes attach to the business; no duplicate company identity |
| Business access | `business_memberships`/`business_members` with active owner, manager, staff roles | Existing owner profile fields migrate to membership/business fields |
| Platform admin | Protected `user_roles` or server-controlled app claim, checked by DB/RPC | Remove the hardcoded-email condition; no public self-promotion |
| Public business data | Security-invoker public projection with explicitly approved columns | Existing vendor public view becomes or feeds the canonical projection |
| Listings | Canonical property/service rows owned by `business_id` | Existing property records retain IDs and ownership through mapped FKs |
| Saves | `(user_id, listing_id)` with uniqueness and RLS | Preserve target property IDs and saved rows |
| Leads | Inquiry rows addressed to `business_id`, visible to authorized members | Vendor leads and listing inquiries share a documented lifecycle |
| Live event | `events` plus explicit scheduled/live/ended state | Restream channel URL is configuration, not event authority |
| Live chat | `chat_messages` written through a validated, rate-limited server/RPC path | No direct browser inserts |

Exact table names are finalized only after connected schema inspection. A forward-only
migration must adapt the real schema; donor migrations must never be applied verbatim.

## Route contract

### Public

| Target route | Intended behavior |
| --- | --- |
| `/` | Public homepage and product entry points |
| `/marketplace` | Published property/service listings, paginated and searchable |
| `/property/:id` | Published listing detail; private/unpublished rows behave as not found |
| `/businesses` | Canonical public business/service directory; new route or `/vendors` alias |
| `/businesses/:slug` | Canonical public business profile |
| `/vendors`, `/vendors/:slug` | Temporary compatibility redirects or aliases to canonical business routes |
| `/professionals` | Filtered directory view backed by canonical businesses, not a separate identity table |
| `/live`, `/live/:slug` | Public event discovery and approved readable live room |
| `/auth/*`, `/reset-password` | Signed-out authentication/recovery surfaces |
| `/legal/*`, `/pricing` | Public legal and pricing information |

### Authenticated person

- `/dashboard` and profile/settings routes.
- `/saved`.
- Inquiry submission and live-chat write actions.
- Billing/payment history belonging to the person.
- KYC/credentials views belonging to the person where enabled.

### Active business member

- Business dashboard, listings, services, leads, staff, credentials, and billing.
- Owner/manager writes and staff reads/actions are separated explicitly.
- `/list-property` requires an authorized business membership, not a mutable profile flag.

### Admin

- `/admin/*`, reviews, role administration, moderation, and protected integration controls.
- Admin denial must be explicit; it must not masquerade as a generic “Coming Soon” response.

Experimental wallet, tokenization, swap, pools, escrow, treasury, AI-agent, mainnet, and yield
routes remain disabled or admin/prototype-only until separately certified.

## Vertical port plan

| Vertical | Retain/adapt in target | Donor reference | Target implementation result |
| --- | --- | --- | --- |
| Session | `src/hooks/useAuth.ts` and Supabase session | `src/hooks/use-session.tsx` | One session provider returning user, loading, server-derived roles, and safe redirects |
| Route authority | Replace incomplete `RouteGuard` contract | `src/routes/dashboard.tsx`, `src/routes/admin.tsx` | Central route policy for public/auth/business/admin with direct-URL tests |
| Business identity | Vendor profile/network components and public profile UI | `src/routes/dashboard.business.tsx`, `src/hooks/use-business.tsx` | Separate business and membership records; atomic create-with-owner RPC |
| Admin | Existing target admin pages and server functions | donor admin review RPC patterns | Remove email allowlist; explicit server/RLS authorization and audit events |
| Directory | `VendorsDirectory`, `VendorPublicProfile` visual structure | `src/routes/businesses.index.tsx`, `src/routes/businesses.$slug.tsx` | Narrow public projection, server filters, pagination, one canonical business route |
| Professionals | Existing category/catalog content | canonical donor business/services model | Category-filtered canonical businesses; legacy professional IDs mapped, not duplicated |
| Marketplace | Existing `Marketplace`, property detail and target imagery | `src/routes/marketplace.tsx`, `src/routes/properties.$slug.tsx` | Published-only narrow queries, pagination, stable ordering, complete failure states |
| Saves | Target `useSavedProperties` optimistic UI and lookup RPC | `src/routes/saved.tsx` plus RLS tests | Dedicated private page, sign-in return path, two-user isolation tests |
| Leads | Vendor lead UI and business contact modal | `src/routes/dashboard.leads.tsx`, business inquiry forms | One inquiry lifecycle tied to business membership and public listing/service |
| Live | Target navigation and card primitives | `src/routes/live.index.tsx`, `src/routes/live.$slug.tsx` | Event-backed list/room, Restream iframe, deterministic provider states |
| Chat | No target direct equivalent | `src/lib/chat.functions.ts`, `src/lib/chat-gateway.ts` and chat migration/tests | Server-only write, validation, bans, moderation, rate limiting, safe reads |
| Tips | Existing target payments only if launch-approved | donor Stripe reconciliation/webhook patterns | Optional core-adjacent path; idempotent provider events and business attribution |
| Design | Target colors, cards, gradients, logo, dark mode | donor responsive/a11y QA patterns | Root `DESIGN_SYSTEM.md`, visible desktop nav, scoped scrollbars, tested states |

## Migration sequence after connected inspection

1. Inventory actual tables, columns, views, functions, grants, RLS policies, indexes, storage
   buckets, and the remote migration list.
2. Write a data-preservation report for profiles, vendors, professionals, properties, saves,
   leads, and roles. Record counts and orphan/duplicate identities.
3. Add canonical businesses and memberships only where the current schema lacks them.
4. Backfill relationships deterministically; ambiguous identities go to an exception report.
5. Add public security-invoker projections with narrow grants.
6. Add/repair RLS and server RPCs, then run anonymous, cross-user, cross-business, suspended,
   and admin tests before switching UI reads.
7. Switch routes/hooks to the canonical sources and keep compatibility views/redirects for
   referenced public links.
8. Remove legacy authority only after count, relationship, and behavior reconciliation passes.

No destructive migration proceeds without a verified backup and rollback plan.

## Commit sequence for the primary branch

1. `chore(repo): reconcile Lovable and GitHub source state`
2. `docs(core): add design route account and schema contracts`
3. `feat(auth): enforce business memberships and admin roles`
4. `feat(directory): unify public businesses vendors and professionals`
5. `feat(marketplace): secure listings saves and lead flows`
6. `feat(live): add Restream events chat and moderation`
7. `perf(core): bound queries assets and route bundles`
8. `test(core): add connected role browser accessibility and launch gates`
9. `docs(ops): record deployment evidence and rollback`

Each commit must build and pass the checks available at that stage. History can be split
further, but unrelated verticals must not be bundled into one opaque change.

## Do not port

- Donor database migrations or generated Supabase types as if schemas were identical.
- Donor framework/router plumbing; the target remains Vite/React Router unless separately
  approved.
- Mock records, hardcoded IDs/emails, provider secrets, or test credentials.
- Wallet secrets, legacy open-write tables, or unverified architecture claims from target
  documentation.
- Tokenization/trading/yield copy presented as production-ready financial functionality.

## Ready-to-code threshold

Implementation can begin when G0 is complete and connected schema inspection proves the
actual target authorities. Until then, this map is ready for transfer but database/table
names that depend on live state remain provisional.

The discovered local checkout under `Documents\Accountabul Platform\property-web3-portal`
must not be used as the production worktree: it is 241 GitHub commits behind and contains
uncommitted vendor/shop work belonging to an earlier branch. Create a clean sibling clone
after local repository authorization succeeds.
