import { beforeEach, describe } from "vitest";
import { page } from "vitest/browser";

import { DEVICE_TYPE, VIEWPORT_SIZES, type DeviceType } from "@/lib/viewport-breakpoints";

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
export const describeForEachDevice = (name: string, body: (device: DeviceType) => void) => {
    describe.each(Object.values(DEVICE_TYPE))(`${name} (%s)`, (device) => {
        beforeEach(async () => {
            const { width, height } = VIEWPORT_SIZES[device];
            await page.viewport(width, height);
        });

        body(device);
    });
};
