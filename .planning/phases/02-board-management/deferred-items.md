# Deferred Items — Phase 02

Out-of-scope discoveries logged during plan execution. Not fixed — outside the scope of the
plan that surfaced them.

## 02-02

- **`.claude/settings.local.json` fails `pnpm format:check`** — untracked, harness-managed local
  settings file (not part of `scripts/serve-static.mjs`, `scripts/serve-static.unit.test.mjs`, or
  `vitest.config.ts`, the only files this plan touches). Pre-existing before this plan's session
  started; unrelated to the path-traversal fix or the vitest wiring. `pnpm format:check` scoped to
  this plan's own files passes cleanly.

## 02-09

- **`app/layout.tsx(19,41): error TS2304: Cannot find name 'LayoutProps'`** — `pnpm exec tsc
  --noEmit` fails on the root `app/layout.tsx`, a file this plan never touches (confirmed via
  `git diff --stat HEAD -- app/layout.tsx`: no diff). Pre-existing before this plan's session
  started, unrelated to the sidebar/board-list split. `tsc` scoped to this plan's own changed
  files (`app/(dashboard)/layout.tsx`, `src/components/layout/sidebar/*`,
  `src/features/boards/components/*`) reports no new errors.
- **`.claude/settings.local.json` fails `pnpm format:check`** — same pre-existing, untracked,
  harness-managed file noted under 02-02 above; still present and still unrelated to this plan's
  files.
