# PROPOSITIONS

Phase 3 consolidation check: each candidate below was tagged by capability
(auth/session, client cache/mutation, DnD interaction, dev-mock tooling,
typed API client, hosting/infra, static-analysis tooling, visual-test
tooling) and checked for a technology that covers more than one tag.
None found — every candidate here solves a genuinely distinct problem;
no single option in one matrix also satisfies another matrix's need. Two
pairs have real *integration* points worth flagging at the walkthrough
(the data-fetching candidate's TanStack Query commonly pairs with the
API-codegen candidate's openapi-typescript via the `openapi-react-query`
adapter; the auth candidate's proxy pattern and the data-fetching
candidate both touch the same Route Handler boundary), but neither is
one technology subsuming another's decision, so no rows were merged. No
merge history to record in any P-NNN header.

---

P-001 Auth session storage & handling (C-001)

Drivers: Server-side route-guarding fit (x4) — the spec requires
redirecting unauthenticated visitors on board routes before any data
fetch, which is Server Component/DAL/Proxy territory in Next.js App
Router. XSS exposure (x4) — this is a real production app handling real
credentials with no compliance program to fall back on. Solo-dev
implementation simplicity against an ambiguous backend contract (x3) —
signup returns a bare undocumented string and signin returns no body, so
whatever is built must not assume a specific backend intent. Resilience
to unknown backend session mechanism (x2) — backend isn't deployed yet,
so the frontend may have to absorb a mid-project contract clarification
without a rewrite.

| Option | Server-side route-guarding fit (x4) | XSS exposure resistance (x4) | Solo-dev simplicity vs. ambiguous contract (x3) | Resilience to unknown backend mechanism (x2) | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| httpOnly cookie via Route Handler (BFF proxy) | 5 (20) | 5 (20) | 3 (9) | 5 (10) | 59 |
| Bearer token in memory only (React context) | 1 (4) | 4 (16) | 2 (6) | 2 (4) | 30 |
| Bearer token in localStorage/sessionStorage | 1 (4) | 1 (4) | 4 (12) | 2 (4) | 24 |

Recommendation: httpOnly secure cookie set by a Next.js Route Handler
acting as a thin BFF proxy — it's the only option that lets the app
satisfy the mandatory server-side route guard (verified via a DAL/Proxy
reading `cookies()`), matches the Next.js team's own recommended
pattern, and lets the proxy absorb the backend's response-shape
ambiguity behind one boundary instead of propagating it into client
code.

Rationale (non-obvious cells only):
- BFF cookie, simplicity (3, not 5): still the most work of the three up
  front — the solo dev has to write the Route Handler proxy, pick a
  session library (`jose`/`iron-session`), and encrypt/sign a session
  cookie themselves, since the external API's bare-string/no-body
  responses can't just be forwarded as-is. It wins on every other driver
  despite this.
- In-memory token, route-guarding (1): memory is a client-only JS value —
  a fresh SSR request for `/board/123` (direct nav, hard refresh, new
  tab) has no memory to read, so the server literally cannot redirect
  before rendering board data without also introducing a second,
  persisted signal.
- In-memory token, resilience (2): commits to betting the ambiguous bare
  string from `/signup` is meant to function as a bearer token; if the
  backend later issues a `Set-Cookie` instead, this mechanism has to be
  scrapped.
- localStorage, simplicity (4): naive wiring is genuinely the fastest
  thing to hack together — which is exactly why OWASP/Next.js/Auth0 all
  flag it as the most common real-world Next.js auth mistake; the score
  reflects short-term dev speed, not a recommendation.
- localStorage, XSS resistance (1): OWASP's Session Management Cheat
  Sheet states any credential in `localStorage`/`sessionStorage` is
  readable by any script on the origin — one XSS bug discloses the token
  for every open session.

