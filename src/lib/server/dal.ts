import "server-only";

import { cache } from "react";

import { session, type SessionRecord } from "@/lib/server/session";

/*
 * DAL = Data Access Layer — Next.js App Router's own documented auth-pattern term (ADR
 * tech/0001); this file is the authoritative, server-only session-verification checkpoint.
 */

/**
 * The authoritative "who is this" check (T-01-05) — every protected server entry point must call
 * this for itself rather than trust `proxy.ts`'s guard, which is optimisation only, not the
 * authoritative check (CVE-2025-29927; see docs/adr/tech/0019). `cache`-wrapped so one render calls it once.
 */
export const verifySession = cache(async (): Promise<SessionRecord | null> => session.verify());
