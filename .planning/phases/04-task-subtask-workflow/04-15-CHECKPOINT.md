# 04-15 Task 4 — `checkpoint:human-verify` verification report

Driven 2026-09-01 through this project's own headless Playwright MCP server
(`mcp__playwright__*` confirmed), against `pnpm dev` on `localhost:3000` and the real deployed
nonprod backend. Mock pages rendered with `pdftoppm -r 300` and measured through a canvas pixel
scan (divisor 4.1667 at 300 DPI; the 1440-design assumption is confirmed by the modal measuring
exactly 480.000 CSS px).

## Step-by-step result

| # | Step | Result |
|---|------|--------|
| 1 | Task with a title only | **PASS** — card appears in the chosen column, count 0→1, survives reload. Payload confirms `description: undefined`, `subtasks: []` |
| 2 | Task with a description and two subtasks | **PASS** — card shows "0 of 2 subtasks"; after reload both subtasks and the description are still there |
| 3 | Blank title, then a 2-char title | **PASS** — "Can't be empty" then "Task title must be between 3 and 32 characters."; zero non-static network requests either time |
| 4 | Remove both seeded rows and submit | **PASS with a defect on the way** — a task with no subtasks is created and its card renders with no caption. But see Finding 1: the first click on a remove control is sometimes lost |
| 5 | Board with zero columns | **PASS** — header button `disabled=true`, `opacity: 0.5`, `cursor: not-allowed` |
| 6 | Mock comparison (p6 modal, p2 header, both themes) | **MISMATCHES** — see Findings 2-5 |

## Finding 1 — the modal's first click is lost at short viewport heights (real, 2/2)

**What happens.** Open Add New Task and make your first interaction a click on a control —
"+ Add New Subtask", or a row's remove ✕. Nothing happens. Click again and it works.

**Measured mechanism.** The Title field is autofocused on open. `mode: "onTouched"`
(`add-task-modal.tsx:59`) validates it the moment it blurs, so the first click anywhere inserts a
"Can't be empty" message under Title. That insertion moves everything below it down **23.5px**
(remove control measured at y=417.0 before, y=440.5 after) between `mousedown` and `mouseup`, so
the two land on different elements and no `click` fires on the button.

**Reproduction is viewport-dependent, not random:**

| Viewport | Modal height | Slack | Result |
|----------|--------------|-------|--------|
| 1280 × 720 | 624px | 48px | reproduced 2/2 |
| 1440 × 900 | 624px | 276px | did not reproduce 3/3 |

I initially called this deterministic on the strength of four reproductions; that was before the
viewport changed. The corrected claim is the table above.

**Not an automation artifact.** It survives a 1.2s settle before the click, so it is not the open
animation. A real mouse produces the same `mousedown`/`mouseup` split.

**Why no test caught it.** Component tests render the modal already mounted and assert on
library-level clicks, which do not model a `mousedown`→layout-shift→`mouseup` sequence.

**Scope.** The Add Board modal has the same autofocus + `onTouched` shape but did **not** reproduce
(1/1) — its "+ Add New Column" appended on the first click.

## Finding 2 — the subtask rows carry visible per-row labels the mock does not have

Each row renders a real `<label>` reading "Subtask 1" / "Subtask 2" — 18px tall, full
`text-text-primary`, not clipped or `sr-only`. The mock has one "Subtasks" group label and then
bare inputs carrying only placeholders.

This is also what makes the rows sit **36px** apart against the mock's **12px**, and is the largest
single contributor to the modal being taller than the design.

## Finding 3 — modal box metrics

| Measure | Mock (p6) | App | Δ |
|---------|-----------|-----|---|
| Modal width | 480 | 448 | −32 |
| Modal padding | 32 | 24 | −8 |
| Field width | ~416 | 400 | −16 |
| Input height | 40 | 40 | ✓ |
| Description height | 112 | 112 | ✓ |
| Group rhythm | 24 | 24 | ✓ |
| Subtask row gap | 12 | 36 | +24 |
| Subtask input width | ~382 | 348 | −34 |
| Modal corner radius | — | 8 | — |
| Field order | Title, Description, Subtasks, Status, Create | identical | ✓ |
| Add-a-row button | full width | full width | ✓ |

The three ✓ items the checkpoint called out by name — 24px rhythm, 112px description box,
full-width secondary add-a-row button — all hold exactly.

## Finding 4 — the secondary button treatment differs from the mock (pre-existing, shared)

Mock "+ Add New Subtask": borderless lavender pill, purple label.
App: white surface, 1px `border-border-default`, near-black label.

This is `buttonVariants`' shared `secondary` variant, used by 5 surfaces (sign-out, both delete
confirms, the add-board modal, this modal) and settled in phase 01 (`01-06-SUMMARY.md`). Not
introduced by 04-15; changing it is a design-system decision, not a plan fix.

## Finding 5 — header metrics differ from p2 (pre-existing, shared)

Compared at a matched 1440 viewport, so this is not a breakpoint artifact.

| Measure | Mock (p2) | App | Note |
|---------|-----------|-----|------|
| Sidebar width | 300 | 300 | ✓ |
| Header height | 96 | 73 | −23 |
| Create button height | 48 | 40 | −8 |
| Button vertically centred | yes | yes | ✓ |
| Disabled treatment | reduced-opacity purple | `opacity: 0.5` purple | ✓ |
| Rightmost header element | kebab ⋮ | "Sign Out" | app adds account name + Sign Out; mock has neither |

Header and button sizing are design-system values from earlier phases and apply to every surface.
The trailing account name / Sign Out is auth UI the mock never had.

## Both themes

Dark theme renders correctly and structurally identically: `#2B2C37` surface, white labels and
input text, `#635FC7` submit, same 448px width. No dark-only breakage. The Finding 4 divergence
appears in dark too (app `#2B2C37` where the mock's dark secondary is a white pill).

## Leftover test data

Shared nonprod backend, account "Flicker Probe": boards `DIVERGED` (now holds `Title Only Task`,
`Full Task With Subtasks`, and one no-subtask task) and a new `Zero Column Board`. Harmless.
