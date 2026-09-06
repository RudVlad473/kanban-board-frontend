import { appendFileSync } from "node:fs";
import path from "node:path";

import { AxeBuilder } from "@axe-core/playwright";
import { test as base, expect, type Page, type Request } from "@playwright/test";

import {
    buildQualityKey,
    buildQualityObservation,
    compareQualityObservation,
    readQualityBaseline,
    type QualityObservation,
} from "./quality-baseline";

export { expect };

/* `process.cwd()`, not `import.meta.url` — see quality-baseline.ts's own note on why. */
const repoRoot = process.cwd();

/** No direct `axe-core` dependency exists to import types from — derived from the builder's own return type instead. */
type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;

/** A POST carrying a `next-action` header — the discriminator for a mutating write in this app. */
export const isServerActionPost = (request: Request): boolean =>
    request.method() === "POST" && "next-action" in request.headers();

/*
 * Fixture teardown runs inside the test's own 30s default (`playwright.config.ts` sets no
 * `timeout`); several specs already spend most of it on sign-in. Extending only at teardown's
 * start grants budget for the added scan without loosening the test body's own assertion budget.
 */
const TEARDOWN_TIMEOUT_BUDGET_MS = 15_000;

/** `layoutShiftScore` has no real reading until task 3 wires the document-level observer. */
const UNMEASURED_LAYOUT_SHIFT_SENTINEL = -1;

const QUALITY_RECORD_ENV_VAR = "QUALITY_RECORD_MODE";
const isRecordMode = (): boolean => process.env[QUALITY_RECORD_ENV_VAR] === "record";

/** One line per observation, read back and merged by `scripts/record-quality-baseline.mjs`. */
const QUALITY_OBSERVATION_LOG_PATH = path.join(repoRoot, ".quality-observations.jsonl");

const appendObservationToLog = (observation: QualityObservation): void => {
    appendFileSync(QUALITY_OBSERVATION_LOG_PATH, `${JSON.stringify(observation)}\n`);
};

const toRepoRelativePath = (absolutePath: string): string =>
    path.relative(repoRoot, absolutePath).split(path.sep).join("/");

const buildAxeRuleCounts = (violations: AxeResults["violations"]): Record<string, number> =>
    Object.fromEntries(violations.map((violation) => [violation.id, violation.nodes.length]));

/*
 * A destroyed execution context (a navigation racing the scan) is retried once after the load
 * state settles, then fails loudly by name — never swallowed into a silent empty result.
 */
const runAxeAnalysis = async (page: Page): Promise<AxeResults> => {
    try {
        return await new AxeBuilder({ page }).analyze();
    } catch {
        await page.waitForLoadState("domcontentloaded");

        try {
            return await new AxeBuilder({ page }).analyze();
        } catch (retryError) {
            throw new Error(
                `qualityGates: the axe scan failed twice in a row (possible destroyed execution context) — ${String(retryError)}`,
            );
        }
    }
};

export type QualityFixtures = {
    /** A zero-argument factory, so a probe can chain `include`/`exclude`/`withTags` per case without a shared instance leaking one case's narrowing into the next. */
    readonly axe: () => AxeBuilder;
    /** Passive, `auto`. Never called by a test — see the fixture declaration below. */
    readonly qualityGates: undefined;
};

export const test = base.extend<QualityFixtures>({
    axe: [
        async ({ page }, provideFixture) => {
            await provideFixture(() => new AxeBuilder({ page }));
        },
        { option: true },
    ],

    qualityGates: [
        async ({ page }, provideFixture, testInfo) => {
            await provideFixture(undefined);

            testInfo.setTimeout(testInfo.timeout + TEARDOWN_TIMEOUT_BUDGET_MS);

            if (testInfo.status === "failed" || testInfo.status === "timedOut") {
                testInfo.annotations.push({
                    type: "quality-gates",
                    description: "skipped — the test already failed before teardown ran",
                });
                return;
            }

            if (page.isClosed()) {
                throw new Error(
                    "qualityGates: the page was already closed by teardown — no spec in this suite is expected to close its own page.",
                );
            }

            const results = await runAxeAnalysis(page);
            const evaluatedRuleTotal =
                results.passes.length +
                results.violations.length +
                results.incomplete.length +
                results.inapplicable.length;

            const specRelativePath = toRepoRelativePath(testInfo.file);
            const key = buildQualityKey({ specRelativePath, titlePath: testInfo.titlePath });
            const observation = buildQualityObservation({
                key,
                specRelativePath,
                axeRuleCounts: buildAxeRuleCounts(results.violations),
                evaluatedRuleTotal,
                layoutShiftScore: UNMEASURED_LAYOUT_SHIFT_SENTINEL,
            });

            if (isRecordMode()) {
                appendObservationToLog(observation);
                return;
            }

            const baseline = readQualityBaseline();
            const result = compareQualityObservation({ observation, entry: baseline.tests[key] });

            if (!result.passed) {
                throw new Error(result.message);
            }

            for (const improvement of result.improvements) {
                testInfo.annotations.push({ type: "quality-improvement", description: improvement.message });
                console.log(`[qualityGates] ${improvement.message}`);
            }
        },
        { auto: true },
    ],
});
