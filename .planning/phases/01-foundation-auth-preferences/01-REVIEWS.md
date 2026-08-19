---
phase: 01
reviewers: [antigravity]
reviewed_at: "2026-08-19T10:11:38.527Z"
plans_reviewed: [01-33-PLAN.md, 01-34-PLAN.md, 01-35-PLAN.md, 01-36-PLAN.md, 01-37-PLAN.md, 01-38-PLAN.md]
---

# Cross-AI Plan Review — Phase 01 (scoped: round-4 gap closure + its direct prerequisites)

Scope note: this phase has 38 plans total. To keep the review focused and within a reasonable
turnaround, only 6 were reviewed — the 3 brand-new round-4 gap-closure plans (01-36, 01-37, 01-38,
the lib/ module reorg) plus their direct prerequisite plans (01-33, 01-34, 01-35). The other 32
plans (01-01..01-32) are already executed/merged and were out of scope.

Only one reviewer ran this pass (`antigravity`/agy). `claude` was excluded for independence (this
session runs on Claude Code). `gemini` is installed but its free individual tier was sunset by
Google mid-session (`IneligibleTierError`, redirected to Antigravity) and could not authenticate.
No other reviewer CLI (codex, coderabbit, opencode, qwen, cursor, kimi, ollama, lm_studio,
llama_cpp) is installed on this machine. Findings below are single-reviewer, not cross-AI
consensus — weighted accordingly, but two of the HIGH findings were independently verified by the
orchestrator directly against the plan files and confirmed accurate (see notes inline).

## Antigravity Review

## 1. Summary

This implementation plan set covers the finalization of Phase 01 (Foundation, Auth & Preferences), migrating authentication mutations from BFF Route Handlers to Next.js Server Actions (01-33-PLAN.md, 01-34-PLAN.md), documenting architectural reversals and settling theme persistence (01-35-PLAN.md), and executing a structural three-ring reorganization of `src/lib/` alongside per-feature `model.ts` modules (01-36-PLAN.md, 01-37-PLAN.md, 01-38-PLAN.md). The architectural intent is sound, thoughtful, and directly addresses real build/bundler isolation issues discovered during development (such as `node:crypto` reaching browser Storybook bundles). However, critical execution hazards exist: an ESLint boundaries configuration change in plan 01-36 will break `pnpm lint` across the repo before files are moved, four toolchain configurations for `generated-types.ts` were omitted from 01-36, and a wave numbering collision between Round 4 gap closure and unexecuted plans 01-14/01-15 will trigger concurrent execution conflicts.

## 2. Strengths

- **Structural Prevention of Secret Leakage & Bundler Contamination:** Replacing the flat `src/lib/*` catch-all with three lint-enforced rings (`lib/core/**`, `lib/server/**`, `lib/client/**`) via `eslint-plugin-boundaries` (`eslint.config.mjs:194-200`, `01-36-PLAN.md`) directly eliminates the root cause of `import "server-only"` modules leaking into Vite/Storybook bundles.
- **Clear Domain Ownership for Pure Model Functions:** Introducing `features/<domain>/model.ts` (e.g. moving `resolveDisplayName` from `src/lib/display-name.ts:18` to `src/features/auth/model.ts` in 01-37-PLAN.md) gives pure, non-API domain derivation logic a dedicated home without cluttering infrastructure directories.
- **Robust Anti-Enumeration & RFC 7807 Error Handling:** In 01-33-PLAN.md, `signInAction` cleanly threads structured backend error codes (`VALIDATION_FAILED`, `BAD_CREDENTIALS` via `src/lib/api/problem-detail.ts:9-17`) into the UI action state while preserving the generic copywriting contract for sign-in rejections, avoiding user enumeration vectors.
- **Defensive Server Function Navigation:** Both 01-33 and 01-34 explicitly specify calling `redirect()` outside `try/catch` blocks in Server Actions, preventing silent swallowing of Next.js internal redirect exceptions.
- **Honest Defect Recording over Premature Workarounds:** 01-34-PLAN.md verifies and documents the upstream backend's `POST /api/logout` 500 routing defect in `deferred-items.md` rather than hardcoding a fragile workaround in the frontend.

## 3. Concerns

### HIGH Severity

#### 1. ESLint Boundaries Premature Element Switch in 01-36-PLAN.md (Breaks Task 1 Verification Gate) — ORCHESTRATOR-VERIFIED
- **Mechanism:** In Task 1 of 01-36, `eslint.config.mjs` is modified to delete the flat `{ type: "lib", pattern: "src/lib/*" }` element and replace it with the three `lib-*` ring patterns. Task 1 then moves only `cn.ts` and immediately runs `pnpm lint` as its verification gate.
- **Impact:** `src/lib/routes.ts`, `session.ts`, `dal.ts`, `server-client.ts`, `query-client.tsx`, and `validation/auth-schemas.ts` are still in their flat locations and match none of the three new `lib-*` element patterns. Since `boundaries/dependencies` defaults to `"disallow"`, every existing consumer of those unmoved files is rejected. The Task 1 automated verify command fails immediately.

