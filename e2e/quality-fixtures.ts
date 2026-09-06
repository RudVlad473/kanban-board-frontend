import { appendFileSync } from "node:fs";
import path from "node:path";

import { AxeBuilder } from "@axe-core/playwright";
import { test as base, expect, type CDPSession, type Page, type Request } from "@playwright/test";
import { isNil } from "es-toolkit";

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

/** One recorded mutation, read back from `window.__uiFlickerLog` after `start()` installed the observer. */
type FlickerLogEntry = { readonly selector: string; readonly type: MutationRecordType; readonly timestamp: number };

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmenting the global Window interface via declaration merging requires `interface`; `type` cannot merge
    interface Window {
        __uiFlickerLog?: FlickerLogEntry[];
        __uiFlickerObserver?: MutationObserver;
    }
}

// comment-length-exempt: records the SVGAnimatedString hazard (T-04-47) this selector derivation exists to design out — a grep guard in this task's verify checks the forbidden property never reaches this file
/*
 * Derives a selector from the element's tag, id, `data-testid` and up to two class names — read
 * via `getAttribute("class")`, never the DOM property that MIRRORS the class attribute, which is
 * an `SVGAnimatedString` on an SVG element and throws on `.split()`. This app renders SVG icons
 * throughout, so the hazard is reachable, not theoretical (T-04-47). A target that is not an
 * `Element` (a text node, on a `characterData` record) narrows via `instanceof Element` instead.
 */
const FLICKER_INSTALL_SCRIPT = () => {
    const deriveSelector = (target: Node): string => {
        const element = target instanceof Element ? target : target.parentElement;
        // eslint-disable-next-line local/prefer-is-nil -- this closure is serialized into the browser by page.evaluate, which cannot resolve the es-toolkit import from this module's scope
        if (element === null) return "(no-element)";

        const tag = element.tagName.toLowerCase();
        const id = element.getAttribute("id");
        const testId = element.getAttribute("data-testid");
        const classAttr = element.getAttribute("class");
        const classes = classAttr ? classAttr.trim().split(/\s+/).slice(0, 2) : [];

        return `${tag}${id ? `#${id}` : ""}${testId ? `[data-testid="${testId}"]` : ""}${classes.length > 0 ? `.${classes.join(".")}` : ""}`;
    };

    window.__uiFlickerLog = [];
    const observer = new MutationObserver((records) => {
        for (const record of records) {
            window.__uiFlickerLog?.push({
                selector: deriveSelector(record.target),
                type: record.type,
                timestamp: Date.now(),
            });
        }
    });
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    window.__uiFlickerObserver = observer;
};

const readFlickerLog = (page: Page): Promise<FlickerLogEntry[] | undefined> =>
    page.evaluate(() => window.__uiFlickerLog);

export type FlickerTracker = {
    // comment-length-exempt: records the navigation-timing constraint start() depends on and its own falsifier, not restated at every call site
    /*
     * Belongs after the LAST full navigation only: `page.goto` replaces `document.body` and drops
     * the observer, whereas an App Router client navigation replaces only its children. What would
     * make this false: a future router change that replaces `<body>` itself on a client transition.
     */
    readonly start: () => Promise<void>;
    /**
     * `maxMutations` is REQUIRED — a raw `MutationRecord` count has no portable "sensible default"
     * across arbitrary selectors (see the fixture declaration below for why). `selector` narrows to
     * groups whose derived selector CONTAINS it; omitted, every group is checked.
     */
    readonly assertNoFlicker: (args: { selector?: string; maxMutations: number }) => Promise<void>;
};

export type QualityFixtures = {
    /** A zero-argument factory, so a probe can chain `include`/`exclude`/`withTags` per case without a shared instance leaking one case's narrowing into the next. */
    readonly axe: () => AxeBuilder;
    /** A Chromium-only capability (`e2e` uses `devices["Desktop Chrome"]`, so this always resolves). */
    readonly cdp: CDPSession;
    /** Opt-in per D-F: the threshold and selector are both defined against ONE chosen interaction. */
    readonly flickerTracker: FlickerTracker;
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

    cdp: [
        async ({ page }, provideFixture) => {
            const session = await page.context().newCDPSession(page);
            await session.send("Performance.enable");
            await provideFixture(session);

            try {
                await session.detach();
            } catch {
                // Tolerated: the page may already be closed by the time teardown runs.
            }
        },
        { option: true },
    ],

    // comment-length-exempt: records why this fixture deliberately ships with no default budget, which a future reader would otherwise "fix" by adding one
    /*
     * `maxMutations` has no default (D-F): a raw `MutationRecord` count is not the same unit as a
     * semantic "state changes" budget — one React commit produces a `childList` record per
     * insertion plus an `attributes` record per changed attribute — so only a per-call-site
     * measurement can set it. A remembered "sensible" number would be wrong by an unknown multiple.
     */
    flickerTracker: [
        async ({ page }, provideFixture) => {
            await provideFixture({
                start: () => page.evaluate(FLICKER_INSTALL_SCRIPT),
                assertNoFlicker: async ({ selector, maxMutations }) => {
                    const log = await readFlickerLog(page);

                    if (isNil(log)) {
                        throw new Error(
                            "flickerTracker: assertNoFlicker() was called but the tracker was never installed — call start() after the last full navigation.",
                        );
                    }

                    const groups = new Map<string, number>();
                    for (const entry of log) {
                        if (!isNil(selector) && !entry.selector.includes(selector)) continue;
                        groups.set(entry.selector, (groups.get(entry.selector) ?? 0) + 1);
                    }

                    for (const [groupSelector, count] of groups) {
                        if (count > maxMutations) {
                            throw new Error(
                                `flickerTracker: "${groupSelector}" mutated ${String(count)} time(s), exceeding the budget of ${String(maxMutations)}.`,
                            );
                        }
                    }
                },
            });
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
