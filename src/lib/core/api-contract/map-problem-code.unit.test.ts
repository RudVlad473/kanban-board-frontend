import { describe, expect, it } from "vitest";

import { mapProblemCodeToStatus } from "./map-problem-code";
import { PROBLEM_CODE, type ProblemCode } from "./problem-detail";
import { RESULT_STATUS, type ResultStatus } from "./result-status";

/*
 * Parametrised over the whole mapping rather than an `it()` per code, styled after
 * `problem-detail.unit.test.ts` — the table IS the contract, so reading it beats reading four
 * near-identical cases.
 */
const recognisedCases: { code: ProblemCode; status: ResultStatus }[] = [
    { code: PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT, status: RESULT_STATUS.CONFLICT },
    { code: PROBLEM_CODE.DUPLICATE_RESOURCE, status: RESULT_STATUS.DUPLICATE },
    { code: PROBLEM_CODE.UNAUTHENTICATED, status: RESULT_STATUS.UNAUTHENTICATED },
    { code: PROBLEM_CODE.ACCESS_DENIED, status: RESULT_STATUS.NOT_FOUND },
    { code: PROBLEM_CODE.ENTITY_NOT_FOUND, status: RESULT_STATUS.NOT_FOUND },
];

describe("mapProblemCodeToStatus", () => {
    for (const { code, status } of recognisedCases) {
        it(`maps ${code} to ${status}`, () => {
            // Act + Assert
            expect(mapProblemCodeToStatus(code)).toBe(status);
        });
    }

    /*
     * Every code the backend defines but this mapping has nothing distinct to say about — "try
     * again" is genuinely all there is to tell the user.
     */
    const fallbackCases: { description: string; code: ProblemCode | undefined }[] = [
        { description: "a validation failure", code: PROBLEM_CODE.VALIDATION_FAILED },
        { description: "a data-integrity violation", code: PROBLEM_CODE.DATA_INTEGRITY_VIOLATION },
        { description: "bad credentials", code: PROBLEM_CODE.BAD_CREDENTIALS },
        { description: "an internal error", code: PROBLEM_CODE.INTERNAL_ERROR },
        { description: "no code at all", code: undefined },
    ];

    for (const { description, code } of fallbackCases) {
        it(`falls back to ERROR for ${description}`, () => {
            // Act + Assert
            expect(mapProblemCodeToStatus(code)).toBe(RESULT_STATUS.ERROR);
        });
    }

    /* `parseProblemDetail` returns null for an unrecognised code, so `undefined` is what arrives. */
    it("falls back to ERROR for a code the backend does not define", () => {
        // Arrange
        const madeUpCode = "SOMETHING_MADE_UP" as ProblemCode;

        // Act + Assert
        expect(mapProblemCodeToStatus(madeUpCode)).toBe(RESULT_STATUS.ERROR);
    });

    /* T-02-64: every branch resolves to a bare discriminant, never anything carrying upstream text. */
    it("returns only values declared by RESULT_STATUS, for every known code and the fallback", () => {
        // Arrange
        const declaredStatuses: string[] = Object.values(RESULT_STATUS);

        // Act + Assert
        for (const code of [...Object.values(PROBLEM_CODE), undefined]) {
            expect(declaredStatuses).toContain(mapProblemCodeToStatus(code));
        }
    });
});
