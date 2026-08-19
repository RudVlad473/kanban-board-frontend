---
phase: 01-foundation-auth-preferences
plan: 33
subsystem: auth
tags: [server-actions, useActionState, react-19, form-progressive-enhancement]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: session bridging to the real backend's JSESSIONID cookie (plan 01-32)
provides:
  - "src/features/auth/api/auth-actions.ts — signInAction/signUpAction as real Server Actions (\"use server\"), replacing the Route Handler + fetch-wrapper + hook stack"
  - "src/features/auth/api/auth-action-state.ts — AuthActionState/AUTH_ACTION_IDLE, split out of auth-actions.ts because a \"use server\" file may only export async functions"
  - "Both auth forms (sign-in, sign-up) wired via useActionState directly to the server functions, with client-side React Hook Form validation layered on top for display only"
affects: [01-34, 01-35, 01-36, 01-37, 01-38, 01-14, 01-15]

# Actuals (#2632)
actuals:
  tokens: 26000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "AuthActionState/AUTH_ACTION_IDLE live in a plain module (auth-action-state.ts), never inside the \"use server\" file itself — Next.js only allows async-function exports from a \"use server\" module; a plain constant export type-checks, lints and builds fine but throws at the moment an action is actually invoked from the browser, which none of Vitest/tsc/next build exercise"

key-files:
  created:
    - src/features/auth/api/auth-actions.ts
    - src/features/auth/api/auth-actions.unit.test.ts
    - src/features/auth/api/auth-action-state.ts
    - src/test-utils/auth-actions-storybook-stub.ts
  modified:
    - src/features/auth/components/sign-in-form.tsx
    - src/features/auth/components/sign-in-form.test.tsx
    - src/features/auth/components/sign-up-form.tsx
    - src/features/auth/components/sign-up-form.test.tsx
    - src/features/auth/api/auth-api.ts
    - vitest.config.ts
  deleted:
    - app/api/auth/signin/route.ts
    - app/api/auth/signup/route.ts
    - src/features/auth/hooks/use-sign-in.ts
    - src/features/auth/hooks/use-sign-up.ts
    - src/lib/api/bff-generated-types.ts

key-decisions:
  - "AuthActionState and AUTH_ACTION_IDLE moved out of auth-actions.ts into a new auth-action-state.ts, discovered necessary only during the manual browser checkpoint — the invalid-export bug is invisible to Vitest (doesn't enforce the server-actions bundling boundary) and to next build (never invokes an action at build time)"
  - "The no-JS submission must-have (this plan's own must_haves.truths: \"Both forms submit without JavaScript having hydrated\") is NOT met as implemented, and was explicitly de-scoped by the user rather than fixed — see Deviations below"

patterns-established:
  - "When a manual checkpoint needs a running dev server, restart it under a controlled, log-redirected process rather than debugging blind against whatever process happens to be listening on the port — server-side errors (a 404 from the wrong upstream path, a thrown exception) are invisible from the browser/network-request side alone"

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "A visitor signs up and lands signed in on the board list; a returning user signs in and lands there too, with no client-side fetch layer between the form and the server"
    requirement: "AUTH-01"
    verification:
      - kind: manual_procedural
        ref: "Browser walkthrough (Playwright-driven): fresh email sign-up redirected to /boards with correct display name; sign-in with the same account redirected to /boards"
        status: pass
    human_judgment: true
    rationale: "Checkpoint plan (autonomous: false) — the sign-off gate this plan itself defines."
  - id: D2
    description: "A rejected sign-up (duplicate email) and a rejected sign-in (wrong password) both render one fixed, generic message — never the backend's own per-cause text — so the boundary cannot be used for account enumeration"
    requirement: "AUTH-01"
    verification:
      - kind: manual_procedural
        ref: "Browser walkthrough: duplicate-email sign-up and wrong-password sign-in both rendered the identical project-owned copy"
        status: pass
    human_judgment: true
  - id: D3
    description: "Field-level validation appears as a field is touched, before submission, and a rejected sign-in clears the password field while leaving the typed email in place"
    verification:
      - kind: manual_procedural
        ref: "Browser walkthrough: invalid email format, too-short password, and a name containing a digit all surfaced inline on blur; wrong-password sign-in left the email populated and cleared only the password field"
        status: pass
    human_judgment: true
  - id: D4
    description: "Both forms submit and complete sign-in/sign-up before JavaScript has hydrated"
    verification:
      - kind: manual_procedural
        ref: "A genuinely JS-disabled browser context (Playwright, javaScriptEnabled: false) against the sign-up form: no network request fires on submit at all. React renders action=\"javascript:throw new Error('React form unexpectedly submitted.')\" on the form, because sign-up-form.tsx's formAction wraps useActionState's dispatch in a plain client closure (to capture lastSubmittedRef for the field-restore effect) rather than passing a raw Server Action reference — React can only generate a real progressively-enhanceable POST target for the latter."
        status: fail
    human_judgment: true
    rationale: "Explicitly de-scoped by the user during this checkpoint (\"let's omit js disabled testing, not sure that's needed in 2026\") rather than fixed. Left unfixed and undocumented-as-broken would be worse than flagging it: the plan's own must_haves.truths and this component's code comment (sign-up-form.tsx:56-58) both currently claim this property holds. Revisit if the no-JS requirement is ever reinstated — the fix is to pass a raw signUpAction/signInAction reference to the form's action prop and move the submitted-values capture elsewhere (e.g. an onSubmit read of the FormData, or restoring values from the returned state instead of a ref)."

