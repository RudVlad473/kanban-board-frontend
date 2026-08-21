import { beforeEach, describe } from "vitest";
import { page } from "vitest/browser";

import { DEVICE_TYPE, VIEWPORT_SIZES, type DeviceType } from "@/lib/core/viewport/viewport-breakpoints";

/**
 * Runs a suite's entire body once per `DeviceType`, resizing the real Vitest Browser Mode test
 * iframe (`page.viewport`) first — a blanket regression net, never selectively applied to
 * hand-picked assertions (docs/adr/tech/0014). Callers write `it()` blocks exactly once.
 */
export const describeForEachDevice = ({ name, body }: { name: string; body: (device: DeviceType) => void }) => {
    describe.each(Object.values(DEVICE_TYPE))(`${name} (%s)`, (device) => {
        beforeEach(async () => {
            const { width, height } = VIEWPORT_SIZES[device];
            await page.viewport(width, height);
        });

        body(device);
    });
};
