import { describe, expect, it } from "vitest";

import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";

import { signInSchema, signUpSchema } from "./schemas";

const VALID_EMAIL = "user@example.com";
const VALID_PASSWORD = "Correct1Password!";

const PASSWORD_LENGTH_MESSAGE = "Password must be between 8 and 64 characters.";
const PASSWORD_COMPLEXITY_MESSAGE =
    "Password must include an uppercase letter, a lowercase letter, a number, and a special character.";
const DISPLAY_NAME_LENGTH_MESSAGE = "Name must be between 3 and 32 characters.";
const DISPLAY_NAME_CHARSET_MESSAGE = "Name can only contain letters and spaces.";

describe("signUpSchema — password", () => {
    it("accepts a password meeting every rule", () => {
        // Arrange
        const body = { email: VALID_EMAIL, password: VALID_PASSWORD };

        // Act
        const result = signUpSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(true);
    });

    /*
     * Parametrised over the rejected-password families rather than repeating
     * near-identical blocks — each case isolates exactly one rule violation.
     */
    const rejectedPasswordCases: { name: string; password: string; message: string }[] = [
        { name: "too short", password: "Ab1!Ab", message: PASSWORD_LENGTH_MESSAGE },
        { name: "too long", password: `Ab1!${"a".repeat(63)}`, message: PASSWORD_LENGTH_MESSAGE },
        { name: "missing an uppercase letter", password: "nouppercase1!", message: PASSWORD_COMPLEXITY_MESSAGE },
        { name: "missing a lowercase letter", password: "NOLOWERCASE1!", message: PASSWORD_COMPLEXITY_MESSAGE },
        { name: "missing a digit", password: "NoDigitHere!", message: PASSWORD_COMPLEXITY_MESSAGE },
        { name: "missing a special character", password: "NoSpecial123", message: PASSWORD_COMPLEXITY_MESSAGE },
    ];

    for (const { name, password, message } of rejectedPasswordCases) {
        it(`rejects a password that is ${name}, naming the ${message === PASSWORD_LENGTH_MESSAGE ? "permitted range" : "missing requirement"}`, () => {
            // Arrange
            const body = { email: VALID_EMAIL, password };

            // Act
            const result = signUpSchema.safeParse(body);

            // Assert
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(zodErrorToFieldErrors(result.error).password).toBe(message);
            }
        });
    }
});

describe("signUpSchema — displayName", () => {
    it("accepts a sign-up body with no name at all", () => {
        // Arrange
        const body = { email: VALID_EMAIL, password: VALID_PASSWORD };

        // Act
        const result = signUpSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.displayName).toBeUndefined();
        }
    });

    it("treats an empty-string name as no name rather than as an invalid one", () => {
        // Arrange
        const body = { displayName: "", email: VALID_EMAIL, password: VALID_PASSWORD };

        // Act
        const result = signUpSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.displayName).toBeUndefined();
        }
    });

    it("treats a whitespace-only name as no name rather than as an invalid one", () => {
        // Arrange
        const body = { displayName: "   ", email: VALID_EMAIL, password: VALID_PASSWORD };

        // Act
        const result = signUpSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.displayName).toBeUndefined();
        }
    });

    it("accepts a name checked against the backend's length and character rules", () => {
        // Arrange
        const body = { displayName: "Jamie Rivera", email: VALID_EMAIL, password: VALID_PASSWORD };

        // Act
        const result = signUpSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.displayName).toBe("Jamie Rivera");
        }
    });

    it("accepts a name containing a Unicode letter outside the ASCII range", () => {
        // Arrange
        const body = { displayName: "Renée Dubois", email: VALID_EMAIL, password: VALID_PASSWORD };

        // Act
        const result = signUpSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(true);
    });

    const rejectedDisplayNameCases: { name: string; displayName: string; message: string }[] = [
        { name: "shorter than 3 characters", displayName: "Al", message: DISPLAY_NAME_LENGTH_MESSAGE },
        { name: "longer than 32 characters", displayName: "A".repeat(33), message: DISPLAY_NAME_LENGTH_MESSAGE },
        { name: "containing a digit", displayName: "Alice1", message: DISPLAY_NAME_CHARSET_MESSAGE },
        { name: "containing a symbol", displayName: "Alice!", message: DISPLAY_NAME_CHARSET_MESSAGE },
    ];

    for (const { name, displayName, message } of rejectedDisplayNameCases) {
        it(`rejects a name ${name}`, () => {
            // Arrange
            const body = { displayName, email: VALID_EMAIL, password: VALID_PASSWORD };

            // Act
            const result = signUpSchema.safeParse(body);

            // Assert
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(zodErrorToFieldErrors(result.error).displayName).toBe(message);
            }
        });
    }
});

describe("signInSchema", () => {
    it("still accepts a short, simple password — complexity rules never gate sign-in", () => {
        // Arrange
        const body = { email: VALID_EMAIL, password: "short" };

        // Act
        const result = signInSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(true);
    });

    it("still rejects an empty password", () => {
        // Arrange
        const body = { email: VALID_EMAIL, password: "" };

        // Act
        const result = signInSchema.safeParse(body);

        // Assert
        expect(result.success).toBe(false);
    });
});
