# Pre-Review Credential Exposure Audit

Goal: before the codebase goes out for external review, prove that no usable secret is sitting in the code, and fix anything that is. The findings report goes to Google Drive only — nothing about it is written into the repo, so the report itself can't become a leak.

## What I already confirmed

A first-pass scan across the whole repo (excluding dependencies) turned up **no live credentials**: no Stripe live/test secret keys, no AWS keys, no private key blocks, no wallet keys or seed phrases, no GitHub or Slack tokens. Server code reads everything from the server environment (`process.env`), which is the correct pattern.

Two things do need attention:

1. **`.env` is committed to the repo and is not listed in `.gitignore`.** Today it holds only the backend URL, project ID, and the publishable key — all values that are safe to be public by design. But a tracked `.env` is the single most common way a real secret leaks later: the next person to add a key to that file ships it to the reviewer.
2. **Git history matters as much as the current files.** A reviewer with the repo can read every past commit. The audit checks history, not just the current checkout.

## The audit

Scan for, across current files *and* full git history:

- Payment keys (Stripe live/test/publishable, webhook signing secrets)
- Cloud and backend keys (AWS, Google, service-role keys, database connection strings)
- Auth tokens (GitHub, Slack, OAuth client secrets, long-lived JWTs)
- Crypto wallet material (private keys, seed phrases, keystore files)
- Private key blocks and certificates
- Generic high-entropy strings assigned to key-like variable names
- Any secret referenced in client-side code, where it would be visible in the browser

Every hit is triaged into: **real secret — rotate and remove**, **public by design — safe** (publishable keys, project IDs), or **test fixture — safe** (for example the dummy webhook value in the webhook test).

## The deliverable (Google Drive only)

One document uploaded straight to your Google Drive:

- Verdict: safe to send, or blockers first
- Every finding with file, line, classification, and what to do about it
- What is intentionally public and why, so the reviewer doesn't raise it as a false alarm
- Which values live only in the platform environment and never in the repo
- Rotation checklist for anything that must be replaced

The report is written to a temporary location, uploaded, then deleted. It is never committed, and no Markdown copy is left in the project.

## Fixes applied in the repo

- Add `.env` and `.env.*` to `.gitignore` and stop tracking `.env`, so no future key can ride along. The local file stays on disk and the app keeps working; the platform injects these values at runtime.
- Add an `.env.example` with key names and empty values, so a reviewer can see what configuration is required without seeing any value.
- Remove or replace any genuine secret found, and flag it for rotation.

## Notes

- Rotating a real leaked key has to happen on the provider's side (Stripe, Google, etc.) — I can list exactly which ones and where, but I can't rotate them for you.
- If history rewriting turns out to be needed (a real secret in an old commit), I'll flag it rather than do it silently, since it rewrites commit IDs on the connected GitHub repo.
