import { describe, expect, it } from "vitest";

import { createUser, DEMO_USER_EMAIL, DEMO_USER_ID, findUserByEmail, resetMockStore } from "./store";

describe("store", () => {
    it("finds the seeded demo account by email at import time, with no other users present", () => {
        // Arrange
        resetMockStore();

        // Act
        const demoUser = findUserByEmail(DEMO_USER_EMAIL);

        // Assert
        expect(demoUser?.id).toBe(DEMO_USER_ID);
    });

    it("removes a created user on resetMockStore() while the demo account survives", () => {
        // Arrange
        resetMockStore();
        const createdEmail = "jamie@example.com";
        createUser({ displayName: "Jamie Rivera", email: createdEmail, password: "Password123!" });

        // Act
        resetMockStore();

        // Assert
        expect(findUserByEmail(createdEmail)).toBeUndefined();
        expect(findUserByEmail(DEMO_USER_EMAIL)?.id).toBe(DEMO_USER_ID);
    });

    it("is idempotent across two consecutive calls", () => {
        // Arrange
        resetMockStore();

        // Act
        resetMockStore();
        resetMockStore();

        // Assert
        expect(findUserByEmail(DEMO_USER_EMAIL)?.id).toBe(DEMO_USER_ID);
    });
});