Sources:
- https://nextjs.org/docs/app/guides/authentication — fetched 2026-08-09
  (primary-docs): official Next.js guide (v16.3.0, lastUpdated
  2026-08-07) recommending httpOnly/Secure/SameSite=lax cookies via
  `cookies()`, a DAL (`verifySession()`), and Proxy/middleware only for
  optimistic pre-checks. [surfaced by: search "Next.js official docs
  authentication httpOnly cookie session route handler 2025"]
- https://workos.com/blog/nextjs-app-router-authentication-guide-2026 —
  fetched 2026-08-09 (vendor, WorkOS, dated 2026-02-17): recommends
  defense-in-depth (middleware + DAL, never middleware-only per
  CVE-2025-29927); warns bearer tokens in localStorage are
  XSS-vulnerable. [surfaced by: search "Next.js App Router 2026
  authentication session cookie vs bearer token best practice"]
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  — fetched 2026-08-09 (independent): "Do not store authentication
  tokens, session IDs, JWTs, refresh tokens, or any credential in
  localStorage or sessionStorage"; recommends HttpOnly/Secure/SameSite
  cookies or a BFF pattern. [surfaced by: search "OWASP JWT storage
  cookie vs localStorage XSS CSRF cheat sheet 2025 2026"]
- https://auth0.com/docs/secure/security-guidance/data-security/token-storage
  — fetched 2026-08-09 (vendor, Auth0/Okta): recommends in-memory as most
  secure client-side option for pure SPAs, but server-side encrypted
  session cookies for apps with a backend tier. [surfaced by: search
  ""in-memory" access token storage SPA XSS refresh token rotation 2025
  best practice"]

---

P-002 Client data-fetching & mutation strategy (C-002)

Drivers:
- Optimistic-rollback correctness (x3) — every Column/Task/Subtask
  mutation carries a `version` and a stale version is REJECTED, not
  merged; the drag interaction is optimistic-first, so the library must
  snapshot pre-mutation state and cleanly restore it on a rejected write.
- Testability under Vitest Browser Mode + Playwright (x2) — the data
  layer must be mockable as a pure client-side dependency (e.g. via MSW)
  in real-Chromium component tests and end-to-end, without a live Node
  server process for every test.
- Fit for an external-API-only backend (x2) — no same-repo DB; Server
  Actions/Route Handlers can only proxy to a separate REST service.
- Solo-dev maintenance simplicity (x1) — rewrite-level decision for a
  single maintainer; extra architectural machinery is a standing cost.

| Option | Rollback correctness (x3) | Testability (x2) | External-API fit (x2) | Solo-dev simplicity (x1) | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| TanStack Query (client-side) | 5 | 5 | 5 | 4 | 39 |
| SWR (client-side) | 4 | 4 | 5 | 5 | 35 |
| RTK Query | 5 | 3 | 4 | 2 | 31 |
| RSC fetch + Server Actions (`useOptimistic` + `revalidatePath`/`revalidateTag`) | 2 | 2 | 3 | 3 | 19 |

Recommendation: TanStack Query — its explicit `onMutate`/`onError`/
`onSettled` lifecycle gives a structured snapshot-and-rollback path that
maps directly onto "reject a stale `version` and restore prior state,"
it is trivially mockable with MSW in both Vitest Browser Mode and
Playwright, and it avoids both RTK Query's Redux boilerplate and the RSC
approach's manual-rollback burden for a solo maintainer.

Rationale (non-obvious cells only):
- RSC+Server Actions rollback scored 2 (2026-08-09, primary-docs,
  react.dev): `useOptimistic` does NOT auto-rollback on Action failure —
  the developer must hand-roll error UI and any re-sync, exactly the
  behavior TanStack Query gives for free via `onError`'s snapshot
  argument.
- RSC+Server Actions testability scored 2 (2026-08-09, independent,
  thetshaped.dev / mswjs.io): MSW cleanly intercepts client `fetch` for
  TanStack Query/SWR in Vitest Browser Mode and Playwright, but Server
  Actions execute server-side inside Next.js's own pipeline, harder to
  intercept from a component test.
- RSC+Server Actions external-API-fit scored 3 (2026-08-09,
  primary-docs, tanstack.com Advanced Server Rendering guide): TanStack's
  own docs advise against calling Server Actions from a client `queryFn`
  since they "run serially rather than in parallel" when invoked from
  the client.
- RTK Query rollback scored 5, same as TanStack Query, via
  `api.util.updateQueryData(...).undo()` (2026-08-09, primary-docs,
  redux-toolkit.js.org) — but its simplicity score (2) reflects adopting
  a global Redux store for a project with no other reason to need one.
- SWR rollback scored 4 via `rollbackOnError`/`optimisticData`/
  `populateCache` (2026-08-09, primary-docs, swr.vercel.app) — looser,
  per-call options rather than TanStack's per-mutation lifecycle object,
  relevant for rapid successive card moves.

Sources:
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
  — fetched 2026-08-09 (primary-docs): onMutate/onError/onSettled
  snapshot-and-restore pattern. [surfaced by: "TanStack Query optimistic
  updates rollback onError 2026 Next.js App Router external REST API"]
- https://react.dev/reference/react/useOptimistic — fetched 2026-08-09
  (primary-docs): confirms no automatic rollback on Action failure.
  [surfaced by: direct navigation]
- https://swr.vercel.app/docs/mutation — fetched 2026-08-09
  (primary-docs): `optimisticData`, `rollbackOnError`, `populateCache`.
  [surfaced by: direct navigation]
- https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr
  — fetched 2026-08-09 (primary-docs, snippet): Server Actions run
  serially when called client-side, not recommended as a `queryFn`.
  [surfaced by: "TanStack Query docs 'Server Actions' 'run serially'
  queryFn not recommended"]
- https://redux-toolkit.js.org/rtk-query/usage/manual-cache-updates —
  fetched 2026-08-09 (primary-docs, snippet): `updateQueryData` +
  `.undo()` rollback pattern. [surfaced by: "RTK Query optimistic
  updates updateQueryData rollback 2026"]
- https://sisl.pl/en/blog/react-query-swr-2026-showdown — fetched
  2026-08-09 (independent): bundle size TanStack ~16.2KB vs SWR ~5.3KB.
  [surfaced by: "SWR vs TanStack Query 2026 comparison optimistic
  updates"]
- https://www.pkgpulse.com/guides/tanstack-query-v5-vs-swr-v3-vs-rtk-query-data-fetching-2026
  — fetched 2026-08-09 (independent, snippet): TanStack recommended
  default for growing server-state complexity. [surfaced by: same query]
- https://mswjs.io/docs/quick-start/ — fetched 2026-08-09 (primary-docs,
  snippet): MSW works across Vitest, Playwright, Storybook via the same
  interception layer. [surfaced by: "TanStack Query MSW mock service
  worker testing Vitest Playwright optimistic updates"]
- https://thetshaped.dev/p/my-frontend-stack-in-2026 — fetched 2026-08-09
  (independent, snippet): 2026 stack pairing TanStack Query + MSW +
  Vitest + Playwright. [surfaced by: same query]
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag —
  fetched 2026-08-09 (primary-docs, snippet): revalidateTag/revalidatePath
  callable only in Server Actions/Route Handlers. [surfaced by:
  "'external API' Next.js App Router Server Actions proxy revalidateTag
  vs client-side TanStack Query 2026"]

---

P-003 Drag-and-drop library (C-003)

Drivers: Accessibility support (x3) — the enforced Storybook + axe-core
gate makes keyboard-operable, ARIA-correct drag interactions a hard
requirement. Touch/mobile support (x2) — explicit desktop+touch
responsive requirement. Active maintenance + React 19 compatibility (x2)
— greenfield app, rewrite-level cost to swap later. Ease of
optimistic-move-with-rollback (x2) — every move round-trips to a server
that can reject on a version conflict.

| Option | Accessibility (x3) | Touch/mobile (x2) | Maintenance/React 19 (x2) | Optimistic rollback (x2) | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| dnd-kit (@dnd-kit/core + sortable) | 5 | 5 | 5 | 4 | 43 |
| @hello-pangea/dnd | 5 | 4 | 2 | 5 | 37 |
| Pragmatic drag-and-drop (Atlassian) | 2 | 4 | 5 | 3 | 30 |
| Native HTML5 DnD (hand-rolled) | 1 | 1 | 3 | 2 | 15 |

Recommendation: dnd-kit — accessibility (keyboard sensor, live-region
announcements, sensible ARIA) is built in rather than opt-in, decisive
under the enforced axe-core gate, paired with strong touch support and
an `onDragEnd`/state model that makes optimistic-update-then-revert
straightforward.

Rationale (non-obvious cells only):
- Pragmatic DnD accessibility scored low (2): keyboard support ships in
  a separate optional `react-accessibility` package, and Atlassian's own
  guidance recommends pairing drag with a separate action-menu UI rather
  than relying on directional keyboard DnD alone.
- @hello-pangea/dnd scored low on maintenance (2): last commit to `main`
  2026-02-13 (~6 months stale at research time), last release v18.0.1
  Feb 2025 (~18 months stale), one active contributor per quarter.
- Native HTML5 DnD scored 1 on touch: the native Drag and Drop API's
  touch path is effectively unsupported on mainstream mobile browsers
  even where `DragEvent` exists, requiring third-party polyfills.
- dnd-kit's ecosystem is currently split: the mature `@dnd-kit/core`/
  `@dnd-kit/sortable` line (v6.x, ~17.5k stars, React 18/19 peer-dep) vs.
  a newer framework-agnostic rewrite (`@dnd-kit/react`, still pre-1.0 at
  v0.5.0). Recommendation is the established `@dnd-kit/core` line.
- Bundle-size figures (dnd-kit ~6-19KB, Pragmatic ~4.7KB) are UNVERIFIED
  — Bundlephobia returned no numeric data to WebFetch; recommend
  re-checking directly before treating size as a tiebreaker.

Sources:
- https://dev.to/puckeditor/top-5-drag-and-drop-libraries-for-react-24lb
  — fetched 2026-08-09 (independent): 2026 roundup, dnd-kit as 2026
  default. [surfaced by: "dnd-kit vs Pragmatic drag and drop 2026
  comparison React"]
- https://www.pkgpulse.com/blog/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026
  — fetched 2026-08-09 (independent): dnd-kit ~2.8M weekly downloads/6KB
  core, Pragmatic <4KB core. [surfaced by: same query]
- https://github.com/hello-pangea/dnd (repo + issues + `gh api`) —
  fetched 2026-08-09 (primary/repo + GitHub API): last commit `main`
  2026-02-13; last release v18.0.1 Feb 2025; 142 open issues, 4003
  stars; touch support explicitly listed.
- https://insights.linuxfoundation.org/project/hello-pangea-dnd —
  fetched 2026-08-09 (independent): "1 active contributor in the last
  quarter," 52-day avg issue resolution.
- https://github.com/clauderic/dnd-kit (repo + `gh api`) — fetched
  2026-08-09 (primary/repo + GitHub API): keyboard/ARIA/live-regions
  built in; pointer/mouse/touch/keyboard sensors; 17,508 stars, 122 open
  issues, pushed 2026-07-13.
- https://github.com/atlassian/pragmatic-drag-and-drop (repo + `gh api`)
  — fetched 2026-08-09 (primary/repo + GitHub API): "assistive
  technology friendly flows" via optional package; full iOS/Android
  support; 12,721 stars, 102 open issues, last commit 2026-08-08 (daily
  mirror of Atlassian's internal monorepo).
- Search aggregation on native HTML5 DnD mobile support (sitepoint.com,
  testmuai.com, `timruffles/mobile-drag-drop`, `drag-drop-touch-js/dragdroptouch`)
  — fetched 2026-08-09 (independent, unverified exact 2026 currency):
  Samsung Internet exposes DragEvent surface but finger-touch sessions
  don't fire them; iOS/iPadOS 15+ has partial support only.
- https://dndkit.com/ and https://dndkit.com/legacy/guides/accessibility/
  — fetched 2026-08-09 (vendor/primary-docs): confirms stable/legacy vs.
  rewrite doc split; dedicated accessibility guide.
- https://atlassian.design/components/pragmatic-drag-and-drop/about —
  fetched 2026-08-09 (vendor/primary-docs): sensors support "mouse,
  touch, and keyboard" as an extensibility point, not default behavior.

---

P-004 OpenAPI-contract mock/stub server (C-007)

Drivers: (1) Custom version-conflict rejection logic (x3) — the
contract's optimistic-locking `version` field must be checkable per
request and rejected with 409; the named risk a naive fixture server
would hide. (2) Dual test-layer usability (x2) — must work inside both
Vitest Browser Mode and Playwright without maintaining two divergent
mock implementations. (3) OpenAPI spec sync (x1) — the contract may
still change before a real backend exists.

| Option | Custom version-reject logic (x3) | Dual Vitest+Playwright usability (x2) | OpenAPI spec sync (x1) | Total |
|---|:---:|:---:|:---:|:---:|
| MSW (hand-written resolvers) | 5 | 4 | 3 | 26 |
| Hand-rolled Next.js Route Handler stub | 5 | 4 | 2 | 25 |
| json-server + custom middleware | 2 | 3 | 1 | 13 |
| Prism (Stoplight) | 1 | 3 | 5 | 14 |

Recommendation: MSW with hand-written resolvers — arbitrary JS/TS logic
gives full control over the version-check/409 behavior, and it's the
only option with a first-class, documented integration into Vitest
Browser Mode plus a maintained community bridge (`mswjs/playwright`).

Rationale (non-obvious cells only):
- Prism scores 1 on custom logic (2026-08-09, primary-docs,
  github.com/stoplightio/prism): "Data Persistence" is listed as
  planned/not-yet-shipped; complex business logic needs hand-written
  stubs instead.
- Prism scores 5 on spec sync: mocks are generated directly from the
  OpenAPI file, so spec changes propagate with no separate maintenance
  step.
- MSW's Playwright score (4, not 5): `mswjs/playwright` doesn't share
  MSW's native worker mechanism across processes — reimplements
  interception via `page.route()`, called "an implementation detail
  likely to change" by its own README.
- json-server drops to 2 on custom logic: current v1 (beta) docs no
  longer document the custom-middleware mechanism older versions relied
  on; no native concept of a versioned-entity conflict.
- Hand-rolled Route Handler ties MSW on custom logic (5) but loses on
  spec sync (2): no codegen/validation step tying handlers back to the
  OpenAPI file — drift caught only by manual review.

Sources:
- https://mswjs.io/docs/recipes/vitest-browser-mode/ — fetched
  2026-08-09 (primary-docs): official recipe for MSW's browser worker
  inside Vitest Browser Mode. [surfaced by: "MSW Mock Service Worker
  2026 stateful mock Vitest Browser Mode Playwright OpenAPI"]
- https://github.com/mswjs/playwright — fetched 2026-08-09
  (primary-docs): community bridge using `page.route()`, stopgap caveat.
  [surfaced by: same query]
- https://github.com/stoplightio/prism — fetched 2026-08-09
  (primary-docs): roadmap lists persisted mock data as unshipped.
  [surfaced by: "Prism Stoplight mock server 2026 custom logic dynamic
  response OpenAPI stateful"]
- https://github.com/typicode/json-server — fetched 2026-08-09
  (primary-docs): db.json-driven, standalone-process only, v1 beta with
  no documented middleware mechanism. [surfaced by: "json-server 2026
  stateful mock OpenAPI custom middleware version conflict"]
- https://qaskills.sh/blog/msw-mock-service-worker-testing-guide-2026 —
  unfetched, snippet only (2026-08-09, independent): MSW as 2026-default
  mocking tool. [surfaced by: same query as MSW above] — unverified
  beyond snippet.
- https://apidog.com/blog/prism-mock/ — unfetched, snippet only
  (2026-08-09, independent): corroborates Prism cannot verify complex
  business logic. [surfaced by: same query as Prism above]
- https://blog.arcjet.com/testing-next-js-app-router-api-routes/ —
  unfetched, snippet only (2026-08-09, independent): general Next.js
  route-handler testing guidance. [surfaced by: "Next.js route handler
  mock stub OpenAPI contract testing in-repo optimistic locking version
  2026"] — unverified beyond snippet.

---

P-005 Typed API client / codegen (C-008)

Drivers: Regeneration/contract-drift friction (x3) — backend contract
still moving, tool must re-sync types with a single low-ceremony command
against the local OpenAPI 3.1 file. TypeScript type fidelity against
OpenAPI 3.1 (x3) — every component calls through this client. Solo-dev
maintenance overhead (x2) — no team to split codegen-config upkeep.
Synergy with common data-fetching libraries (x1) — lower weight since
the caching layer is a separate decision.

| Option | Regen/drift friction (x3) | 3.1 type fidelity (x3) | Solo maintenance (x2) | Data-fetch synergy (x1) | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| openapi-typescript + openapi-fetch | 5 | 5 | 4 | 4 | 42 |
| Orval | 3 | 3 | 4 | 5 | 31 |
| Kubb | 2 | 3 | 2 | 4 | 23 |
| Hand-written client + manual types (baseline) | 1 | 1 | 2 | 4 | 14 |

Recommendation: openapi-typescript + openapi-fetch — single-command
regeneration straight from the local OpenAPI 3.1 file, reference-grade
3.1 type fidelity, lowest ongoing config surface for a solo dev; add the
official `openapi-react-query` adapter once P-002 (TanStack Query) lands.

Rationale (non-obvious cells only):
- openapi-typescript regen=5: benchmarked 1.5s/single output file on a
  75k-line, 1,200-op schema vs. Orval's 5.5s/2,719 files and Kubb's
  18.1s/3,877 files (dev.to comparison, 2026-08-09).
- Orval fidelity=3: open 2026 GitHub issues document incorrect
  Zod-schema generation for OpenAPI 3.1 `prefixItems`/tuple structures
  and default/min-max values (orval-labs/orval#1961, #2801, #2933).
- Kubb solo-maintenance=2: actively-published line is still
  `5.0.0-beta.106` alongside a separate `3.2.3` "stable" tag — confusing
  dual-channel versioning for a single maintainer.
- Not scored but worth tracking: `@hey-api/openapi-ts` (successor to
  `openapi-typescript-codegen`) merges PRs within a day and generates a
  React Query plugin; several 2026 comparisons recommend it for new
  projects over Orval, though it wasn't in the requested candidate set.

Sources:
- https://dev.to/nyaomaru/which-openapi-codegen-should-you-choose-openapi-typescript-vs-hey-api-vs-orval-vs-kubb-100p
  — fetched 2026-08-09 (independent): benchmark table on 75k-line/1,200-op
  schema. [surfaced by: "openapi-typescript vs Orval vs Kubb 2026
  comparison"]
- https://www.pkgpulse.com/guides/orval-vs-openapi-typescript-vs-kubb-openapi-client-2026
  — fetched 2026-08-09 (independent): CI drift-prevention pattern,
  explicit solo-dev recommendation for openapi-typescript+openapi-fetch.
  [surfaced by: same query]
- https://openapi-ts.dev/openapi-fetch/ and /introduction — fetched
  2026-08-09 (primary-docs): confirms OpenAPI 3.0/3.1 support incl.
  discriminators/polymorphic types.
- `gh api repos/openapi-ts/openapi-typescript` (+ /releases) — fetched
  2026-08-09 (primary-docs/repo metadata): 8,292 stars, 281 open issues,
  pushed 2026-08-09; core CLI's latest tag 7.13.0 published 2026-02-11
  (sibling packages still receive commits).
- `gh api repos/orval-labs/orval` — fetched 2026-08-09 (primary-docs):
  6,337 stars, 97 open issues, latest release v8.24.0 published
  2026-08-08.
- https://github.com/orval-labs/orval/issues/1961, /2801, /2933 —
  fetched 2026-08-09 (independent/primary): open 3.1-fidelity bugs.
- `gh api repos/kubb-labs/kubb` and https://kubb.dev/ — fetched
  2026-08-09 (primary-docs/repo metadata): 1,771 stars, concurrent
  `5.0.0-beta.106`/`3.2.3` tags.
- `gh api repos/hey-api/openapi-ts` — fetched 2026-08-09
  (primary-docs/repo metadata): 5,239 stars, 545 open issues, pushed
  2026-08-06 — context for the "worth tracking" note only.

---

P-006 Production hosting / deployment target (C-011)

Drivers: Solo-dev budget/free-tier fit with near-zero ops overhead (x3).
Genuine native support for Next.js SSR + middleware, since the auth
route-guard is a hard functional requirement (x3). Ease of
per-environment env var / API base URL swapping (mock now, real backend
later) (x1). Native preview deployments per branch for solo iteration
(x2).

| Option | Budget/ops fit (x3) | SSR+middleware fidelity (x3) | Env/API-base swap ease (x1) | Preview deploys (x2) | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| Vercel | 5 | 5 | 5 | 5 | 45 |
| Netlify | 5 | 4 | 5 | 5 | 42 |
| Cloudflare Workers (@opennextjs/cloudflare) | 4 | 3 | 4 | 4 | 33 |
| Self-hosted Docker on VPS (e.g. Hetzner) | 2 | 5 | 3 | 1 | 26 |

Recommendation: Vercel — first-party, zero-caveat SSR/middleware support
(the reference platform Next.js is built against), automatic per-branch
preview deployments, trivial per-environment env var management, all
inside a free Hobby tier fitting a solo, pre-revenue project.

Rationale (non-obvious cells only):
- Vercel budget/ops (5): Hobby tier is fully managed with generous 2026
  limits (100GB Fast Data Transfer, 1M invocations, 4 CPU-hrs), but is
  explicitly non-commercial only — fine pre-revenue, becomes a real
  constraint the moment the app monetizes (Pro $20/mo).
- Netlify SSR+middleware (4, not 5): Middleware runs on Netlify Edge
  Functions, "one of the better-supported features," but headers/
  redirects are evaluated after middleware — a behavioral difference
  from stock Next.js that could bite an auth-redirect flow.
- Cloudflare budget/ops (4, not 5): free plan's 10ms CPU time per
  invocation is tight for SSR, likely forcing an early move to the
  $5/mo Workers Paid plan.
- Cloudflare SSR+middleware (3): @opennextjs/cloudflare hit 1.0 GA Feb
  2026, supports App Router/Middleware/streaming, but at least one 2026
  write-up (unverified against Cloudflare's own primary docs) flags
  `cookies()` needing Node.js APIs that may not work inside
  `middleware.ts` on Workers — directly relevant to the cookie-based
  auth route-guard; flagged for a spike before committing if Cloudflare
  is ever reconsidered.
- Self-hosted SSR+middleware (5): running Next.js's own Node server via
  `output: "standalone"` in Docker has zero adapter/compatibility
  caveats — perfect fidelity, at the cost of everything else.
- Self-hosted budget/ops (2): no free tier (~€3.79–4.59/mo Hetzner CX22
  floor), and the solo dev personally owns Docker/Nginx/SSL/patching.
- Self-hosted preview deploys (1): no native per-branch preview
  mechanism; would have to be hand-built.

Sources:
- https://vercel.com/docs/limits — fetched 2026-08-09 (primary-docs,
  last_updated 2026-08-03): Hobby plan limits, non-commercial
  restriction. [surfaced by: direct WebFetch]
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
  — fetched 2026-08-09 (primary-docs): App Router/SSR/Middleware/
  streaming via OpenNext adapter; "Node.js middleware... not yet
  supported." [surfaced by: "Cloudflare Workers Next.js
  opennextjs-cloudflare 2026 middleware support"]
- https://developers.cloudflare.com/workers/platform/pricing/ — fetched
  2026-08-09 (primary-docs): 100,000 requests/day, 10ms CPU
  time/invocation. [surfaced by: direct WebFetch]
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
  and .../legacy-runtime/middleware/ — referenced 2026-08-09
  (primary-docs, via search synthesis): Middleware on Edge Functions,
  headers/redirects evaluated after middleware. [surfaced by: "Netlify
  Next.js App Router middleware support 2026"]
- https://www.netlify.com/pricing/ — fetched 2026-08-09 (vendor):
  Free/Starter confirms "unlimited deploy previews," "300 credit limit."
  [surfaced by: direct WebFetch]
- https://costbench.com/... and https://flexprice.io/blog/... — fetched
  2026-08-09 (independent, unverified against Netlify primary source):
  Starter = 100GB bandwidth, 300 build minutes, 125K function calls/mo.
  [surfaced by: "Netlify free plan 2026 100GB bandwidth 300 build
  minutes edge functions limit"]
- https://github.com/opennextjs/opennextjs-cloudflare — referenced
  2026-08-09 (primary-source repo): adapter hit 1.0 GA Feb 2026.
- https://rickylaikhuram.medium.com/hosting-next-js-on-cloudflare-workers-using-opennext-9a72170fea7f
  — fetched 2026-08-09 (independent, unverified): claims `cookies()` may
  fail inside `middleware.ts` on Workers — flagged for direct
  confirmation before relying on it.
- https://vpsfor.dev/posts/hetzner-cx22-pricing-2026/ and
  https://www.hetzner.com/pressroom/new-cx-plans/ — fetched 2026-08-09
  (independent + vendor): Hetzner CX22 ≈ €3.79–4.59/month.
- https://nextjs.org/docs/app/getting-started/deploying — referenced
  2026-08-09 (primary-docs): `output: "standalone"` for Docker/VPS.

---

P-007 Linter + formatter toolchain (C-014)

Drivers: Constraint compliance (x3) — must not require dropping ESLint +
eslint-plugin-tailwindcss, fixed and non-negotiable. Current-2026-
standard-ness (x2) — owner explicitly asked "what's the industry
standard thing in 2026." Solo-dev config/maintenance simplicity (x2).
Performance (x1) — runs on every commit.

| Option | Constraint compliance (x3) | 2026-standard-ness (x2) | Maintenance simplicity (x2) | Performance (x1) | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| A: ESLint+eslint-plugin-tailwindcss (kept) + Prettier + prettier-plugin-tailwindcss | 5 | 4 | 4 | 3 | 34 |
| B: ESLint+eslint-plugin-tailwindcss (kept) + Biome used only as formatter | 5 | 2 | 3 | 5 | 30 |
| C: Biome for both linting+formatting, eslint-plugin-tailwindcss dropped for Biome's own class-sort rule | 1 | 5 | 5 | 5 | 28 |

Recommendation: Option A (ESLint + eslint-plugin-tailwindcss kept +
Prettier + prettier-plugin-tailwindcss) — the only fully
constraint-compliant option and the best-documented, lowest-friction
2026 pairing; option B is a legitimate fallback if commit-time speed
later becomes a measured pain point.

Rationale (non-obvious cells only):
- Option C constraint score of 1, not 0: technically installable
  alongside eslint-plugin-tailwindcss, but the whole point of "Biome for
  both" is to drop it, which directly violates the fixed requirement.
- Option C's Tailwind sorting (`useSortedClasses`) is in Biome's
  "nursery" (experimental) tier, unsafe-fix only, no screen-variant
  (`md:`) or plugin/prefix support — materially less mature than
  eslint-plugin-tailwindcss independent of the hard constraint.
- Option B standard-ness scored low (2): the documented 2026 "hybrid"
  pattern found is the inverse pairing (Biome for everything + Prettier
  only for Tailwind sorting) — no sources describe B's specific
  combination as an established convention.
- Option A maintenance scored above B: prettier-plugin-tailwindcss is
  maintained directly by Tailwind Labs, zero custom config, vs. B
  requiring explicit coordination of "who formats what" between two
  tools.
- eslint-plugin-tailwindcss v4.2.0 (released 2026-07-13) is now built
  specifically for Tailwind CSS v4 — confirms the fixed requirement
  isn't stale tooling.

Sources:
- https://biomejs.dev/linter/rules/use-sorted-classes/ — fetched
  2026-08-09 (primary-docs): confirms nursery/experimental,
  unsafe-fix-only status. [surfaced by: "Biome Tailwind CSS class
  sorting plugin support 2026"]
- https://github.com/francoismassart/eslint-plugin-tailwindcss/releases
  — fetched 2026-08-09 (independent, primary release feed): v4.2.0
  released 2026-07-13, built for Tailwind v4. [surfaced by:
  ""eslint-plugin-tailwindcss" Tailwind v4 support 2026 maintained"]
- https://www.npmjs.com/package/prettier-plugin-tailwindcss — search
  snippet, not directly fetched (vendor/primary, Tailwind Labs): latest
  v0.8.1, defaults to Tailwind v4 support. [surfaced by:
  "prettier-plugin-tailwindcss 2026 still maintained latest version"]
- https://www.peal.dev/blog/biome-vs-eslint-prettier-new-linting-landscape
  — fetched 2026-08-09 via snippet (independent): describes the inverse
  hybrid pattern (Biome + Prettier-for-Tailwind-only); notes Biome has
  no plugin ecosystem for custom rules like eslint-plugin-tailwindcss.
  [surfaced by: "Biome vs Prettier vs ESLint 2026 Next.js Tailwind CSS
  formatter standard"]
- https://www.programming-helper.com/tech/biome-2026-rust-toolchain-web-development
  — fetched 2026-08-09 via snippet (independent): Biome 2.3 as of Jan
  2026, notes "the ESLint+Prettier era isn't over." [surfaced by:
  ""Biome" "1.0" OR "2.0" state of JS tooling 2026 survey adoption
  ESLint Prettier"]
- https://github.com/biomejs/biome/issues/1274 and .../discussions/164 —
  surfaced but not individually fetched (independent): ongoing Tailwind
  class-sort feature-request discussion. [surfaced by: "Biome Tailwind
  CSS class sorting plugin support 2026"]
- Unverified/low-confidence: exact npm download-count or GitHub-star
  comparison figures for Biome vs. ESLint — directional signal only, not
  confirmed against a primary source.

---

P-008 Visual regression tool (C-015) — REVISED after user pushback on
3rd-party dependency

Drivers: No third-party dependency / data stays in repo (x4) — the user
explicitly said relying on a 3rd-party service "doesn't sit right"; this
is now the heaviest driver, not a tiebreaker. Budget/recurring cost (x3)
— solo dev, no team, wants to minimize recurring SaaS spend. Setup &
day-to-day diff-review workflow overhead (x3) — solo dev has nobody to
absorb maintenance pain, and the user is new to visual regression
testing, so the actual operating workflow matters as much as install
friction. Storybook integration + GitHub Actions/PR-review fit (x2) —
Storybook stories are the fixed VRT scope, GitHub Actions is the
already-chosen deploy pipeline.

| Option | No 3rd-party dep / data-in-repo (x4) | Budget/recurring cost (x3) | Setup & diff-review workflow (x3) | Storybook + GH Actions/PR fit (x2) | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| Chromatic | 1 | 3 | 5 | 5 | 38 |
| Lost Pixel | 4 | 5 | 2 | 4 | 45 |
| Argos | 1 | 5 | 4 | 4 | 39 |
| **Playwright-native (`toHaveScreenshot`)** | 5 | 5 | 3 | 2 | **48** |

Recommendation: Playwright-native (`toHaveScreenshot`) — highest total;
directly satisfies the user's explicit no-3rd-party-service requirement
at zero added dependency (Playwright is already mandatory in the stack
for E2E/`nextcov`) and zero recurring cost, and the extra workflow
overhead is manageable at this project's modest, design-system-only
scope.

Rationale (non-obvious cells only):
- Playwright-native = 5 on the dependency driver: `toHaveScreenshot()`
  and its `pixelmatch`-based diffing ship inside `@playwright/test`,
  already mandatory for E2E — nothing new enters `package.json`, and
  screenshots/diffs never leave the local machine or CI runner.
- Playwright-native = 3 (not higher) on setup/workflow: there's no
  official one-command Storybook hookup. The documented community
  pattern is to read `storybook-static/index.json`, filter to real
  stories, build each story's iframe URL, and call `page.goto()` +
  `toHaveScreenshot()` per story yourself — roughly 30-60 lines of glue
  you own. Review is genuinely workable for a solo dev — `npx playwright
  show-report` (or the CI artifact) renders expected/actual/diff images
  with a comparison slider, not raw PNGs — but nothing posts to the PR
  itself, so accepting a real visual change means `--update-snapshots` +
  committing new PNGs as a manual git step the SaaS options replace with
  a UI button.
- Playwright-native = 2 on Storybook+GH driver: no first-class "point at
  your Storybook and go" integration (unlike Chromatic's/Argos's native
  Storybook deploy commands), and CI reporting is a plain pass/fail
  check with no diff thumbnails/comments surfaced on the PR.
- Lost Pixel = 4, not 5, on the dependency driver: its OSS/CI mode also
  keeps everything local (baselines in `.lostpixel/baseline/`, committed
  to git, no account needed) — close to Playwright-native — but it's
  still a separate npm/Docker-based tool to install and keep compatible,
  where Playwright-native adds nothing beyond what's already in the
  stack.
- Lost Pixel = 5 on budget under this narrower "recurring cost" framing:
  OSS mode's real cost is $0 with no usage ceiling at all — better than
  Chromatic's/Argos's free tiers, which are usage-capped.
- Chromatic = 1 / Argos = 1 on the dependency driver: both require an
  account and uploading every screenshot to the vendor's cloud for
  review — exactly the pattern the user objected to; Argos's own README
  confirms no self-hosting escape hatch either.
- Baseline PNG accumulation at this project's scale: no source addresses
  git-repo-size concerns directly — reasoned estimate, not a sourced
  claim: with scope fixed to design-system components only, a realistic
  story count is in the dozens × a handful of viewport/browser variants
  — order of 100-300 small PNGs, a few MB total, not a scale where plain
  git becomes a real problem for a solo repo.
- Vendor counter-argument acknowledged: Argos's own blog argues native
  Playwright VRT needs custom scripts and lacks a built-in review UI "at
  scale" — vendor-authored (Argos sells the alternative), and its
  "doesn't scale" framing targets team-scale usage; none of this
  project's drivers require multi-reviewer collaboration, so the
  critique carries less weight here than it would for a team.

Sources:
- https://playwright.dev/docs/test-snapshots — fetched 2026-08-10
  (primary-docs): confirms `--update-snapshots` workflow, snapshots
  stored next to the test file and meant to be committed to git, warns
  rendering varies by host OS/version so CI should match the environment
  baselines were generated in. [surfaced by: direct navigation,
  deepening the prior 2026-08-09 quick check]
- https://markus.oberlehner.net/blog/running-visual-regression-tests-with-storybook-and-playwright-for-free/
  — fetched 2026-08-10 (independent): concrete pattern for discovering
  every Storybook story via `storybook-static/index.json`, generating
  per-story `toHaveScreenshot()` tests, reviewing failures via `npx
  playwright show-report`; explicitly silent on baseline PNG/git-size
  concerns. [surfaced by: "storybook test-runner generate playwright
  test per story screenshot testStorybook index.json"]
- https://storybook.js.org/docs/writing-tests/integrations/test-runner —
  snippet-level only (primary-docs): `@storybook/test-runner` turns each
  story into a Jest+Playwright test; its `postVisit` hook is the
  standard place to wire up screenshot assertions (commonly via
  `jest-image-snapshot`) as an alternative to hand-rolled index.json
  glue. [surfaced by: same query]
- https://argos-ci.com/blog/playwright-visual-testing-limits — surfaced
  via search snippet; direct fetch returned 404, full text unverified
  (vendor, low-confidence): claims native Playwright VRT needs custom
  scripts, artifact juggling, "baseline archaeology" via git history,
  and lacks a built-in review UI at scale. [surfaced by: "Argos CI
  playwright visual testing limits scale baseline management git blog"]
- https://testdino.com/blog/playwright-visual-testing and
  https://browsercat.com/post/ultimate-guide-visual-testing-playwright —
  fetched 2026-08-10, snippet-level only (independent): confirm the
  Playwright HTML report renders expected/actual/diff images plus a
  comparison slider for failed screenshot assertions. [surfaced by:
  "Playwright HTML report visual diff slider expected actual diff review
  UI"]
- Carried forward from prior research, verified 2026-08-09 (not
  re-fetched this pass):
  - https://www.chromatic.com/pricing/ (primary-docs): Free 5,000
    snapshots/mo (25K turbosnaps), Chrome only; Starter $179/mo.
  - https://argos-ci.com/pricing (primary-docs): Hobby free 5,000
    screenshots/mo forever, no card; Pro from $100/mo.
  - https://www.lost-pixel.com/ (primary-docs/vendor): Hobby free 7,000
    shots/mo; Startup $100/mo.
  - https://docs.lost-pixel.com/user-docs/setup/integrating-with-github-actions
    (primary-docs): OSS/CI mode vs. Platform mode; GitHub Actions
    first-class either way.
  - https://github.com/lost-pixel/lost-pixel (independent/primary via
    README): OSS mode is CLI/CI-artifact based, no hosted review UI.
  - https://docs.lost-pixel.com/.../baseline-images (primary-docs,
    snippet): baselines stored in `.lostpixel/baseline/`, committed to
    git in OSS mode.
  - https://github.com/argos-ci/argos (independent/primary via README):
    self-hosting not officially supported/documented; production
    depends on AWS/PostgreSQL/RabbitMQ/Redis/S3/DynamoDB/Stripe.
- Unverified/low-confidence: precise baseline-PNG-count and
  total-repo-size projections for this project's design-system scope
  are a reasoned estimate, not a fetched figure — no source located
  addressed git storage growth for Playwright snapshot directories
  directly.

---

P-009 Project/component organization methodology (C-017)

Drivers: Next.js App Router fit (x3) — the project already leans on App
Router's own primitives (route groups, Server/Client Component split,
Server Actions), so a structure fighting those conventions creates
permanent friction. Solo-dev clarity / "where does X go" (x3) — the
explicit stated concern is avoiding a flat 50-component `/components`
dump; the winning structure must answer placement questions with
near-zero deliberation for a single maintainer. Current 2026 real-world
adoption at this project's scale (x2) — ~5-6 domains (boards, columns,
tasks, subtasks, auth, activity log), started around 15-20 components —
the chosen approach should be what projects at this scale verifiably do,
not a stale or over-scaled recommendation.

| Option | App Router fit (x3) | Solo-dev clarity (x3) | 2026 adoption/fit-to-scale (x2) | Total |
|---|:---:|:---:|:---:|:---:|
| **Feature-folder hybrid** (`features/<domain>/` + `components/ui/`) | 4 | 5 | 5 | **37** |
| Next.js official colocation only (no global `features/`) | 5 | 2 | 4 | 29 |
| Feature-Sliced Design (FSD) | 2 | 3 | 3 | 21 |
| Atomic Design | 3 | 2 | 2 | 19 |

Recommendation: Feature-folder hybrid — directly answers "where does X
go" with a two-tier rule (domain code in `features/<domain>`,
cross-domain primitives in `components/ui`), imposes no App Router
naming collisions, and is what 2026 sources (Bulletproof React —
35.7k GitHub stars — plus independent community templates) converge on
independently for projects at this scale. FSD's own docs reserve it for
20+ features, well past this project's size.

Concrete folder structure for this project:

```
app/                                  # routing only — thin, imports from features/
├── layout.tsx
├── page.tsx
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
└── (dashboard)/
    ├── layout.tsx                    # sidebar shell
    └── boards/
        └── [boardId]/
            └── page.tsx              # composes features/boards + features/tasks, no business logic

src/
├── features/
│   ├── boards/
│   │   ├── components/               # BoardCard, AddBoardModal, EditBoardModal, DeleteBoardConfirm
│   │   ├── hooks/                    # useBoards, useCreateBoard, useUpdateBoard (TanStack Query)
│   │   ├── api/                      # calls into the openapi-typescript generated client
│   │   └── types.ts
│   ├── columns/
│   │   ├── components/               # ColumnHeader, AddColumnControl
│   │   └── hooks/
│   ├── tasks/
│   │   ├── components/               # TaskCard, TaskDetailModal, AddTaskModal, EditTaskModal, DeleteTaskConfirm
│   │   ├── hooks/                    # useTasks, useMoveTask (dnd-kit + TanStack Query mutation)
│   │   └── api/
│   ├── subtasks/
│   │   ├── components/               # SubtaskChecklist, SubtaskRow
│   │   └── hooks/
│   ├── auth/
│   │   ├── components/               # LoginForm, RegisterForm
│   │   ├── hooks/                    # useSession, useLogin, useLogout
│   │   └── api/
│   └── activity-log/
│       ├── components/               # ActivityFeed, ActivityItem
│       └── hooks/
│
├── components/
│   ├── ui/                           # Base UI-wrapped design-system primitives ONLY
│   │   ├── Button/{Button.tsx,Button.stories.tsx}
│   │   ├── TextField/{TextField.tsx,TextField.stories.tsx}
│   │   ├── Dropdown/{Dropdown.tsx,Dropdown.stories.tsx}
│   │   └── Checkbox/{Checkbox.tsx,Checkbox.stories.tsx}
│   └── layout/                       # Sidebar, AppShell — cross-domain, not primitives, not a feature
│
├── hooks/                            # generic, non-domain hooks (useMediaQuery, useDebounce, useLocalStorage)
├── lib/                              # generated API client instance, query-client, MSW handlers/setup, utils
└── styles/                           # Tailwind v4 @theme tokens generated by Style Dictionary from DTCG JSON
```

Placement rule of thumb: if it renders a route → `app/`. If it's
reusable across ≥2 domains and knows nothing about boards/tasks/auth →
`components/ui` (primitive) or `components/layout` (shell). If it
belongs to exactly one domain → that domain's `features/<domain>/`. If
in doubt whether something is a primitive or feature-specific, default
to feature-specific — promote to `components/ui` only once a second
domain needs it (avoids premature abstraction).

Rationale (non-obvious cells only):
- FSD app-router fit scored 2, not 1: FSD's own team ships explicit
  Next.js guidance (prefixed `_app`/`_pages` layers, `index.server.ts`
  public-API split) — it works, but only via workarounds layered on top
  of App Router's own folder semantics, not with them.
- FSD solo-dev clarity scored 3, not lower: once internalized its layer
  rules are unambiguous; the deduction is for enforcement cost (import-
  direction rules, public-API discipline, a linter you'd need to
  configure and heed alone) being disproportionate for a single
  maintainer.
- Next.js official colocation-only scored highest on App Router fit (5
  — it IS the framework's own default) but low on clarity (2): being
  unopinionated cuts both ways — it gives no rule for where shared-but-
  not-route-local domain hooks/components go, precisely the gap that
  produces a flat `/components` dump.
- Atomic Design was surfaced during research as a natural 4th
  comparison point: FSD's own docs dismiss it as providing "no guidance
  for domain logic or feature boundaries," and 2026 sources treat it as
  a design-system-only categorization, not an app-architecture answer.

**Completeness check (requested by the user after the initial
recommendation, since the original searches were name-targeted at FSD/
Bulletproof React/Atomic Design rather than open-ended):** a broader
sweep found nothing that beats or supplements the 4 options above.
"Domain-driven"/"vertical slice" Next.js structures found in 2026
sources are the same recommended pattern under different vocabulary
(app→features→shared, one-way dependency flow). Monorepo/package-per-
domain splitting (Turborepo/Nx) is real and current but every source
scopes it to team/platform scale, confirming its exclusion here was
correct, not a gap. Vercel's own docs confirm no official opinion beyond
plain colocation. The original recommendation stands unmodified.

**Enforcement-tool verification (the "how do we actually stop drift"
follow-up):** `eslint-plugin-boundaries` checks out as current and real
— latest release v7.2.0 (2026-08-09, one day before this check), ~1.5M
weekly downloads, and confirmed ESLint 9/10 flat-config support (load-
bearing: ESLint 9 reached end-of-life 2026-08-06 and ESLint 10 dropped
the old eslintrc system entirely). Its `boundaries/dependencies` +
`boundaries/no-private` rules directly support "features can't import
each other except via a public surface; `components/ui/` is importable
by anyone." Config is a one-time ~20-40 line `element-types`/
`dependencies` block — realistic for a solo developer, not a team-only
tool. `eslint-plugin-import` (the older alternative) is effectively
abandoned; its maintained fork `eslint-plugin-import-x` is a viable but
cruder path-based (not architectural-vocabulary-based) fallback.

Sources:
- https://feature-sliced.design/docs/guides/tech/with-nextjs — fetched
  2026-08-10 (primary-docs): official FSD Next.js integration guide,
  documents the `app`→`_app` naming-collision workaround and
  `index.server.ts` RSC-boundary fix. [surfaced by: "Feature-Sliced
  Design Next.js App Router 2026"]
- https://feature-sliced.design/blog/nextjs-app-router-guide — fetched
  2026-08-10 (primary-docs): FSD's own case for FSD+App Router; source
  of FSD's dismissal of Atomic Design. [surfaced by: same query]
- https://nextjs.org/docs/app/getting-started/project-structure —
  fetched 2026-08-10 (primary-docs, v16.3.0, lastUpdated 2026-07-21):
  official guidance confirming the framework is "unopinionated,"
  documents colocation/private-folders/route-groups conventions
  verbatim. [surfaced by: "Next.js official project structure
  documentation colocation components 2026"]
- https://raw.githubusercontent.com/alan2207/bulletproof-react/master/docs/project-structure.md
  — fetched 2026-08-10 (independent, 35.7k GitHub stars): canonical
  `features/<domain>/{components,hooks,api,types}` + shared top-level
  `components/` structure, unidirectional shared→features→app import
  rule. [surfaced by: "Bulletproof React Next.js App Router 2026"]
- https://github.com/arhamkhnz/next-colocation-template and
  https://next-colocation-template.vercel.app/ — fetched 2026-08-10
  (independent, community template): the "colocation-first" comparison
  row (route-local `_components` + shared top-level folders, no global
  `features/`). [surfaced by: "Next.js official project structure
  documentation colocation components 2026" and "'feature folders'
  Next.js 'components/ui' domain colocation hybrid named pattern"]
- https://github.com/feature-sliced/steiger — fetched 2026-08-10
  (primary-docs, npm published 10 days prior to fetch): FSD's official
  structure linter, evidence FSD tooling is actively maintained
  (adoption signal, not fit signal); still in beta. [surfaced by:
  "feature-sliced design npm downloads steiger adoption 2026 survey"]
- Completeness-check queries (2026-08-10, independent unless noted):
  "Next.js App Router project structure 2026 best practices folder
  organization"; "Vercel official Next.js template project structure
  conventions 2026" (primary-docs, nextjs.org); "'vertical slice
  architecture' Next.js App Router 2026"; "Turborepo Nx package per
  domain small Next.js app single developer 2026" (vendor/independent
  mix — codewithseb.com, digitalapplied.com); "'screaming architecture'
  OR 'domain driven' Next.js App Router folder structure 2026"
  (groovyweb.co, medium.com/@farzaneh.haddadi, Klickbee's
  "feature-driven-architecture" repo — all structurally identical to
  the recommended hybrid); "'feature-sliced design' vs 'bulletproof
  react' 2026 comparison which is more popular" (single-source Medium
  opinion, low-confidence, treated as weak color only).
- `eslint-plugin-boundaries`: GitHub Releases API (primary, fetched
  2026-08-10) — v7.2.0 published 2026-08-09; npm registry `/latest` +
  shields.io download badge (primary/vendor, fetched 2026-08-10) —
  ~1.53M weekly downloads (week of Aug 2-8, 2026); README quick-start
  (primary-docs) — flat-config `eslint >=6.0.0` peer dependency;
  jsboundaries.dev docs (primary-docs) — `dependencies`/`no-private`
  rule semantics, current documentation site (rebranded 2026, package
  name unchanged). eslint.org blog "ESLint v10.0.0 released"
  (independent, fetched 2026-08-10) — confirms ESLint 9 EOL 2026-08-06
  and v10's flat-config-only requirement.
- `eslint-plugin-import-x`: npm registry `/latest` (primary, fetched
  2026-08-10) — peer dependency `eslint ^8.57.0 || ^9.0.0 || ^10.0.0`,
  confirming current ESLint 10 support as the maintained fork of the
  effectively-abandoned `eslint-plugin-import`.
