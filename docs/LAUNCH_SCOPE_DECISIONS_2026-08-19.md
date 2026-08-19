# Launch scope decisions — 2026-08-19

These decisions close the three unresolved repository requirements without collecting data or
shipping controls that have no working outcome.

## Live-room presence — implemented

- Signed-in viewers refresh one server-controlled heartbeat every 45 seconds while a valid,
  non-canceled event room is open.
- The UI receives only the number of viewers active in the last 90 seconds. Browser clients cannot
  read presence rows or viewer identifiers and cannot write the table directly.
- Heartbeats older than five minutes are removed opportunistically. Presence is ephemeral
  operational state and does not create audit events.
- The connected gate must prove authentication, aggregate-only responses, canceled-event denial,
  heartbeat refresh, and stale-viewer expiry after the migration is applied.

## Notification preferences — deferred until delivery exists

No email, SMS, or push delivery provider is connected in the launch scope. A preference screen now
would store settings that cannot affect a real notification and would create an unnecessary source
of personal data. The profile route therefore remains profile/contact management only.

Before adding notification preferences, select a delivery provider, approve consent and retention
language, define transactional versus marketing categories, and implement unsubscribe and delivery
failure behavior end to end. Event reminders remain an in-product saved reminder; they do not claim
to send an external notification.

## Product analytics — deferred; privileged audit retained

No third-party behavioral analytics SDK is included in the launch core. This keeps the public and
authenticated clients free of an undeclared tracking boundary while the privacy policy, event
catalog, retention period, and consent rules remain unapproved.

Audit logging is still required for privileged or security-relevant state changes. Business and
credential review, listing/service review, moderation, payment reconciliation, and business-member
administration use server/database-controlled audit records. Ordinary page views, searches,
heartbeats, saves, and profile edits do not create audit noise by default.

Adding product analytics later requires a versioned event catalog with purpose, owner, fields,
retention, consent basis, and a test proving that secrets and unnecessary personal data are absent.
