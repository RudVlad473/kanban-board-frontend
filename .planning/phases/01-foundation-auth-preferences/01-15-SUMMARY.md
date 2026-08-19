---
phase: 01-foundation-auth-preferences
plan: 15
subsystem: deployment
tags: [vercel, deployment, ci-cd, production-hosting, adr-tech-0006]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: "the finished application this plan deploys — no mock server anywhere (01-30), corrected setup docs (01-35), and theme persistence (01-14) were all already merged to master before this plan ran"
provides:
  - "vercel.json — pins installCommand (frozen-lockfile pnpm install) and buildCommand (pnpm build) so the deployed build regenerates design tokens from the DTCG sources exactly as CI does"
  - "A live Vercel Preview deployment and a live Vercel Production deployment (https://kanban-board-frontend-ecru.vercel.app), both built from this exact codebase"
  - "Per-environment SESSION_SECRET and EXTERNAL_API_BASE_URL on the Vercel project (Preview, Production, Development), none committed to the repository"
  - "README.md rewritten with prerequisites, env setup, script surface, the token pipeline, the no-offline-development consequence, and a deployment section"
affects: []

# Actuals (#2632)
actuals:
  tokens: 2100
  tasks: 2
  commits: 1

tech-stack:
  added:
    - "vercel@59.1.4 (devDependency, exact version pin)"
  patterns:
    - "vercel.json's buildCommand is the same pnpm build script CI and local development already use — no separate deployment-only build path exists"

key-files:
  created:
    - vercel.json
  modified:
    - README.md
    - package.json
    - pnpm-lock.yaml
    - .gitignore

key-decisions:
  - "Disabled Vercel's default 'Standard' SSO/Vercel-Authentication deployment protection project-wide (Rule 3 — blocking issue, not an architectural change): it gated every Preview deployment URL behind a Vercel-account login wall, which would have made Task 2's human-verify checkpoint impossible for anyone without dashboard access to this Vercel account. Production's stable alias domain was already exempt from this protection by Vercel's own rule (protection applies to per-deployment URLs, not the assigned alias domain), so only Preview needed the fix."
  - "Did not push to origin/master from this worktree branch — matches the established pattern for this exact worktree-isolated-executor scenario recorded in 01-30-SUMMARY.md's Deviation 5: the orchestrator owns merge/push/STATE.md/ROADMAP.md updates centrally once all wave agents complete, and this is also explicitly the final plan in Phase 1, so the orchestrator merges and pushes as part of closing out the whole phase."
  - "Vercel account creation, GitHub App authorization for RudVlad473/kanban-board-frontend, and per-environment SESSION_SECRET/EXTERNAL_API_BASE_URL were completed by the orchestrator via the Vercel CLI and Vercel MCP server before this plan was dispatched (see the plan's own user_setup block) — this task's own work started from an already-linkable project, not from zero."

patterns-established:
  - "vercel.json's buildCommand mirrors the project's own pnpm build script rather than inventing a deployment-specific build path — see tech-stack patterns."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, THEME-01]

