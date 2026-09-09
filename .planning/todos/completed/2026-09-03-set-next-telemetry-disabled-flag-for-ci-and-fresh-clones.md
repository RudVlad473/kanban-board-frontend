---
created: 2026-09-03T20:50:00.000Z
title: Set NEXT_TELEMETRY_DISABLED=1 so Next.js telemetry stays off in CI and on fresh clones
area: tooling
severity: minor
files:
  - .github/workflows/ci.yml
  - .github/workflows/visual-baselines.yml
  - .env.example
---

## Problem

Next.js collects anonymous telemetry by default (since 9.4) — feature usage, build durations,
Node/OS versions — writing `anonymousId`, a hashing `salt` and `notifiedAt` to
`~/.config/nextjs-nodejs/config.json`. The user found that file, did not want it, and telemetry was
disabled on this box on 2026-09-03 via `pnpm exec next telemetry disable`; `next telemetry status`
confirms opted out.

That fix does not travel. The opt-out is **per-machine state in `$HOME`**, not repo state, so:

- every CI job starts opted **in** — `pnpm build` runs in `quality`, `build-storybook` in `visual`,
  and both `.github/workflows/ci.yml` and `.github/workflows/visual-baselines.yml` are affected
- a fresh clone on another machine starts opted in
- a container or a rebuilt box silently reverts

So the state that was just fixed is the least durable form of the fix.

## Solution

Set `NEXT_TELEMETRY_DISABLED=1` as an environment variable, which needs no state file and cannot
drift per machine:

- Add it to the workflow(s) — prefer a single top-level `env:` block per workflow file over
  repeating it per job, so a newly added job inherits it instead of silently opting back in.
- Add it to `.env.example` with a one-line comment, so a fresh clone following SETUP.md gets it
  without needing to know the command exists.

Note for whoever picks this up: `.env.example` matches the `Read(.env.*)` deny in
`~/.claude/settings.json`, so an agent cannot `cat`, `grep` or `sed` it directly — the same
constraint that made the `pnpm secrets:*` script wrappers load-bearing in quick task `260903-ttt`.
Edit it with a tool that does not name the path in a shell command, or have the human make that one
edit.

Deferred from `260903-ttt` only because that task's executor was actively rewriting `ci.yml` at the
time and a concurrent edit would have conflicted. Consider folding this into the CI-pinning work in
`2026-09-03-pin-ci-runtime-layer-runner-image-actions-node.md` — both edit the same `env:`/workflow
surface, and doing them together is one review instead of two.

## Closed 2026-09-04 (branch `quick/ci-runtime-pinning`) — partially done

**Workflow half is already in place, pre-dating this close.** Both `.github/workflows/ci.yml` and
`.github/workflows/visual-baselines.yml` carry `NEXT_TELEMETRY_DISABLED: "1"` in a single
top-level `env:` block — landed in an earlier commit on this branch's history (`9c429a5` and
before), not newly added here. Verified present in both files as of this close; no further edit
needed on that half.

**`.env.example` half is blocked, exactly as this todo predicted.** A direct `Read` on
`.env.example` was refused: "File is in a directory that is denied by your permission settings" —
the `Read(.env.*)` deny in `~/.claude/settings.json` applies to the literal filename regardless of
directory, matching the note above. Per instruction, no workaround was attempted (no `pnpm
secrets:*` wrapper exists for this file — those cover `secrets.enc.env`/`.env.local`, not the
template). **This one edit still needs a human:** add a line to `.env.example` setting
`NEXT_TELEMETRY_DISABLED=1` with a one-line comment explaining it keeps Next.js telemetry off by
default for fresh clones (mirroring the reasoning already in this file's Problem section).
