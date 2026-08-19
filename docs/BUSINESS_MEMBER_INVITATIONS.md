# Business member invitation contract

## Goal

Give a business owner a secure, auditable way to add an existing Accountabul member to a business
without exposing direct membership-table writes to browser clients.

## Behavior and ownership

- Only an active `owner` may create invitations, change a non-owner member's role, or revoke a
  non-owner membership.
- Invitations target an existing Accountabul account by normalized email and may assign
  `manager`, `listing_manager`, `lead_manager`, or `viewer`. Ownership transfer is a separate,
  intentionally unsupported workflow.
- The invited member sees pending invitations in the authenticated dashboard and may accept or
  decline only their own invitation.
- Accepting activates the membership and records `joined_at`. Declining or owner revocation records
  a revoked membership without deleting its history.
- Every invite, response, role change, and revocation writes an admin-readable `audit_log` entry.
- Browser clients retain `SELECT` access permitted by RLS but lose direct `INSERT`, `UPDATE`, and
  `DELETE` privileges on `business_members`; all state changes cross narrow RPCs.

## Failure behavior

- Unknown accounts, self-invites, owner-role assignment, duplicate active memberships, stale
  invitations, owner mutation, cross-business mutation, and non-owner administration fail before a
  membership change.
- RPCs derive the actor from `auth.uid()` and never trust a caller-supplied actor or inviter ID.
- The invitation list RPC returns only the current user's pending invitation ID, business identity,
  role, and creation time.

## Acceptance criteria

1. Direct authenticated membership writes are revoked.
2. Owner invite, invited-member accept/decline, owner role change, and owner revoke have explicit
   success and denial-path integration tests.
3. A pending invitation does not grant business access; acceptance does; revocation removes it.
4. The dashboard surfaces pending invitations and refreshes active-business context after a
   response.
5. Staff management uses account email for invitations and no longer sends `user_id`, `invited_by`,
   `joined_at`, or invitation status from the browser.
6. Generated TypeScript RPC contracts, schema documentation, and account audit status match the
   migration.

## Non-goals

- Sending invitation email. Until a transactional email provider is selected, an existing member
  sees the invitation after signing in.
- Inviting a person who has not created an Accountabul account.
- Ownership transfer or removing the final owner.
- Changing the current RLS-backed capabilities of `listing_manager` and `lead_manager`.
