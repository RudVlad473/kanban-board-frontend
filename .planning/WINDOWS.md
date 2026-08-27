---
schema_version: 1
open_count: 19
waived_count: 0
fixed_count: 7
total_count: 26
last_updated: 2026-08-27T12:53:48.822Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | visual/primitives.visual.spec.ts |  | CI visual job (ci.yml) fails on master because no baseline PNGs exist yet under visual/__screenshots__ -- the manual visual-baselines.yml workflow_dispatch has never been run; Button+IconButton's 13 stories (26 light/dark assertions) need baselines generated post-merge via: gh workflow run "Visual baselines" --ref master, then download+commit the visual-baselines artifact | fixed |  | 2026-08-11T09:43:09.095Z | 2026-08-11T10:00:52.616Z |
| 2 | 01 | deviation | style-dictionary.config.mjs |  | Style Dictionary's typographyDeclarations() emits --font-weight-<name>/--leading-<name>/--tracking-<name> as top-level namespaced custom properties; Tailwind v4 resolves --font-weight-<name> to the SAME utility class as --font-<name> (font-family), so the weight utility silently loses. Worked around locally in button.tsx via [font-weight:var(--font-weight-body-m)] arbitrary-property syntax -- future fix: rename to Tailwind's paired --text-<name>--font-weight/--line-height/--letter-spacing sub-property convention in style-dictionary.config.mjs (also update tokens/style-dictionary.build.test.ts's assertions) | open |  | 2026-08-11T09:43:25.361Z |  |
| 3 | 01 | deviation | N/A (tooling/environment) |  | Node's -e/require path resolution treats a bash-style /tmp/... path literally (mapping to C:\\tmp\\...), NOT the same location Git Bash's own /tmp resolves to (C:\\Users\\<user>\\AppData\\Local\\Temp\\...). Any node -e script reading a file that Bash/gh CLI just wrote to /tmp/... will silently ENOENT or read a stale/wrong file unless you use the real Windows-resolved path (visible in Read tool output) instead. Caused real confusion diagnosing a CI visual-baseline issue this session -- a hash comparison via node -e against the wrong path family produced misleading 'still broken' results. Prefer PowerShell's Get-FileHash (PowerShell tool, not Bash) for cross-tool file verification on Windows, or consistently stay within one tool (Bash-only or Node-only) for a given file path. | open |  | 2026-08-11T12:03:22.403Z |  |
| 4 | 01 | unrun-verify | visual/primitives.visual.spec.ts |  | Plan 01-07 (TextField + Checkbox) added 17 new stories (34 light/dark assertions) to visual/primitives.visual.spec.ts, on top of Button/IconButton's already-baselined 13. No baseline PNGs exist yet for the new TextField/Checkbox entries -- same root cause as the now-fixed id 1 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge since it only captures baselines for stories that exist on master at dispatch time). Follow-up once this worktree merges: gh workflow run "Visual baselines" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit. | fixed |  | 2026-08-11T12:55:01.000Z | 2026-08-11T13:17:41.225Z |
| 5 | 01 | unrun-verify | visual/primitives.visual.spec.ts |  | Plan 01-08 (Switch + Dropdown) added 14 new stories (28 light/dark assertions) to visual/primitives.visual.spec.ts, on top of the existing 30. No baseline PNGs exist yet for the new Switch/Dropdown entries -- same root cause as ids 1/4 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge since it only captures baselines for stories that exist on master at dispatch time). Follow-up once this worktree merges: gh workflow run "Visual baselines" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit. | fixed |  | 2026-08-11T15:35:12.302Z | 2026-08-11T15:45:20.532Z |
| 6 | 01 | unrun-verify | visual/primitives.visual.spec.ts |  | Plan 01-09 (Modal, the seventh and final primitive) added 5 new stories (10 light/dark assertions) to visual/primitives.visual.spec.ts, on top of the existing 44. No baseline PNGs exist yet for the new Modal entries -- same root cause as ids 1/4/5 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge since it only captures baselines for stories that exist on master at dispatch time). Follow-up once this worktree merges: gh workflow run "Visual baselines" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit. This also blocks the plan's own Task 2 checkpoint, which asks a human to visually compare all seven primitives including Modal against the Figma reference. | fixed |  | 2026-08-11T16:13:16.075Z | 2026-08-12T09:33:19.344Z |
| 7 | 01 | unrun-verify | visual/primitives.visual.spec.ts |  | Plan 01-25 (Modal Submitting story, GC-16) added 1 new story (2 light/dark assertions) to visual/primitives.visual.spec.ts. No baseline PNGs exist yet for components-ui-modal--submitting -- same root cause as ids 1/4/5/6 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge). Follow-up once this worktree merges: gh workflow run "Visual baselines" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit. | open |  | 2026-08-17T10:27:52.284Z |  |
| 8 | 01 | deviation | src/components/ui/checkbox/checkbox.tsx |  | Fixed dormant disabled-opacity CSS selector (disabled: -> data-[disabled]:) on Checkbox; Switch (src/components/ui/switch/switch.tsx) has the identical disabled:opacity-50/disabled:cursor-not-allowed pattern and likely the same dormant-selector bug, unverified and unfixed (out of plan 01-23's file scope). | open |  | 2026-08-17T10:37:44.785Z |  |
| 9 | 01 | deviation | src/components/ui/modal/modal.test.tsx |  | Pre-existing browser-mode timeout unrelated to 01-26 mock store rewrite | open |  | 2026-08-18T09:09:42.226Z |  |
| 10 | 01 | deviation | src/components/ui/text-field/text-field.test.tsx |  | Pre-existing browser-mode timeout and onValueChange assertion mismatch, unrelated to 01-26 mock store rewrite | open |  | 2026-08-18T09:09:48.828Z |  |
| 11 | 01 | deviation | app/layout.tsx | 11 | Pre-existing tsc TS2304 (Cannot find name LayoutProps), unrelated to 01-26 mock store rewrite | open |  | 2026-08-18T09:09:54.559Z |  |
| 12 | 01 | deviation | app/api/auth/signup/route.ts |  | Task 01-30/Task-2 behaviours 3-4 (sign-up identity storage / failure path) verified manually against the live backend, not via a new committed automated node-project test; 01-33's Server Action tests are the intended replacement home for Route Handler coverage after 01-30 Task 1 deleted app/api/auth/routes.test.ts. | open |  | 2026-08-18T18:39:44.805Z |  |
| 13 | 01 | deviation | .planning/phases/01-foundation-auth-preferences/deferred-items.md |  | Real backend's POST /api/logout returns 500 and never invalidates the upstream session; signOutAction deliberately never calls it (deferred-items.md #6, kanban-board-backend named as owner) | open |  | 2026-08-19T13:19:40.047Z |  |
| 14 | 02.1 | unrun-verify | src/lib/server/server-client.integration.test.ts |  | 3 real-backend tests could not be run in this sandbox (network egress blocked, .env.local denied); needs a human/CI run with real network access | fixed |  | 2026-08-21T13:45:23.244Z | 2026-08-21T17:46:44.065Z |
| 15 | 02.1 | unrun-verify | e2e/boards-list.e2e.spec.ts |  | BOARD-01 e2e spec (and the full pnpm exec playwright test --project e2e suite) could not be run in this sandbox — e2e/global-setup.ts hard-requires NONPROD_RESET_TOKEN (a GitHub Actions secret unavailable here). seed.sh/seed.ts's underlying HTTP behavior was independently verified directly against the real backend. | fixed |  | 2026-08-21T16:38:36.596Z | 2026-08-21T17:46:44.823Z |
| 16 | 02.1 | unrun-verify | e2e/boards-list.e2e.spec.ts |  | BOARD-01 e2e not run in this worktree: NONPROD_RESET_TOKEN unset, matching the prior session's open question (see 02.1-11-SUMMARY.md coverage D5) | open |  | 2026-08-21T18:38:07.036Z |  |
| 17 | 02.2 | deviation | scripts/check-no-play-functions.mjs |  | Rule 3 auto-fix: trimmed a pre-existing 4-line doc comment (from plan 02.2-01) to 3 lines to unblock this plan's own comments:check batch gate | open |  | 2026-08-22T18:16:22.976Z |  |
| 18 | 02 | deviation | e2e/global-setup.ts |  | e2e cannot be launched via pnpm test:e2e from a GSD worktree: global-setup.ts reads process.env.NONPROD_RESET_TOKEN directly and playwright.config.ts loads no dotenv, so a copied-in .env.local never reaches the Playwright node process. Worked around this session with: node --env-file=.env.local ./node_modules/@playwright/test/cli.js test --project=e2e (30/30 pass). Real fix is loading .env.local from playwright.config.ts; out of plan 02-14's scope. | open |  | 2026-08-25T10:26:44.208Z |  |
| 19 | 02 | unmet-truth | CONVENTIONS.md |  | Plan 02-14's two prohibitions remain enforcement-by-code-review only (both flagged-unverified in the plan): nothing mechanically prevents a status discriminant being reintroduced as a bare inline string outside result-status.ts, and nothing prevents a boolean toggle being hand-rolled as a useState pair instead of useBoolean. A lint rule is the intended endpoint for both; plan 02-15 already carries D-29's enforcement-mechanism work and is the natural home. | open |  | 2026-08-25T10:26:50.167Z |  |
| 20 | 02 | deviation | src/components/ui/dropdown/dropdown.test.tsx |  | Plan 02-15 Option B: the story-only-render gate (pnpm renders:check) is blocking in CI but carries an explicit exemption for 10 pre-existing component-test suites -- 121 direct renders across ~116 cases (dropdown 34, modal 17, text-field 15, button 15, checkbox 12, menu 11, icon-button 8, switch 6, error-fallback 2, toast 1). Each count is a ratchet ceiling in MIGRATION_EXEMPTIONS and is printed on every run; ADR tech/0025's Enforcement section and CONVENTIONS.md both state the gate is NOT repo-wide. Outstanding work: migrate all ten onto named per-prop-combination stories. Tracked in .planning/phases/02-board-management/deferred-items.md under 02-15; relates to plan 02-15 threat T-02-54 (false coverage claims are a real defect class here). | open |  | 2026-08-25T12:50:40.028Z |  |
| 21 | 02 | unrun-verify | src/features/boards/server/fetch-boards.ts |  | Plan 02-11 wrapped fetchBoards in React's cache so the sidebar, the dashboard header and a board page's membership check share one upstream call per render, but no test asserts the call count. The plan's own behavior bullet ('loadBoards called twice within one server render performs exactly one upstream call') is therefore unproven: the e2e suite shows the app works, not that it issues one call rather than three. Needs either an instrumented integration test or a server-side call counter. | open |  | 2026-08-25T14:26:38.598Z |  |
| 22 | 02 | deviation | app/api/session/force-sign-out/route.ts |  | Plan 02-11 widened the WR-01 logout-CSRF guard from Sec-Fetch-Site === 'same-origin' to an allow-list of {same-origin, none}. Making /boards a Server Component that calls the external API in its own render turned the forced-sign-out redirect into a real HTTP 307 on the document request, and Chromium carries the initiating navigation's Sec-Fetch-Site across that same-origin hop, so a visitor opening /boards directly arrived with 'none' and was 403'd out of the flow the handler exists to serve (measured 2026-08-25). 'none' is unforgeable by an attacker page and cross-site/same-site/absent are still rejected; SESSION-03's three cases still pass. Recorded as a dated amendment in docs/adr/tech/0026. Open because it is a security-control change made outside plan 02-11's own threat register and deserves a reviewer's explicit sign-off. | open |  | 2026-08-25T14:26:45.483Z |  |
| 23 | 02 | stub | src/features/boards/components/board-list.tsx |  | BoardCard onDelete is a no-op; plan 02-13 supplies D-06's confirm modal | open |  | 2026-08-25T16:26:55.940Z |  |
| 24 | 03 | unrun-verify | .planning/phases/03-column-management/03-BACKEND-FACTS.md |  | Column probe R1-R7 never observed: nonprod database down for all 14 attempts on 2026-08-26; every R section reads NOT YET OBSERVED | fixed |  | 2026-08-26T13:52:58.902Z | 2026-08-26T19:35:18.622Z |
| 25 | 03 | unrun-verify | src/features/boards/components/column-header.tsx |  | 03-08: no live-app visual pass on the column kebab (Playwright MCP is not visible to spawned subagents); mock comparison done from the PDF only | open |  | 2026-08-27T12:13:08.402Z |  |
| 26 | 03 | unrun-verify | src/features/boards/components/delete-column-confirm.tsx |  | No live-app visual pass on the delete confirmation or the destructive kebab entry — Playwright MCP is not visible to spawned subagents | open |  | 2026-08-27T12:53:48.822Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "visual/primitives.visual.spec.ts",
    "line": null,
    "description": "CI visual job (ci.yml) fails on master because no baseline PNGs exist yet under visual/__screenshots__ -- the manual visual-baselines.yml workflow_dispatch has never been run; Button+IconButton's 13 stories (26 light/dark assertions) need baselines generated post-merge via: gh workflow run \"Visual baselines\" --ref master, then download+commit the visual-baselines artifact",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-11T09:43:09.095Z",
    "resolved_at": "2026-08-11T10:00:52.616Z"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "01",
    "file": "style-dictionary.config.mjs",
    "line": null,
    "description": "Style Dictionary's typographyDeclarations() emits --font-weight-<name>/--leading-<name>/--tracking-<name> as top-level namespaced custom properties; Tailwind v4 resolves --font-weight-<name> to the SAME utility class as --font-<name> (font-family), so the weight utility silently loses. Worked around locally in button.tsx via [font-weight:var(--font-weight-body-m)] arbitrary-property syntax -- future fix: rename to Tailwind's paired --text-<name>--font-weight/--line-height/--letter-spacing sub-property convention in style-dictionary.config.mjs (also update tokens/style-dictionary.build.test.ts's assertions)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T09:43:25.361Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "01",
    "file": "N/A (tooling/environment)",
    "line": null,
    "description": "Node's -e/require path resolution treats a bash-style /tmp/... path literally (mapping to C:\\tmp\\...), NOT the same location Git Bash's own /tmp resolves to (C:\\Users\\<user>\\AppData\\Local\\Temp\\...). Any node -e script reading a file that Bash/gh CLI just wrote to /tmp/... will silently ENOENT or read a stale/wrong file unless you use the real Windows-resolved path (visible in Read tool output) instead. Caused real confusion diagnosing a CI visual-baseline issue this session -- a hash comparison via node -e against the wrong path family produced misleading 'still broken' results. Prefer PowerShell's Get-FileHash (PowerShell tool, not Bash) for cross-tool file verification on Windows, or consistently stay within one tool (Bash-only or Node-only) for a given file path.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T12:03:22.403Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "visual/primitives.visual.spec.ts",
    "line": null,
    "description": "Plan 01-07 (TextField + Checkbox) added 17 new stories (34 light/dark assertions) to visual/primitives.visual.spec.ts, on top of Button/IconButton's already-baselined 13. No baseline PNGs exist yet for the new TextField/Checkbox entries -- same root cause as the now-fixed id 1 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge since it only captures baselines for stories that exist on master at dispatch time). Follow-up once this worktree merges: gh workflow run \"Visual baselines\" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-11T12:55:01.000Z",
    "resolved_at": "2026-08-11T13:17:41.225Z"
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "visual/primitives.visual.spec.ts",
    "line": null,
    "description": "Plan 01-08 (Switch + Dropdown) added 14 new stories (28 light/dark assertions) to visual/primitives.visual.spec.ts, on top of the existing 30. No baseline PNGs exist yet for the new Switch/Dropdown entries -- same root cause as ids 1/4 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge since it only captures baselines for stories that exist on master at dispatch time). Follow-up once this worktree merges: gh workflow run \"Visual baselines\" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-11T15:35:12.302Z",
    "resolved_at": "2026-08-11T15:45:20.532Z"
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "visual/primitives.visual.spec.ts",
    "line": null,
    "description": "Plan 01-09 (Modal, the seventh and final primitive) added 5 new stories (10 light/dark assertions) to visual/primitives.visual.spec.ts, on top of the existing 44. No baseline PNGs exist yet for the new Modal entries -- same root cause as ids 1/4/5 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge since it only captures baselines for stories that exist on master at dispatch time). Follow-up once this worktree merges: gh workflow run \"Visual baselines\" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit. This also blocks the plan's own Task 2 checkpoint, which asks a human to visually compare all seven primitives including Modal against the Figma reference.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-11T16:13:16.075Z",
    "resolved_at": "2026-08-12T09:33:19.344Z"
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "visual/primitives.visual.spec.ts",
    "line": null,
    "description": "Plan 01-25 (Modal Submitting story, GC-16) added 1 new story (2 light/dark assertions) to visual/primitives.visual.spec.ts. No baseline PNGs exist yet for components-ui-modal--submitting -- same root cause as ids 1/4/5/6 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge). Follow-up once this worktree merges: gh workflow run \"Visual baselines\" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-17T10:27:52.284Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "deviation",
    "phase": "01",
    "file": "src/components/ui/checkbox/checkbox.tsx",
    "line": null,
    "description": "Fixed dormant disabled-opacity CSS selector (disabled: -> data-[disabled]:) on Checkbox; Switch (src/components/ui/switch/switch.tsx) has the identical disabled:opacity-50/disabled:cursor-not-allowed pattern and likely the same dormant-selector bug, unverified and unfixed (out of plan 01-23's file scope).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-17T10:37:44.785Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "01",
    "file": "src/components/ui/modal/modal.test.tsx",
    "line": null,
    "description": "Pre-existing browser-mode timeout unrelated to 01-26 mock store rewrite",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-18T09:09:42.226Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "01",
    "file": "src/components/ui/text-field/text-field.test.tsx",
    "line": null,
    "description": "Pre-existing browser-mode timeout and onValueChange assertion mismatch, unrelated to 01-26 mock store rewrite",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-18T09:09:48.828Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "deviation",
    "phase": "01",
    "file": "app/layout.tsx",
    "line": 11,
    "description": "Pre-existing tsc TS2304 (Cannot find name LayoutProps), unrelated to 01-26 mock store rewrite",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-18T09:09:54.559Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "01",
    "file": "app/api/auth/signup/route.ts",
    "line": null,
    "description": "Task 01-30/Task-2 behaviours 3-4 (sign-up identity storage / failure path) verified manually against the live backend, not via a new committed automated node-project test; 01-33's Server Action tests are the intended replacement home for Route Handler coverage after 01-30 Task 1 deleted app/api/auth/routes.test.ts.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-18T18:39:44.805Z",
    "resolved_at": null
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "01",
    "file": ".planning/phases/01-foundation-auth-preferences/deferred-items.md",
    "line": null,
    "description": "Real backend's POST /api/logout returns 500 and never invalidates the upstream session; signOutAction deliberately never calls it (deferred-items.md #6, kanban-board-backend named as owner)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-19T13:19:40.047Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "unrun-verify",
    "phase": "02.1",
    "file": "src/lib/server/server-client.integration.test.ts",
    "line": null,
    "description": "3 real-backend tests could not be run in this sandbox (network egress blocked, .env.local denied); needs a human/CI run with real network access",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-21T13:45:23.244Z",
    "resolved_at": "2026-08-21T17:46:44.065Z"
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "02.1",
    "file": "e2e/boards-list.e2e.spec.ts",
    "line": null,
    "description": "BOARD-01 e2e spec (and the full pnpm exec playwright test --project e2e suite) could not be run in this sandbox — e2e/global-setup.ts hard-requires NONPROD_RESET_TOKEN (a GitHub Actions secret unavailable here). seed.sh/seed.ts's underlying HTTP behavior was independently verified directly against the real backend.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-21T16:38:36.596Z",
    "resolved_at": "2026-08-21T17:46:44.823Z"
  },
  {
    "id": 16,
    "kind": "unrun-verify",
    "phase": "02.1",
    "file": "e2e/boards-list.e2e.spec.ts",
    "line": null,
    "description": "BOARD-01 e2e not run in this worktree: NONPROD_RESET_TOKEN unset, matching the prior session's open question (see 02.1-11-SUMMARY.md coverage D5)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T18:38:07.036Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "deviation",
    "phase": "02.2",
    "file": "scripts/check-no-play-functions.mjs",
    "line": null,
    "description": "Rule 3 auto-fix: trimmed a pre-existing 4-line doc comment (from plan 02.2-01) to 3 lines to unblock this plan's own comments:check batch gate",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-22T18:16:22.976Z",
    "resolved_at": null
  },
  {
    "id": 18,
    "kind": "deviation",
    "phase": "02",
    "file": "e2e/global-setup.ts",
    "line": null,
    "description": "e2e cannot be launched via pnpm test:e2e from a GSD worktree: global-setup.ts reads process.env.NONPROD_RESET_TOKEN directly and playwright.config.ts loads no dotenv, so a copied-in .env.local never reaches the Playwright node process. Worked around this session with: node --env-file=.env.local ./node_modules/@playwright/test/cli.js test --project=e2e (30/30 pass). Real fix is loading .env.local from playwright.config.ts; out of plan 02-14's scope.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-25T10:26:44.208Z",
    "resolved_at": null
  },
  {
    "id": 19,
    "kind": "unmet-truth",
    "phase": "02",
    "file": "CONVENTIONS.md",
    "line": null,
    "description": "Plan 02-14's two prohibitions remain enforcement-by-code-review only (both flagged-unverified in the plan): nothing mechanically prevents a status discriminant being reintroduced as a bare inline string outside result-status.ts, and nothing prevents a boolean toggle being hand-rolled as a useState pair instead of useBoolean. A lint rule is the intended endpoint for both; plan 02-15 already carries D-29's enforcement-mechanism work and is the natural home.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-25T10:26:50.167Z",
    "resolved_at": null
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "02",
    "file": "src/components/ui/dropdown/dropdown.test.tsx",
    "line": null,
    "description": "Plan 02-15 Option B: the story-only-render gate (pnpm renders:check) is blocking in CI but carries an explicit exemption for 10 pre-existing component-test suites -- 121 direct renders across ~116 cases (dropdown 34, modal 17, text-field 15, button 15, checkbox 12, menu 11, icon-button 8, switch 6, error-fallback 2, toast 1). Each count is a ratchet ceiling in MIGRATION_EXEMPTIONS and is printed on every run; ADR tech/0025's Enforcement section and CONVENTIONS.md both state the gate is NOT repo-wide. Outstanding work: migrate all ten onto named per-prop-combination stories. Tracked in .planning/phases/02-board-management/deferred-items.md under 02-15; relates to plan 02-15 threat T-02-54 (false coverage claims are a real defect class here).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-25T12:50:40.028Z",
    "resolved_at": null
  },
  {
    "id": 21,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "src/features/boards/server/fetch-boards.ts",
    "line": null,
    "description": "Plan 02-11 wrapped fetchBoards in React's cache so the sidebar, the dashboard header and a board page's membership check share one upstream call per render, but no test asserts the call count. The plan's own behavior bullet ('loadBoards called twice within one server render performs exactly one upstream call') is therefore unproven: the e2e suite shows the app works, not that it issues one call rather than three. Needs either an instrumented integration test or a server-side call counter.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-25T14:26:38.598Z",
    "resolved_at": null
  },
  {
    "id": 22,
    "kind": "deviation",
    "phase": "02",
    "file": "app/api/session/force-sign-out/route.ts",
    "line": null,
    "description": "Plan 02-11 widened the WR-01 logout-CSRF guard from Sec-Fetch-Site === 'same-origin' to an allow-list of {same-origin, none}. Making /boards a Server Component that calls the external API in its own render turned the forced-sign-out redirect into a real HTTP 307 on the document request, and Chromium carries the initiating navigation's Sec-Fetch-Site across that same-origin hop, so a visitor opening /boards directly arrived with 'none' and was 403'd out of the flow the handler exists to serve (measured 2026-08-25). 'none' is unforgeable by an attacker page and cross-site/same-site/absent are still rejected; SESSION-03's three cases still pass. Recorded as a dated amendment in docs/adr/tech/0026. Open because it is a security-control change made outside plan 02-11's own threat register and deserves a reviewer's explicit sign-off.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-25T14:26:45.483Z",
    "resolved_at": null
  },
  {
    "id": 23,
    "kind": "stub",
    "phase": "02",
    "file": "src/features/boards/components/board-list.tsx",
    "line": null,
    "description": "BoardCard onDelete is a no-op; plan 02-13 supplies D-06's confirm modal",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-25T16:26:55.940Z",
    "resolved_at": null
  },
  {
    "id": 24,
    "kind": "unrun-verify",
    "phase": "03",
    "file": ".planning/phases/03-column-management/03-BACKEND-FACTS.md",
    "line": null,
    "description": "Column probe R1-R7 never observed: nonprod database down for all 14 attempts on 2026-08-26; every R section reads NOT YET OBSERVED",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-26T13:52:58.902Z",
    "resolved_at": "2026-08-26T19:35:18.622Z"
  },
  {
    "id": 25,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "src/features/boards/components/column-header.tsx",
    "line": null,
    "description": "03-08: no live-app visual pass on the column kebab (Playwright MCP is not visible to spawned subagents); mock comparison done from the PDF only",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-27T12:13:08.402Z",
    "resolved_at": null
  },
  {
    "id": 26,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "src/features/boards/components/delete-column-confirm.tsx",
    "line": null,
    "description": "No live-app visual pass on the delete confirmation or the destructive kebab entry — Playwright MCP is not visible to spawned subagents",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-27T12:53:48.822Z",
    "resolved_at": null
  }
]
````
