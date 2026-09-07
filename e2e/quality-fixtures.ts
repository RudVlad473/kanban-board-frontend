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

// comment-length-exempt: records the read/write asymmetry this fixture's delay form depends on, with the dates and measurements that back it — getting this wrong reproduces a defect this repo already paid for once
/*
 * A fixed delay on READS is proven safe here (`boards-switch.e2e.spec.ts` holds every read for
 * 3000ms and is CI-green). A long fixed delay on a WRITE is not: `optimistic-guards.e2e.spec.ts`
 * had to become a release GATE because a fixed hold outlived its assertions, widened the window for
 * the shared nonprod backend to refuse the create, and turned a locally-green suite red on CI on
 * 2026-09-05. That release-gate shape remains the right tool for a long write hold; this fixture's
 * delay form is for a BOUNDED window only. What would make this false: a call site needing a delay
 * long enough to reproduce the same hazard should use the release-gate shape instead, not raise
 * `delayMs` here.
 */
export type OptimisticRoute = (args: {
    urlPattern: string | RegExp;
    delayMs: number;
    match?: (request: Request) => boolean;
}) => Promise<void>;

type LayoutShiftFilterPolicy = "exclude-recent-input" | "include-recent-input";
type LayoutShiftState = { score: number; unsupported: boolean };

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmenting the global Window interface via declaration merging requires `interface`; `type` cannot merge
    interface Window {
        __uiLayoutShift?: Partial<Record<LayoutShiftFilterPolicy, LayoutShiftState>>;
    }
}

// comment-length-exempt: records why this installer takes a required filtering policy with no default, which is the whole of D-K and easy to "simplify" away by a future edit
/*
 * ONE installer, shared by both readings (D-K): the filtering policy is a REQUIRED parameter with
 * no default, so neither call site can inherit the other's answer by omission. The passive gate
 * (below) passes `"exclude-recent-input"` — standard CLS semantics; `layoutShiftTracker.start()`
 * passes `"include-recent-input"`, because the interaction under test IS the recent input.
 */
const installLayoutShiftObserver = (policy: LayoutShiftFilterPolicy) => {
    // comment-length-exempt: records why this type guard is nested rather than a module-scope const, which the outer serialization boundary requires
    /*
     * The Layout Instability API's entry shape is not in the DOM lib — a type guard, never a cast
     * (`strictTypeChecked` rejects an `as`). Declared INSIDE this function, not at module scope:
     * this whole function is serialized by `page.evaluate`/`addInitScript` and re-run in the
     * browser, where a reference to an outer Node-scope binding is a `ReferenceError`.
     */
    const isLayoutShiftEntry = (
        entry: PerformanceEntry,
    ): entry is PerformanceEntry & { value: number; hadRecentInput: boolean } =>
        "value" in entry && "hadRecentInput" in entry;

    window.__uiLayoutShift = window.__uiLayoutShift ?? {};
    window.__uiLayoutShift[policy] = { score: 0, unsupported: false };

    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!isLayoutShiftEntry(entry)) continue;
                if (policy === "exclude-recent-input" && entry.hadRecentInput) continue;

                const state = window.__uiLayoutShift?.[policy];
                if (state) state.score += entry.value;
            }
        });
        observer.observe({ type: "layout-shift", buffered: true });
    } catch {
        window.__uiLayoutShift[policy].unsupported = true;
    }
};

const EXCLUDE_RECENT_INPUT: LayoutShiftFilterPolicy = "exclude-recent-input";
const INCLUDE_RECENT_INPUT: LayoutShiftFilterPolicy = "include-recent-input";

const readLayoutShiftState = ({
    page,
    policy,
}: {
    page: Page;
    policy: LayoutShiftFilterPolicy;
}): Promise<LayoutShiftState | undefined> => page.evaluate((p) => window.__uiLayoutShift?.[p], policy);

export type LayoutShiftTracker = {
    /** Installs the shared observer with the input-INCLUDING policy (D-K) — call after the route has settled. */
    readonly start: () => Promise<void>;
    /** The input-inclusive running total. Fails by name — never returns 0 — when the observer never attached. */
    readonly getScore: () => Promise<number>;
    /** Named for what it measures, not `assertMaxCLS`: an input-inclusive total is not CLS (D-K). */
    readonly assertMaxLayoutShift: (maxAllowed: number) => Promise<void>;
};

/* Version-pinned (D-D): an unpinned CDN URL is an unreviewed dependency that can change under a green suite. */
const REACT_SCAN_BUNDLE_URL = "https://unpkg.com/react-scan@0.5.7/dist/auto.global.js";

let reactScanBundlePromise: Promise<string> | undefined;

const fetchReactScanBundleUncached = async (): Promise<string> => {
    let response: Response;
    try {
        response = await fetch(REACT_SCAN_BUNDLE_URL);
    } catch (error) {
        throw new Error(
            `reactScan: could not reach ${REACT_SCAN_BUNDLE_URL} — this is the one fixture in this file that needs the network; ${String(error)}`,
        );
    }

    if (!response.ok) {
        throw new Error(
            `reactScan: fetching ${REACT_SCAN_BUNDLE_URL} returned HTTP ${String(response.status)} — this is the one fixture in this file that needs the network.`,
        );
    }

    return response.text();
};

