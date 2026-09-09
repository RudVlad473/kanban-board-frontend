import { describe, expect, it } from "vitest";

import { checkGitleaksVersion, findPinnedVersions, normalizeVersion } from "./check-gitleaks-version.mjs";

/** Fixture strings only — no case shells out to the real binary or reads the real workflow. */
const workflowWith = (...assignments) =>
    [
        "jobs:",
        "    secrets:",
        "        steps:",
        "            - env:",
        ...assignments.map((a) => `                  ${a}`),
    ].join("\n");

const onePin = workflowWith('GITLEAKS_VERSION: "8.30.1"');

describe("findPinnedVersions", () => {
    it("reads the pin quoted, unquoted, or with a leading v", () => {
        // Arrange, Act, Assert
        expect(findPinnedVersions({ workflow: onePin })).toEqual(["8.30.1"]);
        expect(findPinnedVersions({ workflow: workflowWith("GITLEAKS_VERSION: 8.30.1") })).toEqual(["8.30.1"]);
        expect(findPinnedVersions({ workflow: workflowWith('GITLEAKS_VERSION: "v8.30.1"') })).toEqual(["8.30.1"]);
    });
});

describe("normalizeVersion", () => {
    it("strips a leading v and surrounding whitespace", () => {
        // Arrange, Act, Assert
        expect(normalizeVersion(" v8.30.1\n")).toBe("8.30.1");
        expect(normalizeVersion("8.30.1")).toBe("8.30.1");
    });
});

describe("checkGitleaksVersion", () => {
    it("passes when the installed version equals the pin, however each is spelled", () => {
        // Arrange, Act
        const violations = checkGitleaksVersion({ workflow: onePin, installedVersion: "v8.30.1\n" });

        // Assert
        expect(violations).toEqual([]);
    });

    it("fails closed when the workflow carries no pin", () => {
        // Arrange
        const workflow = workflowWith("GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}");

        // Act
        const violations = checkGitleaksVersion({ workflow, installedVersion: "8.30.1" });

        // Assert — finding nothing must not read as agreement.
        expect(violations.map((violation) => violation.kind)).toEqual(["no-pin"]);
    });

    it("fails when two pins exist, because ambiguity is drift waiting to happen", () => {
        // Arrange
        const workflow = workflowWith('GITLEAKS_VERSION: "8.30.1"', 'GITLEAKS_VERSION: "8.29.0"');

        // Act
        const violations = checkGitleaksVersion({ workflow, installedVersion: "8.30.1" });

        // Assert
        expect(violations.map((violation) => violation.kind)).toEqual(["ambiguous-pin"]);
    });

    it("fails on a version mismatch, naming both versions and the remedy", () => {
        // Arrange, Act
        const violations = checkGitleaksVersion({ workflow: onePin, installedVersion: "8.29.0" });

        // Assert
        expect(violations.map((violation) => violation.kind)).toEqual(["drift"]);
        expect(violations[0].detail).toContain("8.29.0");
        expect(violations[0].detail).toContain("8.30.1");
        expect(violations[0].detail).toContain("pnpm tools:install");
    });

    it("fails when the binary is absent rather than skipping", () => {
        // Arrange, Act
        const violations = checkGitleaksVersion({ workflow: onePin, installedVersion: null });

        // Assert — a hook that passes without the scanner is worse than no hook.
        expect(violations.map((violation) => violation.kind)).toEqual(["absent"]);
        expect(violations[0].detail).toContain("pnpm tools:install");
    });
});
