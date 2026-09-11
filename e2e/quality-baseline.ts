import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isNil } from "es-toolkit";

/*
 * No `@playwright/test` import anywhere in this module — the `node` Vitest project loads it in a
 * plain Node environment, so the comparator's both-directions proof costs no seeded account.
 */

/*
 * `process.cwd()`, not `import.meta.url`-derived `__dirname`: Playwright's own TS transform
 * targets CommonJS, where `import.meta` throws, so this module has to resolve the same way
 * `e2e/seed.ts` already does — relative to the repo root every `pnpm` script is invoked from.
 */
const QUALITY_BASELINE_PATH = path.join(process.cwd(), "e2e", "quality-baseline.json");

// comment-length-exempt: records the noUncheckedIndexedAccess/no-unnecessary-condition interaction that decides this type's shape, not the shape itself
/*
 * One test's reading, handed to the comparator by `qualityGates`'s teardown or replayed from the
 * record-mode log. `axeRuleCounts` counts violation NODES per rule id (D-L), never a bare id list.
 * Every map value below carries an explicit `| undefined`: `noUncheckedIndexedAccess` is off, so
 * without it an index read types as always-present and `no-unnecessary-condition` rejects the
 * absent-entry guards this whole gate depends on.
 */
export type QualityObservation = {
    readonly key: string;
    readonly specRelativePath: string;
    readonly axeRuleCounts: Record<string, number | undefined>;
    readonly evaluatedRuleTotal: number;
    readonly layoutShiftScore: number;
};

/** The recorded half of one test's gate — what a fresh `QualityObservation` is checked against. */
export type QualityBaselineEntry = {
    readonly axeRuleCounts: Record<string, number | undefined>;
    readonly flakyRuleIds: readonly string[];
    readonly evaluatedRuleFloor: number;
    readonly layoutShiftScore: number;
};

/** The committed file's whole shape — a stamp, a human note, and a map of key to entry. */
export type QualityBaselineFile = {
    readonly recordedAt: string;
    readonly note: string;
    readonly tests: Record<string, QualityBaselineEntry | undefined>;
};

/** A recorded rule id that disappeared or dropped in count — reported, never gated (D-E). */
export type QualityImprovement =
    | {
          readonly kind: "rule-disappeared";
          readonly ruleId: string;
          readonly recordedCount: number;
          readonly message: string;
      }
    | {
          readonly kind: "rule-count-decreased";
          readonly ruleId: string;
          readonly recordedCount: number;
          readonly observedCount: number;
          readonly message: string;
      };

export type QualityComparisonResult =
    | { readonly passed: true; readonly improvements: readonly QualityImprovement[] }
    | { readonly passed: false; readonly message: string; readonly improvements: readonly QualityImprovement[] };

export type QualityTolerances = { readonly layoutShiftFloor: number; readonly layoutShiftTolerance: number };

// comment-length-exempt: records the measurement these two numbers are now derived from and a since-corrected finding worth keeping visible, neither of which the constants alone can say
/*
 * MEASURED 2026-09-06 (04-24) against the whole `e2e` project's three-repeat record-mode spread
 * (median 1.8e-5, highest stable-scoped reading 0.00305) — both values confirmed with wide margin,
 * not raised. One test spiked to 0.0164 in the whole-suite recording run; a scoped, isolated
 * re-record of that spec alone did not reproduce it (three clean near-zero runs), pointing at
 * full-suite resource contention rather than the interaction itself — see the 04-24 pending todo.
 * `layoutShiftFloor` keeps a near-zero baseline from failing on any shift at all;
 * `layoutShiftTolerance` is the multiplier applied to `max(recorded, layoutShiftFloor)`.
 */
export const DEFAULT_QUALITY_TOLERANCES: QualityTolerances = { layoutShiftFloor: 0.01, layoutShiftTolerance: 1.5 };

const KEY_SEPARATOR = " :: ";

