# Environment and Credential Handoff

The application and credential-free tests can be built without these values. The remaining
connected gates require an authorized operator to configure them in local `.env`, the
hosting secret store, provider dashboards, and GitHub Actions as indicated. Do not send
secret values in chat or commit them.

## Required to run the connected application

| Input                               | Where to obtain it               | Where to configure it                     | Exposure               |
| ----------------------------------- | -------------------------------- | ----------------------------------------- | ---------------------- |
| `SUPABASE_PROJECT_ID` / project ref | Supabase project settings        | Server runtime and CLI link               | Identifier             |
| `SUPABASE_URL`                      | Supabase Data API settings       | Server runtime + GitHub Phase 1 gate      | Public endpoint        |
| `SUPABASE_PUBLISHABLE_KEY`          | Supabase API keys                | Server runtime + GitHub Phase 1 gate      | Public with RLS/grants |
| `VITE_SUPABASE_PROJECT_ID`          | Same project ref                 | Browser build                             | Public identifier      |
| `VITE_SUPABASE_URL`                 | Same Data API URL                | Browser build                             | Public endpoint        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`     | Same publishable key             | Browser build                             | Public with RLS/grants |
| `SUPABASE_SERVICE_ROLE_KEY`         | Supabase secret/service-role key | Server runtime + GitHub Phase 1 gate only | Secret; bypasses RLS   |
| `PUBLIC_SITE_URL`                   | Final preview/production origin  | Server runtime                            | Public origin          |

The CLI is linked to project ref `zvfxmlvtbnesjyugodje`, but the current authenticated
profile returned HTTP 403 during linked verification. Sign in with a Supabase account that
can access that project (or relink the correct project), then run `supabase migration list
--linked` before applying anything.

In Supabase Auth, confirm the production Site URL and exact preview/production redirect
allowlist. Enable/configure email delivery and Google OAuth only if those sign-in methods
will launch. Google OAuth requires its client ID/secret in the Supabase Dashboard plus exact
authorized redirect origins in Google Cloud.

## Required for real payments

| Input                      | Where to configure it                                | Exposure   |
| -------------------------- | ---------------------------------------------------- | ---------- |
| `STRIPE_SECRET_KEY`        | Server runtime only                                  | Secret     |
| `STRIPE_WEBHOOK_SECRET`    | Server runtime only                                  | Secret     |
| Stripe webhook destination | `/api/public/webhooks/stripe` on the deployed origin | Public URL |

Register the webhook event types exercised by the handler, run Stripe test-mode checkout,
duplicate-delivery, async-payment, failure, and refund cases, then record provider IDs and
reconciliation results. Client success redirects are not payment evidence.

## Live events and media

- Each event needs a trusted HTTPS player embed URL and, when ready, replay URL in the admin
  event surface. If a future Restream status API adapter is enabled, add its API credential
  to the server secret store only; no such secret belongs in a `VITE_` variable.
- Configure the private `property-media` bucket and its policies from committed migrations
  before enabling uploads. Storage backup/restore is separate from database backup.

## GitHub and hosting

Add repository secrets `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`, then manually run **Phase 1 live RLS gate**. The workflow
creates disposable users/businesses and removes them afterward. Observe a successful
Repository QA run on Node 22 before merge.

For final display/QA, provide or configure:

1. The deployed preview URL and production URL.
2. Disposable member, business-owner, moderator, and admin test accounts (never personal
   accounts), or permission for the test workflow to create them.
3. Two published and two draft/suspended businesses with representative properties,
   services, approved credentials, event states, and missing/broken media cases.
4. Stripe test-mode credentials and permission to inspect webhook delivery results.
5. Access to the Supabase project logs/advisors and the hosting error dashboard.

After configuration, rotate any credential that was ever pasted into an insecure channel.
