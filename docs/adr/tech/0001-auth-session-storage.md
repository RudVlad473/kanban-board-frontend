# 0001 — Auth session storage & handling

## Decision Drivers

- Route-level auth gating is a hard functional requirement: an
  unauthenticated visitor hitting a board route must be redirected
  server-side, before any board data is requested (HIGH-LEVEL-
  ARCHITECTURE.md's flow spine, stage 11 `route-guard`).
- This is a real production app handling real user credentials, with no
  compliance program to fall back on — XSS exposure is a first-order
  concern, not a formality.
- The backend's auth response shape is genuinely ambiguous: `POST
  /signup` returns a bare undocumented string, `POST /signin` returns
  200 with no documented body at all.
- No backend is deployed yet — the mechanism chosen has to survive a
  possible later clarification of what the backend actually intends
  without a full rewrite.

## Considered Options

**httpOnly cookie via a Next.js Route Handler (BFF proxy)** (recommended)
- Pros: the only option that lets a server-side Data Access Layer verify
  a session via `cookies()` before rendering board data, satisfying the
  route-guard requirement outright; matches Next.js's own documented
  authentication pattern; the proxy absorbs the backend's ambiguous
  response shape behind one boundary instead of leaking it into client
  code.
- Cons: the most upfront work of the three — requires writing the proxy,
  choosing a session library (e.g. `jose`/`iron-session`), and
  signing/encrypting the session cookie, since the external API's
  responses can't just be forwarded as-is.

**Bearer token in memory only (React context)**
- Pros: no cookie infrastructure to build.
- Cons: memory is a client-only JS value — a fresh SSR request (direct
  nav, hard refresh, new tab) has no memory to read, so the server
  cannot redirect before rendering board data without a second,
  persisted signal, at which point it stops being "in-memory only."
- Why not the recommendation: fails the route-guard requirement outright
  under the most common navigation patterns.

**Bearer token in localStorage/sessionStorage**
- Pros: fastest to hack together.
- Cons: any credential in `localStorage`/`sessionStorage` is readable by
  any script on the origin — OWASP's Session Management Cheat Sheet
  names this the most common real-world auth mistake; one XSS bug (own
  code or a dependency) discloses every open session.
- Why not the recommendation: unacceptable XSS exposure for a production
  app with real credentials and no compensating control.

## Decision Outcome

Chosen: **httpOnly cookie via a Next.js Route Handler acting as a BFF
proxy**. Confirmed by the user at Phase 4's walkthrough: "accept
recommendation."

## Consequences

Unwind trigger: the backend's actual auth mechanism, once clarified or
deployed, turns out to be incompatible with a cookie-based session (e.g.
it only ever issues short-lived bearer tokens with no way to set a
cookie) → revisit this decision and the proxy's implementation.

Sources:
- https://nextjs.org/docs/app/guides/authentication — fetched 2026-08-09
  (primary-docs, v16.3.0, lastUpdated 2026-08-07): recommends httpOnly/
  Secure/SameSite=lax cookies via `cookies()`, a Data Access Layer, and
  Proxy/middleware only for optimistic pre-checks.
- https://workos.com/blog/nextjs-app-router-authentication-guide-2026 —
  fetched 2026-08-09 (vendor, dated 2026-02-17): defense-in-depth
  (middleware + DAL, never middleware-only per CVE-2025-29927); warns
  against bearer tokens in localStorage.
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  — fetched 2026-08-09 (independent): "Do not store authentication
  tokens... in localStorage or sessionStorage."
- https://auth0.com/docs/secure/security-guidance/data-security/token-storage
  — fetched 2026-08-09 (vendor): recommends server-side encrypted
  session cookies for apps with a backend tier.
