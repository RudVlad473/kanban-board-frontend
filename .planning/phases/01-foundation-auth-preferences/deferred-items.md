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
