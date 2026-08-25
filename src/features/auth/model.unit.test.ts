import { describe, expect, it } from "vitest";

import { readFormField, resolveDisplayName } from "./model";

describe("resolveDisplayName", () => {
    it("returns the trimmed name when one is present", () => {
        // Arrange
        const input = { displayName: "  Jamie Rivera  ", email: "jamie@example.com" };

        // Act
        const result = resolveDisplayName(input);

        // Assert
        expect(result).toBe("Jamie Rivera");
    });

    it("falls back to the part of the email before the at-sign when no name is present", () => {
        // Arrange
        const input = { displayName: undefined, email: "jamie@example.com" };

        // Act
        const result = resolveDisplayName(input);

        // Assert
        expect(result).toBe("jamie");
    });

    it("falls back to the part of the email before the at-sign when the name is whitespace-only", () => {
        // Arrange
        const input = { displayName: "   ", email: "jamie@example.com" };

        // Act
        const result = resolveDisplayName(input);

        // Assert
        expect(result).toBe("jamie");
    });

    it('falls back to the literal "User" when no name is present and the email has nothing before the at-sign', () => {
        // Arrange
        const input = { displayName: undefined, email: "@example.com" };

        // Act
        const result = resolveDisplayName(input);

        // Assert
        expect(result).toBe("User");
    });

    it('falls back to the literal "User" when neither a name nor a usable email local part exists', () => {
        // Arrange
        const input = { displayName: undefined, email: "" };

        // Act
        const result = resolveDisplayName(input);

        // Assert
        expect(result).toBe("User");
    });

    it("never returns an empty string", () => {
        // Arrange
        const inputs = [
            { displayName: undefined, email: "" },
            { displayName: "   ", email: "" },
            { displayName: "", email: "@example.com" },
        ];

        // Act
        const results = inputs.map((input) => resolveDisplayName(input));

        // Assert
        for (const result of results) {
            expect(result).not.toBe("");
        }
    });
});

describe("readFormField", () => {
    it("returns the string value for a text field", () => {
        // Arrange
        const formData = new FormData();
        formData.set("email", "jamie@example.com");

        // Act & Assert
        expect(readFormField({ formData, key: "email" })).toBe("jamie@example.com");
    });

    /* A File (or a missing key) is not text, so it surfaces as empty rather than stringifying. */
    it("returns an empty string for a non-string value", () => {
        // Arrange
        const formData = new FormData();
        formData.set("avatar", new File([], "avatar.png"));

        // Act & Assert
        expect(readFormField({ formData, key: "avatar" })).toBe("");
    });

    it("returns an empty string when the key is absent entirely", () => {
        // Act & Assert
        expect(readFormField({ formData: new FormData(), key: "email" })).toBe("");
    });
});
