---
schema_version: 1
open_count: 11
waived_count: 0
fixed_count: 6
total_count: 17
last_updated: 2026-08-22T18:16:22.976Z
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
  }
]
````
