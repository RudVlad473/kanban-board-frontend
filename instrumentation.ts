/**
 * Next.js startup hook (file must live at the repository root, a sibling of `app/` — a copy
 * under `app/` is not picked up). Starts MSW's Node-side interception once, at server-process
 * startup, so the deployed app's own outbound calls to the external API are mocked, not just
 * calls made inside Vitest/Playwright test runs (Pattern 3, Pitfall 3, 01-RESEARCH.md).
 *
 * Gated to the Node.js runtime only, reached through a dynamic import — a static top-level
 * import would let bundlers pull MSW's Node internals into the client or edge graphs, which is
 * exactly Pitfall 5's warning sign.
 */
export const register = async () => {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { server } = await import("@/lib/mocks/node-server");

        /* CONVENTIONS.md's mock rule: an unmocked request fails rather than escaping to the network. */
        server.listen({ onUnhandledRequest: "error" });
    }
};
