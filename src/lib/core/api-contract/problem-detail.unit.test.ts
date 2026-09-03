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
     * `errors` is a side channel; `code` is what every caller branches on. Dropping a malformed map
     * keeps a specific backend error specific, where failing the whole parse would silently
     * downgrade it to INTERNAL_ERROR at the one moment the real code matters.
     */
    it.each([
        { name: "values that are not strings", errors: { email: 42 } },
        { name: "a non-object", errors: "must not be blank" },
        { name: "an array", errors: ["must not be blank"] },
    ])("drops a malformed errors map ($name) but still parses the problem", ({ errors }) => {
        // Arrange
        const body: unknown = { ...VALID_PROBLEM_DETAIL, code: PROBLEM_CODE.VALIDATION_FAILED, errors };

        // Act
        const result = parseProblemDetail(body);

        // Assert
        expect(result?.code).toBe(PROBLEM_CODE.VALIDATION_FAILED);
        expect(result?.errors).toBeUndefined();
    });

    /*
     * The literal 409 body the real backend answered a stale-version board update with
     * (02-BACKEND-FACTS.md P3) — quoted verbatim so the enum entry is pinned to an observation.
     */
    it("parses the optimistic-lock conflict body the backend returns for a stale version", () => {
        // Arrange
        const body: unknown = {
            type: "about:blank",
            title: "Conflict",
            status: 409,
            detail: "Board was modified by another request, please refetch.",
            instance: "/api/boards/8okxhwo6oq2o",
            code: "OPTIMISTIC_LOCK_CONFLICT",
        };

        // Act
        const result = parseProblemDetail(body);

        // Assert
        expect(result).not.toBeNull();
        expect(result?.code).toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
        expect(result?.status).toBe(409);
    });

    /*
     * T6: the double-delete body a real 404 carries, quoted verbatim so the enum entry is pinned to
     * an observation (04-BACKEND-FACTS.md T6).
     */
    it("parses the entity-not-found body the backend returns for a missing or already-deleted entity", () => {
        // Arrange
        const body: unknown = {
            type: "about:blank",
            title: "Not Found",
            status: 404,
            detail: "Task was not found",
            instance: "/api/boards/8okxhwo6oq2o/columns/8okxhwo6oq2p/tasks/8okxhwo6oq2q",
            code: "ENTITY_NOT_FOUND",
        };

        // Act
        const result = parseProblemDetail(body);

        // Assert
        expect(result).not.toBeNull();
        expect(result?.code).toBe(PROBLEM_CODE.ENTITY_NOT_FOUND);
        expect(result?.status).toBe(404);
    });

    /*
     * Parametrised over the rejection-case families rather than a near-identical `it()`
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
