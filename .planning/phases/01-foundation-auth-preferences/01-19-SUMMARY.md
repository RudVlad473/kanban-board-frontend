---
phase: 01-foundation-auth-preferences
plan: 19
subsystem: auth
tags: [zod, react-hook-form, validation, nextjs-route-handlers, msw, playwright, openapi]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: sign-up form (01-16), auth Route Handlers and mock backend (01-10/01-11/01-12), e2e auth coverage (01-13)
provides:
  - "signUpSchema carrying the real backend's password rules (8-64 chars, 4 character classes) and an optional displayName (3-32 Unicode letters/spaces when supplied)"
  - "resolveDisplayName — the single email-local-part fallback used by both auth Route Handlers when assembling a session"
  - "sign-up form, its tests/stories, and 01-UI-SPEC.md's Copywriting Contract updated to match"
  - "regenerated BFF OpenAPI contract and generated types reflecting the new schema"
affects: [01-20, 01-21, 01-26, 01-29]

# Actuals (#2632)
actuals:
  tokens: 11213
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "z.string().optional().transform().pipe() for an optional field needing input-side normalization — keeps the schema's input and output types identical (string | undefined), unlike z.preprocess() whose raw-argument type is always `unknown` and breaks react-hook-form's useForm<T>/zodResolver type equality."
    - "Single shared fallback helper (resolveDisplayName) read by every Route Handler that assembles a session, rather than each call site inventing its own default."

key-files:
  created:
    - src/lib/display-name.ts
    - src/lib/display-name.unit.test.ts
    - src/lib/validation/auth-schemas.unit.test.ts
  modified:
    - src/lib/validation/auth-schemas.ts
    - app/api/auth/signup/route.ts
    - app/api/auth/signin/route.ts
    - app/api/auth/routes.test.ts
    - src/lib/mocks/store.ts
    - src/lib/mocks/handlers.ts
    - docs/api/bff-openapi.json
    - src/lib/api/bff-generated-types.ts
    - src/features/auth/components/sign-up-form.tsx
    - src/features/auth/components/sign-up-form.test.tsx
    - src/features/auth/components/sign-up-form.stories.tsx
    - .planning/phases/01-foundation-auth-preferences/01-UI-SPEC.md
    - e2e/auth.e2e.spec.ts

key-decisions:
  - "displayName's optionality is expressed as .optional().transform().pipe(), not z.preprocess() — preprocess's raw-argument type is always `unknown`, which widened the schema's input type to `displayName?: unknown` and broke useForm<SignUpInput>/zodResolver's type equality (the 2 tsc errors this session inherited). .transform() preserves its source schema's own input type instead."
  - "The e2e fixture name in e2e/auth.e2e.spec.ts (\"E2E Tester\") was changed to \"End To End Tester\" — the digit in the original fixture now fails the new letters-and-spaces-only name rule, which is exactly the class of fixture-alignment change the plan's own acceptance criteria called out for the password fixture."

