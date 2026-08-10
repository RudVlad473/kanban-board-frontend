# 0008 — Visual regression tool

## Decision Drivers

- Visual regression testing runs only against Storybook design-system
  components (fixed scope).
- The user explicitly objected to a third-party service for this:
  "just having this 3rd party service doesnt sit right" — this became
  the heaviest weighted driver after the initial walkthrough.
- Solo developer — budget-consciousness and low setup/maintenance
  overhead both matter.
- Playwright is already a fixed, mandatory part of the testing stack for
  E2E/`nextcov` coverage.

## Considered Options

**Playwright-native (`expect(page).toHaveScreenshot()`)** (recommended)
- Pros: zero third-party service — baseline PNGs, diffing (via the
  open-source `pixelmatch` library), and review all stay inside the
  project's own repo and CI; zero added dependency, since Playwright is
  already mandatory; zero recurring cost; the local/CI HTML report
  (`npx playwright show-report`) renders an expected/actual/diff slider,
  a genuinely usable review experience.
- Cons: no official one-command Storybook hookup — requires ~30-60 lines
  of hand-written glue (reading `storybook-static/index.json`,
  iterating stories, screenshotting each); no PR-visible diff
  comments — a reviewer must know to open the CI artifact; accepting a
  visual change means `--update-snapshots` + a manual commit.

**Lost Pixel (OSS/CI mode)**
- Pros: also fully local and free — confirmed zero external
  account/API-key/network-call requirement when configured with
  `generateOnly: true`; Storybook integration is one config line
  (`storybookUrl`) rather than hand-rolled glue.
- Cons: no local CLI diff viewer at all in OSS mode (only raw PNG
  folders — worse review experience than Playwright's own HTML report);
  wants Docker for baseline-generation OS consistency; still a separate
  npm dependency to install and keep compatible, unlike Playwright-
  native which adds nothing new.
- Why not the recommendation: on direct comparison it isn't "Playwright-
  native with a better review UI" — it trades slightly less integration
  glue for a worse review experience and one more dependency to
  maintain.

**Argos**
- Pros: generous free tier (5,000 screenshots/mo forever, no card);
  first-class GitHub PR/merge-queue integration.
- Cons: requires an account and uploading every screenshot to the
  vendor's cloud for review — exactly the pattern the user objected to;
  its own README confirms self-hosting isn't officially supported, so
  there's no lower-dependency escape hatch.
- Why not the recommendation: violates the user's explicit
  no-third-party-service preference outright.

**Chromatic**
- Pros: purpose-built for Storybook (same authors), best-in-class setup
  experience and PR integration.
- Cons: same third-party-dependency objection as Argos; smallest free
  tier of the SaaS options (5,000 snapshots/mo, Chrome-only) with the
  steepest paid jump ($179/mo) if exceeded.
- Why not the recommendation: same third-party objection as Argos, and
  the least budget headroom of the three SaaS options.

## Decision Outcome

Chosen: **Playwright-native (`toHaveScreenshot`)**. This decision was
revised mid-walkthrough: the initial research (limited to Chromatic/Lost
Pixel/Argos, as originally framed by the user's own testing-strategy
diagram) recommended Argos. The user then pushed back on relying on any
third-party service, prompting a second research pass that added
Playwright-native as a fourth option and re-weighted "no third-party
dependency" as the heaviest driver. After a follow-up deep-dive
specifically comparing Playwright-native against Lost Pixel's OSS mode
(which looked like a closer alternative on paper), the user confirmed:
"yeah let's go playwright."

## Consequences

Unwind trigger: the hand-rolled Storybook-story-discovery glue becomes a
real maintenance burden, or the lack of PR-visible diff review becomes a
recurring workflow problem → re-evaluate Lost Pixel's OSS mode (closest
alternative on the same no-third-party-dependency terms) rather than
reintroducing a SaaS dependency.

Sources:
- https://playwright.dev/docs/test-snapshots — fetched 2026-08-09 and
  deepened 2026-08-10 (primary-docs).
- https://markus.oberlehner.net/blog/running-visual-regression-tests-with-storybook-and-playwright-for-free/
  — fetched 2026-08-10 (independent).
- https://storybook.js.org/docs/writing-tests/integrations/test-runner —
  fetched 2026-08-10, snippet-level (primary-docs).
- https://argos-ci.com/blog/playwright-visual-testing-limits — surfaced
  via search snippet, direct fetch 404'd, unverified (vendor,
  low-confidence).
- https://testdino.com/blog/playwright-visual-testing and
  https://browsercat.com/post/ultimate-guide-visual-testing-playwright —
  fetched 2026-08-10, snippet-level (independent).
- https://docs.lost-pixel.com/user-docs/llms-full.txt — fetched
  2026-08-10 (primary-docs): confirmed OSS/CI mode requires no external
  account/API key/network call; story discovery via `storybookUrl`
  config, not automatic; no local CLI diff viewer, raw PNG
  folders only; baseline updates fully manual (`npx lost-pixel docker
  update` or an optional PR-based recipe).
- https://www.chromatic.com/pricing/, https://argos-ci.com/pricing,
  https://www.lost-pixel.com/, https://github.com/lost-pixel/lost-pixel,
  https://github.com/argos-ci/argos — fetched 2026-08-09 (primary-docs/
  independent), carried forward from the initial research pass.
