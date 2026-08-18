import { describe, expect, it } from "vitest";

import { parseProblemDetail, PROBLEM_CODE } from "./problem-detail";

const VALID_PROBLEM_DETAIL = {
    type: "about:blank",
    title: "Unauthorized",
    status: 401,
    detail: "Bad credentials.",
    instance: "/api/signin",
    code: PROBLEM_CODE.BAD_CREDENTIALS,
};

describe("parseProblemDetail", () => {
    it("parses a well-formed problem response body into a typed value carrying its named code", () => {
        // Arrange
        const body: unknown = VALID_PROBLEM_DETAIL;

        // Act
        const result = parseProblemDetail(body);

        // Assert
        expect(result).toEqual(VALID_PROBLEM_DETAIL);
        expect(result?.code).toBe(PROBLEM_CODE.BAD_CREDENTIALS);
    });

    it("carries the optional per-field errors map when the body is a validation failure", () => {
        // Arrange
        const body: unknown = {
            ...VALID_PROBLEM_DETAIL,
            code: PROBLEM_CODE.VALIDATION_FAILED,
            errors: { email: "must not be blank" },
        };

        // Act
        const result = parseProblemDetail(body);

        // Assert
        expect(result?.errors).toEqual({ email: "must not be blank" });
    });

    /*
     * Parametrised over the rejection-case families (D-26y) rather than a near-identical `it()`
     * per shape — each case isolates exactly one reason a value is not a well-formed problem
     * response.
     */
    const rejectedCases: { description: string; value: unknown }[] = [
        { description: "a plain string", value: "Something went wrong." },
        { description: "null", value: null },
        { description: "undefined", value: undefined },
        { description: "an object with no code at all", value: { ...VALID_PROBLEM_DETAIL, code: undefined } },
        {
            description: "an object whose code is not one the backend defines",
            value: { ...VALID_PROBLEM_DETAIL, code: "SOMETHING_MADE_UP" },
        },
        { description: "an object missing the title field", value: { ...VALID_PROBLEM_DETAIL, title: undefined } },
        { description: "an object missing the status field", value: { ...VALID_PROBLEM_DETAIL, status: undefined } },
        { description: "a bare number", value: 401 },
        { description: "an array", value: [VALID_PROBLEM_DETAIL] },
    ];

    for (const { description, value } of rejectedCases) {
        it(`parses to null rather than a half-populated value for ${description}`, () => {
            // Act
            const result = parseProblemDetail(value);

            // Assert
            expect(result).toBeNull();
        });
    }

    it("never throws for any of the rejection cases", () => {
        // Act + Assert
        for (const { value } of rejectedCases) {
            expect(() => parseProblemDetail(value)).not.toThrow();
        }
    });
});
