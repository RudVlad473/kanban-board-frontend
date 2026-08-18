import { setupWorker, type SetupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * Registers a handler-less browser MSW worker's start/reset/stop lifecycle against the calling
 * test file and returns the worker, so the caller still registers its own per-test handlers via
 * `worker.use(...)`. Must be called at a test file's top level (not inside a test body or a
 * `describe` callback) — it registers `beforeAll`/`afterEach`/`afterAll` hooks at call time, and
 * calling it from inside a test body would register those hooks too late for Vitest to run them.
 *
 * A test-local worker is created here rather than reusing `src/lib/mocks/browser.ts`'s shared
 * singleton, because that singleton's handlers (`src/lib/mocks/handlers.ts`) reach
 * `src/lib/mocks/store.ts`, which imports `node:fs`/`node:os`/`node:crypto` — Node builtins a real
 * browser test page cannot load (Vite externalizes them and the import throws at test-file load).
 *
 * @example
 * const worker = setupMswWorker();
 *
 * it("does something", async () => {
 *     worker.use(http.post("/api/some-path", () => HttpResponse.json({ ok: true })));
 *     // ...
 * });
 */
export const setupMswWorker = (): SetupWorker => {
    const worker = setupWorker();

    beforeAll(async () => {
        await worker.start({ onUnhandledRequest: "bypass" });
    });
    afterEach(() => {
        worker.resetHandlers();
    });
    afterAll(() => {
        worker.stop();
    });

    return worker;
};