patterns-established:
  - "Optional-field-with-normalization Zod pattern: .optional().transform(normalize).pipe(constrainedSchema) keeps input/output types aligned for react-hook-form consumers; prefer this over z.preprocess() whenever the schema feeds a useForm<T> resolver."

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "signUpSchema enforces the real backend's password rules (8-64 chars, uppercase/lowercase/digit/special) and rejects out-of-range or low-complexity passwords with the correct named message"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/lib/validation/auth-schemas.unit.test.ts#signUpSchema — password"
        status: pass
      - kind: integration
        ref: "app/api/auth/routes.test.ts#POST /api/auth/signup > returns 400 for a password missing the required character classes, and never reaches the upstream endpoint"
        status: pass
    human_judgment: false
  - id: D2
    description: "displayName is optional; an absent, empty, or whitespace-only name is accepted as no-name, and a supplied name is checked against the backend's 3-32/Unicode-letters-and-spaces rules"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/lib/validation/auth-schemas.unit.test.ts#signUpSchema — displayName"
        status: pass
    human_judgment: false
  - id: D3
    description: "resolveDisplayName never returns an empty string: supplied name wins, else the email's local part, else the literal 'User'; both Route Handlers use it when assembling a session, so a nameless sign-up/sign-in yields a usable display name"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/lib/display-name.unit.test.ts"
        status: pass
      - kind: integration
        ref: "app/api/auth/routes.test.ts#POST /api/auth/signup > derives the session's display name from the email's local part when no name is supplied"
        status: pass
    human_judgment: false
  - id: D4
    description: "signInSchema is unchanged — still accepts any non-empty password, proving the complexity rules gate sign-up only"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/lib/validation/auth-schemas.unit.test.ts#signInSchema — still accepts a short, simple password — complexity rules never gate sign-in"
        status: pass
      - kind: e2e
        ref: "e2e/auth.e2e.spec.ts#AUTH-02: sign in > signs in the demo account and stays signed in across a full page reload"
        status: pass
    human_judgment: false
  - id: D5
    description: "The BFF OpenAPI contract and its generated types are regenerated from the new schemas; re-running the generator leaves no diff"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "pnpm bff-api:generate then git diff --exit-code docs/api/bff-openapi.json src/lib/api/bff-generated-types.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Sign-up form: Name field marked optional via the description prop, empty-submit shows exactly two required-field messages, a nameless valid submit sends no displayName key, on-blur cases cover the too-short/digit-containing name and the too-long/complexity-failing password"
    requirement: "AUTH-01"
    verification:
      - kind: integration
        ref: "src/features/auth/components/sign-up-form.test.tsx"
        status: pass
      - kind: e2e
        ref: "e2e/auth.e2e.spec.ts#AUTH-01: sign up > creates an account, lands on the board list, and sets an httpOnly session cookie"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 19: Validation Schema Alignment to Real Backend Rules (GC-02) Summary

**Sign-up password/name validation now matches the real backend's Bean Validation rules exactly (8-64 chars + 4 character classes, optional 3-32-char Unicode-letter name), with a single `resolveDisplayName` fallback wired into both auth Route Handlers so a nameless account never renders a blank display name.**

## Performance

