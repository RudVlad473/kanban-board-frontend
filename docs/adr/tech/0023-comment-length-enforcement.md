# 0023 — Comment-length enforcement

## Context

`CONVENTIONS.md`'s PC-05 has stated the 1-3 line comment-prose rule since plan `02-05`, with its
Enforcement column reading "code review — no automated tool measures comment-prose length." A
repo-wide scan (plan `02.1-02`) found 98 files and 241 offending runs under the previous, looser
sweep, and — re-run against the enforced default globs after `check-comment-length.mjs` shipped —
88 distinct offender files, including a 26-consecutive-prose-line block in
`src/components/ui/text-field/text-field.tsx`. Enforcement stated in prose but never mechanized is
a rule that erodes silently: every violation looks like every other line of code until someone
counts by hand, so nobody does.

## Decision Outcome

A comment's prose may not exceed three consecutive lines. Longer rationale belongs in the relevant
ADR, `CONTEXT.md`, or `SUMMARY.md`, referenced by a short pointer (e.g. "see ADR tech/0018") —
this is PC-05's existing rule, unchanged; what changes is that it is now mechanically checked.

**Mechanism:** `scripts/check-comment-length.mjs` (`pnpm comments:check`), CI-wired as a blocking
step — plan `02.1-15` removed the `continue-on-error: true` flag once the retrofit sweep brought
the whole repo into compliance. Its `findLongCommentRuns({ source, max })` classifier tracks
consecutive `//`/`/* */`/`/** */` comment lines as a single "run,"
treating block-comment delimiters and bare `*` continuation lines as non-counting, non-breaking
spacers — a `/** ... */` block with internal paragraph breaks but no truly blank line counts as one
continuous run, not several shorter ones, matching how a human reader actually experiences the
block.

This is a standalone script rather than an ESLint `no-restricted-syntax` selector (the mechanism
this project already uses for the raw-`<a>` ban and the `vi.mock`/`vi.spyOn` ban, `tech/0020`):
comments are not AST nodes, so no ESLint selector can match a run of them — the rule genuinely
cannot be expressed in that form, not merely inconvenient to. `scripts/check-comment-length.mjs`
instead mirrors `scripts/check-routes.mjs`'s own shebang/header/`globSync`/violations-array/
exit-code shape, this project's established pattern for a repo-wide grep-style CI gate outside
ESLint's rule system.

**Escape hatch:** a `comment-length-exempt:` marker line, placed immediately above the comment
block it exempts, suppresses the check for that one block. The marker itself is a hard boundary,
not prose — it closes any run already in progress and, only when it sits directly on the line
above the next block's first line, exempts that following block. This keeps the marker line from
silently merging into (and inflating) the prose count of the block it's meant to exempt. Every use
of the marker requires a reason on the same line — an unexplained exemption defeats the rule's
purpose as thoroughly as no rule at all.

## Consequences

- Every comment block over three prose lines anywhere in the repo's default-globbed scope
  (`app/`, `src/`, `e2e/`, `visual/`, `tokens/`, `scripts/`, `.storybook/`, top-level config/setup
  files) fails `pnpm comments:check` until either compressed to a short pointer or explicitly
  marked exempt with a stated reason.
- The check ran non-blocking in CI until the retrofit sweep (D-22) brought the repo's 88 known
  offender files into compliance; plan `02.1-15` then flipped it to blocking, once flipping it
  early would no longer have failed every PR on pre-existing debt unrelated to the change under
  review.
- A future contributor writing a long inline explanation gets fast, mechanical feedback instead of
  discovering the rule only at review time, or never.

Unwind trigger: none anticipated — this closes a gap the project's own conventions already
identified as a problem (PC-05's stated-but-unenforced rule); revisit only if the three-line
threshold itself proves too strict for a real, recurring case that genuinely can't be compressed or
pointed elsewhere.

**Enforcement:** `pnpm comments:check` (`scripts/check-comment-length.mjs`), wired into CI as a
blocking step.

Sources:

- `CONVENTIONS.md` PC-05 — the pre-existing rule this record mechanizes, previously enforced by
  code review only.
- `docs/adr/tech/0012-enum-like-constant-pattern.md` — the Enforcement-column style this record's
  own Enforcement statement follows.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md`
  D-22.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-02-SUMMARY.md`
  — the plan that built `check-comment-length.mjs` and proved it against the real
  `text-field.tsx` offender.
- `scripts/check-comment-length.mjs`, `scripts/check-routes.mjs` — the shipped script and the
  existing repo-wide-CI-gate pattern it mirrors.
