/*
 * Registers @testing-library/jest-dom's matchers once per jsdom "unit" project test file, mirroring
 * vitest.setup.ts's role — kept separate since "unit" has no CSS/globals.css to load.
 */
import "@testing-library/jest-dom/vitest";

import { TextDecoder, TextEncoder } from "node:util";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/*
 * Works around a jsdom multi-realm gap: jsdom's own `Uint8Array` intrinsic fails `jose`'s strict
 * `instanceof Uint8Array` check on JWT payload bytes unless every intrinsic here is repointed at
 * Node's real classes (see 01-33-SUMMARY.md's Testing Infrastructure Notes).
 */
const realUint8Array = new TextEncoder().encode("").constructor as unknown as typeof Uint8Array;
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
globalThis.Uint8Array = realUint8Array;

/*
 * RTL's automatic afterEach-cleanup only self-registers with a global `afterEach`; this project
 * imports `afterEach` explicitly per test file, so nothing calls it unless registered here.
 */
afterEach(cleanup);
