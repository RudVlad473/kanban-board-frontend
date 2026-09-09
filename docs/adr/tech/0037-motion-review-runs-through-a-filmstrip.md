# 0037 — Motion review runs through a filmstrip, not a numeric proxy

## Context

Phase 5's prototypes are judged on motion, and motion is the one thing this project could not
verify. Between 2026-09-08 and 2026-09-09, thirteen revisions of the task-open panel were reviewed
by the user watching OBS captures and reporting verdicts in prose — "it's literally the same?", "it
is still a fade in fade out situation" — while the agent's own measurements reported success on
every one of them. Every miss was reachable with tools already installed. None was caught.

`scripts/filmstrip.mjs` is the instrument that closes that gap: it drives the real page, captures
the interaction as CDP screencast frames, and emits one contact sheet plus a per-frame change
series. A reader arrives at it with five questions.

**This record was corrected on 2026-09-09** after a three-way review of the first version returned
twelve confirmed findings, and a thirteenth surfaced while fixing them. §2's original headline
number was measured through an injection that silently did nothing, and §3 and §4 described
behaviour the code did not have. Both are restated below against what was actually run.

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

`moved` counts pixels whose channel delta exceeds `CHANNEL_THRESHOLD` (8): structural change,
things arriving, leaving and travelling. `wash` is the mean absolute luminance delta with **no**
threshold: a low-amplitude tint across a whole area.

Both are needed, and the second is the one that matters, because the first is blind by construction
to any change smaller than its threshold — however large the area, however long it lasts. Measured
2026-09-09 on a page whose background transitions `#ffffff` → `#f8f8f8` (a 7-unit step, just under
the threshold) with no element moving at all:

```
filmstrip: 61 frames over 932ms of movement
  viewport       moved 0.00% @ +0ms   wash 7.00 @ +915ms
```

A single thresholded metric reports a whole-viewport fade lasting nearly a second as **nothing at
all**. That is exactly the defect this file exists for, and it is invisible to `moved` at any
duration.

**A correction, because the original version of this section got its evidence wrong.** It claimed
`moved` read *"4.04% both ways"* on the root-fade bug. That number came from a positive control that
silently did nothing: the injection restored the root snapshot by declaring
`:root { view-transition-name: root }`, and `root` is a **reserved value that fails to parse**, so
both runs measured the fixed code. Deleting the page's own `:root { view-transition-name: none }`
rule is what actually restores it, and against that, `moved` goes 4.04% → ~9%. So `moved` is not
blind to that particular bug — it simply raises no verdict line, while `outside` wash goes
0.22 → 4.89 and flips the run's conclusion. **Byte-identical numbers from a broken and a fixed run
are evidence of a no-op experiment, not of a blind metric.**

**Each metric gets its own peak frame.** Reporting one frame's pair understates the other by
construction: the tint above printed `wash 0.00` while the series held 7.00, because the max-`moved`
frame was frame 0. This was the thirteenth finding, and the one that mattered most — the tool's own
headline line was blind to the thing it was built to see.

## 3. Why is the whole viewport always reported, and why can't `--region` replace it?

Because the 2026-09-09 fade covered the entire screen and every check that day was scoped to a
named transition group. The one element large enough to matter was the one nothing looked at.

`--region` names the area you **expect** to change. It never narrows what is watched — it splits
the report into *inside* (did the intended thing happen?) and *outside* (did anything happen that
nothing asked for?). The outside series is the load-bearing one, and it is what flips the verdict
line to `OUTSIDE MOVED`. The contact sheet is likewise never cropped to the region; seeing what was
not under test is the point of having a sheet at all.

A region is validated against the viewport. `getImageData` pads an out-of-bounds rect with
transparent black rather than refusing, and that padding never changes between frames, so an
overhanging rect dilutes both `inside` metrics in exact proportion to the overhang — the same page
and trigger reported `inside moved 100.00%` at 1440x900 and `0.00%` at 800x600, exit 0, no warning.
A region covering the whole viewport leaves nothing outside it and reports `not measurable` rather
than a zero, because "wash 0.00 — nothing moved" is otherwise indistinguishable from a real result.

### The negative control, and what it actually proves

Pre-trigger frames are the built-in negative control, and **its semantics are frame counts, not an
average.** CDP emits a screencast frame only when the compositor produces one, so a genuinely
settled page emits the initial frame and nothing else. Zero repaints in the control window is
therefore a *positive* finding of stillness, and it is reported as such.

