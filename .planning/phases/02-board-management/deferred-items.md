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

## 02-10

- **BLOCKED ON BACKEND — boards cannot be sorted by creation date.** Raised during 02-10
  checkpoint review: the sidebar board list has no ordering control, and none can be built
  client-side. `BoardResponseDTO` exposes exactly `["id", "name", "version"]` — no `createdAt`,
  no `updatedAt`, no `position`. `GET /boards` accepts exactly one parameter, `userId`: no
  `sort`, `order`, or `pageable`. Verified directly against `docs/api/kanban-board-openapi.json`,
  not inferred from the client types.

  There is no client-side workaround: the data does not exist in the response, so any ordering
  the frontend applies would be arbitrary (current order is whatever the backend returns, with no
  documented guarantee). `GET /boards/{boardId}/activity` *does* accept `pageable`, so the
  backend already has the pagination/sorting pattern — it simply is not exposed on `/boards`.

  **Needs a backend change** before any frontend work is possible. Minimum ask: add a creation
  timestamp to `BoardResponseDTO`. Better: add `sort`/`pageable` to `GET /boards` matching the
  `/activity` convention already in the contract.

- **Duplicate board names are rejected by the backend, contradicting a locked plan truth.** The
  02-10 plan asserted "Duplicate board names are allowed — creating a board whose name another
  board already has succeeds." Probed twice against the real backend during execution: a
  duplicate name returns `409 Conflict`, `code: "DUPLICATE_RESOURCE"`,
  `detail: "Board with that name already exists"`. No probe in `02-BACKEND-FACTS.md` ever tested
  this, so the truth was assumed, not measured. The app handles the failure correctly (D-05:
  modal stays open, inline error), but two decisions remain open: whether duplicates *should* be
  permitted (a backend change), and whether the generic "Couldn't create board. Try again." is
  adequate copy for a name collision under the UI-SPEC Copywriting Contract. This constraint
  most likely also applies to board rename (02-12) — worth probing there before assuming.

- **`CONVENTIONS.md` contradicts ADR tech/0019 on who calls `refresh()`.** `CONVENTIONS.md` says
  the *client caller* invokes `router.refresh()` after a mutating Server Action; `docs/adr/tech/0019`
  — which those same bullets cite — says the *Server Action* calls `refresh()` from `next/cache`
  and lists anything else as Anti-pattern 1. 02-10 followed the ADR. One of the two documents
  needs correcting; left alone deliberately rather than silently picking a winner in a plan that
  was not about documentation.
