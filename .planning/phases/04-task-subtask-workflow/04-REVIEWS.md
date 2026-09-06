---
phase: 4
reviewers: [antigravity, codex]
reviewed_at: 2026-09-06T17:55:00.000Z
plans_reviewed: [04-23-PLAN.md, 04-24-PLAN.md, 04-25-PLAN.md]
models:
  antigravity: "gemini-3.1-pro-high"
  codex: "gpt-5.6-sol (reasoning=low)"
model_sources:
  antigravity: "pinned"
  codex: "banner"
---

# Cross-AI Plan Review — Phase 4 (quality-verification harness addition: 04-23/04-24/04-25)

Scope: only the three newly-added plans, not the already-executed 04-01..04-22. Both reviewers ran
source-grounded against the real repo (a disposable `.worktrees/review-agy` detached checkout for
Gemini/Antigravity; Codex against the primary checkout read-only). Every surviving finding below was
independently re-verified against the plan text by the orchestrating session before being reported —
see the per-finding notes.

## Consensus Summary

Both reviewers independently rated the plans HIGH-quality in form (falsifiable language, both-directions
unit tests, explicit decision records, source citations back to this repo's own conventions) but found
real substantive gaps in the core regression-detection design. Codex's findings were source-grounded and
verified true. Antigravity's one HIGH finding was verified FALSE — see Divergent Views.

### Agreed Strengths (both reviewers)
- Interaction-scoping of `flickerTracker`/`optimisticRoute` (never applied passively) is correct and matches existing repo precedent (`boards-switch.e2e.spec.ts`, `optimistic-guards.e2e.spec.ts`).
- The `optimisticRoute` match-predicate (`isServerActionPost`) correctly distinguishes a Server Action POST from document navigation to the same URL.
- The SVG/text-node hazard handling (`getAttribute("class")` + `Element` narrowing) is mechanically correct.
- The ESLint-enforced rollout is a sound *mechanism choice* (even though its current specifier-only form has a bypass — see below).
- No new `VERIFY_STEPS`/CI entry is genuinely unneeded — the `e2e` project glob already covers the new spec.

### Agreed/Confirmed Concerns — CONFIRMED TRUE by the orchestrator against the plan text

1. **HIGH — Baseline comparator only diffs a SET of axe rule IDs, not occurrence/node counts** (Codex, confirmed at `04-23-PLAN.md:323-325`: `QualityObservation` stores "sorted de-duplicated axe rule ids" only). A route with one `button-name` violation that grows to eleven `button-name` violations produces the same rule-id set — no new id, so it silently passes. This undermines the plan's own headline claim ("new findings fail").

2. **HIGH — `layoutShiftTracker`'s `hadRecentInput` filter is wrong for an interaction-scoped tool** (Codex, confirmed against 04-23's `layoutShiftTracker.start()` action text: skips any entry whose `hadRecentInput` is true). The Layout Instability API sets `hadRecentInput` specifically to exclude shifts *caused by* a recent user interaction — but this fixture exists precisely to measure the shift a chosen interaction (e.g. a board switch click) causes. As designed, a real shift directly caused by the interaction under test can score zero, and the installation-sentinel discipline can't catch this because it's a semantic blind spot, not an absent instrument.

3. **HIGH — `no-restricted-imports` does not actually force adoption** (Codex, confirmed at `04-24-PLAN.md:100-106`: the rule bans the `test`/`expect` *named imports* from `@playwright/test`). `import * as playwright from "@playwright/test"; playwright.test(...)` is a namespace import — ESLint's `no-restricted-imports`/`importNames` option does not catch namespace-import bypasses of a banned named specifier. The plan's claim that a spec "cannot forget" to opt in is overstated.

4. **HIGH — The before/after cost measurement is built on a stash that likely stashes nothing** (Codex, confirmed at `04-24-PLAN.md:240`: `git stash push -- 'e2e/*.e2e.spec.ts'` to get a "before" run). GSD's executor commits atomically per task; by the time task 2 runs, task 1's import-swap changes are already committed, not sitting as uncommitted worktree changes. `git stash` has nothing to stash in that case, so the "before" run would silently still carry the new fixture imports — invalidating the plan's central cost-measurement claim.

5. **MEDIUM — Baseline keys collide across spec files** (Codex, confirmed at `04-23-PLAN.md:331`: `buildQualityKey({ titlePath })` — no spec/file-path component). Two identically-titled `describe`/`test` blocks in different spec files would silently overwrite each other's baseline entry.

### Divergent Views

- **Antigravity's HIGH finding ("missing 90-second global budget enforcement," recommending a literal `globalTimeout: 90000` in `playwright.config.ts`) is INVALID — verified false by the orchestrator.** `04-24-PLAN.md:123-131` (decision D-I) explicitly states the 90-second figure is a **human-checkpoint decision threshold** ("over budget stops the plan rather than shipping"), not a runtime kill-switch, and the checkpoint explicitly reserves the two coverage-narrowing levers for a human decision rather than applying them unilaterally. Adding a hard `globalTimeout: 90000` would be actively harmful: the `e2e` project's own baseline runtime is already documented at ~2 minutes (`docs/review-brief.md`) even *before* this change, so a 90-second global timeout would fail every run outright, not just gate the new instrumentation's added cost. Do not apply this suggestion.
- Antigravity's MEDIUM findings (`flickerTracker`'s unbounded `window.__uiFlickerLog` array; concurrent per-worker `unpkg.com` fetches for `react-scan`) are plausible robustness nice-to-haves but low-priority: test durations are bounded by Playwright's default timeout regardless, and `react-scan` is deliberately never used in the standing parallel suite (04-25 keeps it opt-in, single-probe use only), so the concurrent-fetch scenario doesn't arise under the plan as written.
- Codex's remaining MEDIUM/LOW findings (`passes.length > 0` as an axe-installation sentinel; concurrent `appendFileSync` interleaving during the triple-repeat record run; raw `MutationRecord` counting vs. semantic render counting; a `.prettierrc` vs `.prettierrc.json` path typo; produced-todo files missing from `files_modified`) were not independently re-verified line-by-line but are plausible and worth folding into a revision pass.

## Overall Verdict

**Revision required before execution** (both reviewers agree on this framing even where they disagree on specifics). The four CONFIRMED HIGH findings are the priority: rule-id-set comparison, the interaction-CLS `hadRecentInput` bug, the import-restriction bypass, and the stash-based before/after measurement flaw. The baseline-key collision (MEDIUM) should be folded in at the same time since it touches the same comparator module.
