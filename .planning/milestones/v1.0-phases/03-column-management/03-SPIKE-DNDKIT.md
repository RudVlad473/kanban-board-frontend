# Phase 3 — dnd-kit React 19 Runtime Spike

> Resumes plan `03-03`'s Task 2, halted in a prior session because Playwright MCP tools were
> unreachable from a worktree-isolated executor. Re-run in the main session, after the `.mcp.json`
> `mcpServers`-wrapper fix (commit `f7ae5f3`) let this project's own headless `playwright` server
> load. Driven against a scratch, uncommitted Storybook story mounting a 5-item horizontal sortable
> list built from `@dnd-kit/core@6.3.1` / `@dnd-kit/sortable@10.0.0` / `@dnd-kit/utilities@3.2.2`,
> shaped like the real board (horizontal `overflow-x-auto` row, each item with its own vertical
> scroll region). The story is deleted; nothing survives except this file.

---

## 1. Mount under React 19.2 / Next 16.3

**Observed:** The story mounted with zero console errors and zero console warnings attributable to
dnd-kit, in both the Storybook manager view and the raw `iframe.html?viewMode=story` preview. The
only console entries seen across the whole session were a pre-existing Storybook-manager
`PopoverProvider` `ariaLabel` deprecation warning (unrelated to dnd-kit) and a `favicon.ico` 404
(Storybook dev-server noise).

**Consequence:** `@dnd-kit/core@6.3.1` mounts cleanly under this repo's exact React 19.2 / Next
16.3 combination. No polyfill, shim, or version bump is needed before building the real components.

---

## 2. Keyboard path

**Observed, in order, on the same live story:**

1. Click to focus a column's drag-handle `<button>` (a plain click — no movement — does not start
   a drag, confirming the `MouseSensor` `{ distance: 8 }` activation constraint holds even on the
   handle itself).
2. `Space` — the handle turns `[pressed]`, the live region announces *"Draggable item alpha was
   moved over droppable area alpha"* — lift confirmed.
3. `ArrowRight` — live region updates to *"...moved over droppable area bravo"* — the arrow path
   moves the candidate drop target one step at a time.
4. `Space` again — drops it. The DOM order changed (Alpha: index 0 → index 1, `Bravo, Alpha,
   Charlie, Delta, Echo`), and the live region announced the drop.
5. **Escape mid-lift:** lifted Alpha again, pressed `ArrowRight` once, then `Escape`. The order
   reverted exactly to its pre-lift state (`Bravo, Alpha, Charlie, Delta, Echo` — unchanged), and
   the live region announced *"Dragging was cancelled."*
6. **`Enter` also lifts:** focused the handle, pressed `Enter` — the handle turned `[pressed]` and
   the live region announced the lift, identically to `Space`. Cancelled with `Escape` to leave the
   list undisturbed.

**Consequence:** the full keyboard contract — lift (`Space` **and** `Enter`), arrow-move, drop,
escape-cancel — works exactly as dnd-kit's own defaults describe. Decision D-06 (keep both lift
keys, do not narrow `keyboardCodes`) is directly confirmed as implementable, not just permitted.

---

## 3. Pointer path

**Observed:** Playwright's `locator.dragTo()` (this project's `browser_drag` tool; no lower-level
multi-step `page.mouse` API is exposed by the available MCP tools) dragging the "Alpha" handle onto
the "Charlie" handle produced **no reorder**. The live region announced *"Draggable item alpha was
dropped over droppable area alpha"* — i.e. `over.id === active.id`, so `onDragEnd`'s own guard
(`if (over === null || active.id === over.id) return;`) fired and the array never changed.

This is the exact failure `03-RESEARCH.md` Pitfall 4 predicted and cited
(`microsoft/playwright#32609`): `dragTo()` synthesises a single intermediate `mousemove`, which
does not reliably cross `MouseSensor`'s `{ distance: 8 }` activation threshold in a way dnd-kit
registers as a sustained drag over a new target.

**Number of intermediate move steps needed:** not measurable with this toolset — no tool here
exposes Playwright's low-level `page.mouse.move(..., { steps })` API. `dragTo()`'s single implicit
step was confirmed insufficient; the exact minimum step count remains unmeasured.

**Consequence — confirms A7 and the plan's own stated fallback:** the pointer path is not reliably
drivable by the automation available in this session. This is exactly why `03-RESEARCH.md`
Pitfall 4 recommends the keyboard path as the primary automated-test surface (§1 above, fully
verified) and reserves a real `page.mouse` low-level sequence for e2e (plan `03-12`), which has
direct Playwright API access outside the MCP tool surface and can supply the needed `steps` count
itself.

---

## 4. Sibling-control safety

**Observed:** a plain click on a column's non-handle sibling `<button>` (the "⋮" stand-in) fired
its own `onClick` (visibly incremented to `"⋮ (1)"`) and started no drag — the column order was
unchanged before and after. `MouseSensor`'s activators attach only to the element holding
`listeners`/`setActivatorNodeRef` (the handle); the sibling never receives them, and its stationary
click never crosses the distance-8 activation constraint either way.

**Consequence:** confirms Pitfall 5's two independent mitigations (handle-only listeners + a
distance/delay activation constraint) are sufficient in practice, not just in theory. The kebab
menu can safely be a sibling of the drag handle with no extra guard code.

---

## 5. Auto-scroll in nested scroll containers

