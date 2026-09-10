# 0038 — Motion state lives in one `data-state` attribute, styled with Tailwind variants

**Status:** Accepted 2026-09-10. Decided before Phase 5's motion work is implemented, not after.

Phase 5's prototypes are plain CSS with global class names (`.source`, `.opening`, `.dissolving`,
`.handoff`, `.settling`, `.menu-open`). Porting them needs an answer to "where do those class names
live so they do not collide", and the obvious framings — a Vite plugin, CSS Modules — are the wrong
shape for what actually went wrong in the prototypes.

## Decision Drivers

- **This is Next 16.3, not Vite.** No bundler plugin is in question: Next ships CSS Modules with
  zero config, and Tailwind v4 is already wired through `@tailwindcss/postcss`. The repo has **zero**
  `.module.css` files today; styling is utilities plus three globals under `src/styles/`.
- **Collisions were never the defect.** Not one of the 37 rows in
  `docs/superpowers/specs/2026-09-09-phase-5-defect-log.md` was caused by two class names clashing.
  Scoping is a real property to want, but it would have prevented nothing that actually happened.
- **Three rows were the same specificity bug**, and that one is real. #5, #15 and #28 are all *one
  element, one property, two states that can be true at once, each wanting a different value* — and
  in every case the element was `.ckb` and the property was `opacity`:
  - `.colm:hover .ckb { opacity: 1 }` vs `.colm.source .ckb { opacity: 0 }` — the kebab stayed lit
    on the dashed slot the pointer was still over (#15; #5 is its twin, one layer up).
  - `.colm:hover .ckb` vs a column being crossed mid-drag — a neighbour's kebab lit up while another
    column was being carried over it (#28).
  Each was settled by arranging specificity and source order, which works and is invisible at the
  call site.

## Decision

**Component-local motion state is one `data-state` attribute holding one value at a time, styled
with Tailwind variants. No CSS Modules.**

```tsx
<div data-state={isDragging ? "dragging" : isSlot ? "slot" : "idle"} className="…" />
```

```
data-[state=idle]:hover:opacity-100   data-[state=slot]:opacity-0   data-[state=dissolving]:opacity-0
```

Collision-free by construction — there are no authored class names to collide — and the state is
legible in devtools, which a hashed module class is not.

### The load-bearing rule: when two states compete for one property, they go in ONE attribute

This is the part that must survive; everything else here is a preference.

Do **not** model state as independent booleans (`data-dragging`, `data-slot`, plus `:hover`) when
they can overlap on the same property. Under plain CSS, overlapping states are settled by
specificity. Under Tailwind they are **not**: `hover:opacity-100` and `data-[dragging=true]:opacity-0`
are both single-class, so the winner is whichever Tailwind emits later in the generated sheet —
variant order, not intent, and nothing at the call site shows which one wins.

So the conflict is not resolved, it is **removed**: a single attribute cannot hold two values, so
`data-[state=idle]:hover:…` cannot fight `data-[state=slot]:…`. The exclusivity becomes a fact about
the markup instead of an arrangement of the cascade.

The test, applied per property: *can two of these states be true at the same moment on this element?*
Yes → they are one attribute. No → separate attributes are fine.

This is strictly better than what the prototypes do, which is why it is a decision and not a port.

### What stays in global CSS, and why that is not a scoping failure

- **`::view-transition-old/new(name)` and `view-transition-name`.** The name is a **document-global
  namespace by spec**. Nothing can scope it — CSS Modules would not have helped, and the collision
  risk is real and must be managed by naming convention. See `docs/adr/tech/0037`.
- **`@keyframes`**, declared once in `@theme` and used via `animate-*`. Few, central, and correct as
  a shared motion vocabulary rather than per-component duplicates.

### Seed frames stay expressible

The prototypes' `transition: none` seeding frame (defect log rule 7, and #22 — a fade that animated
*into* its start value and so never ran) is `data-[state=seeding]:transition-none`. It survives the
port; it does not need CSS Modules.

## Consequences

- Reviewing a motion change means reading one attribute's value set, not searching for every class
  that touches a property.
- A state machine with genuinely orthogonal axes needs a second attribute, and that is allowed — the
  rule is scoped to *properties two states compete for*, not to state in general.
- Rejected: **CSS Modules** (a second styling vocabulary bought to solve a collision problem the
  defect log shows we do not have); **`@utility`-only Tailwind** (the motion here is a class swapped
  by JS on a frame boundary, which is what utilities are worst at).
