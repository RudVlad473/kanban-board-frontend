# Deferred Items

Out-of-scope discoveries logged during plan execution, per execute-plan.md's scope boundary
(pre-existing issues not directly caused by the current task's own changes are logged, not
fixed inline).

## From plan 01-06 (Button, IconButton)

### 1. CI visual job requires the manual "Visual baselines" workflow to be run at least once

**Found during:** Task 3 verification.

**Issue:** `visual/primitives.visual.spec.ts`'s screenshot assertions only run/assert in CI
(`ignoreSnapshots: !process.env.CI` in `playwright.config.ts`, per ADR tech/0008's "never
generated on an arbitrary local machine" discipline). No baseline PNGs have ever been committed
to `visual/__screenshots__/` — confirmed via `gh run list --workflow="Visual baselines"`
(zero runs, ever) and `gh run view` on the two most recent `master` CI runs, both of which show
the `visual` job failing with "A snapshot doesn't exist ... writing actual" for every
harness-probe story. This predates plan 01-06 and is not a regression it introduced — it is a
gap left by the initial harness-setup plan (01-05/D-24), which never triggered the
`.github/workflows/visual-baselines.yml` `workflow_dispatch` job.

**Why not fixed inline:** Generating real baselines requires the code to exist on a ref GitHub
Actions can check out (a pushed branch), then dispatching `workflow_dispatch`, waiting for
completion, downloading the `visual-baselines` artifact, and committing the PNGs. This plan
executed inside an isolated worktree that the orchestrator merges centrally after return —
pushing branches or dispatching remote CI runs from inside a parallel worktree executor is
outside this dispatch's stated boundaries (`STATE.md`/`ROADMAP.md` updates and git integration
are explicitly reserved for the orchestrator).

