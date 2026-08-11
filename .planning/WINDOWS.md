---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 2
total_count: 5
last_updated: 2026-08-11T15:35:12.302Z
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
| 5 | 01 | unrun-verify | visual/primitives.visual.spec.ts |  | Plan 01-08 (Switch + Dropdown) added 14 new stories (28 light/dark assertions) to visual/primitives.visual.spec.ts, on top of the existing 30. No baseline PNGs exist yet for the new Switch/Dropdown entries -- same root cause as ids 1/4 (the manual visual-baselines.yml workflow_dispatch must be re-run post-merge since it only captures baselines for stories that exist on master at dispatch time). Follow-up once this worktree merges: gh workflow run "Visual baselines" --ref master, then gh run download <run-id> --name visual-baselines --dir visual/__screenshots__, then commit. | open |  | 2026-08-11T15:35:12.302Z |  |

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
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T15:35:12.302Z",
    "resolved_at": null
  }
]
````
