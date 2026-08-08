# Codex–Lovable Sync Check

This file verifies that Codex can commit to the dedicated Accountabul production repository and that Lovable can ingest GitHub-origin changes.

- Lovable project: `b5380cc3-66e3-48e7-a502-6344428e07c2`
- Repository: `beabulnow/accountabul-final`
- Branch: `main`
- Scope: new Accountabul production platform only

As of 2026-08-08, GitHub `main` and the merged `codex/initial-qa-fixes` branch point to
the same commit. New phase work must start from a refreshed `origin/main` and use a new
`codex/*` branch. See `docs/PHASE_STATUS.md` for the current branch baseline.