- **Duration:** ~40 min (this resumed session — root-causing and fixing the 2 tsc errors, running/fixing both tasks' full `<verify>` blocks, splitting the WIP commit, writing this SUMMARY). The bulk of the schema/route/form implementation itself was done by an earlier session and preserved as an interrupted WIP commit (`d5f58d3`) before this session began.
- **Started:** 2026-08-17T19:00:00Z (approx — resume point)
- **Completed:** 2026-08-17T19:40:00Z
- **Tasks:** 2/2 complete
- **Files modified:** 16 (across both task commits)

## Accomplishments
- `signUpSchema`'s password rule now enforces the real backend's 8-64 character range plus four distinct character-class checks (uppercase, lowercase, digit, special), replacing the researcher-default "at least 8 characters" floor.
- `displayName` is optional end to end — schema, both Route Handlers, and the mock backend all accept a sign-up with no name — while a supplied name is checked against the backend's own 3-32-character/Unicode-letters-and-spaces rule.
- `resolveDisplayName` (`src/lib/display-name.ts`) is the single fallback (supplied name → email local part → `"User"`) both `signup` and `signin` Route Handlers use when assembling a session, closing the blank/`undefined`-in-dashboard-chrome gap.
- The BFF OpenAPI contract and its generated TypeScript types are regenerated from the new schemas; re-running the generator produces no diff.
- The sign-up form marks the Name field optional via its existing `description` prop, its tests/stories reflect the new two-required-field/on-blur behaviors, and `01-UI-SPEC.md`'s Copywriting Contract records the real rules with their source instead of a flagged researcher default.
- Root-caused and fixed the 2 real `tsc` errors the interrupted prior session left behind (see Deviations).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "sign up with no name and a real-rules password" — schema through route to session** - `cbc8491` (feat)
2. **Task 2: The sign-up form, its stories and the design contract catch up** - `1d65097` (feat)

**Plan metadata:** committed alongside this SUMMARY.

_Both tasks were carried tdd="true"; the bulk of the RED/GREEN work was already folded into the interrupted WIP commit by the prior session (69 passing tests before this session started) — this session's job was root-causing the 2 remaining tsc errors, closing the e2e fixture gap, running both tasks' full `<verify>` blocks to green, and splitting the single WIP commit into these two clean per-task commits along the plan's own file boundaries._

## Files Created/Modified
- `src/lib/validation/auth-schemas.ts` - Real password/name rules; `displayName` rewritten from `z.preprocess()` to `.optional().transform().pipe()` to fix the type-inference break
- `src/lib/validation/auth-schemas.unit.test.ts` - New: parametrised coverage of both schemas' rejected/accepted cases
- `src/lib/display-name.ts` - New: `resolveDisplayName`, the single display-name fallback
- `src/lib/display-name.unit.test.ts` - New: fallback edge cases (present/absent/whitespace-only name, no-local-part email)
- `app/api/auth/signup/route.ts` - Forwards the validated body upstream unchanged; resolves the fallback only for the session payload
- `app/api/auth/signin/route.ts` - Resolves the fallback for an upstream identity with an empty display name before creating a session
- `app/api/auth/routes.test.ts` - Nameless-sign-up session assertion, weak-password rejection, rejected-body-never-reaches-upstream assertion
- `src/lib/mocks/store.ts` / `src/lib/mocks/handlers.ts` - Mock backend's `createUser`/sign-up handler widened to accept an optional name
- `docs/api/bff-openapi.json` / `src/lib/api/bff-generated-types.ts` - Regenerated from the new schemas
- `src/features/auth/components/sign-up-form.tsx` - Name field marked optional via `description="Optional"`; `forceFieldErrors` no longer stages a required-name error
- `src/features/auth/components/sign-up-form.test.tsx` - Updated required-field count, nameless/named submit assertions, parametrised on-blur rejection cases
- `src/features/auth/components/sign-up-form.stories.tsx` - Trimmed `WithFieldErrors`, added `WithNameAndPasswordComplexityErrors`
- `.planning/phases/01-foundation-auth-preferences/01-UI-SPEC.md` - Copywriting Contract corrected: real password range/complexity rows, two new name-message rows, researcher-default note removed
- `e2e/auth.e2e.spec.ts` - Fixture fix: the AUTH-01 sign-up fixture's name no longer contains a digit (see Deviations)

## Decisions Made
- **`.transform().pipe()` over `z.preprocess()` for the optional-with-normalization `displayName` field.** `z.preprocess()`'s raw-argument type is always `unknown`, which widened the schema's *input* type to `displayName?: unknown` while its *output* type stayed `displayName?: string | undefined` — an input/output mismatch that's invisible until something asserts the schema's input type equals its output type, which `useForm<SignUpInput>` + `zodResolver(signUpSchema)` does implicitly. `.optional().transform(normalize).pipe(constrainedSchema)` keeps both sides at `string | undefined`, which is both the root-cause fix and a reusable pattern for any future optional-with-normalization field feeding a `useForm` resolver.
- **The e2e fixture name was corrected alongside the password fixture**, even though `e2e/auth.e2e.spec.ts` isn't in the plan's declared `<files>` list. The plan's own Task 2 acceptance criteria anticipated this class of change ("plan 01-13's sign-up scenario still passes, which requires its fixture password to satisfy the new rules") — the same requirement extends to the name field once the letters-and-spaces-only charset rule is in place; the original fixture's `"E2E Tester"` contains a digit and was failing the sign-up e2e test outright.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Root-caused and fixed the 2 tsc errors left by the interrupted prior session**
- **Found during:** Task 1 (pre-existing in the WIP commit `d5f58d3` this session resumed from)
- **Issue:** `react-hook-form`'s `zodResolver(signUpSchema)` produced a `Resolver<{..displayName?: unknown}, ...>` that wasn't assignable to `useForm<SignUpInput>`'s expected `Resolver<{..displayName?: string}, ...>`. Root cause: `displayName`'s optionality was implemented with `z.preprocess(normalizeOptionalDisplayName, innerSchema)`, and `z.preprocess()`'s raw-argument type is always `unknown` — this widened the whole object schema's *input* type without changing its *output* type, breaking the input/output equality `useForm<T>` + `zodResolver` rely on.
- **Fix:** Rewrote the `displayName` field as `z.string().optional().transform((value) => (value === undefined || value.trim() === "" ? undefined : value)).pipe(constrainedOptionalSchema)`. `.transform()` (unlike `preprocess`) preserves its source schema's own input type, so both input and output stay `string | undefined`.
- **Files modified:** `src/lib/validation/auth-schemas.ts`
- **Verification:** `pnpm exec tsc --noEmit` exits 0 (both errors gone); all 57 unit/node tests and all 355 project-wide tests still pass with identical assertions.
- **Committed in:** `cbc8491` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed the AUTH-01 e2e fixture's name to satisfy the new charset rule**
- **Found during:** Task 2's `pnpm exec playwright test --project e2e` verify step
- **Issue:** `e2e/auth.e2e.spec.ts`'s sign-up fixture used the name `"E2E Tester"`, which contains a digit (`2`). The new `DISPLAY_NAME_CHARSET_MESSAGE` rule (letters and spaces only) rejected it on submit, leaving the page stuck on `/register` and the test failing.
- **Fix:** Changed the fixture name to `"End To End Tester"` (no digits).
- **Files modified:** `e2e/auth.e2e.spec.ts`
- **Verification:** `pnpm exec playwright test --project e2e` — all 8 e2e tests pass, including AUTH-01.
- **Committed in:** `1d65097` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bug fixes)
**Impact on plan:** Both fixes were required to reach the plan's own stated verify/acceptance criteria (green `tsc`, green e2e). No scope creep — no architectural changes, no new dependencies.

