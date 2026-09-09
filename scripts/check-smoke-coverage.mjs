#!/usr/bin/env node
/*
 * Ties `e2e/full-app.e2e.spec.ts`'s step list to REQUIREMENTS.md, the file a new feature cannot
 * avoid updating: a hand-maintained smoke decays into a checklist that reads as coverage while
 * missing the newest feature. Fails the moment a ticked requirement has no step proving it.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const REQUIREMENTS_PATH = ".planning/REQUIREMENTS.md";
export const SMOKE_SPEC_PATH = "e2e/full-app.e2e.spec.ts";

/** `- [x] **BOARD-02**: …` — only a ticked box counts, so work in flight is not gated prematurely. */
const COMPLETED_REQUIREMENT = /^- \[x\] \*\*([A-Z]+-\d{2})\*\*/gm;

/** `await test.step("BOARD-02 — …")`, and the combined `SUBTASK-01/03/04` form. */
const STEP_TITLE = /test\.step\(\s*"([^"]+)"/g;

export const findCompletedRequirements = (source) => [...source.matchAll(COMPLETED_REQUIREMENT)].map((m) => m[1]);

/**
 * Every requirement id a step title claims.
 *
 * A title may lead with several — `SUBTASK-01/03/04 — add, rename and delete` — because one
 * uninterrupted interaction genuinely proves all three, and splitting it would reseed between them.
 */
export const findCoveredRequirements = (source) => {
    const covered = new Set();
    for (const [, title] of source.matchAll(STEP_TITLE)) {
        const [lead] = title.split(" — ");
        const family = /^([A-Z]+)-/.exec(lead)?.[1];
        if (family === undefined) {
            continue;
        }

        for (const part of lead.split("/")) {
            covered.add(part.includes("-") ? part : `${family}-${part}`);
        }
    }

    return covered;
};

export const findUncovered = ({ requirementsSource, smokeSource }) => {
    const covered = findCoveredRequirements(smokeSource);

    return findCompletedRequirements(requirementsSource).filter((id) => !covered.has(id));
};

const runCli = () => {
    const read = (relativePath) => readFileSync(path.resolve(repoRoot, relativePath), "utf8");
    const uncovered = findUncovered({
        requirementsSource: read(REQUIREMENTS_PATH),
        smokeSource: read(SMOKE_SPEC_PATH),
    });

    if (uncovered.length > 0) {
        console.error(
            `smoke:check failed — ${String(uncovered.length)} requirement(s) marked complete in ` +
                `${REQUIREMENTS_PATH} have no step in ${SMOKE_SPEC_PATH}:\n`,
        );
        for (const id of uncovered) {
            console.error(`  ${id}`);
        }
        console.error(
            `\nAdd a step whose title starts with the id, e.g.\n` +
                `  await test.step("${uncovered[0]} — what a user does", async () => { … });\n` +
                `Several ids may share one step ("SUBTASK-01/03/04 — …") when one interaction proves them all.`,
        );
        process.exit(1);
    }

    const total = findCompletedRequirements(read(REQUIREMENTS_PATH)).length;
    console.log(`smoke:check passed — all ${String(total)} completed requirements have a step in the full-app smoke.`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
