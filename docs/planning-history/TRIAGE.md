# TRIAGE

Candidates enumerated by sweeping `HIGH-LEVEL-ARCHITECTURE.md`'s Flow
Spine and Cross-cutting list. Technologies already fixed by explicit user
mandate (Next.js, Tailwind + `@theme`, Base UI, DTCG JSON + Style
Dictionary, Vitest, Vitest Browser Mode + `vitest-browser-react` +
Playwright-Chromium, Storybook + `addon-a11y`/axe-core, Playwright +
`nextcov`, Stryker, and the TypeScript+ESLint+`eslint-plugin-tailwindcss`
static-analysis requirement itself) are Known Constraints, not candidates
— there is no open slot to triage where the answer is already mandated.

| ID    | Decision                                                    | Class   | Why (one line) |
|-------|--------------------------------------------------------------|---------|-----------------|
| C-001 | Auth session storage & handling (token vs. cookie)          | Decide  | security-sensitive, threads through route-guarding; expensive to redo once real users' credentials depend on it |
| C-002 | Client data-fetching & mutation strategy (rendering approach + optimistic-update/cache library) | Decide | the central architecture of an api-client/spa/ssr-app; every stage from board-create through move-task and version-conflict reconciliation runs through it — rewrite-level to swap later |
| C-003 | Drag-and-drop library for task/column reordering             | Decide  | deeply embedded in the core interaction, accessibility- and touch-sensitive per the responsive constraint; rewrite-level to swap |
| C-004 | Theme sync mechanism (dark-mode class + FOUC avoidance + API persistence) | Default | well-trodden Next.js + Tailwind pattern, contained and cheap to redo |
| C-005 | Form handling & validation for the create/edit modals        | Default | contained per-component; a well-known ecosystem default (typed, schema-validated) is nameable now |
| C-006 | Activity-log pagination UI pattern                            | Defer   | the screen has no mock at all (HIGH-LEVEL-ARCHITECTURE.md Open Questions item 1) — no real design constraint exists yet |
| C-007 | OpenAPI-contract mock/stub server for pre-backend development | Decide  | fidelity-critical — must faithfully simulate the contract's `version`-conflict rejections, not just happy-path shapes |
| C-008 | Typed API client / codegen from the OpenAPI spec              | Decide  | pervasive — touches every call site; real trade-offs between codegen tools on maintenance and contract-drift detection |
| C-009 | Ephemeral client UI state (sidebar collapsed, drag-in-progress) | Default | narrow, local, cheap; framework state primitives suffice |
| C-010 | Client-side error/observability reporting                     | Default | vendor swap later is contained (SDK-level); a solo-dev-appropriate default is nameable now |
| C-011 | Production hosting / deployment target                        | Decide  | "deployed and verified in prod" was explicitly required; Next.js-specific features (RSC, edge middleware for route-guard) are host-sensitive |
| C-012 | CI pipeline tooling                                            | Default | low-stakes, obvious default absent contrary signal |
| C-013 | Package manager                                                | Default | low-stakes, two-way, obvious modern default |
| C-014 | Linter + formatter toolchain (formatter choice / Biome vs. Prettier alongside the fixed ESLint+eslint-plugin-tailwindcss requirement) | Decide | user explicitly flagged this as unresolved ("not sure what's the industry standard thing in 2026") — genuine live 2026 ecosystem trade-off |
| C-015 | Visual regression tool: Chromatic (managed) vs. Lost Pixel/Argos (OSS) | Decide | user's own testing-strategy diagram frames this as an open either/or |
| C-016 | Contract-drift detection tooling                               | Defer   | no real constraint exists yet — reopens once the real backend is deployed and undetected contract changes actually cause a break |
| C-017 | Project/component organization methodology (where components, hooks, primitives live) | Decide | discovered late (during `/gsd-ingest-docs`, not the original Phase 1 sweep — see note below); rewrite-level to restructure once dozens of files exist; user's explicit stated concern was avoiding an unstructured flat `/components` dump |

**Note on C-017's late discovery:** this candidate was missed by the original Phase 1a sweep because `HIGH-LEVEL-ARCHITECTURE.md`'s Cross-cutting section — built from iluvatar's fixed 13-invariant checklist — has no invariant asking "how is source code organized so it doesn't decay as the codebase grows." It surfaced only when the user asked directly, after hairsplitter's Phase 5 had already validated clean. Classifications stay revisable for the life of the pipeline, so it's added here rather than silently folded into `CONVENTIONS.md` without a TRIAGE/PROPOSITIONS trail.
