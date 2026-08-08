# Canonical Schema — Accountabul Platform Production

Phase 0 deliverable: schema diagram + migration skeleton. **No migration has been run.**
The first migration executes in Phase 1 after the RLS threat model is signed off.

## Conventions (non-negotiable)

- UUID primary keys generated in Postgres (`gen_random_uuid()`).
- `timestamptz` in UTC for all time.
- Money as `bigint` minor units + uppercase ISO `currency` code. No floating point.
- Plural snake_case tables, snake_case columns.
- Lifecycle: `created_at`, `updated_at`, plus `deleted_at`, `published_at`,
  `archived_at`, `created_by`, `updated_by` where relevant.
- Unique stable `slug` for public URLs, with redirect handling on change.
- External records carry `provider`, `provider_account_id`, `provider_record_id`.
- Imported records carry `source_system`, `legacy_id`, `migration_batch_id`, `migrated_at`.
- Idempotency via unique constraints on provider event IDs and explicit idempotency keys.
- Foreign-key delete behavior declared intentionally; never left to defaults.
- `jsonb` only for provider payload fragments or genuinely flexible attributes.
- Every `CREATE TABLE public.x` is immediately followed by explicit `GRANT`s, then
  `ENABLE ROW LEVEL SECURITY`, then policies.

## Entity map

```text
auth.users
   │ 1:1
profiles ─────────────< user_roles                (global roles; admin-write only)
   │
   │ 1:N
business_members >──── businesses ───< business_credentials
                            │  │  │
                            │  │  └──< services ───< service_inquiries
                            │  └─────< properties ─< property_media
                            │                     └< property_inquiries (leads)
                            │
saved_properties >──── properties
business_follows  >─── businesses

events ──< event_reminders
   │    └< chat_messages ──< chat_moderation_actions
   │    └< event_presence
   └──────< tips ──< payment_events (provider webhook ledger, idempotent)

audit_log (append-only, admin-read)
migration_batches ──< migration_record_map
```

## Table sketches

### Identity and access

- **`profiles`** — `id` (= `auth.users.id`), `email_display`, `first_name`, `last_name`,
  `display_name`, `avatar_path`, `phone`, `city`, `state`, `country`,
  `onboarding_status`, timestamps. Owner-only read/update. A narrow public view exposes
  only `id`, `display_name`, `avatar_url`. Email and phone are never public.
- **`user_roles`** — `id`, `user_id`, `role` (`member` | `business_owner` |
  `business_staff` | `moderator` | `admin`), `granted_by`, `granted_at`, `revoked_at`.
  Unique active `(user_id, role)`. Written only by admins or privileged server functions.
  Read through a `security definer` `has_role(_user_id, _role)` function to avoid
  recursive RLS.
- **`businesses`** — `id`, `slug`, `legal_name`, `display_name`, `headline`,
  `description`, `logo_path`, `cover_path`, `website_url`, `public_email`,
  `public_phone`, `year_founded`, `employee_count_range`, `primary_industry`,
  `address_city/state/country`, `service_areas`, `profile_status`
  (`draft|pending_review|published|rejected|suspended|archived`), `verification_status`
  (`unverified|pending|in_review|verified|rejected|expired`), `public_profile_enabled`,
  `created_by`, timestamps, `published_at`.
- **`business_members`** — `id`, `business_id`, `user_id`, `membership_role`
  (`owner|manager|listing_manager|lead_manager|viewer`), `permissions`,
  `invitation_status`, `invited_by`, `joined_at`, timestamps. An owner may grant only
  within their own business.
- **`business_credentials`** — private verification artifacts plus a
  `public_display_approved` flag. Documents and private notes are never client-readable.

### Marketplace

- **`properties`** — `id`, `business_id`, `slug`, title, description, address parts,
  geo, `price_minor` `bigint`, `currency`, `property_type`, `status`
  (`draft|pending_review|published|rejected|archived`), `created_by`, timestamps,
  `published_at`, `archived_at`.
- **`property_media`** — ordered media rows referencing storage paths, with alt text.
- **`property_inquiries`** / **`service_inquiries`** — lead rows readable only by
  permitted members of the owning business, plus the submitting user.
- **`services`** — business service listings with availability and service areas.
- **`saved_properties`**, **`business_follows`** — owner-scoped join tables.

### Live and chat

- **`events`** — `id`, `slug`, title, description, `scheduled_start_at`,
  `actual_start_at`, `ended_at`, `status`
  (`scheduled|live|ended|canceled|replay_available`), `provider`,
  `provider_account_id`, `provider_record_id`, `replay_url_path`, moderation settings.
- **`event_reminders`**, **`event_presence`**, **`chat_messages`**,
  **`chat_moderation_actions`** — chat writes always pass through the server; bans and
  roles are enforced server-side and cannot be forged by a client.

### Money

- **`tips`** — `id`, `event_id`, `from_user_id`, `to_business_id`, `amount_minor`
  `bigint`, `currency`, `status` (`created|processing|paid|failed|refunded`), `provider`,
  `provider_record_id`, `idempotency_key` (unique), timestamps.
- **`payment_events`** — raw-but-redacted provider event ledger with a unique
  `(provider, provider_event_id)` so repeated webhooks create exactly one paid tip.

### Operations

- **`audit_log`** — append-only actor/action/target/diff with request ID; admin-read only.
- **`migration_batches`**, **`migration_record_map`** — `source_system`, `legacy_id`,
  new UUID, batch, `migrated_at` for idempotent re-runnable imports.

## Indexing plan

Foreign keys used in reads; `properties (status, published_at)`;
`properties (business_id, status)`; `businesses (profile_status, published_at)`;
unique indexes on all slugs; `chat_messages (event_id, created_at)`;
`tips (provider, provider_record_id)` unique; `payment_events (provider, provider_event_id)`
unique. Verify with `EXPLAIN (ANALYZE, BUFFERS)` on representative data before launch.

## Migration skeleton (order, not yet executed)

1. `0001_extensions_and_enums`
2. `0002_profiles_and_user_roles` (+ `has_role` security-definer function)
3. `0003_businesses_and_members`
4. `0004_business_credentials`
5. `0005_properties_and_media`
6. `0006_services_and_inquiries`
7. `0007_saves_and_follows`
8. `0008_events_chat_presence`
9. `0009_tips_and_payment_events`
10. `0010_audit_log`
11. `0011_migration_mapping_tables`

Each migration is forward-only, contains its GRANTs and RLS policies inline, and is
committed to source control.
