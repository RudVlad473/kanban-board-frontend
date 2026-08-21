# 0011 — Visual regression scope: primitives only, for now

## Context

`docs/adr/tech/0008` chose the visual-regression *tool* (Playwright-native `toHaveScreenshot`)
and stated scope loosely as "Storybook design-system components," without drawing a hard line
between the `components/ui/` primitive library and feature-level components that also happen to
have Storybook stories. In practice, that ambiguity was already resolved permissively: plan
01-12 (sign-up/sign-in forms) and plan 01-14 (theme toggle) both include creating their own
`visual/auth.visual.spec.ts` / `visual/theme.visual.spec.ts` and dispatching CI baselines for
them, exactly like the seven `components/ui/` primitives.

This is a direct user decision, made during the wave 9 (01-09) checkpoint review while
discussing the visual-regression pipeline's mechanics: extending screenshot generation to every
future component (not just primitives) is a bigger performance/maintenance question — more
Storybook stories to build, more baseline PNGs to generate and store, more surface area for the
baseline-poisoning risk already logged as a todo — that deserves its own deliberate policy
decision rather than defaulting to "yes" by accretion, one plan at a time.

## Decision Outcome

**For now, Playwright visual-regression coverage is scoped to `components/ui/` primitives only.**
Feature-level components (auth forms, theme toggle, and everything in later phases —
boards/columns/tasks UI) get Storybook stories and Vitest Browser Mode + axe coverage as normal,
but do **not** get a `visual/*.visual.spec.ts` entry or CI-generated screenshot baselines until a
separate policy decision extends this scope deliberately.

Plans 01-12 and 01-14 (already authored, not yet executed) are amended to drop their
`visual/auth.visual.spec.ts` and `visual/theme.visual.spec.ts` deliverables accordingly — the
`.stories.tsx` files themselves stay (still useful for manual Storybook review and the a11y
project), only the visual-regression spec entry and baseline generation are removed.

## Consequences

- `visual/primitives.visual.spec.ts` remains the only visual-regression spec file for the
  remainder of Phase 1.
- Feature-level UI (auth screens, theme toggle) has no automated defense against visual
  regressions beyond manual review and the a11y/behavioral test suites — accepted as the
  tradeoff for this decision, for now.
- The broader policy — whether/how to extend visual regression to feature components in later
  phases (boards, columns, tasks) — is an open decision, not resolved here. It should weigh the
  performance/storage cost this ADR's context flagged (more stories × more baselines × two
  viewports since ADR tech/0010's mobile-first retrofit) against the coverage gap this ADR just
  accepted.

Unwind trigger: a real visual regression ships in a feature component that primitive-only
coverage couldn't have caught, and manual review missed → revisit scope with the actual
performance cost measured against that concrete cost of not having it.

## Test mechanism (added during D-22's comment sweep, plan `02.1-14`)

`visual/primitives.visual.spec.ts` implements this ADR's scope decision. Recorded in full here so
the spec file can carry short pointers instead of the reasoning inline (CONVENTIONS.md PC-05).

**Dual-viewport capture (ADR tech/0010).** Every story is captured at both viewports by having
Playwright itself resize the page before navigating (`page.setViewportSize`, driven by the same
shared `viewport-breakpoints.ts` sizes `.storybook/preview.ts`'s toolbar control and the Vitest
dual-viewport test util both read), rather than authoring a separate `Mobile*` story export per
primitive. Storybook's own `viewport` global/toolbar only resizes a nested manager iframe that
doesn't exist when a test navigates directly to `/iframe.html` the way this spec does, so it can't
drive the real viewport here — the page's own size is what actually needs to change for
`md:`/`lg:` Tailwind classes to evaluate correctly. Baseline filenames read
`{storyId}-{desktop|mobile}-{light|dark}.png` — device before theme, matching the order the two
axes are chosen in.

**Screenshot target resolution (`gotoStory`).** Screenshotting the story's root element, not the
full page or even `#storybook-root`, crops to its actual rendered bounds — most primitives take up
under 10% of the viewport, so a full-page capture was mostly wasted whitespace in every baseline
and comparison; this also scales for larger primitives without a hand-picked size per story. The
target resolves through several branches, most specific first, because Base UI's portal-rendering
primitives (D-15) don't render their real visible surface inside `#storybook-root`:

- **Toast** (plan `02-07`): `Toast.Portal` renders the Viewport into `document.body`, and — unlike
  Modal, which only ever has one open dialog — a Stacked story renders more than one
  `[role="dialog"]` toast at once, so preferring the dialog match would silently crop the baseline
  to the first toast and lose the second. Checked first, independently of the dialog branch: the
  Viewport carries `role="region"`+`aria-live="polite"` (verified directly against the installed
  `ToastViewport.js`, not the `role="status"` a consumer might assume) — a combination no other
  primitive's stories produce, so this match is scoped to Toast alone.
- **Menu** (plan `02-07`): `Menu.Portal` renders an open Menu's real popup (`role="menu"`) into
  `document.body`. Checked before the dialog branch purely because it's the newer/more specific
  case; Menu never renders `role="dialog"` and Modal never renders `role="menu"`, so the two
  branches never actually compete for the same story.
- **Modal**: `Dialog.Portal` renders the Backdrop/Popup into `document.body` by design, so an open
  Modal story's `#storybook-root` child is just its (visually empty) Trigger button —
  screenshotting that would produce a meaningless baseline. Every other primitive (none of which
  render `role="dialog"`) falls through to the `#storybook-root` behavior below unchanged.
- **Fallback**: `#storybook-root` itself is a full-width block whose own bounding box stretches to
  the viewport regardless of content, so the target is its first real child — the story's own
  single root element (every story here renders one: a bare primitive, or a wrapping `<div>` for
  multi-element stories like "Sizes") — not the shell around it.

Sources:

- `visual/primitives.visual.spec.ts` — the implementation this record documents; carries one-line
  pointers back here instead of restating this reasoning inline.