/** Memoized at module scope so a multi-test run fetches once per worker, not once per test. */
const fetchReactScanBundle = (): Promise<string> => {
    reactScanBundlePromise ??= fetchReactScanBundleUncached().catch((error: unknown) => {
        reactScanBundlePromise = undefined; // let a later test in this worker retry rather than caching a transient failure forever
        throw error;
    });

    return reactScanBundlePromise;
};

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmenting the global Window interface via declaration merging requires `interface`; `type` cannot merge
    interface Window {
        /** Assigned by the fetched bundle itself (`Ku(); window.reactScan = Ku`) — the CDN build's own public entry point, empirically confirmed at 04-25 planning time (react-scan 0.5.7). */
        reactScan?: (options?: Record<string, unknown>) => void;
    }
}

export type ReactScan = () => Promise<void>;

export type QualityFixtures = {
    /** A zero-argument factory, so a probe can chain `include`/`exclude`/`withTags` per case without a shared instance leaking one case's narrowing into the next. */
    readonly axe: () => AxeBuilder;
    /** A Chromium-only capability (`e2e` uses `devices["Desktop Chrome"]`, so this always resolves). */
    readonly cdp: CDPSession;
    /** Opt-in per D-F: the threshold and selector are both defined against ONE chosen interaction. */
    readonly flickerTracker: FlickerTracker;
    /** Opt-in per D-F: a passive blanket delay would re-open the 2026-09-05 hazard on every write in the suite at once. */
    readonly optimisticRoute: OptimisticRoute;
    /** Opt-in: the interaction-window reading, INCLUDING input-initiated shifts (D-K) — see the passive gate for the excluding half. */
    readonly layoutShiftTracker: LayoutShiftTracker;
    /** Opt-in for a DIFFERENT reason than D-F: axe and layout-shift need no argument, but this needs a network fetch at setup time on a gate that now runs on every push (D-D). */
    readonly reactScan: ReactScan;
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

    optimisticRoute: [
        async ({ page }, provideFixture) => {
            await provideFixture(async ({ urlPattern, delayMs, match = isServerActionPost }) => {
                await page.route(urlPattern, async (route, request) => {
                    if (match(request)) {
                        await new Promise((resolve) => setTimeout(resolve, delayMs));
                    }

                    await route.continue();
                });
            });
        },
        { option: true },
    ],

    layoutShiftTracker: [
        async ({ page }, provideFixture) => {
            const getScore = async (): Promise<number> => {
                const state = await readLayoutShiftState({ page, policy: INCLUDE_RECENT_INPUT });

                if (isNil(state)) {
                    throw new Error(
                        "layoutShiftTracker: getScore() was called but the observer was never attached — call start() first.",
                    );
                }

                if (state.unsupported) {
                    throw new Error(
                        "layoutShiftTracker: the layout-shift entry type is not supported by this browser.",
                    );
                }

                return state.score;
            };

            await provideFixture({
                start: () => page.evaluate(installLayoutShiftObserver, INCLUDE_RECENT_INPUT),
                getScore,
                assertMaxLayoutShift: async (maxAllowed) => {
                    const score = await getScore();

                    if (score > maxAllowed) {
                        throw new Error(
                            `layoutShiftTracker: input-inclusive shift score ${String(score)} exceeds the allowed ${String(maxAllowed)}.`,
                        );
                    }
                },
            });
        },
        { option: true },
    ],

    reactScan: [
        async ({ page }, provideFixture) => {
            /*
             * An object, not a bare `let`: TS narrows a `let` reassigned only inside a callback
             * argument as if the reassignment always ran, making the check below dead code.
             */
            const state = { wasCalled: false };

            await provideFixture(async () => {
                const bundleText = await fetchReactScanBundle();
                /*
                 * Inline CONTENT, not a script tag pointing at the URL: `addInitScript` content runs
                 * before any page script, so it can instrument React's own chunks; an appended tag
                 * loads asynchronously and races the bundles it exists to wrap (T-04-52).
                 */
                await page.addInitScript({ content: bundleText });
                state.wasCalled = true;
            });

            if (!state.wasCalled) return;

            const attached = await page.evaluate(() => typeof window.reactScan === "function");

            if (!attached) {
                throw new Error(
                    `reactScan: opted in, but "window.reactScan" was never installed after this test's navigations — the CDN bundle may have lost the race with the app's own scripts, or executed with no effect.`,
                );
            }
        },
        { option: true },
    ],

    qualityGates: [
        async ({ page }, provideFixture, testInfo) => {
            /*
             * Setup, not teardown: an init script applies to every document created after it is
             * registered, and this runs before the test body's first navigation (D-C — this is the
             * standard-CLS half; the interaction-window half is `layoutShiftTracker` above).
             */
            await page.addInitScript(installLayoutShiftObserver, EXCLUDE_RECENT_INPUT);

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

            const shiftState = await readLayoutShiftState({ page, policy: EXCLUDE_RECENT_INPUT });

            if (isNil(shiftState)) {
                throw new Error("qualityGates: the layout-shift observer never attached before teardown ran.");
            }

            if (shiftState.unsupported) {
                throw new Error(
                    'qualityGates: the layout-shift entry type is not supported by this browser — expected devices["Desktop Chrome"] to always support it.',
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
                layoutShiftScore: shiftState.score,
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
