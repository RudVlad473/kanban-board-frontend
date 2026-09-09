#!/usr/bin/env node
/*
 * Mechanises CONVENTIONS.md's Server Action naming rule: an action file is
 * `<verb>-<noun>-action.ts` drawn from a closed verb set, exporting the matching `<verbNoun>Action`.
 * Mirrors scripts/check-no-play-functions.mjs's file-scanning shape.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { globRealFiles } from "./glob-real-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/*
 * The closed set CONVENTIONS.md records: HTTP-derived `create`/`update`/`delete`, the narrower
 * domain verbs `rename`/`reorder`/`move`, `sign` for auth, and `get` for a client-callable read.
 */
export const ALLOWED_ACTION_VERBS = ["create", "update", "delete", "rename", "reorder", "move", "sign", "get"];

const toExpectedExport = ({ fileStem }) => {
    const camel = fileStem.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase());
    return camel;
};

export const findActionNameViolations = ({ relativePath, source }) => {
    const fileStem = path.basename(relativePath, ".ts");
    const violations = [];

    if (!fileStem.endsWith("-action")) {
        violations.push({ relativePath, reason: "file name does not end in `-action`" });
        return violations;
    }

    const verb = fileStem.split("-")[0];
    if (!ALLOWED_ACTION_VERBS.includes(verb)) {
        violations.push({
            relativePath,
            reason: `verb \`${verb}\` is outside the allowed set (${ALLOWED_ACTION_VERBS.join(", ")})`,
        });
    }

    const expectedExport = toExpectedExport({ fileStem });
    if (!new RegExp(`^export const ${expectedExport}\\b`, "m").test(source)) {
        violations.push({ relativePath, reason: `does not export \`${expectedExport}\` matching its file name` });
    }

    return violations;
};

/*
 * Phase 4 success criterion 8's absence property: the `"use server"` transform
 * (scripts/vite-plugin-server-action-stub.mjs) doubles every Server Action, so neither a
 * hand-written double module nor an alias register may exist. See docs/adr/tech/0020's carve-out.
 */
export const DOUBLE_MODULE_SUFFIX = "-storybook-stub.ts";

const VITEST_CONFIG_PATH = "vitest.config.ts";

/*
 * A comment naming the deleted register is a record of it, not a reinstatement, so comment text is
 * scanned out first — the same allowance a by-hand grep of this property makes.
 */
const stripComments = (source) =>
    source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((line) => !/^\s*\/\//.test(line))
        .join("\n");

/*
 * Two rules, not one: the second catches a register that renames itself, which a name-only check
 * would wave through — the drift this gate exists to stop was invisible for exactly that long.
 */
const REGISTER_RULES = [
    {
        pattern: /\b\w*[Aa]ctionStubAlias(?:es)?\b/,
        reason: 'declares an action-stub alias register; the `"use server"` transform replaced it (plan 04-10)',
    },
    {
        pattern: /["'][^"']*\/actions\/[^"']*["']/,
        reason:
            "names a Server Action module — aliasing one to a replacement module is banned; the " +
            "transform doubles it with no config entry",
    },
];

export const findStubSeamViolations = ({ testUtilPaths, vitestConfigSource }) => {
    const doubleViolations = testUtilPaths
        .filter((relativePath) => relativePath.endsWith(DOUBLE_MODULE_SUFFIX))
        .map((relativePath) => ({
            relativePath,
            reason: "is a hand-written Server Action double; the transform emits one from the real module instead",
        }));

    const configSource = stripComments(vitestConfigSource);
    const registerViolations = REGISTER_RULES.filter(({ pattern }) => pattern.test(configSource)).map(({ reason }) => ({
        relativePath: VITEST_CONFIG_PATH,
        reason,
    }));

    return [...doubleViolations, ...registerViolations];
};

const reportViolations = ({ heading, violations }) => {
    console.error(heading);
    for (const violation of violations) {
        console.error(`  ${violation.relativePath} — ${violation.reason}`);
    }
};

const scanFile = (relativePath) => {
    const source = readFileSync(path.resolve(repoRoot, relativePath), "utf8");
    return findActionNameViolations({ relativePath, source });
};

const runCli = () => {
    const files = globRealFiles({ patterns: ["src/features/*/actions/*.ts"], cwd: repoRoot }).filter(
        (relativePath) => !relativePath.includes(".test."),
    );

    const nameViolations = files.flatMap(scanFile).sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    const seamViolations = findStubSeamViolations({
        testUtilPaths: globRealFiles({ patterns: ["src/test-utils/**/*.{ts,tsx}"], cwd: repoRoot }),
        vitestConfigSource: readFileSync(path.resolve(repoRoot, VITEST_CONFIG_PATH), "utf8"),
    }).sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    if (nameViolations.length > 0) {
        reportViolations({
            heading:
                "actions:check failed — a Server Action's name is outside CONVENTIONS.md's closed verb set, " +
                "or its exported symbol does not mirror its file name.\n",
            violations: nameViolations,
        });
    }

    if (seamViolations.length > 0) {
        reportViolations({
            heading:
                "actions:check failed — a hand-written Server Action double or an alias register has " +
                "reappeared (phase 04 success criterion 8, docs/adr/tech/0020).\n",
            violations: seamViolations,
        });
    }

    if (nameViolations.length > 0 || seamViolations.length > 0) {
        process.exit(1);
    }

    console.log(
        `actions:check passed — ${String(files.length)} Server Action(s) match the naming rule, ` +
            "and no double module or alias register exists.",
    );
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
