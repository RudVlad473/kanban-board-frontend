import { z, type ZodError } from "zod";

/*
 * Copy sourced from 01-UI-SPEC.md's Copywriting Contract, shared verbatim by these server
 * schemas and the React Hook Form resolvers in plan 01-12 so both sides can never drift apart.
 * The password and display-name rules below are read directly from the real backend's own Bean
 * Validation annotations (.planning/HANDOFF.json's `decisions` array, GC-02) — not re-derived.
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const EMAIL_FORMAT_MESSAGE = "Enter a valid email address.";
const PASSWORD_LENGTH_MESSAGE = "Password must be between 8 and 64 characters.";
const PASSWORD_COMPLEXITY_MESSAGE =
    "Password must include an uppercase letter, a lowercase letter, a number, and a special character.";
const DISPLAY_NAME_LENGTH_MESSAGE = "Name must be between 3 and 32 characters.";
const DISPLAY_NAME_CHARSET_MESSAGE = "Name can only contain letters and spaces.";

/*
 * A blank or whitespace-only Name field is a valid "no name supplied" input, not an invalid short
 * one — the backend allows omitting `displayName` entirely (GC-02, resolved 2026-08-16). Run
 * before the length/charset constraint chain so an untouched form field never trips them.
 *
 * Written as `.optional().transform().pipe()` rather than `z.preprocess()`: preprocess's raw
 * argument type is always `unknown`, which makes the schema's *input* type `displayName?: unknown`
 * instead of `displayName?: string`. react-hook-form's `useForm<SignUpInput>` expects the resolver's
 * field-values type (the schema's input type) to equal `SignUpInput` (the schema's output type) —
 * true for every other field here, since none of them transform — so `preprocess` alone broke that
 * equality and `zodResolver`'s inferred type stopped matching `useForm`'s. `.optional()` keeps the
 * input type as `string | undefined` (matching the output), and `.transform()` (unlike
 * `preprocess`) preserves its source schema's input type rather than widening it to `unknown`.
 */
export const signUpSchema = z.object({
    displayName: z
        .string()
        .optional()
        .transform((value) => (value === undefined || value.trim() === "" ? undefined : value))
        .pipe(
            z
                .string()
                .min(3, DISPLAY_NAME_LENGTH_MESSAGE)
                .max(32, DISPLAY_NAME_LENGTH_MESSAGE)
                /*
                 * Unicode letters and spaces only — HANDOFF.json's "letters and spaces" read as any
                 * Unicode letter, not ASCII-only (flagged assumption, see the plan's rationale).
                 */
                .regex(/^[\p{L}\s]+$/u, DISPLAY_NAME_CHARSET_MESSAGE)
                .optional(),
        ),
    email: z.string().min(1, REQUIRED_FIELD_MESSAGE).pipe(z.email(EMAIL_FORMAT_MESSAGE)),
    /*
     * Four distinct character-class checks (not one combined regex) so a future rule change can
     * differentiate them individually — they all carry the same complexity message today, and
     * `zodErrorToFieldErrors` below collapses a field's issues to the first one, so `.min`/`.max`
     * (the length range) are chained first: an out-of-range password always reports the length
     * message even when it also fails a character class, matching the backend's own precedence.
     */
    password: z
        .string()
        .min(1, REQUIRED_FIELD_MESSAGE)
        .min(8, PASSWORD_LENGTH_MESSAGE)
        .max(64, PASSWORD_LENGTH_MESSAGE)
        .regex(/[A-Z]/, PASSWORD_COMPLEXITY_MESSAGE)
        .regex(/[a-z]/, PASSWORD_COMPLEXITY_MESSAGE)
        .regex(/[0-9]/, PASSWORD_COMPLEXITY_MESSAGE)
        /*
         * "Special" is read as any non-letter, non-digit character — the conventional, more
         * permissive reading (flagged assumption; see the plan's rationale).
         */
        .regex(/[^a-zA-Z0-9]/, PASSWORD_COMPLEXITY_MESSAGE),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
    email: z.string().min(1, REQUIRED_FIELD_MESSAGE).pipe(z.email(EMAIL_FORMAT_MESSAGE)),
    password: z.string().min(1, REQUIRED_FIELD_MESSAGE),
});

export type SignInInput = z.infer<typeof signInSchema>;

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
