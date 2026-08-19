# Accountabul Platform Production

Accountabul is a TanStack Start application for member and business profiles, a real
estate and services marketplace, live events and chat, and reconciled payments.

The current milestone is **Phase 6 connected launch-gate closure plus targeted
definition-of-done cleanup**. Core product implementation through Phases 1-5 and Phase 6
credential-free verification are complete in the current local branch. The application is
not launch-complete until the known presence/notification/analytics decisions are closed and
the connected Supabase, Storage, chat, Stripe, migration, authenticated-role, cross-browser,
screen-reader, and monitoring
evidence in [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md) is recorded.

Use [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md) as the current source of truth and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for approved scope and phase gates. Operational inputs
needed to finish the connected gates are listed in
[`docs/ENVIRONMENT_HANDOFF.md`](docs/ENVIRONMENT_HANDOFF.md).

## Implemented product scope

- Member authentication, recovery, profiles, and protected dashboards.
- Business pages, staff membership, credentials, verification, and admin review.
- Property and service marketplace, saved items, follows, inquiries, leads, and private
  property media.
- Scheduled/live/replay event states, reminders, server-mediated chat, moderation, and
  rate limits.
- Stripe-first tips, signed webhook reconciliation, refunds/failures, receipts, and admin
  payment review.
- Deterministic legacy-import tooling, reconciliation artifacts, and operational runbooks.

Known implementation decisions still open are live-room presence wiring, member notification
preferences, and the roadmap's per-feature analytics/audit coverage. They are tracked in
`docs/PHASE_STATUS.md` rather than being hidden inside a general "complete" label.

The repository currently contains 18 product routes and nine forward-only Supabase
migration files. Repository presence is implementation evidence; it is not proof that the
same migrations or provider configuration are active in the connected environment.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b5380cc3-66e3-48e7-a502-6344428e07c2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
npm run check
npm run dev
```

Copy `.env.example` to `.env` and supply local values. Never commit `.env` or place a
service-role/provider secret in a `VITE_` variable.
