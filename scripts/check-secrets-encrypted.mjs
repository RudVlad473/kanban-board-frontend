#!/usr/bin/env node
/*
 * Asserts that secrets.enc.env holds SOPS ciphertext and nothing else, and that the gitleaks
 * allowlist entry that exempts it still exists. Allowlisting a path removes it from the only
 * automated secret scan, so the two halves are one mechanism — see docs/adr/tech/0032.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const GUARDED_PATH = "secrets.enc.env";

/** Byte-identical to the `paths` entry in .gitleaks.toml; drift between the two is the hole. */
export const GITLEAKS_ALLOWLIST_PATTERN = String.raw`^secrets\.enc\.env$`;

const GITLEAKS_CONFIG_PATH = ".gitleaks.toml";

const ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

/** SOPS writes its own bookkeeping as `sops_`-prefixed dotenv keys, several in plaintext by design. */
const METADATA_KEY_PREFIX = "sops_";

const CIPHERTEXT_PATTERN = /^ENC\[AES256_GCM,data:.+\]$/;

/*
 * Violations carry a key name and a line number, never a value: a gate that echoes the secret it
 * caught leaks it into every CI log and every stored terminal transcript.
 */
export const findCiphertextViolations = ({ content }) => {
    const lines = content.split("\n");
    const violations = [];
    let hasMetadata = false;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();

        if (trimmed === "" || trimmed.startsWith("#")) return;

        const assignment = ASSIGNMENT_PATTERN.exec(line);

        if (assignment === null) {
            violations.push({
                kind: "malformed",
                line: lineNumber,
                detail: `line ${String(lineNumber)} is neither blank, a comment, nor a KEY=VALUE assignment`,
            });
            return;
        }

        const [, key, value] = assignment;

        if (key.startsWith(METADATA_KEY_PREFIX)) {
            hasMetadata = true;
            return;
        }

        if (!CIPHERTEXT_PATTERN.test(value)) {
            violations.push({
                kind: "plaintext",
                line: lineNumber,
                detail: `\`${key}\` on line ${String(lineNumber)} is not SOPS ciphertext`,
            });
        }
    });

    if (!hasMetadata) {
        violations.push({
            kind: "not-sops",
            detail: `${GUARDED_PATH} carries no SOPS metadata keys — it is not sops output`,
        });
    }

    return violations;
};

/** Independent of the encrypted file's content: the allowlist can rot while the ciphertext is fine. */
export const findAllowlistDriftViolations = ({ gitleaksConfig }) => {
    if (gitleaksConfig.includes(GITLEAKS_ALLOWLIST_PATTERN)) return [];

    return [
        {
            kind: "allowlist-drift",
            detail:
                `${GITLEAKS_CONFIG_PATH} no longer contains the allowlist pattern ` +
                `\`${GITLEAKS_ALLOWLIST_PATTERN}\` that this check is paired with`,
        },
    ];
};

export const scanSecrets = ({ content, gitleaksConfig }) => [
    ...findCiphertextViolations({ content }),
    ...findAllowlistDriftViolations({ gitleaksConfig }),
];

/*
 * A hook must read the INDEX, not the working tree: checking disk would pass while plaintext sits
 * staged. Absent from the index means nothing is about to be committed at that path.
 */
const readStagedContent = () => {
    try {
        return execFileSync("git", ["show", `:${GUARDED_PATH}`], { cwd: repoRoot, encoding: "utf8" });
    } catch {
        return null;
    }
};

const runCli = () => {
    const isStaged = process.argv.slice(2).includes("--staged");
    const gitleaksConfig = readFileSync(path.resolve(repoRoot, GITLEAKS_CONFIG_PATH), "utf8");
    const content = isStaged ? readStagedContent() : readFileSync(path.resolve(repoRoot, GUARDED_PATH), "utf8");

    if (content === null) {
        console.log(`secrets:check passed — ${GUARDED_PATH} is not staged, nothing to guard.`);
        return;
    }

    const violations = scanSecrets({ content, gitleaksConfig });

    if (violations.length > 0) {
        console.error(
            `secrets:check failed — ${GUARDED_PATH} is allowlisted in ${GITLEAKS_CONFIG_PATH}, so this ` +
                `check is the only thing standing between it and a committed plaintext secret. ` +
                `See docs/adr/tech/0032.\n`,
        );
        for (const violation of violations) {
            console.error(`  ${GUARDED_PATH} — ${violation.detail}`);
        }
        console.error(`\n${String(violations.length)} violation(s).`);
        process.exit(1);
    }

    console.log(
        `secrets:check passed — ${GUARDED_PATH} is SOPS ciphertext${isStaged ? " in the index" : ""} and its ` +
            `${GITLEAKS_CONFIG_PATH} allowlist entry is intact.`,
    );
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
