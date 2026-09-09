---
phase: 01-foundation-auth-preferences
plan: 12
subsystem: auth
tags: [tanstack-query, react-hook-form, zod, msw, nextjs, storybook]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-11)
    provides: signUpSchema/signInSchema, POST /api/auth/signup, POST /api/auth/signin BFF Route
      Handlers, session-service factory
  - phase: 01-foundation-auth-preferences (plans 01-06 through 01-08)
    provides: TextField/Button/IconButton design-system primitives
provides:
  - QueryProvider (src/lib/query-client.tsx), wrapping app/layout.tsx — TanStack Query context
    for the whole app, mutation retry disabled by default
  - Same-origin auth-api.ts (postSignUp/postSignIn) + useSignUp/useSignIn mutation hooks, typed by
    the shared Zod input schemas, redirecting to /boards + router.refresh() on success
  - AuthCard shared shell, SignUpForm and SignInForm (React Hook Form + Zod, mode onTouched),
    each with a password-visibility toggle, live form-level error region, and staging props
    (defaultValues/forceFieldErrors/forceServerError/forceSubmitting/defaultPasswordRevealed) for
    D-25-compliant visual-only Storybook stories
  - /register and /login routes under the (auth) route group
affects: [01-13 (route guard — will need an authenticated session to redirect away from these
  routes), any future phase touching TanStack Query/React Hook Form conventions]

# Actuals (#2632)
actuals:
  tokens: 12756
  tasks: 3
  commits: 3

tech-stack:
  added: ["@tanstack/react-query@5.101.4", "react-hook-form@7.85.0", "@hookform/resolvers@5.7.1"]
  patterns:
    - "Story-staging props (defaultValues/forceFieldErrors/forceServerError/forceSubmitting/
      defaultPasswordRevealed) as the D-25-compliant, non-play-function way to demonstrate a
      composed feature form's every visual state in Storybook — the same pattern Dropdown/Modal
      already use via defaultOpen, extended from primitive-level to feature-form-level"
    - "A dedicated, test-local msw/browser setupWorker() (no base handlers, populated per test via
      .use()) for feature-form browser tests that call this app's own same-origin BFF routes —
      not src/lib/mocks/browser.ts's shared singleton, whose handlers transitively import
      node:fs/os/crypto via src/lib/mocks/store.ts and cannot be bundled into a real browser page"
    - "Plain <a> instead of next/link's Link for auth cross-links — next/link's internal code
      reads process.env, which is undefined in this project's plain (non-Next-runtime) Vitest
      Browser Mode test project; a full navigation also costs nothing here since the BFF issues
      an httpOnly cookie and there is no client router state worth preserving across the
      sign-up/sign-in transition"
    - "@storybook/nextjs-vite stories that render a next/navigation useRouter consumer need
      parameters.nextjs.appDirectory: true or the story throws \"expected app router to be
      mounted\" — required on both new *.stories.tsx meta blocks"

key-files:
  created:
    - src/lib/query-client.tsx
    - src/features/auth/api/auth-api.ts
    - src/features/auth/hooks/use-sign-up.ts
    - src/features/auth/hooks/use-sign-in.ts
    - src/features/auth/components/auth-card.tsx
    - src/features/auth/components/sign-up-form.tsx
    - src/features/auth/components/sign-up-form.test.tsx
    - src/features/auth/components/sign-up-form.stories.tsx
    - src/features/auth/components/sign-in-form.tsx
    - src/features/auth/components/sign-in-form.test.tsx
    - src/features/auth/components/sign-in-form.stories.tsx
    - app/(auth)/layout.tsx
    - app/(auth)/register/page.tsx
    - app/(auth)/login/page.tsx
  modified:
    - app/layout.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "QueryClient created inside QueryProvider's component state (useState initializer), not a
    module-scope singleton, so it is never shared across concurrent SSR requests; mutations.retry
    is false at the default-options level (a failed sign-in/sign-up must not be silently retried)."
  - "Story-staging props on SignUpForm/SignInForm (documented above) let the visual-only stories
    demonstrate WithFieldErrors/WithServerError/Submitting/PasswordRevealed states without a play
    function, satisfying D-25's locked no-play-function rule with no msw-storybook-addon
    dependency."
  - "Plain <a> instead of next/link — see tech-stack patterns above."
  - "A dedicated test-local MSW browser worker per form test file, instead of the shared
    src/lib/mocks/browser.ts worker — see tech-stack patterns above."

