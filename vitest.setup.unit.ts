/*
 * Registers @testing-library/jest-dom's matchers (toBeDisabled, toHaveAccessibleName, etc.)
 * once for every jsdom "unit" project test file. Mirrors vitest.setup.ts's role for the
 * "browser" project — kept as a separate file since the "unit" project has no CSS/globals.css
 * dependency to load (jsdom doesn't paint layout, so there is nothing for it to consume).
 */
import "@testing-library/jest-dom/vitest";

import { TextDecoder, TextEncoder } from "node:util";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/*
 * jsdom runs test code inside its own `vm` realm, which has its own `Uint8Array` intrinsic —
 * distinct from (though same-named as) the one every Node built-in, including `node:util`'s own
 * `TextEncoder`, actually produces (a known jsdom multi-realm gap — plan 01-33, found writing
 * `auth-actions.unit.test.ts`). `jose`'s `SignJWT.sign()` (called through the real, unmocked
 * `session.ts` this project's auth-action tests exercise) performs a strict `instanceof Uint8Array`
 * check on the payload bytes it builds internally and throws "payload must be an instance of
 * Uint8Array" once that payload comes from the wrong realm's constructor. Swapping
 * `globalThis.TextEncoder`/`TextDecoder` for Node's own implementations is necessary but not
 * sufficient on its own — those still construct bytes belonging to Node's *real* `Uint8Array`,
 * which then fails `instanceof` against jsdom's *own* `globalThis.Uint8Array`. Repointing
 * `globalThis.Uint8Array` at that same real class (captured directly off a real `TextEncoder`
 * output, not assumed from any Node API surface) closes the gap at its source, for every module
 * in this project's dependency graph, rather than working around it at each call site.
 */
const realUint8Array = new TextEncoder().encode("").constructor as unknown as typeof Uint8Array;
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
globalThis.Uint8Array = realUint8Array;

/*
 * RTL's automatic afterEach-cleanup only self-registers when it detects a global `afterEach`
 * (e.g. Jest, or Vitest with test.globals: true). This project imports `afterEach` explicitly
 * per test file instead (matching the "browser" project's style), so nothing calls it —
 * unmounted DOM from a prior test leaks into the next one unless registered here explicitly.
 */
afterEach(cleanup);
