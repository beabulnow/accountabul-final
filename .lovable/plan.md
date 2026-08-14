# Line-Level Code Evaluation Index

A machine-readable record for every physical line of code in the repo: what the line is for, how risky it is to change, what trust surface it touches, and whether anything verifies it. Records are keyed by a hash of the line's content, so a line that hasn't changed is never re-evaluated. Anything downstream — a security review, an agent about to edit a file, you — retrieves what it needs with a single GET call instead of re-reading the codebase.

Current scope: 91 source files, 11,986 lines.

## On the YAML question

YAML is pleasant to read but the wrong format here. It is roughly the same size as JSON on disk, parses several times slower, and has no way to read one record without loading the whole document. For 12,000 records that matters.

The index uses **JSONL** — one JSON object per line, one file per source file. A single record can be pulled by byte offset, files can be appended to, and diffs in git stay line-for-line readable. The human-facing documents (`ROSETTA.md`, the run summary) stay in Markdown, so the parts you actually read by eye remain readable.

## Structure

```text
.codeindex/
  manifest.json              index version, last run, per-file hash + line count
  lines/
    src/routes/admin.tsx.jsonl        one record per line of that file
    src/lib/tips.functions.ts.jsonl
    ...
  ROSETTA.md                 single source of truth: dependencies, services, boundaries
  SUMMARY.md                 latest run summary, risk hot spots, unverified surfaces
```

One record per line:

```json
{
  "n": 42,
  "hash": "a1b4…",
  "intent": "Reads the Stripe signature header before any privileged DB access",
  "risk": 4,
  "surface": ["payments", "webhook-input", "server-only"],
  "verified": "tested",
  "evaluated_at": "2026-08-14T01:30:00Z"
}
```

- `risk` 0–5: 0 is an import or closing brace, 5 is a line whose change can leak data, lose money, or break auth.
- `surface`: any of `auth`, `rls`, `secrets`, `user-input`, `payments`, `client-boundary`, `server-only`, `generated`, `presentation`, or empty.
- `verified`: `tested` | `typechecked` | `unverified`.

## Incremental behavior

Each run hashes every line of every file and compares against `manifest.json`.

- File hash unchanged → the whole file is skipped, zero evaluation work.
- File changed → only lines whose own hash changed are re-evaluated; unchanged lines keep their existing record and `evaluated_at`.
- Lines inserted or deleted → surviving records are re-numbered by hash match, not by position, so adding a line at the top of a file does not invalidate the file.

This is what keeps a 12,000-line index cheap to maintain: a normal commit touching 30 lines costs 30 evaluations, not 12,000.

## ROSETTA.md

One Markdown document, generated in the same run, holding the dependency and technology truth so it lives in exactly one place: every npm dependency with its role and where it is used, the external services (backend/database, auth, Stripe, Restream), the route inventory, the server/client boundary rules, the database tables and which code paths touch them, and the environment variables each surface requires. Line records point at it rather than duplicating it.

## Retrieval API

A public read-only server route, so any agent or tool can query the index over plain HTTP.

```text
GET /api/public/codeindex/manifest
GET /api/public/codeindex/file?path=src/lib/tips.functions.ts
GET /api/public/codeindex/line?path=…&n=42
GET /api/public/codeindex/query?surface=payments&risk_min=4&verified=unverified
GET /api/public/codeindex/rosetta
```

`query` is the one that matters in practice: "show me every high-risk line touching auth that nothing verifies" is a single request. Responses are JSON, capped and paginated. Read-only, no secrets, no file contents beyond the line text — safe to expose.

## Technical notes

- Indexer is a Node script (`scripts/codeindex/`) run via `npm run codeindex`, reading from disk and writing `.codeindex/`. It does not run in the app process.
- Line classification is done by static analysis first — TypeScript AST for symbols and imports, plus rules matching known surfaces (`supabase`, `process.env`, `createServerFn`, `.functions.ts`, `api/public`, `*.server.ts`) — and only escalates to a model call for lines the rules cannot characterize. That keeps a full cold run bounded and a warm run nearly free.
- Generated files (`src/routeTree.gen.ts`, `src/integrations/supabase/types.ts`) are indexed as `surface: ["generated"], risk: 0` in one pass, never line-evaluated.
- `verified` is derived: lines inside a module reachable from `tests/` are `tested`, TypeScript-checked modules are `typechecked`, the rest `unverified`.
- The API route reads `.codeindex/` from the bundled build output; no database table, nothing to keep in sync.

## Build order

1. Indexer core: file walk, line hashing, manifest, JSONL writer, incremental skip logic.
2. Rule-based classification for intent, risk, and surface, plus the verification derivation.
3. `ROSETTA.md` generator.
4. `/api/public/codeindex/*` routes.
5. First full run over the current 11,986 lines, then `SUMMARY.md` with the risk hot spots it finds.

## Not included

No auto-refactoring, no CI gate, and no separate agents. The index reports; deciding what to do with a report stays a separate step you or a tool takes deliberately.
