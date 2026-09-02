import { isNil } from "es-toolkit";
import type { ZodType } from "zod";

/**
 * Create one child per value and return the values that did not land.
 *
 * Serial, never concurrent: a backend that derives a child's position from call order needs it, and
 * a refusal has to leave the children created before it in place (ADR domain/0003).
 */
export const createChildrenSerially = async ({
    values,
    valueSchema,
    createChild,
}: {
    values: string[];
    valueSchema: ZodType<string>;
    createChild: (value: string) => Promise<{ error?: unknown }>;
}): Promise<string[]> => {
    const failedValues: string[] = [];

    for (const value of values) {
        const validValue = valueSchema.safeParse(value);

        if (!validValue.success) {
            failedValues.push(value);
            continue;
        }

        const { error } = await createChild(validValue.data);

        if (!isNil(error)) {
            failedValues.push(value);
        }
    }

    return failedValues;
};
