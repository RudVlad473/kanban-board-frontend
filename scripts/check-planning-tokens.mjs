#!/usr/bin/env node
/*
 * Decision ids restart per phase — `D-01` is defined in nine phase documents — so a BARE one names
 * no single decision, while `04-CONTEXT.md D-14` does. `T-NN-NN` and the requirement ids each
 * resolve to exactly one thing already, so widening this to them would be a mistake.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const TOKEN = /\b(?:D|S|U|GC)-\d{2}[a-z]?\b/g;

/** A document reference that pins which phase's numbering is meant. */
const QUALIFIER = /\d{2}(?:\.\d)?-(?:\d{2}-)?(?:CONTEXT|SUMMARY|RESEARCH|UI-SPEC|PLAN|CHECKPOINT|VALIDATION)/;

const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

export const isScannedSource = (relativePath) =>
    /\.(ts|tsx|mjs|cjs)$/.test(relativePath) && relativePath !== "scripts/check-planning-tokens.mjs";

/**
 * Every comment holding a bare decision id, as `{ line, tokens }`.
 *
 * A comment carrying a qualifier is exempt whole: the reference is resolvable, and the token need
 * not repeat the document on every mention within the same comment.
 */
export const findBareTokens = (source) => {
    const found = [];
    for (const match of source.matchAll(COMMENT)) {
        if (QUALIFIER.test(match[0])) {
            continue;
        }

        const tokens = [...new Set(match[0].match(TOKEN) ?? [])];
        if (tokens.length > 0) {
            found.push({ line: source.slice(0, match.index).split("\n").length, tokens });
        }
    }

    return found;
};

const runCli = () => {
    const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(isScannedSource);

    const violations = files.flatMap((path) =>
        findBareTokens(readFileSync(path, "utf8")).map((found) => ({ path, ...found })),
    );

    if (violations.length > 0) {
        console.error(
            "planning-tokens:check failed — decision ids restart their numbering each phase, so a bare " +
                "one names no single decision. Drop it and keep the prose, or qualify it with the document " +
                "that defines it (`04-CONTEXT.md D-14`), which is CONVENTIONS.md's own house style.\n",
        );
        for (const { path, line, tokens } of violations) {
            console.error(`  ${path}:${String(line)} — ${tokens.join(", ")}`);
        }
        console.error(`\n${String(violations.length)} violation(s).`);
        process.exit(1);
    }

    console.log(`planning-tokens:check passed — no bare decision id (${String(files.length)} files scanned).`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
