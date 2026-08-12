import "server-only";

import { cache } from "react";

import { session, type SessionPayload } from "@/lib/session";

/**
 * The authoritative "who is this" check (RESEARCH.md Security Domain) — every Route Handler and
 * protected Server Component must call this for itself rather than trusting an upstream redirect
 * (the CVE-2025-29927 class of bypass). `proxy.ts`'s route guard (plan 01-13) is an optimistic
 * pre-render check only, never the authorisation decision. Wrapped in React's `cache` so repeated
 * calls within a single server render don't re-verify the cookie more than once.
 */
export const verifySession = cache(async (): Promise<SessionPayload | null> => session.verify());
