import type { ZodError } from "zod";

/**
 * Maps a validation failure to `{ field: message }`, one message per field (the first issue
 * found for that field) — never echoes the received value back, only the field name and message.
 */
export const zodErrorToFieldErrors = (error: ZodError): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};

    for (const issue of error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in fieldErrors)) {
            fieldErrors[field] = issue.message;
        }
    }

    return fieldErrors;
};
