#!/usr/bin/env node
// comment-length-exempt: records why this is a Node script rather than a shell one-liner, and the replace-not-union property D-E's baseline-drift bound depends on
/*
 * `pnpm e2e:baseline [spec...]` — the record mode behind `qualityGates`. Runs the given e2e spec(s)
 * (or every spec, unscoped) three times each and REPLACES the matching keys' entries in
 * `e2e/quality-baseline.json` wholesale, never unioning with what was already there (D-E). A plain
 * Node script, not a shell one-liner with a leading `NAME=value` prefix: this project is also
 * developed on Windows, where that prefix form is not portable.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const QUALITY_OBSERVATION_LOG_PATH = path.join(repoRoot, ".quality-observations.jsonl");
const QUALITY_BASELINE_PATH = path.join(repoRoot, "e2e", "quality-baseline.json");
const QUALITY_RECORD_ENV_VAR = "QUALITY_RECORD_MODE";
const OBSERVATIONS_PER_KEY = 3;

/** Every key this run observed, parsed straight off the JSONL log — one array entry per line. */
export const parseObservationLog = ({ log }) => {
    const observations = [];

    log.split("\n")
        .map((line) => line.trim())
        .forEach((line, index) => {
            if (line === "") return;

            try {
                observations.push(JSON.parse(line));
            } catch {
                throw new Error(
                    `record-quality-baseline: unparseable observation log line ${String(index + 1)}: ${line}`,
                );
            }
        });

    return observations;
};

/*
 * Groups observations by key and enforces the collision contract: fewer than three is a lost
 * append or a mid-record failure; more than three is two tests sharing a key. Both directions —
 * and a spec-path disagreement within one key — hard-fail naming the key and the counts (T-04-64).
 */
export const groupObservationsByKey = ({ observations }) => {
    const grouped = new Map();

    for (const observation of observations) {
        const existing = grouped.get(observation.key) ?? [];
        existing.push(observation);
        grouped.set(observation.key, existing);
    }

    for (const [key, group] of grouped) {
        if (group.length !== OBSERVATIONS_PER_KEY) {
            throw new Error(
                `record-quality-baseline: "${key}" received ${String(group.length)} observation(s), expected exactly ${String(OBSERVATIONS_PER_KEY)}. ` +
                    (group.length < OBSERVATIONS_PER_KEY
                        ? "Fewer than three means a lost append or a test that failed mid-record."
                        : "More than three means two identically-titled tests in one spec file shared this key."),
            );
        }

        const specPaths = new Set(group.map((observation) => observation.specRelativePath));
        if (specPaths.size > 1) {
            throw new Error(
                `record-quality-baseline: "${key}" was observed from more than one spec path: ${[...specPaths].join(", ")}.`,
            );
        }
    }

    return grouped;
};

/*
 * A rule id in all three observations is recorded at its MAXIMUM count (D-L): ordinary count
 * variance then needs no flaky exemption and stays gated against a genuine rise. A rule id in
 * some but not all three is flaky — ungated in both presence and count.
 */
export const buildBaselineEntry = ({ group }) => {
    const ruleIdCounts = new Map();

    for (const observation of group) {
        for (const [ruleId, count] of Object.entries(observation.axeRuleCounts)) {
            const counts = ruleIdCounts.get(ruleId) ?? [];
            counts.push(count);
            ruleIdCounts.set(ruleId, counts);
        }
    }

    const axeRuleCounts = {};
    const flakyRuleIds = [];

    for (const [ruleId, counts] of [...ruleIdCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (counts.length === group.length) {
            axeRuleCounts[ruleId] = Math.max(...counts);
        } else {
            flakyRuleIds.push(ruleId);
        }
    }

    return {
        axeRuleCounts,
        flakyRuleIds: flakyRuleIds.sort((a, b) => a.localeCompare(b)),
        evaluatedRuleFloor: Math.min(...group.map((observation) => observation.evaluatedRuleTotal)),
        layoutShiftScore: Math.max(...group.map((observation) => observation.layoutShiftScore)),
    };
};

/** Replaces every key this run observed; leaves every key it did not observe untouched. */
export const mergeBaseline = ({ baseline, grouped }) => {
    const tests = { ...baseline.tests };

    for (const [key, group] of grouped) {
        tests[key] = buildBaselineEntry({ group });
    }

    return {
        recordedAt: new Date().toISOString(),
        note: baseline.note,
        tests,
    };
};

const readBaseline = () => {
    if (!existsSync(QUALITY_BASELINE_PATH)) {
        return {
            recordedAt: new Date().toISOString(),
            note: "Committed accessibility/layout-shift baseline for e2e/quality-fixtures.ts (04-23).",
            tests: {},
        };
    }
    return JSON.parse(readFileSync(QUALITY_BASELINE_PATH, "utf8"));
};

const writeBaseline = (baseline) => {
    writeFileSync(QUALITY_BASELINE_PATH, `${JSON.stringify(baseline, null, 4)}\n`);
};

const runCli = () => {
    if (process.env.CI) {
        console.error(
            "record-quality-baseline: refusing to run with CI set — a recording must never happen where nobody would see the diff.",
        );
        process.exit(1);
    }

    const specArgs = process.argv.slice(2);

    writeFileSync(QUALITY_OBSERVATION_LOG_PATH, "");

    const result = spawnSync("pnpm", ["exec", "playwright", "test", "--project=e2e", "--repeat-each=3", ...specArgs], {
        cwd: repoRoot,
        stdio: "inherit",
        env: { ...process.env, [QUALITY_RECORD_ENV_VAR]: "record" },
    });

    if (result.status !== 0) {
        console.error(
            "record-quality-baseline: the recording run itself failed — fix the failure before trusting any observation it produced.",
        );
        process.exit(result.status ?? 1);
    }

    const log = readFileSync(QUALITY_OBSERVATION_LOG_PATH, "utf8");

    try {
        const observations = parseObservationLog({ log });
        const grouped = groupObservationsByKey({ observations });
        const baseline = mergeBaseline({ baseline: readBaseline(), grouped });

        writeBaseline(baseline);

        console.log(
            `record-quality-baseline: recorded ${String(grouped.size)} key(s) into ${path.relative(repoRoot, QUALITY_BASELINE_PATH)}.`,
        );
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