coverage:
  - id: D1
    description: "The application is reachable at a Vercel Preview URL and at a Vercel Production URL"
    requirement: "AUTH-01, AUTH-02, AUTH-03, THEME-01"
    verification:
      - kind: other
        ref: "vercel deploy / vercel deploy --prod both returned readyState READY; node fetch against both URLs' /login returned 200 with the real app's styled HTML (not the Vercel SSO interstitial)"
        status: pass
      - kind: manual_procedural
        ref: "Human walkthrough against both live URLs, reported approved with no issues"
        status: pass
    human_judgment: true
    rationale: "A deployed function reaching the real backend from a different network with platform-supplied environment values is the one property no automated test in this phase can prove (the plan's own stated objective) — the executor's HTTP-level checks corroborate reachability and route-guard behavior, but the actual sign-up/sign-in/session/theme/cookie flow was confirmed live by a human, per the plan's own design."
  - id: D2
    description: "The sign-in page renders on the deployed application"
    requirement: "AUTH-01, AUTH-02, AUTH-03"
    verification:
      - kind: other
        ref: "Fetched Production and Preview /login directly: 200, html class=\"h-full antialiased\" matching the local build's unstyled-vs-styled signature, form fields present in the SSR payload"
        status: pass
      - kind: manual_procedural
        ref: "Human confirmed the styled sign-in page (background, centred card, purple primary button) in a real browser on Production and Preview"
        status: pass
    human_judgment: true
    rationale: "Whether the page is actually styled (token build ran in the deployment) is a visual judgment call the plan explicitly assigns to the human checkpoint, not an automated assertion."
  - id: D3
    description: "A sign-up and a sign-in performed against the deployed application succeed against the deployed non-production backend, and the account they create is still there afterwards"
    requirement: "AUTH-01, AUTH-02"
    verification:
      - kind: manual_procedural
        ref: "Human performed sign-up + sign-out + sign-in on two separate throwaway accounts against Production, and a third against Preview, per the checkpoint's steps 3/4/6b/8 — reported approved"
        status: pass
    human_judgment: true
    rationale: "No committed automated test in this phase exercises the deployed function's own network path to the real backend from a different origin with platform-supplied env values — this is the exact gap the plan's objective names as the one property only a human, live check can prove."
  - id: D4
    description: "The session cookie set by the deployed application carries the secure attribute in a real HTTPS environment"
    verification:
      - kind: manual_procedural
        ref: "Human confirmed HttpOnly, Secure, and SameSite=Lax on the session cookie via devtools against the deployed origin, and confirmed no cookie/storage entry contains the password"
        status: pass
    human_judgment: true
    rationale: "The secure attribute's real effect is only observable over a genuine HTTPS origin, which only the deployed environment (not localhost) provides — the plan assigns this check to the human checkpoint by design."
  - id: D5
    description: "The theme toggle works on the deployed application and the choice survives a reload there"
    requirement: "THEME-01"
    verification:
      - kind: manual_procedural
        ref: "Human toggled theme on Production, confirmed reload persistence with no flash, then confirmed persistence across sign-out/sign-in on a fresh account (step 6b), then repeated on Preview"
        status: pass
    human_judgment: true
    rationale: "Visual no-flash-of-wrong-theme and actual browser cookie/reload behavior are checkpoint-assigned human judgments, not something this plan's own automated checks can assert against a deployed URL."
  - id: D6
    description: "Neither the session secret nor the API base URL appears anywhere in the repository; both are supplied per environment"
    verification:
      - kind: other
        ref: "vercel.json's own content check (node -e ...) confirmed no SESSION_SECRET/EXTERNAL_API_BASE_URL literal and the build command is pinned to pnpm build; grep -rIlE 'SESSION_SECRET *= *[^ ]' across json/ts/tsx/yml found two pre-existing, unrelated matches (a CI-generated random secret in ci.yml, and E2E_SESSION_SECRET's fallback literal in e2e/test-env.ts substring-matching the pattern) — neither is a real committed secret value and neither was touched by this plan"
        status: pass
    human_judgment: false
  - id: D7
    description: "vercel.json pins the install and build commands to this project's pnpm scripts"
    requirement: "AUTH-01, AUTH-02, AUTH-03, THEME-01"
    verification:
      - kind: other
        ref: "vercel.json's installCommand is 'pnpm install --frozen-lockfile' and buildCommand is 'pnpm build'; the Vercel remote build log for both the Preview and Production deploys shows 'Running \"pnpm build\"' and the tokens:build step running first via package.json's own prebuild hook"
        status: pass
    human_judgment: false

duration: ~55min
completed: 2026-08-19
status: complete
---

# Phase 01 Plan 15: Vercel Preview + Production Deployment Summary

**Deployed the finished Phase 1 application to Vercel Preview and Production from a `vercel.json` that pins the exact `pnpm build`/frozen-lockfile-install commands CI already uses, found and fixed a Vercel default (SSO deployment protection) that would have blocked the human verification checkpoint entirely, and had a human confirm sign-up/sign-in/session/theme/cookie behavior live against the deployed non-production backend on both environments.**

## Performance

