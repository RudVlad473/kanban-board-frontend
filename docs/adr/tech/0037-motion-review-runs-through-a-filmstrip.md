# 0037 — Motion review runs through a filmstrip, not a numeric proxy

## Context

Phase 5's prototypes are judged on motion, and motion is the one thing this project could not
verify. Between 2026-09-08 and 2026-09-09, thirteen revisions of the task-open panel were reviewed
by the user watching OBS captures and reporting verdicts in prose — "it's literally the same?", "it
is still a fade in fade out situation" — while the agent's own measurements reported success on
every one of them. Every miss was reachable with tools already installed. None was caught.

`scripts/filmstrip.mjs` is the instrument that closes that gap: it drives the real page, captures
the interaction as CDP screencast frames, and emits one contact sheet plus a per-frame change
series. A reader arrives at it with four questions.

## 1. Why an instrument at all, rather than a Playwright assertion?

An agent cannot watch a video. Motion has to be reduced to stills and numbers before it can be
reasoned about at all, so the question is never *whether* to reduce it, only whether the reduction
is chosen deliberately or improvised per investigation.

Improvised, it was wrong four times in two days:

- A harness asserting a swap strategy passed on a branch that never executed —
  `startViewTransition` was called **0** times while the row reported clean.
- `getComputedTiming()` reported `delay: 0` for the root snapshot under **both** the broken and the
  fixed CSS. The metadata agreed while the videos disagreed.
- A luminance probe's first clip covered the two cards whose open-highlight moves during the swap,
  so it measured a wanted change and would have reported it as the defect.
- Screenshot-based sampling ran ~100ms per frame — a quarter of a 420ms transition — which cannot
  resolve the shape it is measuring and reports a smooth curve as three flat points.

The instrument is tracked so the next review starts from its output instead of from a guess about
what to measure.

## 2. Why two metrics, when one would be simpler?

`moved` counts pixels whose channel delta exceeds a threshold: structural change, things arriving,
leaving and travelling. `wash` is the mean absolute luminance delta with **no** threshold: a
low-amplitude tint across a whole area.

Both are needed, and the second is the one that matters, because the first is blind to the exact
defect that prompted this file. A `::view-transition-old/new(root)` rule was fading the entire
window; measured on the same interaction with and without the bug, `moved` read **4.04% both
ways** — every affected pixel sat just under the threshold — while `wash` separated them
**0.22 against 4.89**, a factor of 22.

A single thresholded metric would have shipped the bug with a green result. This is the general
shape: thresholds are how a subtle, global regression hides inside a check built for a local,
obvious one.

## 3. Why is the whole viewport always reported, and why can't `--region` replace it?

Because the 2026-09-09 fade covered the entire screen and every check that day was scoped to a
named transition group. The one element large enough to matter was the one nothing looked at.

`--region` names the area you **expect** to change. It never narrows what is watched — it splits
the report into *inside* (did the intended thing happen?) and *outside* (did anything happen that
nothing asked for?). The outside series is the load-bearing one, and it is what flips the run's
verdict line to `OUTSIDE MOVED`. The contact sheet is likewise never cropped to the region; seeing
what was not under test is the point of having a sheet at all.

Pre-trigger frames are captured as a built-in negative control. A settled page must read flat; if
it does not, the instrument is picking up a caret, a spinner or a running animation, and the run
says `CONTROL DIRTY` rather than presenting numbers that look clean. **A check asserting an absence
needs a positive control** — this is that rule mechanised, after a harness twice reported a clean
absence it was incapable of ever contradicting.

## 4. Why does nothing accumulate on disk?

A review tool that leaves artifacts behind stops being run, or worse, gets read against a stale
sheet from a previous fix. Three properties keep `.motion/` bounded without anyone maintaining it:

- **Frames never touch disk.** They are decoded, diffed and tiled in memory; only `strip.png` and
  `series.json` survive a run. A 29-frame run costs ~475KB rather than ~30 full-page PNGs.
- **A run replaces its own `--name` directory**, so re-running a check after a fix cannot leave the
  pre-fix sheet sitting beside the new one.
- **Only the newest 5 run directories survive**, pruned on every run. The budget is enforced, not
  documented. `--clean` removes the tree outright.

`.motion/` is gitignored: it is evidence for a decision in progress, not a record of one.

## Consequences

Motion findings are reported from a sheet and a series, both regenerable by one command. A claim
about an animation that cites neither is unverified, whatever else supports it.

The gap this does not close: the sheet is sampled at screencast frame rate, so a defect lasting
less than one frame is invisible to it. Nothing here replaces the user watching the actual thing —
it replaces the agent guessing about it.

## Status

Accepted 2026-09-09. Supersedes nothing; `docs/adr/tech/0035`'s Playwright fixtures cover
correctness and accessibility during e2e runs, which is a different job from reviewing a
transition's shape.
