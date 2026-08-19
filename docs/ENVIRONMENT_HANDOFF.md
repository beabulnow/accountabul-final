# Environment and Credential Handoff

The local development environment is connected to the hosted **Accountabul Development**
Supabase project. The application and credential-free tests can still be built without
credentials. Connected tests require the protected local environment file or equivalent
values in the hosting/GitHub secret stores. Do not send secret values in chat or commit them.

## Current local development environment

- Supabase project: `Accountabul Development`
- Project ref: `vvrudyzeublgunlfgvlt`
- Organization: `JibreelMuhammad's Org`
- Region: `us-east-2`
- Local app URL: `http://127.0.0.1:4173/`
- Protected environment file: `%LOCALAPPDATA%\Accountabul\dev.env`

The environment file is intentionally outside OneDrive and the Git repository. Its Windows
ACL grants access only to the signed-in user and `SYSTEM`. Never copy its service-role value
into a `VITE_` variable, source file, test fixture, artifact, or chat message.

From the repository root:

```sh
npm ci
npm run dev:local
```

In a second terminal, run the connected and credential-free gates:

```sh
npm run test:connected
npm run qa:smoke -- http://127.0.0.1:4173/
npm run check
```

`npm run dev:local` and `npm run test:connected` inject the protected environment only into
their child processes. The launcher refuses connected tests when the server-only credential
is missing. The browser receives only the project identifier, URL, and publishable key.

Email/password sign-up is enabled and currently requires email confirmation. Google OAuth
is disabled until its Supabase and Google provider credentials and redirect origins are
configured. The Auth admin API currently works with the project's legacy `service_role`
credential; the opaque secret key should be re-tested before replacing it in the protected
environment.

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

The CLI is linked to project ref `vvrudyzeublgunlfgvlt`. Before applying future migrations,
run `supabase projects list` and `supabase migration list --linked`, then confirm the linked
project name and ref match the environment above.

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