**Observed:** the row (`scrollWidth: 848px`, `clientWidth: 518px`, i.e. genuinely overflowing by
330px) started at `scrollLeft: 0`. Lifting the first visible item and pressing `ArrowRight`
repeatedly to walk it toward the last position tracked the row's scroll position at each step
(`0 → 15 → 267 → 330`), converging exactly on `scrollWidth - clientWidth` (330, the true maximum) —
no overshoot, no oscillation. The moved item's own drop landed correctly in the last position
(`Alpha, Charlie, Delta, Echo, Bravo`). Each column's own vertical scroll region (`overflow-y-auto`,
tested with 300px of content in a 96px-tall box) was never touched by the horizontal auto-scroll —
the two axes did not interfere with each other in either direction.

**Consequence — resolves Open Question 4:** dnd-kit's default keyboard auto-scroll-into-view
behaves correctly in this exact nested-scroll-container shape (horizontal row of independently
vertically-scrollable columns) with **no extra configuration**. `@dnd-kit/modifiers`' 
`restrictToFirstScrollableAncestor` is **not needed** — see `## Supersedes` below.

*Caveat: this observation covers the keyboard path only (§2's mechanism), which is what plan 03-10
must support per D-06/U-02. The pointer path's auto-scroll behaviour (dragging near the row's edge
with the mouse) was not independently observable — see §3's tooling limitation — but pointer-based
auto-scroll is dnd-kit's better-exercised, upstream-tested code path (unlike the keyboard
coordinate-getter integration just observed), so this is a low-risk gap, not an open question.*

---

## 6. Pitfall 3 — `DndContext` `id` / hydration mismatch

**Observed:** rendered a second story variant (`WithoutId`) with the `DndContext` `id` prop
omitted. No hydration or `aria-describedby` mismatch warning appeared — but Storybook, as the plan
anticipated, does not server-render at all, so this specific failure mode (a server-rendered
`aria-describedby` diverging from the client's re-render) cannot occur here by construction, and
its absence proves nothing either way.

**Mechanism — verified-by-source, not by observation:** `03-RESEARCH.md` Pitfall 3 already quotes
`@dnd-kit/utilities@3.2.2`'s `useUniqueId` implementation directly from its shipped `dist` —
a module-scope counter keyed by prefix, returning the supplied `value` verbatim when one is given.
That source reading is the actual basis for the fix; this spike's non-reproduction in a
client-only tool is expected and does not weaken it.

**Consequence:** treat the explicit `DndContext id={...}` prop as **required-by-construction** in
plan 03-10 (as the plan itself already says), not as a nice-to-have confirmed by this spike. The
real confirmation instrument for this specific pitfall is a server-rendered page
(`/boards/[boardId]`) with the id prop removed, which is out of this spike's scope by design.

---

## Supersedes 03-RESEARCH.md A6 and Open Question 4

| Item | Verdict |
|------|---------|
| **A6** — `@dnd-kit/core@6.3.1` behaves correctly under React 19.2 + Next 16.3 at runtime | **CONFIRMED.** Mount (§1), full keyboard lift/move/drop/cancel including both `Space` and `Enter` (§2), and sibling-control safety (§4) all observed working with no runtime error. The pointer path (§3) is not reliably automatable with this session's tooling — a tooling gap, not a library defect; dnd-kit's own pointer-activation code is unexercised by this spike, not shown broken. |
| **Open Question 4** — is `@dnd-kit/modifiers`' `restrictToFirstScrollableAncestor` needed for auto-scroll in this layout's nested scroll containers? | **NOT NEEDED**, for the keyboard path (§5), which is the path D-06/U-02 make mandatory. `@dnd-kit/modifiers` should **not** be added on the strength of this finding. |

Open Question 3 (whether to narrow `keyboardCodes`) was already resolved by the user as D-06 during
planning (keep both `Space` and `Enter`) — this spike's §2 independently confirms that choice is
implementable, not just chosen.

---

## Environment

- **Playwright MCP server:** `@playwright/mcp@0.0.79` (resolved via `npx @playwright/mcp@latest`
  per `.mcp.json`), bundling `playwright-core@1.63.0-alpha-2026-08-05`.
- **Browser:** `navigator.userAgent` → `HeadlessChrome/152.0.0.0`.
- **Discrepancy, stated plainly:** the project's own pinned `@playwright/test@1.62.1` (what
  Vitest browser-mode / Storybook-interaction tests and e2e actually run under) bundles Chromium
  **151.0.7922.34** (`chrome --version` inside `~/.cache/ms-playwright/chromium-1234/`), one Chromium
  major version behind this spike's 152. The `must_haves` backstop truth asking for "the same
  Chromium build the browser/storybook Vitest projects use" is therefore **not exactly met** — this
  spike ran one version ahead, not on the identical build. Recorded honestly rather than claimed as
  satisfied. The gap is a single adjacent Chromium release; none of the behaviour observed above
  (button focus, keydown handling, scroll-into-view, ARIA live-region text) is the kind of thing
  that plausibly differs between adjacent Chromium releases, but this spike does not itself prove
  that — it is a judgment call, not a re-observation.

---

## Scratch story removed

`src/features/boards/components/dnd-kit-spike.stories.tsx` was created for this session only,
driven headless via `mcp__playwright__*`, and deleted immediately after. `git status --porcelain
src/` is empty.