duration: ~55min (across two sessions, plus this checkpoint's verification)
completed: 2026-08-19
status: complete
---

# Phase 01 Plan 33: Route Handlers to Server Actions for sign-in/sign-up Summary

**Sign-up and sign-in now submit straight to real Server Actions with no client fetch layer in between — verified end-to-end in a real browser against the live nonprod backend, with three real bugs (two code, one environment) found and fixed along the way, and one known-broken property (no-JS submission) explicitly accepted rather than fixed.**

## Performance

- **Duration:** ~55 min build (prior session) + this session's checkpoint verification
- **Completed:** 2026-08-19
- **Tasks:** 3 (2 build tasks, 1 checkpoint)
- **Files modified:** 22 across the merge (9 created, 8 modified, 5 deleted)

## Accomplishments

- `signInAction`/`signUpAction` (`src/features/auth/api/auth-actions.ts`) replace both Route Handlers, both fetch-wrapper hooks, and the generated BFF OpenAPI client — sign-in/sign-up now cross the client→server boundary as framework-managed action requests, not hand-written `fetch` calls.
- Both forms (`sign-in-form.tsx`, `sign-up-form.tsx`) submit via `useActionState` bound directly to the server function; React Hook Form stays for client-side field validation display only, never gating submission.
- The backend's named failure reason threads through to `AuthActionState.code` (via `parseProblemDetail`) without ever reaching the rendered message — the anti-enumeration property (T-01-55) holds for both duplicate-email and wrong-password cases.
- A stale server-returned field error clears the moment the user edits that field (client validation takes precedence over the last server response for the same field).
- Verified end-to-end in a real browser (Playwright-driven) against the live nonprod backend: sign-up, duplicate-email rejection, inline field validation, sign-in, wrong-password rejection with correct field-clear behavior, dark mode, and narrow width all confirmed working.

## Task Commits

1. **Task 1: Sign-in and sign-up as server functions** - `4e2217e` (feat)
2. **Task 2: Both auth forms submit straight to the server** - `71c0e46` (feat)
3. **Task 3 checkpoint follow-up: move AUTH_ACTION_IDLE out of the "use server" module** - `ab5b8ec` (fix, found during manual verification)

**Merge:** `2140853` (merge: bring 01-33 into master, wave 7)

## Files Created/Modified

- `src/features/auth/api/auth-actions.ts` - `signInAction`/`signUpAction`, the real Server Actions
- `src/features/auth/api/auth-action-state.ts` - `AuthActionState`/`AUTH_ACTION_IDLE`, split out post-checkpoint (see Deviations)
- `src/features/auth/api/auth-actions.unit.test.ts` - server functions proven against a stubbed HTTP boundary
- `src/test-utils/auth-actions-storybook-stub.ts` - Storybook's own decoupled stub (stories can't invoke a real Server Action)
- `src/features/auth/components/{sign-in,sign-up}-form.tsx` - `useActionState` wiring replaces the old hook + fetch call
- `app/api/auth/{signin,signup}/route.ts`, `src/features/auth/hooks/use-sign-{in,up}.ts`, `src/lib/api/bff-generated-types.ts` - deleted, superseded by the Server Actions

## Decisions Made

- `AuthActionState`/`AUTH_ACTION_IDLE` moved from `auth-actions.ts` into a new `auth-action-state.ts` — a `"use server"` file may only export async functions; the constant export type-checked, linted, and built cleanly but threw `"A 'use server' file can only export async functions, found object"` the instant an action was actually invoked from a real browser. Found only because this checkpoint drove a real dev server rather than trusting the automated-checks-green claim.
- The no-JS submission must-have is knowingly left broken, by explicit user decision during this checkpoint, rather than fixed. See coverage D4 above for the root cause and the fix shape if ever revisited.

## Deviations from Plan

### Auto-fixed Issues

