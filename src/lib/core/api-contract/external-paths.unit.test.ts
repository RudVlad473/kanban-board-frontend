import { describe, expect, it } from "vitest";

import { EXTERNAL_PATH } from "./external-paths";
import type { paths } from "./generated-types";

/*
 * Compile-time only: every EXTERNAL_PATH value must be a real key of the generated OpenAPI
 * `paths` type. A member drifting from the contract fails `tsc --noEmit`, not a runtime surprise.
 */
type ExternalPathValue = (typeof EXTERNAL_PATH)[keyof typeof EXTERNAL_PATH];
const _contractKeyAssertion: ExternalPathValue extends keyof paths ? true : never = true;
void _contractKeyAssertion;

describe("EXTERNAL_PATH", () => {
    it("has no duplicate path values", () => {
        // Arrange
        const values = Object.values(EXTERNAL_PATH);

        // Act
        const uniqueValues = new Set(values);

        // Assert
        expect(uniqueValues.size).toBe(values.length);
    });

    it("has every value starting with a forward slash", () => {
        // Arrange
        const values = Object.values(EXTERNAL_PATH);

        // Act / Assert
        for (const value of values) {
            expect(value.startsWith("/")).toBe(true);
        }
    });
});
