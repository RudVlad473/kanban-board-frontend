import type { Page, Response } from "@playwright/test";

// comment-length-exempt: records the race this exists to close, the wire shape it keys off, and the ordering rule that makes it work — all three are needed to use it correctly and none is readable from the code (docs/adr/tech/0023)
/*
 * The settle-wait for an OPTIMISTIC mutation. A spec that asserts an optimistically-applied
 * value and then reloads is reading the server, but nothing in the optimistic assertion says the
 * write ever left the browser — so under contention the reload outruns the in-flight Server Action
 * and reads stale state. Measured 2026-08-27: `boards-rename` failed twice in fifteen runs at
 * `--workers=2` on exactly that, reverting to the pre-rename name after the reload.
 *
 * A Next.js Server Action is one POST to the current URL carrying a `next-action` request header,
 * and its response arrives only after the upstream write AND the `refresh()` re-render, so the
 * response is proof the write is durable. Deliberately not a timer: this file's callers already
 * wait on structural signals for drag state, and a timer here would be the same defect one layer
 * down.
 *
 * MUST be called BEFORE the click that triggers the action — a wait created afterwards races the
 * response it is waiting for.
 *
 * Resolves on the response HEAD, deliberately: `response.finished()` waits for the streamed
 * `refresh()` payload to close and was measured 2026-08-27 to hang past the 30s test timeout on
 * `columns-rename`. The head is already sufficient — the action awaits its upstream write before
 * responding at all, so a status line means the write is durable. The server logging
 * "destination stream closed early" when the reload abandons that payload is cosmetic.
 */
export const createServerActionSettled = (page: Page): Promise<Response> =>
    page.waitForResponse(
        (response) => response.request().method() === "POST" && "next-action" in response.request().headers(),
    );