**1. [Bug] `auth-actions.ts` exported a non-function constant from a `"use server"` module**
- **Found during:** Task 3's manual browser checkpoint (sign-up submit)
- **Issue:** `AUTH_ACTION_IDLE` (a plain `AuthActionState` object) was exported alongside the two action functions from a file marked `"use server"`. Next.js requires every export of such a file to be an async function; this one type-checks, lints, and builds successfully, and only throws at the moment the action bundle is actually invoked from a request — a runtime-only failure mode none of Vitest, `tsc`, or `next build` exercise.
- **Fix:** Moved `AuthActionState`/`AUTH_ACTION_IDLE` into a new `src/features/auth/api/auth-action-state.ts` (no `"use server"` directive); `auth-actions.ts` and both form components now import the constant from there.
- **Files modified:** `src/features/auth/api/auth-action-state.ts` (new), `src/features/auth/api/auth-actions.ts`, `src/features/auth/api/auth-actions.unit.test.ts`, `src/features/auth/components/{sign-in,sign-up}-form.tsx`, `src/features/auth/components/{sign-in,sign-up}-form.test.tsx`
- **Verification:** `pnpm exec tsc --noEmit` clean, `pnpm exec eslint` clean, `pnpm exec vitest run --project unit --project browser src/features/auth` — 79/79 pass, then confirmed live in a real (JS-enabled) browser: sign-up now completes and redirects to `/boards`.
- **Committed in:** `ab5b8ec`

### Accepted, Not Fixed

**2. [Gap] The no-JS submission property this plan's own must_haves and checkpoint script claim does not hold**
- **Found during:** Task 3's checkpoint, using a genuinely JS-disabled Playwright browser context
- **Issue:** `sign-up-form.tsx`'s `formAction` wraps `useActionState`'s `dispatch` in a plain client closure (to capture submitted values into a ref for the post-settle field-restore effect) instead of passing a raw Server Action reference to the form's `action` prop. React can only generate a real, progressively-enhanceable POST target for the latter; for a wrapped client function it renders `action="javascript:throw new Error('React form unexpectedly submitted.')"` — with JavaScript disabled, clicking submit does nothing at all, no network request fires.
- **Decision:** User explicitly de-scoped this ("let's omit js disabled testing, not sure that's needed in 2026") rather than have it fixed in this plan. Left as-is; the plan's `must_haves.truths` and `sign-up-form.tsx:56-58`'s own code comment both still claim the property holds and were not corrected, since the plan itself isn't being reopened for this.
- **Files affected:** `src/features/auth/components/sign-up-form.tsx` (and, structurally, `sign-in-form.tsx`, not independently re-verified)

### Related, Pre-existing Fixes (not in this plan's scope, required to test it at all)

**3. Tailwind v4's content scanner broke on prose in a planning doc**
- A wildcard placeholder in `01-17-PLAN.md` (`[font-weight:var(--font-weight-heading-*)]`) was picked up by Tailwind's automatic content detection (which scans the whole tracked tree, not just source code) as a candidate arbitrary-value class, generating invalid CSS and hard-failing `next dev` on every route. Fixed on `master` directly (commit `101a4e8`, before this merge) — not part of `01-33`'s own `files_modified`, but blocked this checkpoint from starting at all.

**4. `EXTERNAL_API_BASE_URL` missing the backend's `/api` context-path**
- The configured nonprod URL was missing the `server.servlet.context-path=/api` prefix the real backend requires (confirmed against the `kanban-board-backend` sibling repo's Spring config); requests landed outside the app entirely and hit Tomcat's own generic 404. An environment-value fix only (`.env.local`, user-applied) — no code change.

---

**Total deviations:** 1 auto-fixed (Rule 1, correctness bug), 1 accepted-not-fixed (explicit scope decision), 2 pre-existing/environmental blockers resolved to unblock verification.
**Impact on plan:** The auto-fixed bug was necessary for the plan's own must-haves to work at all. The accepted gap is a real, documented shortfall against this plan's stated must-haves — a deliberate trade-off, not an oversight.

## Issues Encountered

The checkpoint's own "all automated checks green" claim (396 tests, build, lint, tsc) did not catch either code bug found here — both are runtime-only failure modes (a `"use server"` export violation, a DNS/path misconfiguration) invisible to static analysis and to a test suite that doesn't invoke the real Next.js dev server. This is exactly the class of gap `checkpoint:human-verify` exists to catch.

## User Setup Required

None beyond what STATE.md already tracked — `SESSION_SECRET` and `EXTERNAL_API_BASE_URL` (now corrected to include `/api`) needed to be set in the worktree's local `.env.local` for this checkpoint to run at all.

## Next Phase Readiness

- Plan 01-34 (finish the Server Actions migration: sign-out) is unblocked.
- The no-JS submission gap (coverage D4) is unresolved and undocumented in the plan text itself — worth a deliberate look if a future phase revisits progressive enhancement, rather than rediscovering it from scratch.
- `AUTH_ACTION_IDLE`'s new home (`auth-action-state.ts`) is the pattern any future `"use server"` module in this codebase should follow if it needs to export a non-function constant alongside its actions.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-19*
