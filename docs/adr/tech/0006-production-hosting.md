# 0006 — Production hosting / deployment target

## Decision Drivers

- "Deployed and verified in prod" was explicitly required, even though
  no backend is deployed anywhere yet.
- Server-side auth route-guarding (ADR 0001) requires genuine Next.js
  middleware/server-execution support, not just static hosting.
- Solo developer — budget-consciousness and near-zero ops overhead
  matter; no ops team, no stated infra budget.
- Preview deployments per branch and easy per-environment API-base-URL
  swapping matter for iterating alone against a mock now, a real backend
  later.

## Considered Options

**Vercel** (recommended)
- Pros: first-party, zero-caveat SSR/middleware support (the reference
  platform Next.js is built against); automatic per-branch preview
  deployments; trivial per-environment env var management; free Hobby
  tier confirmed to have no overage billing — hitting a limit pauses the
  project rather than charging a card, per Vercel's own docs.
- Cons: Hobby tier is explicitly non-commercial-only; becomes a real
  constraint the moment the app monetizes (Pro, $20/mo).

**Netlify**
- Pros: comparable budget/ops fit and preview-deployment support to
  Vercel.
- Cons: Middleware runs on Netlify Edge Functions with headers/redirects
  evaluated *after* middleware — a subtle behavioral difference from
  stock Next.js that could affect the auth-redirect flow specifically.
- Why not the recommendation: a real, if narrow, risk to the one
  functional requirement (route-guarding) this decision most needs to
  get right.

**Cloudflare Workers (`@opennextjs/cloudflare`)**
- Pros: adapter reached 1.0 GA in Feb 2026, supports App Router/
  Middleware/streaming.
- Cons: free tier's 10ms CPU-time-per-invocation cap is tight for SSR;
  at least one (unverified against Cloudflare's own docs) source flags a
  possible `cookies()` API gap inside `middleware.ts` — directly
  relevant to the cookie-based auth guard from ADR 0001.
- Why not the recommendation: an unverified compatibility risk against
  the exact mechanism ADR 0001 depends on is too much uncertainty for
  the primary hosting decision.

**Self-hosted Docker on a VPS**
- Pros: perfect fidelity to upstream Next.js behavior (it's literally
  the Node server via `output: "standalone"`); no vendor lock-in.
- Cons: no free tier; the solo developer personally owns
  Docker/Nginx/SSL/patching; no native per-branch preview mechanism at
  all.
- Why not the recommendation: trades away nearly every stated driver
  (budget, ops overhead, preview deploys) for fidelity this project
  doesn't need, since Vercel already has zero-caveat SSR support.

## Decision Outcome

Chosen: **Vercel**. Confirmed by the user at Phase 4's walkthrough, after
a clarifying question about surprise billing risk (verified directly
against Vercel's current docs: the free Hobby tier pauses rather than
bills on hitting a limit, with no card required) — user: "yes."

## Consequences

Unwind trigger: the app moves past Vercel Hobby's non-commercial
restriction and Pro's cost/limits no longer fit, or the backend's own
hosting constraints force co-location elsewhere → re-evaluate against
Netlify or self-hosting.

Sources:
- https://vercel.com/docs/limits — fetched 2026-08-09 and re-verified
  2026-08-09 (primary-docs, last_updated 2026-08-03).
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
  and /workers/platform/pricing/ — fetched 2026-08-09 (primary-docs).
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
  and .../legacy-runtime/middleware/ — referenced 2026-08-09
  (primary-docs, via search synthesis).
- https://rickylaikhuram.medium.com/hosting-next-js-on-cloudflare-workers-using-opennext-9a72170fea7f
  — fetched 2026-08-09 (independent, unverified claim flagged in the
  decision).
- https://www.promptstoproduct.com/vercel-pricing-explained and
  https://www.pandacodegen.com/blog/nextjs-hosting-zero-cost — fetched
  2026-08-09 (independent): confirm Hobby has no overage billing
  mechanism, pauses instead.
