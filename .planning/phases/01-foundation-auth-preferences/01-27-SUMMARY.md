---
phase: 01-foundation-auth-preferences
plan: 27
subsystem: docs
tags: [documentation, gap-closure, setup, dal]
dependency-graph:
  requires: []
  provides:
    - "SETUP.md (repo root, manual setup steps)"
    - "dal.ts file-level DAL acronym comment"
  affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - SETUP.md
  modified:
    - src/lib/dal.ts
decisions:
  - "SETUP.md documents only today's real, already-known .env.local blocker — no speculative future sections for services that don't exist yet in this project"
  - "The .sh-script migration GC-11 mentions is explicitly out of scope for this plan"
metrics:
  duration: "~15 minutes"
  completed: 2026-08-17
status: complete
actuals:
  tokens: 562
  tasks: 1
  commits: 1
---

# Phase 01 Plan 27: DAL Acronym + SETUP.md Summary

Spelled out "DAL" (Data Access Layer) in a new file-level comment in `src/lib/dal.ts`, and created `SETUP.md` at the repo root documenting the real `EXTERNAL_API_BASE_URL`/`SESSION_SECRET` `.env.local` requirement — closing GC-10 and GC-11.

## What Was Built

**`src/lib/dal.ts`:** Added a block comment above the imports (`@stylistic/multiline-comment-style` requires block-comment form, not consecutive `//` lines) spelling out "DAL = Data Access Layer — Next.js App Router's own documented auth-pattern term (ADR tech/0001); this file is the authoritative, server-only session-verification checkpoint." The existing `verifySession` JSDoc comment was left untouched.

**`SETUP.md`** (new, repo root): One-line purpose statement (manual/human setup steps before build/dev, intended to later become a `.sh` script — that migration itself out of scope here); a section naming the two required `.env.local` variables verbatim from `.env.example` (`EXTERNAL_API_BASE_URL`, `SESSION_SECRET`), stating that omitting either produces a `SESSION_SECRET is not set` failure during `pnpm build`/`pnpm dev`; and a note that `.env.local` is gitignored and must be created per-clone, per-worktree.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Stale/missing Next.js route types blocked `tsc --noEmit`**
- **Found during:** Task 1 verification
- **Issue:** This worktree had never run `next build`/`next dev`, so `.next/types` did not exist. `pnpm exec tsc --noEmit` failed on an unrelated file (`app/layout.tsx`, `Cannot find name 'LayoutProps'`) — a pre-existing environment gap, not caused by this plan's doc-only changes (confirmed via `git diff --stat`, which showed only `src/lib/dal.ts` touched).
- **Fix:** Ran `pnpm exec next typegen` to generate route types without a full build. No tracked source files were affected; `.next/` is gitignored.
- **Files modified:** none (generated output only, gitignored)
- **Commit:** n/a (no trackable change)

**2. [Rule 1 - Bug] `dal.ts` comment style violated project lint rule**
- **Found during:** Task 1 verification (`pnpm lint`)
- **Issue:** Initial file-level comment used consecutive `//` line comments; the project's `@stylistic/multiline-comment-style` ESLint rule requires block-comment (`/* ... */`) form for multi-line comments.
- **Fix:** Converted to a `/* ... */` block comment with the same content.
- **Files modified:** `src/lib/dal.ts`
- **Commit:** `eeae8cb` (folded into the single task commit, since lint was re-run before commit)

**Note:** The first `pnpm lint` run (before dependency reinstall) additionally reported 34 pre-existing errors across unrelated auth files (`app/(dashboard)/layout.tsx`, `sign-out-button.tsx`, `use-sign-in.ts`, `use-sign-up.ts`, `session.ts`) — all `@typescript-eslint/no-unsafe-*` errors caused by stale/incomplete `node_modules` type resolution in this freshly-created worktree. These disappeared after `pnpm exec eslint` triggered pnpm's own dependency sync (`pnpm install`, ~7.5 min, resolved 758 packages). This was an environment artifact of worktree creation, out of scope for this plan's files, and resolved itself without any source change.

## Verification

- `test -f SETUP.md` — pass
- `grep -c "EXTERNAL_API_BASE_URL" SETUP.md` → 1
- `grep -c "SESSION_SECRET" SETUP.md` → 2
- `grep -c "Data Access Layer" src/lib/dal.ts` → 1
- `pnpm lint` — exit 0 (0 errors)
- `pnpm exec tsc --noEmit` — exit 0 (0 errors, after `next typegen`)
- `dal.ts`'s existing `verifySession` doc comment confirmed unchanged (only new block comment added above imports)

## Self-Check: PASSED

- FOUND: `SETUP.md` at repo root
- FOUND: `src/lib/dal.ts` modified with DAL block comment
- FOUND: commit `eeae8cb` in `git log --oneline --all`