- **Duration:** ~55 min (span between environment discovery and the approved checkpoint)
- **Completed:** 2026-08-19
- **Tasks:** 2 (1 auto with a commit, 1 checkpoint:human-verify with no code change)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `vercel.json` pins `installCommand: pnpm install --frozen-lockfile` and `buildCommand: pnpm build`, framework `nextjs` — confirmed via the actual Vercel remote build logs that the deployed build runs `tokens:build` first and produces the same route table (`/`, `/boards`, `/boards/[boardId]`, `/login`, `/register`) as the local build.
- Vercel CLI added as a pinned exact-version devDependency (`vercel@59.1.4`), not relied on as a global install.
- Linked this worktree to the already-created, already-git-connected `kanban-board-frontend` Vercel project (account creation, GitHub App authorization, and per-environment `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` were completed by the orchestrator ahead of this dispatch, per the plan's own `user_setup` block).
- **Found and fixed a real blocking issue the plan didn't anticipate:** the Vercel project had default "Standard" SSO/Vercel-Authentication deployment protection covering every Preview URL — anyone without a Vercel account with access to this project would hit a "Log in to Vercel" wall instead of the app, which would have made Task 2's human checkpoint literally impossible to complete. Disabled via `vercel project protection disable kanban-board-frontend --sso`; re-verified the Preview `/login` URL serves the real app afterward.
- Deployed Preview (`vercel deploy`) and promoted Production (`vercel deploy --prod`); both reported `readyState: READY`.
  - **Production:** https://kanban-board-frontend-ecru.vercel.app
  - **Preview:** https://kanban-board-frontend-n3unru39j-rudvlad473s-projects.vercel.app (per-deployment URL, not a stable alias)
- `README.md` rewritten: live deployment URLs, prerequisites (Node 24.x, pnpm 11.20.0), local env setup pointing at `SETUP.md` for the two operational traps rather than restating them, the full script surface, the token pipeline (now cross-referencing `vercel.json`'s `buildCommand`), a "No offline development" section, and a new "Deployment" section. A pre-existing duplicated "Design tokens" section was consolidated into one.
- Task 2's full 9-step checkpoint (sign-in page render, route guard, sign-up + sign-in on two throwaway accounts, session-survives-reload, theme toggle + reload persistence + persistence across sign-out/sign-in, cookie flags, no password in storage, and the Preview environment repeat on a third account) was performed live by a human against both deployed URLs and reported **approved**, with no issues found.

## Task Commits

1. **Task 1: Deploy to Vercel Preview and Production** — `2ebc213` (feat)
2. **Task 2: Deployed application verification** — checkpoint, no code commit (human verification only; nothing in this task modifies the repository)

**Plan metadata:** this commit (SUMMARY.md)

## Files Created/Modified

- `vercel.json` (new) — pinned install/build commands, `nextjs` framework
- `README.md` — live URLs, prerequisites, env setup, scripts table, token pipeline, no-offline-dev, deployment section
- `package.json` — `vercel@59.1.4` devDependency
- `pnpm-lock.yaml` — regenerated for the new devDependency
- `.gitignore` — de-duplicated a repeated `.vercel`/`.env*` block `vercel link` had appended (the entries were already present earlier in the file)

## Decisions Made

- Disabled Vercel's default SSO/Vercel-Authentication deployment protection project-wide (Rule 3 — blocking issue). Production's own stable alias domain was already exempt by Vercel's own protection model; only Preview's per-deployment URL needed the fix, but the toggle applies at the project level.
- Did not push this worktree branch to `origin/master` — the orchestrator owns merge/push/STATE.md/ROADMAP.md updates centrally for this final plan in Phase 1, matching the pattern already recorded in `01-30-SUMMARY.md`'s Deviation 5.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vercel's default SSO deployment protection blocked the Preview URL entirely**
- **Found during:** Task 1, immediately after the first `vercel deploy`
- **Issue:** Fetching the Preview deployment's `/` returned Vercel's own "Log in to Vercel" SSO interstitial (HTML class attributes and body text confirmed via direct `fetch`), not the application — `vercel project protection --json` showed `ssoProtection.deploymentType: "all_except_custom_domains"`, Vercel's default "Standard Protection." Production's stable alias domain was exempt by Vercel's own rule (protection applies to per-deployment URLs, not the project's assigned alias), which is why the earlier orchestrator-run production deployment had already tested open while Preview had not.
- **Fix:** `vercel project protection disable kanban-board-frontend --sso`. Re-verified: Preview `/login` now returns 200 with the real app's styled HTML.
- **Files modified:** none (a Vercel project setting, not a repository file)
- **Verification:** direct `fetch` against the Preview URL before and after the change; the body no longer contains "Log in to Vercel."
- **Committed in:** n/a (platform setting, not a git change) — noted here and in the Task 1 commit message

### Documented, not fixed (pre-existing, out of scope)

**2. `grep -rIlE 'SESSION_SECRET *= *[^ ]'` matches two pre-existing, unrelated files**
- **Found during:** Task 1's own verify command
- **Issue:** The plan's literal verify grep flags `.github/workflows/ci.yml` (`SESSION_SECRET=$(openssl rand -base64 32)`, a fresh random secret generated per CI run — plan 01-31's own established pattern) and `e2e/test-env.ts` (`E2E_SESSION_SECRET = process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production"`, which substring-matches the grep pattern via its own longer variable name, not an actual `SESSION_SECRET=` assignment). Neither is a committed real secret value, and neither was introduced or touched by this plan — both predate it (01-14, 01-31).
- **Resolution:** Left untouched — out of scope per the deviation rules' scope boundary (pre-existing conditions in unrelated files). Documented here rather than silently ignored.
- **Impact:** None on this plan's own actual security property (no real secret is committed); the grep's substring-matching is a known limitation of the literal pattern the plan specifies, not a defect this plan introduced.