// comment-length-exempt: records the empirically-checked Playwright 1.62.1 titlePath fact this key format deliberately duplicates
/*
 * Playwright 1.62.1's own `TestInfo.titlePath` is documented as already starting with the file
 * name, so the explicit `specRelativePath` component below is belt-and-braces, not a bug fix.
 * `testInfo.file` is the documented, unambiguous source; the titlePath's leading element is only
 * loosely described in the type declaration. It also makes every key self-describing when grepping
 * the committed baseline for one spec's own entries.
 */
export const buildQualityKey = ({
    specRelativePath,
    titlePath,
}: {
    specRelativePath: string;
    titlePath: readonly string[];
}): string => `${specRelativePath}${KEY_SEPARATOR}${titlePath.join(" > ")}`;

/** The scoped re-record command a failure or an improvement report should name — never the whole-suite form. */
export const scopedRecordCommand = (specRelativePath: string): string => `pnpm e2e:baseline ${specRelativePath}`;

const sortRuleCounts = (counts: Record<string, number | undefined>): Record<string, number | undefined> =>
    Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));

/** One rule's axe-core result — decoupled from `@axe-core/playwright`'s own type so this module needs no Playwright dependency, even for types (see this file's own note above). */
type AxeRuleResult = { readonly id: string };

/** The four buckets every one of `AxeResults`'s rule results lands in — structurally what `@axe-core/playwright`'s own return shape already is. */
export type AxeResultBuckets = {
    readonly passes: readonly AxeRuleResult[];
    readonly violations: readonly AxeRuleResult[];
    readonly incomplete: readonly AxeRuleResult[];
    readonly inapplicable: readonly AxeRuleResult[];
};

// comment-length-exempt: records the confirmed axe-core behavior this dedup corrects for and the falsifiable evidence behind it, neither of which the one-line body conveys
/*
 * Deduplicates by rule id, DELIBERATELY: axe-core groups results by (rule id, verdict), not by
 * rule id alone. When a rule's matched nodes split across two verdicts — one heading passing
 * heading-order while a second, freshly-mounted heading is reported incomplete — the same rule id
 * appears as two separate result-bucket entries. Confirmed 2026-09-11 on this repo's own
 * `boards-create.e2e.spec.ts` BOARD-02 case: raw bucket-length sums varied run to run (90 vs 91)
 * against a byte-identical, fully-settled DOM (waiting longer before scanning changed nothing),
 * while the distinct rule-id count stayed at 89 every time. Counting distinct ids is what "did the
 * instrument install" actually needs to ask.
 */
