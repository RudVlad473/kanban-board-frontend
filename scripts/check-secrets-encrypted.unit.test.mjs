import { describe, expect, it } from "vitest";

import {
    GITLEAKS_ALLOWLIST_PATTERN,
    findAllowlistDriftViolations,
    findCiphertextViolations,
    scanSecrets,
} from "./check-secrets-encrypted.mjs";

/** The metadata block sops 3.13.3 actually emits for a dotenv file, trimmed to the shape-bearing keys. */
const SOPS_METADATA = [
    "sops_age__list_0__map_recipient=age1j990f2cfxrgylkxncppddn0muwuq90pu26pnktr80eg7g452r4vseuxjrg",
    "sops_lastmodified=2026-09-03T20:02:11Z",
    "sops_unencrypted_suffix=_unencrypted",
    "sops_version=3.13.3",
].join("\n");

const ciphertextLine = (key) => `${key}=ENC[AES256_GCM,data:lPVe3j+iLL68zknd,iv:gHlVlDMRF6Jdh7cU,tag:rt64BB,type:str]`;

const withMetadata = (body) => `${body}\n${SOPS_METADATA}\n`;

const intactConfig = `[[rules.allowlist]]\npaths = ['''${GITLEAKS_ALLOWLIST_PATTERN}''']\n`;

describe("findCiphertextViolations", () => {
    it("accepts sops output: encrypted comments, encrypted values, plaintext metadata keys", () => {
        // Arrange
        const content = withMetadata(
            [
                "#ENC[AES256_GCM,data:tyBhdqkty,iv:roNt3zhM,tag:LMGyfmo,type:comment]",
                ciphertextLine("EXTERNAL_API_BASE_URL"),
                ciphertextLine("SESSION_SECRET"),
            ].join("\n"),
        );

        // Act
        const violations = findCiphertextViolations({ content });

        // Assert
        expect(violations).toEqual([]);
    });

    it("fails a value that is not sops ciphertext, naming the key and line", () => {
        // Arrange
        const content = withMetadata([ciphertextLine("KEPT"), 'LEAKED="plaintext"'].join("\n"));

        // Act
        const violations = findCiphertextViolations({ content });

        // Assert
        expect(violations).toEqual([
            { kind: "plaintext", line: 2, detail: "`LEAKED` on line 2 is not SOPS ciphertext" },
        ]);
    });

    it("never repeats the offending value in the violation it reports", () => {
        // Arrange
        const literal = "falsification-probe-not-a-real-secret";
        const content = withMetadata(`SESSION_SECRET="${literal}"`);

        // Act
        const rendered = JSON.stringify(findCiphertextViolations({ content }));

        // Assert — a gate that echoes what it caught leaks it into every CI log.
        expect(rendered).not.toContain(literal);
        expect(rendered).toContain("SESSION_SECRET");
    });

    it("fails closed on an empty file and on ciphertext with no sops metadata", () => {
        // Arrange, Act
        const empty = findCiphertextViolations({ content: "" });
        const metadataless = findCiphertextViolations({ content: `${ciphertextLine("SESSION_SECRET")}\n` });

        // Assert — "not sops output" is a failure, not an absence of evidence.
        expect(empty.map((violation) => violation.kind)).toEqual(["not-sops"]);
        expect(metadataless.map((violation) => violation.kind)).toEqual(["not-sops"]);
    });

    it("fails a line that is neither blank, a comment, nor an assignment", () => {
        // Arrange
        const content = withMetadata([ciphertextLine("KEPT"), "this is not a dotenv line"].join("\n"));

        // Act
        const violations = findCiphertextViolations({ content });

        // Assert
        expect(violations).toEqual([
            {
                kind: "malformed",
                line: 2,
                detail: "line 2 is neither blank, a comment, nor a KEY=VALUE assignment",
            },
        ]);
    });
});

describe("findAllowlistDriftViolations", () => {
    it("passes while the exact allowlist pattern is present", () => {
        // Arrange, Act, Assert
        expect(findAllowlistDriftViolations({ gitleaksConfig: intactConfig })).toEqual([]);
    });

    it("fails when the pattern is deleted or renamed, independent of the encrypted file", () => {
        // Arrange
        const renamed = intactConfig.replace("secrets", "credentials");

        // Act
        const deletedViolations = findAllowlistDriftViolations({ gitleaksConfig: "[extend]\nuseDefault = true\n" });
        const renamedViolations = findAllowlistDriftViolations({ gitleaksConfig: renamed });

        // Assert
        expect(deletedViolations.map((violation) => violation.kind)).toEqual(["allowlist-drift"]);
        expect(renamedViolations.map((violation) => violation.kind)).toEqual(["allowlist-drift"]);
    });
});

describe("scanSecrets", () => {
    it("reports both halves together rather than stopping at the first", () => {
        // Arrange
        const content = withMetadata('LEAKED="plaintext"');

        // Act
        const violations = scanSecrets({ content, gitleaksConfig: "[extend]\nuseDefault = true\n" });

        // Assert
        expect(violations.map((violation) => violation.kind)).toEqual(["plaintext", "allowlist-drift"]);
    });

    it("passes the real committed shape against the real allowlist entry", () => {
        // Arrange
        const content = withMetadata(ciphertextLine("NONPROD_RESET_TOKEN"));

        // Act
        const violations = scanSecrets({ content, gitleaksConfig: intactConfig });

        // Assert
        expect(violations).toEqual([]);
    });
});
