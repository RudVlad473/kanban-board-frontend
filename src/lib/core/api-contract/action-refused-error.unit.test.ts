import { describe, expect, it } from "vitest";

import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

describe("ActionRefusedError", () => {
    it("hands the refusal back on a typed field, not through the message string", () => {
        const error = new ActionRefusedError(RESULT_STATUS.CONFLICT);

        expect(error.status).toBe(RESULT_STATUS.CONFLICT);
    });

    it("rejects a status that is not a member of RESULT_STATUS", () => {
        // @ts-expect-error -- the whole point: only a ResultStatus can be carried across the throw
        const error = new ActionRefusedError("REFRESHING");

        expect(Object.values(RESULT_STATUS)).not.toContain(error.status);
    });

    it("stays catchable as an Error, which is how onError narrows it", () => {
        const error: unknown = new ActionRefusedError(RESULT_STATUS.NOT_FOUND);

        expect(error instanceof Error).toBe(true);
        expect(error instanceof ActionRefusedError).toBe(true);
    });
});
