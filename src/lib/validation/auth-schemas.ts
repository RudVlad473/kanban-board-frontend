import { z, type ZodError } from "zod";

/*
 * Copy sourced from 01-UI-SPEC.md's Copywriting Contract, shared verbatim by these server
 * schemas and the React Hook Form resolvers in plan 01-12 so both sides can never drift apart.
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const EMAIL_FORMAT_MESSAGE = "Enter a valid email address.";
const PASSWORD_LENGTH_MESSAGE = "Password must be at least 8 characters.";

export const signUpSchema = z.object({
    displayName: z.string().min(1, REQUIRED_FIELD_MESSAGE),
    email: z.string().min(1, REQUIRED_FIELD_MESSAGE).pipe(z.email(EMAIL_FORMAT_MESSAGE)),
    password: z.string().min(1, REQUIRED_FIELD_MESSAGE).min(8, PASSWORD_LENGTH_MESSAGE),
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
