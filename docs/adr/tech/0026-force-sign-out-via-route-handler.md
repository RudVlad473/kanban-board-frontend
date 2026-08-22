# 0026 — Forced sign-out clears the session cookie via a Route Handler, not inline during RSC render

## Decision Drivers

- Plan `02.2-08` (Phase 02.2, migrating `server-client.integration.test.ts` off a `next/headers`
  mock onto a real Playwright e2e test) surfaced a previously-undetected production bug: the mocked
  version of this test only ever exercised `externalApi`'s `onResponse` middleware through a fake
  in-memory cookie jar with no real Next.js request-scope restrictions, so it never caught that the
  middleware's forced-sign-out path cannot actually run where it's invoked from.
- `loadBoards()` (`src/features/boards/server/load-boards.ts`) is called from `SidebarBoards`, an
  async Server Component streamed inside `<Suspense>` in `app/(dashboard)/layout.tsx`. When the
  bridged upstream call it makes gets refused (a 401 meaning the `jsessionId` credential embedded in
  an otherwise-still-valid JWT is dead), `onResponse` (`src/lib/server/server-client.ts`) calls
  `await session.destroy()` — a `next/headers` `cookies().delete()` call. Next.js throws "Cookies
  can only be modified in a Server Action or Route Handler" from this context: cookie mutation is
  illegal during **any** Server Component render, not merely once streaming has begun (confirmed
  against both `next dev` and `next build && next start`, the real e2e target, and against the
  official Next.js docs: "setting cookies is not directly supported during Server Component
  rendering; modifications must be performed by invoking a Server Function from the client, or
  using a Route Handler").
- The consequence is worse than a stale cookie: because the cookie is never actually cleared,
  `redirect(ROUTE.SIGN_IN)` sends the browser to `/login`, but `proxy.ts`'s own JWT check
  (`session.verifyToken`, local-only — see `docs/adr/tech/0019`) still finds the JWT locally valid
  and immediately bounces the browser back to `/boards`. Confirmed via Playwright trace logs
  showing `/boards` ⇄ `/login` navigation churn until timeout. A real user with a dead upstream
  credential would be stuck in this loop until the JWT's natural 7-day expiry, not signed out.
- Threat model impact: `T-02.2-37` ("dead upstream credential still rendering board data",
  severity high) only partially holds — no board data ever renders during the loop, so there is no
  direct data leak — but the "force a full sign-out" guarantee the code's own comments claim
  (GC-18, T-01-52, T-01-53) does not actually hold for this call path, and the redirect-loop
  symptom is a real defect independent of the security framing.

## Considered Options

**Option 1 — chosen: redirect through a Route Handler that legally clears the cookie.**
`onResponse` keeps its existing, free detection (it already runs as part of the real bridged API
call — no new request needed) but stops calling `session.destroy()` inline. Instead it redirects to
a new Route Handler (`app/api/session/force-sign-out/route.ts`), which — because Route Handlers are
one of the two contexts Next.js allows cookie mutation in — legally destroys the session cookie,
then issues its own redirect to `/login`. `proxy.ts`'s subsequent check on that `/login` navigation
now sees no session cookie at all, so the bounce-back never fires and the loop is closed.
- Pros: fully closes the redirect loop; adds no new per-navigation cost (detection is unchanged,
  still piggy-backed on a real API call that was going to happen anyway); no new client-side code;
  matches a workaround independently proposed in a maintainer discussion of the identical problem
  in the Lucia auth library (`lucia-auth/lucia#1540`) — "using a route handler as an intermediary."
- Cons: one extra hop (redirect → Route Handler → redirect) versus a hypothetical single-hop fix,
  invisible to the end user (both hops are server-side 30x redirects before any paint).

**Option 2 — middleware (`proxy.ts`) makes its own upstream liveness check on every protected
navigation.** `proxy.ts` currently does zero network calls (local JWT verification only, per
`docs/adr/tech/0019`'s "optimisation only" framing). Making it independently re-verify the
`jsessionId` against the real backend on every protected-route navigation would duplicate the
bridging check `server-client.ts` already performs for free on the actual data call, adding a
real, unconditional latency and backend-load cost to navigations that would have succeeded anyway.
Rejected: the cost applies to every navigation, not just the failure case Option 1 targets for free.

**Option 3 — client-triggered Server Action.** The RSC still can't destroy the cookie, but instead
of redirecting server-side it renders a small Client Component that, on mount, invokes a real
Server Action (`forceSignOutAction()`) — a genuine client→server Action dispatch, which is legally
permitted to mutate cookies. Functionally similar to Option 1 (both introduce a legal-context hop),
but requires new client-side plumbing (a mount-effect trigger) and produces a brief visible
"session dead" flash before the client-side effect fires, where Option 1's extra hop is a
transparent server-side redirect. Rejected in favor of Option 1 for being the heavier of two
functionally-equivalent fixes — no correctness advantage, strictly more moving parts.

**Option 4 — accept and defer.** Keep the try/catch already applied around `session.destroy()`
(prevents the destroy failure from swallowing the `redirect()` call entirely) and ship without
closing the loop, tracking it as a follow-up. This is the pattern both the official Next.js
`verifySession()` reference implementation and the Lucia maintainer's own fix for the identical
problem actually use — neither destroys the cookie inline; both just redirect. Considered
seriously because it matches real precedent, not dismissed as invalid — but rejected here because,
unlike those reference cases, this app's `proxy.ts` re-validates the *same* JWT that never got
invalidated, so "just redirect" does not stop the loop the way it does in a simpler
verify-then-redirect architecture with no local/upstream credential split. Deferring would ship a
known, user-facing redirect-loop bug when a same-effort fix (Option 1) was available.

## Decision Outcome

Chosen: **Option 1.** `externalApi`'s `onResponse` middleware (`src/lib/server/server-client.ts`)
no longer calls `session.destroy()` itself; on a forced-sign-out-eligible 401 it instead
`redirect()`s to a new Route Handler, `app/api/session/force-sign-out/route.ts`. That Route
Handler:

1. Checks the `Sec-Fetch-Site` request header and rejects (403, session left intact) anything
   other than `same-origin` — this route is otherwise a plain, unauthenticated `GET` that any
   page can navigate a signed-in visitor to, and the session cookie is `SameSite=Lax`, so without
   this check a cross-site page could force a real user's session to be destroyed (logout CSRF).
   `Sec-Fetch-Site` is set by the browser itself and cannot be spoofed by the requesting page; only
   the internal same-origin redirect this handler exists for produces `same-origin`. This is what
   actually enforces "reachable only via the genuine originating 401 condition" — the property this
   record's "one narrow, justified exception" framing (Consequences, below) depends on but did not
   originally mechanize.
2. Calls `session.destroy()` (legal here — Route Handlers are an explicitly permitted cookie-write
   context).
3. Redirects to `ROUTE.SIGN_IN` via `NextResponse.redirect`. There is no caller-supplied
   destination — the handler always redirects to `ROUTE.SIGN_IN`. An earlier version of the
   handler (and this record's original text) described a `redirect` query-param/allowlist
   mechanism for a caller-chosen destination, but `onResponse`'s one production call site never
   actually passed one, so that branch was unreachable dead code; it has been removed rather than
   wired up for a caller that doesn't exist.

`proxy.ts`'s existing matcher already excludes `/api/**` from its own gating (see its own comment:
"Excludes the BFF's own API routes — they authenticate themselves"), so this new handler does not
recurse through the proxy's own redirect logic. No change to `proxy.ts` itself is needed for this
decision — it continues to do local-only JWT verification, unchanged, per `docs/adr/tech/0019`.

This does not change the DAL/RSC authorization model `docs/adr/tech/0019` established:
`verifySession()` remains the authoritative per-request check every protected server entry point
makes on its own authority; this decision only fixes *where* a forced-sign-out's cookie mutation is
legally allowed to happen, not who is allowed to decide one is needed.

## Consequences

- `e2e/session-bridge.e2e.spec.ts`'s `SESSION-01` case (plan `02.2-08`) can now assert what it
  originally intended to prove: after a forged/dead-credential response, the session cookie is
  actually absent afterward, not merely that a redirect was attempted.
- One new Route Handler exists (`app/api/session/force-sign-out/route.ts`) — the one narrow,
  ADR-justified exception to `docs/adr/tech/0019`'s Route-Handler ban, scoped specifically to the
  one operation (cookie mutation triggered from non-Action server code) that ADR's own RSC-read /
  Server-Action-write split has no legal answer for otherwise.
- `server-client.ts`'s `onResponse` gets one hop simpler in one sense (no longer calls
  `session.destroy()` itself) and one hop more complex in another (redirects to an intermediary
  instead of the final destination directly).
- The `Sec-Fetch-Site` guard is covered by `e2e/session-bridge.e2e.spec.ts`'s `SESSION-03` cases:
  a cross-site header and an absent header both leave the session cookie intact (403, no
  destroy), while `same-origin` still destroys it and redirects to `ROUTE.SIGN_IN` exactly as
  before the guard was added.

Unwind trigger: if Next.js ever allows cookie mutation from Server Component render context (no
such change is currently planned or proposed upstream), this Route Handler indirection becomes
unnecessary and `onResponse` can destroy the cookie inline again. A future revisit belongs to a new
record, not this one.

**Enforcement:** code review — no automated check exists for "a forced-sign-out response actually
clears the cookie" beyond `e2e/session-bridge.e2e.spec.ts`'s `SESSION-01` assertion itself.

Sources:

- Next.js docs, `01-app/02-guides/authentication.mdx` — the official `verifySession()`/`deleteSession()`
  reference pattern (redirect-only on invalid session; cookie deletion only from an explicit
  Server Action, never inline during verification).
- Next.js docs, `01-app/03-api-reference/04-functions/cookies.mdx` — "setting cookies is not
  directly supported during Server Component rendering; modifications must be performed by
  invoking a Server Function from the client, or using a Route Handler," and "due to HTTP
  limitations that prevent setting cookies after streaming has begun, the `.set` method must be
  invoked exclusively within a Server Function or Route Handler."
- `lucia-auth/lucia` GitHub discussion #1540, "Next RSC: cookies().set() in validateRequest" — the
  maintainer's own fix for the identical problem (try/catch, skip the mutation in RSC context) and
  a community-proposed Route Handler intermediary, the pattern this record adopts.
- `vercel/next.js` GitHub issue #81570 — confirms the restriction applies even to a fully
  server-rendered component, with no canonical maintainer-stated workaround in the issue thread
  itself.
- `docs/adr/tech/0019-server-entry-points.md` — the RSC-read / Server-Action-write split and the
  Route-Handler ban this decision carves one narrow, justified exception into.
- `.planning/phases/02.2-unify-component-tests-fully-onto-storybook-stories-eliminate/02.2-08-PLAN.md`
  Task 2 — the e2e migration that surfaced this bug.
