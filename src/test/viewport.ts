import { beforeEach, describe } from "vitest";
import { page } from "vitest/browser";

import { DEVICE_TYPE, VIEWPORT_SIZES, type DeviceType } from "@/lib/viewport-breakpoints";

/**
 * `src/test/` is a new sixth-ish home alongside CONVENTIONS.md's existing six (features/ui/
 * layout/hooks/lib/styles) — none of those cleanly fit shared Vitest test infrastructure that is
 * never imported by application code (only by other test files), and this file's own import of
 * `vitest/browser` would make it unusable from anywhere else anyway. Kept as a single file rather
 * than a new placement-rule category since it's the first thing to need this home.
 */

/**
 * Runs the same test body once per `DeviceType`, resizing the Vitest Browser Mode test iframe
 * (`page.viewport`, a real per-test resize — not to be confused with Storybook's own `viewport`
 * global, which only resizes a nested manager iframe that doesn't exist in this context) to that
 * device's dimensions before each `it()` inside. Callers write their `it()` blocks exactly once;
 * no test author manually writes `describe.each` or calls `page.viewport` directly.
 *
 * @example
 * describeForEachDevice("Modal padding", (device) => {
 *     it("renders the expected padding", async () => {
 *         // device is "MOBILE" | "DESKTOP" here, and the iframe is already that size.
 *     });
 * });
 */
export function describeForEachDevice(name: string, body: (device: DeviceType) => void) {
    describe.each(Object.values(DEVICE_TYPE))(`${name} (%s)`, (device) => {
        beforeEach(async () => {
            const { width, height } = VIEWPORT_SIZES[device];
            await page.viewport(width, height);
        });

        body(device);
    });
}
