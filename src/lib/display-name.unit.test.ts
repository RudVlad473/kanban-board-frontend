import { describe, expect, it } from "vitest";

import { resolveDisplayName } from "./display-name";

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
