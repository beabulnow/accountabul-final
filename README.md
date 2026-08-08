# Accountabul Platform Production

Accountabul is a TanStack Start application for member and business profiles, a real
estate and services marketplace, live events and chat, and reconciled payments.

The current milestone is **Phase 1 gate closure**. Later-phase product surfaces are
present but are not considered complete until their documented end-to-end gates pass.
Start with [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md), then use
[`docs/ROADMAP.md`](docs/ROADMAP.md) for scope and sequencing.

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
