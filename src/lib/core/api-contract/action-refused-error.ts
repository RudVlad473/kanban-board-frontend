// Covered by: `src/lib/core/api-contract/action-refused-error.unit.test.ts`

import type { ResultStatus } from "@/lib/core/api-contract/result-status";

/*
 * These Server Actions RETURN a refusal rather than throwing, so TanStack would record one as a
 * settled success and never run `onError`. Rethrowing as this carries the discriminant across
 * (docs/adr/tech/0030), on a typed field so no consumer has to cast `message` back to a status.
 */
export class ActionRefusedError extends Error {
    constructor(readonly status: ResultStatus) {
        super(status);
    }
}