#### 2. Wave Number Collision Between Round 4 Plans and 01-14 / 01-15 — ORCHESTRATOR-VERIFIED
- **Mechanism:** 01-36/01-37/01-38 are wave 19/20/21. 01-14 is also wave 19 (`depends_on: ["01-35"]`), 01-15 is also wave 20 (`depends_on: ["01-14"]`) — neither pair depends on the other, so a wave-parallel dispatcher runs 01-14 concurrently with 01-36, and 01-15 concurrently with 01-37. Additionally, 01-35-PLAN.md Task 4 has an automated gate script with `want={'01-14':{wave:'19',dep:'01-35'},'01-15':{wave:'20',dep:'01-14'}}` **hardcoded** — confirmed present verbatim in the file. Renumbering 01-14/01-15 without also updating this script breaks 01-35's own gate.
- **Impact:** 01-14 introduces `src/lib/theme.ts` and imports `src/lib/dal.ts` / creates `app/api/users/me/theme/route.ts` at the exact time 01-36 is turning on strict three-ring boundaries and 01-37 (next wave) is about to move `dal.ts` and remove `app/api/`.

### MEDIUM Severity

#### 3. Omission of Toolchain Configuration Updates for Relocated `generated-types.ts` in 01-36-PLAN.md
- **Mechanism:** 01-36 Task 2 moves `src/lib/api/generated-types.ts` to `src/lib/core/api-contract/generated-types.ts` but does not update: `package.json`'s `api:generate` script output path, `.github/workflows/ci.yml`'s API-types-drift diff target, `eslint.config.mjs`'s `globalIgnores` entry, and `.prettierignore`'s ignore entry.
- **Impact:** `pnpm api:generate` regenerates into the deleted old path (failing 01-37's `test ! -e src/lib/api` cleanup check); CI's API-types-drift job fails; `pnpm format:check`/`pnpm lint` attempt to format/lint the unformatted generated file.

#### 4. Client/Server Field Error Merging Dynamics in Form Action Migration (01-33-PLAN.md)
- **Mechanism:** 01-33 removes `handleSubmit` and uses `<form action={formAction}>` while keeping RHF `mode: "onTouched"`. The plan states a client-error-takes-precedence merge rule, but if RHF's client error resolves to `undefined` after a user fixes their input, a naive `clientError ?? serverError` merge falls back to displaying the stale server error from the previous submit instead of clearing it.
- **Impact:** Persistent validation errors shown on now-valid inputs.

### LOW Severity

#### 5. Theme Module Placement Ambiguity Post-Three-Ring Reorganization (01-35-PLAN.md & 01-14-PLAN.md)
- **Mechanism:** 01-14-PLAN.md was drafted before Round 4 and creates `src/lib/theme.ts`, which would be an orphan matching no boundaries element once the three-ring structure lands.
- **Impact:** If 01-35 Task 3 chooses a Server Action for theme mutation, `theme.ts` needs to land in `src/lib/server/theme.ts` or `src/features/theme/`, not `src/lib/theme.ts`.

## 4. Suggestions

1. **Transitional boundary strategy in 01-36-PLAN.md:** retain temporary `lib-legacy`/`lib-legacy-api`/`lib-legacy-validation` element patterns in Task 1, allowing `feature`/`ui`/`layout` to import them during the transitional wave; delete the legacy patterns in 01-37 Task 3 once all files have moved.
2. **Update all toolchain references for `generated-types.ts` in 01-36-PLAN.md:** add `package.json`, `.github/workflows/ci.yml`, `eslint.config.mjs`, and `.prettierignore` to 01-36's `files_modified`, updating each path to `src/lib/core/api-contract/generated-types.ts`.
3. **Re-sequence waves and update 01-35's verification gate:** re-sequence 01-14 to wave 22 (`depends_on: ["01-38"]`) and 01-15 to wave 23 (`depends_on: ["01-14"]`); update 01-35 Task 4's hardcoded `want={...}` assertion to match.
4. **Specify error-state clearing on form input in 01-33-PLAN.md:** clear a field's stale server error when RHF marks that field dirty/re-validated, rather than only checking for a present client error.

## 5. Risk Assessment

| Plan | Objective | Risk Level | Primary Risk Factor |
| :--- | :--- | :---: | :--- |
| 01-33 | Auth Server Actions Migration | MEDIUM | Form Action + RHF state sync & field error precedence |
| 01-34 | Sign-out Server Action & BFF Client Deletion | LOW | Straightforward deletion and local session destruction |
| 01-35 | ADR Records & Plan Repair | MEDIUM | Hardcoded verification script conflicts with Round 4 wave renumbering |
| 01-36 | Three-Ring Boundaries & Core Ring Move | HIGH | `pnpm lint` breakage during intermediate move state; missing toolchain path updates |
| 01-37 | Server/Client Ring Move & Auth Feature Reorg | MEDIUM | Multiple file moves and import repointing across test suites |
| 01-38 | CONVENTIONS.md Documentation Update | LOW | Documentation-only reconciliation |

**Overall Phase Risk: MEDIUM** — the architectural pattern is sound; the mechanical execution-ordering issues in 01-36 and the wave collision touching 01-35's own gate must be fixed before execution.

---

## Consensus Summary

Single-reviewer pass (see scope note above) — no cross-reviewer consensus to synthesize. Both HIGH
findings were independently confirmed by the orchestrator against the actual plan/config files
before being recorded here, so they carry more weight than an unverified single-reviewer claim
normally would.

### Agreed Strengths
N/A — single reviewer.

### Agreed Concerns
N/A — single reviewer. See Concerns section above; findings #1 and #2 are orchestrator-verified.

### Divergent Views
N/A — single reviewer.