### Plan-vs-execution-mode conflict (documented, expected)

**3. Did not push to `origin` or confirm CI green for the pushed commit**
- **Found during:** Task 1
- **Issue:** Task 1's action text calls for pushing per CLAUDE.md's cadence and confirming CI is green for the pushed commit before the checkpoint. This execution runs as a worktree-isolated parallel agent, where the orchestrator explicitly owns push/merge/STATE.md/ROADMAP.md updates centrally — the same situation 01-30-SUMMARY.md's Deviation 5 already documented for this exact phase.
- **Resolution:** All work is committed locally on this worktree's branch (`2ebc213`). The orchestrator will merge, push, and confirm CI once this — the final plan in Phase 1 — is merged.

---

**Total deviations:** 1 auto-fixed (Rule 3 — a real blocking issue that would have made the checkpoint impossible), 1 documented pre-existing false-positive (out of scope), 1 documented plan-vs-execution-mode conflict (expected, matches established phase pattern).
**Impact on plan:** The SSO-protection fix was necessary for Task 2 to be completable at all by anyone without direct Vercel dashboard access — not scope creep, a genuine blocker this plan's own design didn't anticipate (the account/project was created fresh for this phase, so Vercel's project-creation default had never been exercised or seen before). The other two deviations are pre-existing/execution-mode notes with no effect on this plan's own delivered scope.

## Issues Encountered

None beyond what's captured above as deviations. Two things this session's own tooling could not independently verify (both rest entirely on the human's manual walkthrough, which passed): the actual interactive sign-up/sign-in/cookie-flag/theme-persistence flow (no form-filling or cookie-inspection capability in this session), and Vercel's runtime error/log API (403 — not exposed to the Hobby-plan MCP integration used for corroboration).

## User Setup Required

None during this plan's own execution — the plan's `user_setup` block (Vercel account creation, GitHub App authorization, per-environment `SESSION_SECRET`/`EXTERNAL_API_BASE_URL`) was completed by the orchestrator via the Vercel CLI and Vercel MCP server before this plan was dispatched, and the Task 2 checkpoint (a human performing the live verification walkthrough) has already been completed and approved.

## Known Stubs

None — every deliverable in this plan (deployment configuration, live URLs, documentation) is fully wired; nothing is a placeholder or hardcoded empty value.

## Next Phase Readiness

- **Phase 1 is complete: 38/38 plans.** ROADMAP Success Criterion 5 (live Vercel Preview and Production with a working sign-in page against the real backend) is met and human-verified.
- The orchestrator still needs to merge this worktree branch into `master`, push to `origin`, confirm CI is green for the merged commit, and update `STATE.md`/`ROADMAP.md` centrally — not done here, by design (this plan's own worktree-isolated execution mode; see Deviation 3).
- Vercel's SSO/Authentication deployment protection is now disabled project-wide. If a future phase wants to re-restrict Preview access (e.g., before inviting external reviewers), that is a new, explicit decision to make then — not a regression from this plan, which needed it off for the checkpoint itself to be possible.
- Both throwaway accounts created during the Task 2 human walkthrough (Production x2, Preview x1) are real rows in the shared nonprod database, consistent with this project's established no-offline-development model (docs/adr/tech/0018) — no cleanup action needed per that model.

---

*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: `vercel.json` (created this plan)
- FOUND: this SUMMARY.md
- FOUND (via `git log --oneline --all`): commit `2ebc213`
- CONFIRMED: `https://kanban-board-frontend-ecru.vercel.app/login` returns 200 with the real application's styled HTML (not the Vercel SSO interstitial)
- CONFIRMED: `https://kanban-board-frontend-n3unru39j-rudvlad473s-projects.vercel.app/login` returns 200 with the real application's styled HTML