**Recommended follow-up (post-merge, once this worktree's commits land on `master`):**
```bash
gh workflow run "Visual baselines" --ref master
# wait for completion, then:
gh run download <run-id> --name visual-baselines --dir visual/__screenshots__
git add visual/__screenshots__
git commit -m "test(visual): add baseline screenshots for Button and IconButton"
git push
```
This captures baselines for all 13 stories (Button's 7 + IconButton's 6) across both mode
scopes — 26 assertions — the first real baselines this project has ever committed.

Logged to `.planning/WINDOWS.md` (id 1, kind `unrun-verify`).

### 2. Token pipeline: composite typography weight collides with the family utility class name

**Found during:** Task 2, writing `button.tsx`'s typography classes.

**Issue:** `style-dictionary.config.mjs`'s `typographyDeclarations()` emits
`--font-weight-<name>`, `--leading-<name>`, and `--tracking-<name>` as top-level namespaced CSS
custom properties. Verified by direct compilation (`postcss` + `@tailwindcss/postcss`) that
Tailwind v4 resolves `--font-weight-<name>` to the exact same utility class name as
`--font-<name>` (font-family) — e.g. both produce a `.font-body-m` rule, and the font-family
declaration always wins regardless of source order, so the weight utility is silently unusable.
`--leading-<name>` and `--tracking-<name>` do not have this problem (no name collision).

**Why not fixed inline:** The correct fix (Tailwind v4's paired sub-property convention —
`--text-<name>--font-weight`, `--text-<name>--line-height`, `--text-<name>--letter-spacing`
instead of separate top-level namespaces) lives in `style-dictionary.config.mjs`, a shared
token-pipeline file owned by plan 01-04 (already merged to `master` before this plan started)
and outside plan 01-06's `files_modified` list. Fixing it would also require updating
`tokens/style-dictionary.build.test.ts`'s existing assertions (`--font-weight-heading-xl:
700;`, `--leading-heading-xl: 30px;`, `--tracking-heading-s: 2.4px;`), which is a second
already-shipped plan's test file.

**Workaround applied in this plan:** `button.tsx` reads the weight token directly via Tailwind's
arbitrary-property syntax — `[font-weight:var(--font-weight-body-m)]` — which still sources the
real semantic token (not a hardcoded literal) and sidesteps the collision without touching the
shared pipeline.

**Recommended follow-up:** A future plan should migrate `style-dictionary.config.mjs`'s
`typographyDeclarations()` to Tailwind v4's paired `--text-<name>--*` sub-property convention,
update `tokens/style-dictionary.build.test.ts`'s assertions accordingly, and simplify every
composite-typography consumer (this plan's `button.tsx` included) back down to two classes
(`font-<name> text-<name>`) instead of the current family+size+arbitrary-weight combination.

Logged to `.planning/WINDOWS.md` (id 2, kind `deviation`).

## From plan 01-26 (GC-09, mock store in-memory rewrite)

### 3. Pre-existing flaky/broken browser-mode tests unrelated to the mock store

**Found during:** Task 1 verification (`pnpm test`, full suite run).

**Issue:** `pnpm test` reports 3 failed tests across 2 files, neither touched by this plan:
- `src/components/ui/modal/modal.test.tsx` — "blocks both backdrop-click and Escape dismissal
  while a Modal.Footer action is loading..." times out at 15000ms.
- `src/components/ui/text-field/text-field.test.tsx` — "truncates overflowing values with a
  native ellipsis..." times out at 15000ms, and "updates its value and calls onValueChange when
  typed into" asserts a call with `"a"` but receives raw keystroke event objects instead
  (`"x"`, `"xa"`, `"xax"` with event payloads) — looks like a stale/mismatched assertion against
  the current component behavior, or browser-mode input-simulation flakiness.

**Why not fixed inline:** Neither `Modal` nor `TextField` is in this plan's `files_modified`
(`src/lib/mocks/store.ts`, `src/lib/mocks/store.unit.test.ts`, `CONVENTIONS.md`). Grepped both
test files for any reference to the mock store — none found (the only "store" substring matches
are the unrelated word "restores"). This plan's changes cannot have caused these failures.

**Recommended follow-up:** Investigate `text-field.test.tsx`'s onValueChange assertion (looks
like a real regression or a stale test, not flakiness — the received event-object args aren't
what a timing issue would produce) and the two 15000ms browser-mode timeouts in a dedicated
plan/session, ideally re-run in isolation to rule out CI/local resource contention.

### 4. Pre-existing `tsc --noEmit` error in `app/layout.tsx`, unrelated to this plan

**Found during:** Task 1 verification (`pnpm exec tsc --noEmit`).

**Issue:** `app/layout.tsx(11,35): error TS2304: Cannot find name 'LayoutProps'.` — this plan
never touches `app/layout.tsx`.

**Why not fixed inline:** Out of this plan's `files_modified` scope entirely; likely a
Next.js-generated ambient type (`.next/types`) not present in this worktree's build output.

**Recommended follow-up:** Run `pnpm dev`/`pnpm build` once to regenerate `.next/types`, or
replace the `LayoutProps` reference with an explicit prop type if it's not meant to be ambient.

## From plan 01-32 (GC-18, session bridging with the real backend)

### 5. Forced sign-out on upstream session expiry cannot run from a Server Component

**Found during:** Task 2, implementing `externalApi`'s `onResponse` middleware.

**Issue:** `server-client.ts`'s `onResponse` middleware detects an upstream `401 UNAUTHENTICATED`
refusal on an already-bridged call and forces a full sign-out by calling `session.destroy()`
(clearing this app's own session cookie) and `redirect(ROUTE.SIGN_IN)`. Both operations are only
valid from a context where a cookie write is permitted — a Server Action or a Route Handler.
Within this round's scope, every call path that can reach `externalApi` is one of those two
contexts (sign-in, sign-up, sign-out, and plan 01-14's theme route, once bridged), so the clear
works everywhere this plan touches. It will stop working the moment Phase 2 adds a Server
Component that calls `externalApi` directly for a `GET` (board data) — `cookies().delete()`
inside a Server Component render throws, since a Server Component cannot mutate cookies
mid-render (`01-RESEARCH.md`'s round-3 addendum, Finding 3).

**Why not fixed inline:** No Server Component making such a call exists yet in this repository —
building a fix for a call site that doesn't exist would be untestable, and this plan's own scope
(GC-18, session bridging) doesn't add one.

**Recommended follow-up:** Phase 2, when it adds the first Server Component reading board data
through `externalApi`, should follow Next.js's own documented pattern for this case: redirect to
a dedicated route/Route Handler that performs the actual cookie clear, rather than attempting an
in-render mutation. Phase 2 is the named owner of this follow-up.
