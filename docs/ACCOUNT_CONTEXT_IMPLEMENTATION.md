# Account context implementation

## Goal

Make authenticated dashboard behavior deterministic for personal members and people who belong to
one or more businesses. Every business-scoped read and write must use an explicit active business,
and the interface must not offer actions that the current database policies will reject.

## Users and behavior

- Signed-out visitors may use public routes, but dashboard routes send them to login and preserve a
  safe return path.
- Signed-in people may use personal profile and sent-payment features without a business.
- A person with one active business uses it automatically.
- A person with multiple active businesses can switch between them. The selected business ID is
  stored in the URL so refreshes, copied links, and browser history remain deterministic.
- An unknown or unauthorized `business` URL value falls back to the first active membership in a
  stable display-name/ID order. It never becomes a query or mutation scope.
- Business-scoped screens use the same active membership instead of issuing separate "first row"
  membership queries.
- UI capabilities mirror the current RLS contract: `owner` and `manager` may edit business content;
  `listing_manager`, `lead_manager`, and `viewer` currently have read-only access. RLS remains the
  authorization boundary.

## Data contract

The active-business query reads only active memberships for the signed-in user and the minimum
business fields required by navigation and dashboard summaries. Personal profile and tips sent by
the user remain user-scoped. Business content, leads, credentials, staff, and received tips are
scoped by the selected `business_id`.

## Acceptance criteria

1. A signed-out request to any `/dashboard` route is redirected to `/login` with a safe return path.
2. Dashboard children do not render protected content while session state is unresolved.
3. Active membership selection is stable and rejects business IDs absent from the user's active
   memberships.
4. Switching businesses updates the URL and every business-scoped query key and filter.
5. Overview, business, properties, services, leads, and received billing use the shared context.
6. Edit controls are hidden or disabled when the membership lacks the RLS-backed capability.
7. Pure selection and capability rules have automated success and failure-path tests.
8. Type checking, linting, tests, migration checks, static QA, and production build pass.

## Non-goals for this checkpoint

- Server-rendered cookie authentication. The existing Supabase session is browser-managed, so this
  checkpoint provides a central client route boundary without claiming SSR authentication.
- Changing database role semantics. Granular write access for `listing_manager` and `lead_manager`
  requires a reviewed forward migration and integration tests.
- Email delivery for staff invitations. Member invitation lifecycle will be implemented separately
  from active-business selection so neither change obscures the other's authorization behavior.