## Issues Encountered
- **`pnpm build` initially failed with `SESSION_SECRET is not set`.** This worktree had no `.env.local` (gitignored, per-clone/per-worktree per `SETUP.md`) — unrelated to this plan's code. Created a worktree-local `.env.local` with a freshly generated `SESSION_SECRET` (`openssl rand -base64 32`) and a placeholder `EXTERNAL_API_BASE_URL` purely to satisfy the build-time env check; the file is gitignored and was never staged or committed. Not a code change, not part of either task commit.
- **Dashboard-header-for-a-nameless-account behavior** was confirmed at the session level (`app/api/auth/routes.test.ts`'s `"derives the session's display name from the email's local part when no name is supplied"` test), per the plan's own documented fallback path ("if it needs new fixtures, assert it in `app/api/auth/routes.test.ts` at the session level instead and say so in the SUMMARY") — 01-13's e2e helpers don't currently expose a route to a nameless account without adding new fixtures of their own, so this session did not add one.

## User Setup Required
None - no external service configuration required. (The worktree-local `.env.local` created for build verification is a local convenience only, gitignored, and not part of this plan's deliverable — see Issues Encountered.)

## Next Phase Readiness
- GC-02 is closed: sign-up validation now matches the real backend exactly, the name is optional exactly as the backend allows, and no code path renders an absent name as blank or `undefined`.
- 01-20, 01-21, 01-26 (all `depends_on: ["01-19"]`) are unblocked.
- This worktree/branch (`worktree-agent-af88496caaa43c8ac`) is left intact with two clean commits on top of `b682b84`, ready for the orchestrator's merge-back; no cleanup performed here per instructions.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-17*
