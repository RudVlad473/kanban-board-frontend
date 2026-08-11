---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-08-11T09:43:25.361Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | visual/primitives.visual.spec.ts |  | CI visual job (ci.yml) fails on master because no baseline PNGs exist yet under visual/__screenshots__ -- the manual visual-baselines.yml workflow_dispatch has never been run; Button+IconButton's 13 stories (26 light/dark assertions) need baselines generated post-merge via: gh workflow run "Visual baselines" --ref master, then download+commit the visual-baselines artifact | open |  | 2026-08-11T09:43:09.095Z |  |
| 2 | 01 | deviation | style-dictionary.config.mjs |  | Style Dictionary's typographyDeclarations() emits --font-weight-<name>/--leading-<name>/--tracking-<name> as top-level namespaced custom properties; Tailwind v4 resolves --font-weight-<name> to the SAME utility class as --font-<name> (font-family), so the weight utility silently loses. Worked around locally in button.tsx via [font-weight:var(--font-weight-body-m)] arbitrary-property syntax -- future fix: rename to Tailwind's paired --text-<name>--font-weight/--line-height/--letter-spacing sub-property convention in style-dictionary.config.mjs (also update tokens/style-dictionary.build.test.ts's assertions) | open |  | 2026-08-11T09:43:25.361Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "visual/primitives.visual.spec.ts",
    "line": null,
    "description": "CI visual job (ci.yml) fails on master because no baseline PNGs exist yet under visual/__screenshots__ -- the manual visual-baselines.yml workflow_dispatch has never been run; Button+IconButton's 13 stories (26 light/dark assertions) need baselines generated post-merge via: gh workflow run \"Visual baselines\" --ref master, then download+commit the visual-baselines artifact",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T09:43:09.095Z",
    "resolved_at": null
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
  }
]
````