patterns-established:
  - "Route Handler validation error shapes ({ errors: {field: message} } for 400, { message }
    for other non-2xx) are read directly by auth-api.ts's extractMessage helper and thrown as a
    plain Error, so a mutation hook's onError/form's mutation.error.message always carries the
    server's own copy unmodified — the copy decision stays in the Route Handler, never
    duplicated/re-derived client-side."
  - "Submit buttons bind isDisabled + aria-busy to the mutation's isPending state rather than
    changing their visible label — Button has no loading-spinner variant of its own in this
    phase's primitive set, and UI-SPEC's Copywriting Contract names no separate loading-state
    copy, so the accessible/disabled state alone carries the loading affordance."

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "QueryProvider wraps app/layout.tsx; useSignUp/useSignIn mutation hooks call this
      app's own /api/auth/signup and /api/auth/signin endpoints only, never the external
      contract's base URL"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "pnpm build + node boundary/absolute-URL scan (both exit 0); a temporary
          server-client import inside use-sign-in.ts (wired into app/(auth)/login/page.tsx) was
          confirmed to fail pnpm build, then reverted"
        status: pass
    human_judgment: false
  - id: D2
    description: "SignUpForm: ten specified behaviours (three labelled fields + submit, all-empty
      and single-empty required-field errors, email-format error, password-length error,
      untouched-field isolation, single mutation call with entered values, disabled/loading
      submit state, generic failure copy with retained values, password reveal toggle)"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "src/features/auth/components/sign-up-form.test.tsx (10 behaviours x 2 viewports =
          20 tests, pnpm vitest run --project browser)"
        status: pass
      - kind: automated_ui
        ref: "src/features/auth/components/sign-up-form.stories.tsx (7 stories, axe via pnpm
          vitest run --project storybook)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SignInForm: eight specified behaviours (two labelled fields + submit, required
      and format field errors, single mutation call, disabled/loading submit state,
      invalid-credentials copy with password cleared/email retained, byte-identical failure
      message for unknown-email vs wrong-password, password reveal toggle)"
    requirement: "AUTH-02"
    verification:
      - kind: automated_ui
        ref: "src/features/auth/components/sign-in-form.test.tsx (8 behaviours x 2 viewports = 16
          tests, pnpm vitest run --project browser)"
        status: pass
      - kind: automated_ui
        ref: "src/features/auth/components/sign-in-form.stories.tsx (6 stories, axe via pnpm
          vitest run --project storybook)"
        status: pass
    human_judgment: false
  - id: D4
    description: "/register and /login routes render the respective form inside AuthCard; both
      build as static routes"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "pnpm build (Route (app) output lists both /register and /login as ○ Static)"
        status: pass
    human_judgment: false

duration: 26min (task-commit span; excludes upfront context-reading time, not separately timed)
completed: 2026-08-12
status: complete
---

# Phase 01 Plan 12: Sign-Up and Sign-In Forms Summary

**React Hook Form + Zod sign-up and sign-in screens built entirely from the TextField/Button/
IconButton primitives, wired through TanStack Query mutation hooks to this app's own BFF
endpoints, with a story-staging-props pattern for D-25-compliant visual-only Storybook coverage.**

## Performance

- **Duration:** 26 min (span between first and last task commit; upfront context-reading time not
  separately captured)
- **Started:** 2026-08-12T22:08:29+02:00 (first task commit)
- **Completed:** 2026-08-12T22:34:31+02:00 (last task commit)
- **Tasks:** 3
- **Files modified:** 17 (14 created, 3 modified)

## Accomplishments

