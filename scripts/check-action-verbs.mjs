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
 * The closed set CONVENTIONS.md records. `create`/`update`/`delete` come from the HTTP methods they
 * ride; `rename`/`reorder`/`move` are the narrower domain verbs kept deliberately over a generic
 * `update`; `sign` covers the non-CRUD auth actions, which have no HTTP verb to derive from.
 */
export const ALLOWED_ACTION_VERBS = ["create", "update", "delete", "rename", "reorder", "move", "sign"];

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

// RED skeleton — the assertion itself lands in this task's GREEN commit.
export const findStubSeamViolations = () => [];

const scanFile = (relativePath) => {
    const source = readFileSync(path.resolve(repoRoot, relativePath), "utf8");
    return findActionNameViolations({ relativePath, source });
};

const runCli = () => {
    const files = globRealFiles({ patterns: ["src/features/*/actions/*.ts"], cwd: repoRoot }).filter(
        (relativePath) => !relativePath.includes(".test."),
    );

    const violations = files.flatMap(scanFile).sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    if (violations.length > 0) {
        console.error(
            "actions:check failed — a Server Action's name is outside CONVENTIONS.md's closed verb set, " +
                "or its exported symbol does not mirror its file name.\n",
        );
        for (const violation of violations) {
            console.error(`  ${violation.relativePath} — ${violation.reason}`);
        }
        process.exit(1);
    }

    console.log(`actions:check passed — ${String(files.length)} Server Action(s) match the naming rule.`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
