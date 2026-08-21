import { z, type ZodError } from "zod";

/*
 * Every rule below mirrors the real backend's own Bean Validation rules (GC-02) — not this app's
 * invention, and not to be relaxed unilaterally (see 01-19-SUMMARY.md).
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const EMAIL_FORMAT_MESSAGE = "Enter a valid email address.";
const PASSWORD_LENGTH_MESSAGE = "Password must be between 8 and 64 characters.";
const PASSWORD_COMPLEXITY_MESSAGE =
    "Password must include an uppercase letter, a lowercase letter, a number, and a special character.";
const DISPLAY_NAME_LENGTH_MESSAGE = "Name must be between 3 and 32 characters.";
const DISPLAY_NAME_CHARSET_MESSAGE = "Name can only contain letters and spaces.";

/*
 * A blank Name is valid "no name supplied" (GC-02) — normalized before the length/charset chain.
 * `.optional().transform().pipe()`, not `z.preprocess()`, keeps the schema's input/output types
 * equal so `zodResolver`/`useForm<SignUpInput>` still match (see 01-19-SUMMARY.md).
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
     * Four separate character-class checks (not one regex) so a future rule change can
     * differentiate them — length is chained first so an out-of-range password reports that, not
     * a class failure, matching the backend's own precedence (see 01-19-SUMMARY.md).
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