export const countEvaluatedRules = (results: AxeResultBuckets): number =>
    new Set(
        [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map(
            (rule) => rule.id,
        ),
    ).size;

/** Builds a `QualityObservation` with its rule-count map keys sorted, so the serialized baseline diffs cleanly. */
export const buildQualityObservation = ({
    key,
    specRelativePath,
    axeRuleCounts,
    evaluatedRuleTotal,
    layoutShiftScore,
}: {
    key: string;
    specRelativePath: string;
    axeRuleCounts: Record<string, number | undefined>;
    evaluatedRuleTotal: number;
    layoutShiftScore: number;
}): QualityObservation => ({
    key,
    specRelativePath,
    axeRuleCounts: sortRuleCounts(axeRuleCounts),
    evaluatedRuleTotal,
    layoutShiftScore,
});

// comment-length-exempt: records D-E/D-L's one-directional gate shape and the flaky residual, which the code below implements but does not itself state
/*
 * The whole gate, one-directional (D-E): a NEW rule id or a RISEN count fails; a disappeared or
 * fallen count only ever reports an improvement. A flaky rule is ungated in both presence and
 * count — the residual D-E's flaky classification always carried, now widened by count (D-L).
 */
export const compareQualityObservation = ({
    observation,
    entry,
    tolerances = DEFAULT_QUALITY_TOLERANCES,
}: {
    observation: QualityObservation;
    entry: QualityBaselineEntry | undefined;
    tolerances?: QualityTolerances;
}): QualityComparisonResult => {
    if (isNil(entry)) {
        return {
            passed: false,
            message: `No baseline entry for "${observation.key}". Record one with \`${scopedRecordCommand(observation.specRelativePath)}\`.`,
            improvements: [],
        };
    }

    if (observation.evaluatedRuleTotal < entry.evaluatedRuleFloor) {
        return {
            passed: false,
            message:
                `Vacuous accessibility scan for "${observation.key}": evaluated-rule total ` +
                `${String(observation.evaluatedRuleTotal)} is below the recorded floor ${String(entry.evaluatedRuleFloor)} ` +
                "— the axe instrument may not have installed.",
            improvements: [],
        };
    }

    const flaky = new Set(entry.flakyRuleIds);
    const failures: string[] = [];
    const improvements: QualityImprovement[] = [];
    const recordCommand = scopedRecordCommand(observation.specRelativePath);

    for (const [ruleId, observedCount] of Object.entries(observation.axeRuleCounts)) {
        if (flaky.has(ruleId) || isNil(observedCount)) continue;

        const recordedCount = entry.axeRuleCounts[ruleId];

        if (isNil(recordedCount)) {
            failures.push(`"${ruleId}" fired ${String(observedCount)} time(s) and is not in the baseline`);
            continue;
        }

        if (observedCount > recordedCount) {
            failures.push(`"${ruleId}" rose from ${String(recordedCount)} to ${String(observedCount)} occurrence(s)`);
        }
    }

    for (const [ruleId, recordedCount] of Object.entries(entry.axeRuleCounts)) {
        if (flaky.has(ruleId) || isNil(recordedCount)) continue;

        const observedCount = observation.axeRuleCounts[ruleId];

        if (isNil(observedCount)) {
            improvements.push({
                kind: "rule-disappeared",
                ruleId,
                recordedCount,
                message: `"${ruleId}" no longer fires for "${observation.key}" (was ${String(recordedCount)}). Tighten the baseline with \`${recordCommand}\`.`,
            });
            continue;
        }

        if (observedCount < recordedCount) {
            improvements.push({
                kind: "rule-count-decreased",
                ruleId,
                recordedCount,
                observedCount,
                message: `"${ruleId}" fell from ${String(recordedCount)} to ${String(observedCount)} occurrence(s) for "${observation.key}". Tighten the baseline with \`${recordCommand}\`.`,
            });
        }
    }

    /*
     * Rule 6 — the layout-shift half, one-directional in exactly the same way (D-K): a score UNDER
     * the baseline has never failed and never will, matching the axe half's own asymmetry.
     */
    const shiftCeiling =
        Math.max(entry.layoutShiftScore, tolerances.layoutShiftFloor) * tolerances.layoutShiftTolerance;
    if (observation.layoutShiftScore > shiftCeiling) {
        failures.push(
            `layout-shift score ${String(observation.layoutShiftScore)} exceeds the allowed ceiling ${String(shiftCeiling)} (recorded ${String(entry.layoutShiftScore)}, floor ${String(tolerances.layoutShiftFloor)}, tolerance ${String(tolerances.layoutShiftTolerance)})`,
        );
    }

    if (failures.length > 0) {
        return {
            passed: false,
            message: `Quality regression for "${observation.key}": ${failures.join("; ")}. Re-record with \`${recordCommand}\` once addressed.`,
            improvements,
        };
    }

    return { passed: true, improvements };
};

/** Parses the committed baseline off disk — a cast, following `e2e/seed.ts`'s own shape, never a JSON import (which would cache stale between a record pass and a check pass in one process). */
export const readQualityBaseline = (): QualityBaselineFile =>
    JSON.parse(readFileSync(QUALITY_BASELINE_PATH, "utf8")) as QualityBaselineFile;

/** Serializes at four-space indentation with a trailing newline, matching `.prettierrc.json` (`e2e/` is a `pnpm format:check` target). */
export const writeQualityBaseline = (baseline: QualityBaselineFile): void => {
    writeFileSync(QUALITY_BASELINE_PATH, `${JSON.stringify(baseline, null, 4)}\n`);
};