The first version got this wrong twice over. It averaged the control frames and compared the mean
to the same `0.3` used for a capture window three times longer; and when there was only one control
frame — the normal case on a settled page — a ternary returned a literal `0`, printing
`control clean … 0.00` from zero measurements. Every reference run in the original version of this
record, including the ones quoted as evidence, printed that constant. The control now reports the
repaint count and, when there were repaints, their peak wash against `THRESHOLDS.controlWash`
(0.05).

Verified against the two cases the original text promised and did not deliver: a 20px square
crossing 200px every 100ms now reports `CONTROL DIRTY 13 repaint(s) … washing 0.16`, and a landing
page carrying `animation:fly 7s infinite` reports `CONTROL DIRTY 12 repaint(s) … washing 0.27`.
Before the fix both read `control clean`, and the second additionally attributed the page's own
ambient motion to a `--trigger` that had not been supplied.

**A check asserting an absence needs a positive control.** This is that rule mechanised — and the
rule caught this file twice, which is the argument for it.

## 4. Why does nothing accumulate on disk?

A review tool that leaves artifacts behind stops being run, or worse, gets read against a stale
sheet from a previous fix. Four properties keep `.motion/` bounded without anyone maintaining it:

- **Frames never touch disk.** They are decoded, diffed and tiled in memory; only `strip.png` and
  `series.json` survive a run. A 29-frame run costs ~475KB rather than ~30 full-page PNGs.
- **A run replaces its own `--name` directory**, so re-running a check after a fix cannot leave the
  pre-fix sheet sitting beside the new one.
- **Only the newest 5 run directories survive**, pruned in a `finally` so a crashed run still pays
  its retention debt. The original pruned only on the success path: eight crashed runs left eight
  directories, and the empty husks then occupied retention slots and evicted real sheets — the
  inverse of the property this section claims.
- **`--name` is one path segment** of `[A-Za-z0-9._-]`. It reaches a recursive `force: true` delete
  that runs *before* the browser launches, so `--name ../src` destroyed the source tree without
  needing a reachable URL. The realistic trigger is a shell variable expanding empty inside
  `--name "../$SLUG"`, not malice.

`.motion/` is gitignored: it is evidence for a decision in progress, not a record of one.

## 5. Where do the thresholds come from?

Three numbers decide every verdict line, and they are `THRESHOLDS` rather than literals so this
section can be found from the code:

| name | value | basis |
|---|---|---|
| `CHANNEL_THRESHOLD` | 8 | above sub-pixel antialiasing noise; the figure `moved` is built on |
| `outsideWash` | 0.3 | the reference clean run sits at **0.22**, a 1.36× margin |
| `moved` | 0.5 | amber labelling and the `span` filter only; no verdict depends on it |
| `controlWash` | 0.05 | below the two ambient-motion cases in §3 (0.16 and 0.27) |

**`outsideWash`'s margin is thin and is the number most likely to need revisiting.** 0.22 is not
noise — it is a real permanent change, the card selection highlight moving outside the named
region — so any prototype whose legitimate outside-region change is ~40% larger will false-alarm.
When that happens the fix is a larger region or a better-chosen one, not a larger threshold.

`outside.moved` is computed and stored in `series.json` but no verdict consults it; the outside
verdict is `wash`-only. Both metrics are area-normalised, so on the outside series they dilute
together and no input was found where consulting `moved` changes the conclusion.

## Consequences

Motion findings are reported from a sheet and a series, both regenerable by one command. A claim
about an animation that cites neither is unverified, whatever else supports it.

Every failure mode now names the argument at fault and exits 2; a run that captures no frames after
the trigger says so in words and exits 1, rather than dereferencing `undefined` — which it did on
**39 of the 62** tracked prototypes.

Two gaps remain, both deliberate. The sheet is sampled at screencast frame rate, so a defect
lasting less than one frame is invisible to it. And the decoder is browser code carried as a
template literal, which `node --check`, eslint and prettier all pass on even when it cannot parse —
`scripts/filmstrip.unit.test.mjs` parses it with `new Function` to catch that class, and the run
asserts both entry points exist after injection, but neither substitutes for a type checker.
Extracting it into a real module is the fix if it grows.

Nothing here replaces the user watching the actual thing — it replaces the agent guessing about it.

## Status

Accepted 2026-09-09; corrected the same day after a three-way review. Supersedes nothing;
`docs/adr/tech/0035`'s Playwright fixtures cover correctness and accessibility during e2e runs,
which is a different job from reviewing a transition's shape.
