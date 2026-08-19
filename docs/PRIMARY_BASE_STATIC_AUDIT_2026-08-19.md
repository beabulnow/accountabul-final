# Primary Base Static Security and Quality Audit

**Prepared:** 2026-08-19
**Target snapshot:** Lovable `3601ff823bedcacdeb9d30e3039eaad49a6d7238`
**Scope:** Core identity, directory, marketplace, saved items, leads, routing, navigation, and
documentation inspected through the Lovable file API.

## Evidence limitations

This is repository evidence, not connected-environment certification. The Lovable database
query action remains unavailable because the connector lacks `projects:write`; therefore the
actual remote migration list, grants, policies, advisors, records, and function definitions
are not yet verified. Each database finding must be confirmed against the live catalog before
applying a forward-only fix, but the checked-in source is sufficient to block release until
resolved or disproved by stronger evidence.

## Release-blocking findings

### P1 — Saved-property RPC can disclose a full nonpublic property row

Evidence:

- `supabase/migrations/20260531234314_ac669155-9de9-41d3-9aa2-fb0458e9247f.sql`
  defines `public.get_saved_properties_for_user()` as `SECURITY DEFINER`.
- The function returns `to_jsonb(p.*)`, bypassing normal property RLS for every saved row
  belonging to the caller.
- Generated types show `properties` includes `contact_email`, `contact_phone`,
  `owner_user_id`, `owner_wallet`, `review_notes`, projected return/yield fields, and other
  columns that should not automatically travel through a public saved-list response.
- The UI removes certain stale saves only after it has already read the RPC response. Client
  pruning cannot prevent disclosure.

Required fix:

- Replace the JSON wildcard with a typed, explicit public-listing projection.
- Require a published/public eligibility predicate before joining listing details.
- Return only save metadata or a null listing projection when an item is no longer public;
  remove it through a deliberate server path if product policy requires pruning.
- Keep a fixed `search_path`, explicit execute grants, and a caller-bound `auth.uid()` check.

Required tests:

- User A cannot retrieve User B's saves.
- A saved published property exposes only the approved public columns.
- Draft, rejected, under-review, delisted, deleted, or otherwise private property details are
  not returned after the state transition.
- Forged `user_id`, property ID, wallet address, and direct REST/RPC calls do not broaden data.

### P1 — Public vendor-by-slug RPC can bypass the verified-directory gate

Evidence:

- `supabase/migrations/20260612000759_b60217d1-8ebb-4d8a-b1b4-c2ef3aa9f2ef.sql`
  recreates `public.get_vendor_public_profile_by_slug(text)` as `SECURITY DEFINER` and grants
  it to `anon` and `authenticated`.
- Its public branch requires `public_profile_enabled = true` and a slug, but does not require
  `verification_status = 'verified'`.
- The security-invoker directory view can rely on base RLS, but this security-definer function
  runs with owner privileges and implements its own weaker predicate.
- The function returns business email and phone along with the unverified profile.

Required fix:

- Require `verification_status = 'verified'` for every anonymous/non-owner branch.
- Split owner preview from public lookup or make caller purpose explicit in separate functions.
- Place privileged helpers outside the exposed schema where practical, revoke public execute,
  and expose only a narrow reviewed wrapper.
- Decide explicitly whether public email/phone are opt-in fields; otherwise omit them from the
  projection and use the lead form.

Required tests:

- Anonymous and unrelated authenticated users receive no row for draft, requested, pending,
  denied, suspended, or disabled profiles.
- The owner may preview only their own row through the owner path.
- Admin preview is authorized from server/database state.
- Verified plus enabled is the only public result; disabling or suspension removes it
  immediately.

### P1 — Anonymous lead tables are a direct abuse surface

Evidence:

- Vendor migrations grant/directly allow anonymous inserts for directory contact leads and
  `intake_join` records.
- Later migrations add length and basic email constraints, which is useful, but no repository
  evidence proves per-origin/user/IP throttling, bot protection, duplicate suppression, or an
  auditable server gateway for the public forms.
- Lead rows contain names, email addresses, phone numbers, free text, property/service context,
  assignment, notes, and follow-up state.

Required fix:

- Route public submission through an Edge/server function with schema validation, verified
  destination checks, atomic rate limiting, abuse telemetry, and a privacy-safe response.
- Remove direct anonymous table insert privileges when the server gateway is active.
- Keep vendor/admin read and lifecycle writes behind membership/role checks.
- Establish retention/deletion rules for rejected/spam leads and prevent public writes to
  internal notes, assignment, or status.

Required tests:

- Oversized, malformed, repeated, arbitrary-destination, status/assignment injection, and burst
  submissions are rejected.
- Anonymous submission never grants lead read access.
- Vendor A cannot read/update Vendor B's leads.
- Staff/manager/owner/admin permissions match the final role contract.

## High-priority architecture and correctness findings

### P2 — Business authority is a mutable person-profile attribute

- Individual/business signup writes `profiles.account_type` and `company_name` from the
  browser.
- `src/pages/Dashboard.tsx` lets a signed-in user switch the profile between individual and
  business.
- Generated types show no canonical `businesses` or business-membership table. `vendor_profiles`
  is unique per `user_id`, preventing durable multi-user company ownership and staff roles.

Required result: separate person, business, and active business-membership authorities; keep
`account_type` only as onboarding/presentation metadata. Create a business with its owner in
one server/database transaction and test staff/manager/owner boundaries.

### P2 — Route authority is incomplete and inconsistent

- `RouteGuard.allowedAccountTypes` is accepted but unused.
- Several private/business routes are not wrapped at the router boundary.
- Admin denial is displayed as “Coming Soon,” hiding an authorization outcome.

Required result: one explicit public/authenticated/business-member/admin route policy; direct
URL tests must match navigation behavior and database authority.

### P2 — Admin UI access depends on a hardcoded email

- `src/hooks/useTeamAccess.ts` denies every admin role row unless the current email equals a
  source-code constant.
- Navigation performs a different role query, creating competing UI authority logic.

Required result: one server/database role source, no hardcoded identity, no public promotion,
cache invalidation on auth/role change, and admin denial tests. Database authorization remains
mandatory even after the UI is fixed.

### P2 — Vendor and professional records are competing identities

- `vendor_profiles` contains company identity and verification; `professionals` separately
  contains public service identity linked by wallet address.
- `service_bookings` link to professionals/wallet identity rather than a canonical business
  membership.
- Properties can link to `vendor_profile_id` while also carrying `owner_user_id` and
  `owner_wallet`.

Required result: one business entity and membership model, with professional/vendor categories,
credentials, services, products, properties, bookings, and leads attached by stable foreign
keys. Preserve legacy IDs through a deterministic mapping.

### P2 — Public directory and professional queries are unbounded

- `VendorsDirectory` uses `vendor_public_profiles.select('*')`, fetches all records, filters in
  the browser, and refetches every 120 seconds.
- `useProfessionals` also uses `select('*')`.

Required result: explicit public fields, server-side search/filter, stable ordering, bounded
pagination, indexed predicates, intentional cache invalidation, and request/transfer evidence.

### P2 — Public contact-field consent is not explicit

- The public vendor projection contains email, phone, ZIP, and location fields.
- A `public_profile_enabled` flag does not prove that each contact field was knowingly approved
  for publication.

Required result: per-field publication rules or a reviewed business-publication contract. Use
the protected lead workflow when direct contact data is unnecessary.

### P2 — Accessibility regressions are present in global/navigation CSS

- Desktop navigation containers have unconditional `hidden` classes.
- `src/index.css` suppresses scrollbars on `html`, `body`, and every element.

Required result: breakpoint-correct desktop navigation, scoped overflow behavior, visible
focus and scroll affordances, viewport/keyboard/screen-reader evidence, and no global scrollbar
suppression.

### P2 — Architecture and auth documentation contradict later security changes

- Current documents still claim testnet wallet secrets are stored and describe legacy open
  tables, while later migrations say wallet-secret storage was dropped/locked down.
- The documents do not describe the current vendor network, saved-user migration, or the
  production account model required by this release.

Required result: regenerate architecture, schema, data flow, trust boundaries, provider
configuration, and failure modes from the reconciled code and live catalog. Stale documentation
must not be used as deployment evidence.

## Positive patterns to retain

- Saved rows now have `user_id`, a `(user_id, property_id)` uniqueness constraint, and direct
  RLS bound to `auth.uid()`.
- Vendor hardening added a security-invoker public view, field length caps, verified-vendor
  product rules, privilege revocation, and triggers that prevent owner self-verification.
- Public vendor data is already separated into a projection shape rather than requiring the
  private vendor row everywhere.
- Admin/compliance role checks exist in database policies and server functions; they should be
  consolidated rather than discarded.

These patterns are provisional until the live database confirms the corresponding migrations
and grants are active.

## Closure rule

A finding closes only when the reconciled target contains the fix, targeted positive and
negative tests pass, connected database evidence confirms the deployed policy/function, and
the finding is linked in the final evidence index. UI behavior or a migration file by itself
does not close a database finding.
