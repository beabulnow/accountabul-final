# Launch QA and Evidence Runbook

This runbook keeps credential-free checks repeatable and makes the remaining connected
proof explicit. A route existing is not evidence that its launch gate passed.

## Credential-free checks

Run from the repository root:

```sh
npm ci
npm run qa:static
npm run typecheck
npm run lint
npm test
npm run build
```

`qa:static` inspects all 18 product routes, required metadata, basic keyboard/accessibility
guards, live provider state copy, and the server-only chat boundary. Its machine-readable
result is `artifacts/phase6-static-qa.json`.

Build and start the Cloudflare/Nitro production preview (the pinned local Wrangler package
is required by this target), then run:

```sh
npm run build
npm run preview
npm run qa:smoke -- http://localhost:3000
npm run qa:load -- http://localhost:3000
```

The HTTP smoke visits all 18 routes, including intentional missing-slug states, and writes
`artifacts/phase6-http-smoke.json`. The lightweight load smoke writes
`artifacts/phase6-load-smoke.json` and defaults to 100 marketplace requests at concurrency 10. Override with `QA_LOAD_PATH`, `QA_LOAD_REQUESTS`, and `QA_LOAD_CONCURRENCY`. This is a
launch smoke, not a capacity claim.

## Browser and accessibility matrix

Run the 18-route smoke at 360x800, 768x1024, and 1440x900 in current Chrome, Edge,
Firefox, and Safari. Record browser/version, viewport, route, pass/fail, console errors,
horizontal overflow, keyboard order, visible focus, accessible names, and a screenshot for
every failure. Use a real screen reader on signup, recovery, marketplace filters, the live
player/chat, and each dashboard form. Automated static checks do not replace this matrix.

The signed-in pass must cover member, business owner/staff, moderator, and admin. It must
exercise loading, empty, error, retry, success, permission-denied, missing-image,
scheduled, connecting, live, reconnecting, ended, and provider-down states.

## Connected gate evidence still required

- Run the Phase 1 two-user/two-business RLS workflow with the three Supabase secrets.
- Apply migrations to a non-production Supabase project and test the chat RPC as a normal
  member, banned member, burst sender, forged user ID attempt, moderator, and anonymous
  caller. Confirm direct Data API inserts fail.
- Run marketplace storage lifecycle tests with a valid image, missing object, unauthorized
  object, and suspended parent business.
- Run Stripe CLI/provider tests for duplicate and reordered events, refreshes, failure,
  full refund, wrong amount/currency/session, and a paid tip chat event.
- Load-test authenticated chat fan-out and signed webhook bursts in a disposable
  environment; save command, configuration, raw output, p50/p95/p99, error rate, and time.
- Configure production error, latency, webhook-failure, auth-failure, and database alerts;
  trigger each alert once and link the alert and incident record from the phase ledger.

Do not mark Launch QA complete until the cross-browser matrix and connected evidence are
attached to a commit or durable external report.
