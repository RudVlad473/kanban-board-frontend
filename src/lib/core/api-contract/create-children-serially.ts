import { isNil } from "es-toolkit";
import type { ZodType } from "zod";

/**
 * What one fan-out produced: the children the server actually created, and the values that did not
 * land. Both halves are needed — the failures drive the retry toast, and the created children are
 * what the calling hook writes into the board entry (docs/adr/tech/0030 rule 4).
 */
export type SerialCreateOutcome<TChild> = { created: TChild[]; failedValues: string[] };

/**
 * Create one child per value, returning the children created and the values that did not land.
 *
 * Serial, never concurrent: a backend that derives a child's position from call order needs it, and
 * a refusal has to leave the children created before it in place (ADR domain/0003).
 */
export const createChildrenSerially = async <TChild>({
    values,
    valueSchema,
    createChild,
    parseChild,
}: {
    values: string[];
    valueSchema: ZodType<string>;
    createChild: (value: string) => Promise<{ data?: unknown; error?: unknown }>;
    /* Applied to each created child's body; a child the caller cannot parse counts as failed. */
    parseChild: (data: unknown) => TChild | null;
}): Promise<SerialCreateOutcome<TChild>> => {
    const created: TChild[] = [];
    const failedValues: string[] = [];

    for (const value of values) {
        const validValue = valueSchema.safeParse(value);

        if (!validValue.success) {
            failedValues.push(value);
            continue;
        }

        const { data, error } = await createChild(validValue.data);

        if (!isNil(error)) {
            failedValues.push(value);
            continue;
        }

        /*
         * Parsed, never cast: the contract declares no `required` array, so a cast would be a claim
         * about the response rather than a fact (docs/adr/tech/0024). A body this caller cannot
         * parse is reported as failed — the child may exist upstream, but nothing here can name it.
         */
        const child = parseChild(data);

        if (child === null) {
            failedValues.push(value);
            continue;
        }

        created.push(child);
    }

    return { created, failedValues };
};