- `QueryProvider` (`src/lib/query-client.tsx`) creates its `QueryClient` inside component state
  (never a module-scope singleton, so it can't leak across concurrent SSR requests) with mutation
  retry disabled by default; wraps `app/layout.tsx`'s children.
- `auth-api.ts`'s `postSignUp`/`postSignIn` are thin same-origin fetch wrappers over this app's own
  `/api/auth/signup`/`/api/auth/signin` Route Handlers, throwing the server's own `message` on any
  non-2xx response.
- `useSignUp`/`useSignIn` wrap those in a TanStack Query mutation typed by the shared
  `SignUpInput`/`SignInInput` Zod schemas, redirecting to `/boards` and calling `router.refresh()`
  on success.
- `AuthCard` is the shared presentational shell (bg-surface, `p-6`, `rounded-lg`, `shadow.md`,
  centred with `my-8` clearance) both `/register` and `/login` compose.
- `SignUpForm`/`SignInForm` are React Hook Form + Zod forms (`mode: "onTouched"`) built entirely
  from `TextField`/`Button`/`IconButton` — no bespoke input or button element, no six-digit hex
  literal. Both carry a password-visibility toggle (state-reflecting `aria-label`), a live
  form-level error region, and a set of staging props
  (`defaultValues`/`forceFieldErrors`/`forceServerError`/`forceSubmitting`/
  `defaultPasswordRevealed`) that let their Storybook stories demonstrate every required visual
  state without a play function, per this project's locked D-25 rule.
- 36 browser-mode behavioural tests (20 sign-up, 16 sign-in, each behaviour run at both mobile and
  desktop viewports per ADR tech/0014) and 13 Storybook stories (all passing axe) cover every
  behaviour and state named in the plan, including the untouched-field isolation case and a direct
  byte-for-byte comparison proving the sign-in failure message is identical for an unknown email
  and a wrong password.

## Task Commits

1. **Task 1: Query provider and auth mutation hooks** — `5a14d90` (feat)
2. **Task 2: Sign-up form and route** — `dc6cf0e` (feat)
3. **Task 3: Sign-in form and route** — `4c35d23` (feat)

**Plan metadata:** commit created at end of this execution (see final commit list returned to the
orchestrator).

## Files Created/Modified

- `src/lib/query-client.tsx` — `QueryProvider` client component
- `src/features/auth/api/auth-api.ts` — `postSignUp`/`postSignIn` same-origin fetch wrappers
- `src/features/auth/hooks/use-sign-up.ts` / `use-sign-in.ts` — TanStack Query mutation hooks
- `src/features/auth/components/auth-card.tsx` — shared auth screen shell
- `src/features/auth/components/sign-up-form.tsx` / `.test.tsx` / `.stories.tsx` — sign-up form,
  its 20-test browser suite, and its 7 visual-only stories
- `src/features/auth/components/sign-in-form.tsx` / `.test.tsx` / `.stories.tsx` — sign-in form,
  its 16-test browser suite, and its 6 visual-only stories
- `app/(auth)/layout.tsx` — centres both auth screens on `bg-bg-app`
- `app/(auth)/register/page.tsx` / `app/(auth)/login/page.tsx` — thin route files composing
  `AuthCard` + the respective form
- `app/layout.tsx` — wraps children in `QueryProvider`
- `package.json` / `pnpm-lock.yaml` — added `@tanstack/react-query@5.101.4`,
  `react-hook-form@7.85.0`, `@hookform/resolvers@5.7.1` (all exact versions, `pnpm add
  --save-exact`)

## Decisions Made

See frontmatter `key-decisions`/`patterns-established` for the full list. Most significant: the
story-staging-props pattern for D-25-compliant visual-only stories, the plain-`<a>`-over-`next/
link` choice, and the dedicated test-local MSW browser worker per form test file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/lib/mocks/browser.ts`'s shared worker cannot be imported into a real
browser test page**
- **Found during:** Task 2 (first `sign-up-form.test.tsx` run)
- **Issue:** The plan's read_first pointed at "the MSW browser worker from plan 01-10" for these
  tests. That worker's handlers (`src/lib/mocks/handlers.ts`) import `src/lib/mocks/store.ts`,
  which imports `node:fs`/`node:os`/`node:crypto` for its on-disk persistence mirror. Vite
  externalizes those Node builtins for browser code, and importing the shared worker crashed the
  test file outright (`Module "node:fs" has been externalized for browser compatibility`).
- **Fix:** Each form test file constructs its own `setupWorker()` with no base handlers, adding
  per-test handlers via `.use()` for the two same-origin BFF paths these forms actually call. This
  form never talks to the external contract, so the base handlers were never needed for these
  tests anyway.
- **Files modified:** `src/features/auth/components/sign-up-form.test.tsx`,
  `src/features/auth/components/sign-in-form.test.tsx`
- **Verification:** All 36 browser-mode tests pass.
- **Committed in:** `dc6cf0e` (Task 2), `4c35d23` (Task 3)

**2. [Rule 3 - Blocking] `next/link` reads `process.env`, undefined in this project's plain Vitest
Browser Mode test project**
- **Found during:** Task 2 (second `sign-up-form.test.tsx` run, after fixing deviation #1)
- **Issue:** `next/link`'s own internal module (`has-base-path.js`) reads `process.env` at
  evaluation time. This project's "browser" Vitest project has no Next.js runtime/`process` shim
  (unlike the "storybook" project, which uses `@storybook/nextjs-vite`), so importing `Link`
  crashed the test file with `ReferenceError: process is not defined`.
- **Fix:** Replaced `next/link`'s `Link` with a plain `<a>` element for both forms' cross-links.
  Documented in-code: these are auth entry screens issuing an httpOnly cookie via the BFF, so
  there is no client-side router state worth preserving across the transition, and a full
  navigation is simpler and equally correct.
- **Files modified:** `src/features/auth/components/sign-up-form.tsx`,
  `src/features/auth/components/sign-in-form.tsx`
- **Verification:** Both browser test files run clean; `pnpm lint` (including
  `@next/next/no-html-link-for-pages`) exits 0.
- **Committed in:** `dc6cf0e` (Task 2), `4c35d23` (Task 3)

**3. [Rule 1 - Bug] Storybook stories crashed with "expected app router to be mounted"**
- **Found during:** Task 2 (`pnpm vitest run --project storybook`)
- **Issue:** `SignUpForm` calls `useSignUp`, which calls `next/navigation`'s `useRouter`.
  `@storybook/nextjs-vite` only mounts a working App Router context once
  `parameters.nextjs.appDirectory: true` is set on the story/meta — undocumented in the plan,
  discovered via the framework's own type definitions.
- **Fix:** Added `parameters: { nextjs: { appDirectory: true } }` to both stories files' `meta`.
- **Files modified:** `src/features/auth/components/sign-up-form.stories.tsx`,
  `src/features/auth/components/sign-in-form.stories.tsx`
- **Verification:** All 13 auth stories pass, including axe.
- **Committed in:** `dc6cf0e` (Task 2), `4c35d23` (Task 3)

**4. [Rule 1 - Bug] `getByLabelText("Password")` matched the password-reveal IconButton too**
- **Found during:** Task 2 (first full `sign-up-form.test.tsx` run)
- **Issue:** Playwright's `getByLabel` does case-insensitive substring matching by default. The
  password-reveal `IconButton`'s `aria-label="Show password"`/`"Hide password"` both contain the
  substring "password", so an unqualified `getByLabelText("Password")` resolved to two elements
  (a strict-mode violation) instead of just the input.
- **Fix:** Added `{ exact: true }` to every `getByLabelText("Password", ...)` call.
- **Files modified:** `src/features/auth/components/sign-up-form.test.tsx`,
  `src/features/auth/components/sign-in-form.test.tsx`
- **Verification:** All password-field assertions pass.
- **Committed in:** `dc6cf0e` (Task 2), `4c35d23` (Task 3)

**5. [Rule 1 - Bug] Rendering two forms in one test without unmounting the first caused duplicate
matches**
- **Found during:** Task 3 (`sign-in-form.test.tsx`'s identical-failure-message test)
- **Issue:** `vitest-browser-react`'s query methods resolve against the whole test page, not
  scoped strictly to each `render()` call's own container — rendering a second `SignInForm`
  before unmounting the first produced two matching "Email" textboxes (a strict-mode violation).
- **Fix:** Call `await unknownEmailScreen.unmount()` before rendering the second form instance.
- **Files modified:** `src/features/auth/components/sign-in-form.test.tsx`
- **Verification:** The identical-failure-message test passes at both viewports.
- **Committed in:** `4c35d23` (Task 3)

---

**Total deviations:** 5 auto-fixed (2 Rule 3 - blocking, 3 Rule 1 - bug).
**Impact on plan:** All five were necessary to make the plan's own verification gates (tests
actually running against a real browser, Storybook stories rendering without crashing, no
strict-mode query ambiguity) hold true. No scope creep — no feature or architectural change beyond
what Task 1/2/3 already specified.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required. `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` were
already documented in plan 01-11's summary; this worktree's own `.env.local` was populated with
throwaway values per the executor's standard worktree setup, not committed.

## Next Phase Readiness

- AUTH-01 and AUTH-02 are met at the UI level: a visitor can create an account and sign in through
  screens built entirely from the design-system primitives, with per-field validation appearing
  only where earned, a visible loading state, and failure copy that reveals nothing about which
  email addresses exist.
- Plan 01-13 (route guard) can build directly on `verifySession()` (already available from
  01-11) to protect `/boards` and redirect an unauthenticated visitor to `/login`; both
  `SignUpForm`/`SignInForm` already navigate to `/boards` on success, so 01-13 has a real
  destination to guard.
- No blockers.

## Known Stubs

None — every form is fully wired to its real mutation hook and BFF endpoint; no hardcoded
empty/placeholder responses ship as part of this plan's scope. `/boards` itself does not exist yet
(a later phase's concern) — a successful sign-up/sign-in will 404 there until that phase lands,
which is expected and out of this plan's scope.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-12*

## Self-Check: PASSED

- FOUND (via `git ls-files`): all 14 created files under `src/lib/query-client.tsx`,
  `src/features/auth/**`, and `app/(auth)/**`.
- FOUND (via `git log --oneline --all`): commits `5a14d90`, `dc6cf0e`, `4c35d23`.
