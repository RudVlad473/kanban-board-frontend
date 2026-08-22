---
created: 2026-08-22T10:55:17.346Z
title: Investigate a shared integration-testing/mocking module for tests
area: testing
severity: minor
files:
  - src/test-utils/
  - CONVENTIONS.md
  - docs/adr/tech/0020
---

## Problem

The user asked whether we should add a shared integration-testing module that
handles all mocking in one place, importable by tests instead of redeclaring
setup per file.

Current state: `src/test-utils/` already exists as a shared *location*, but not
a shared *module* — each Server Action gets its own dedicated Storybook stub
file (e.g. `sign-in-action-storybook-stub.ts`, `sign-out-action-storybook-stub.ts`,
`sign-up-action-storybook-stub.ts`, `update-theme-action-storybook-stub.ts`).
That one-file-per-action split was a deliberate convention from plan 02-04,
mirroring CONVENTIONS.md's "one file per Server Action" rule, and this project's
docs/adr/tech/0020 treats mocking outside Storybook stories as a blocking lint
error — so any shared module here means shared Storybook decorators/stubs, not
`jest.mock`-style shared mocks.

Open question: is it worth consolidating, and if so how much? A full merge into
one barrel-mock module would cut import boilerplate but couples every test file
to one file that re-runs/re-registers every action's mock setup even when only
one is exercised, and makes that one file a hotspot every stub change touches.

## Solution

TBD — needs discussion with the user and further investigation before deciding.
One option floated in conversation: keep the per-action stub files as-is (matches
the existing convention and ADR-0020), but add a thin barrel re-export
(e.g. `src/test-utils/index.ts`) so call sites do
`import { signInStub, updateThemeStub } from '@/test-utils'` instead of one
import line per stub file — ergonomics of "import from one place" without
actually merging the mocks. Alternative raised but not explored: a shared
MSW-style handler registry. Needs a decision on scope (barrel re-export vs.
deeper consolidation vs. leave as-is) before any implementation.
