import { describe, expect, it } from "vitest";

import {
    type AxeResultBuckets,
    buildQualityObservation,
    compareQualityObservation,
    countEvaluatedRules,
    type QualityBaselineEntry,
    type QualityTolerances,
} from "./quality-baseline";

const KEY = "e2e/quality-fixtures.e2e.spec.ts :: quality gates > passes";
const SPEC = "e2e/quality-fixtures.e2e.spec.ts";

const observation = (axeRuleCounts: Record<string, number>) =>
    buildQualityObservation({
        key: KEY,
        specRelativePath: SPEC,
        axeRuleCounts,
        evaluatedRuleTotal: 100,
        layoutShiftScore: 0,
    });

const entry = (overrides: Partial<QualityBaselineEntry> = {}): QualityBaselineEntry => ({
    axeRuleCounts: { "button-name": 1 },
    flakyRuleIds: [],
    evaluatedRuleFloor: 10,
    layoutShiftScore: 0,
    ...overrides,
});

describe("countEvaluatedRules", () => {
    const buckets = (overrides: Partial<AxeResultBuckets>): AxeResultBuckets => ({
        passes: [],
        violations: [],
        incomplete: [],
        inapplicable: [],
        ...overrides,
    });

    it("counts each distinct rule id once when its matched nodes share a single verdict", () => {
        // Act
        const total = countEvaluatedRules(buckets({ passes: [{ id: "heading-order" }, { id: "button-name" }] }));

        // Assert
        expect(total).toBe(2);
    });

    // comment-length-exempt: records the confirmed axe-core behavior this test pins, which the assertion alone doesn't convey
    /*
     * Confirmed 2026-09-11 (`vacuous-a11y-scan-parallel` debug session): axe-core groups results by
     * (rule id, verdict), not rule id alone. When a rule's matched nodes split across two verdicts
     * — one heading passing heading-order while a second, freshly-mounted heading is reported
     * incomplete — the SAME rule id appears as two separate result-bucket entries. A naive
     * bucket-length sum (`passes.length + violations.length + ...`) counted heading-order TWICE
     * here (3), which is exactly why `evaluatedRuleTotal` flickered between 90 and 91 for a
     * byte-identical, fully-settled page. This must count it once (2) — the real, stable number of
     * distinct rules axe evaluated.
     */
    it("counts a rule once even when its matched nodes split across two different verdicts", () => {
        // Act
        const total = countEvaluatedRules(
            buckets({
                passes: [{ id: "heading-order" }, { id: "button-name" }],
                incomplete: [{ id: "heading-order" }],
            }),
        );

        // Assert
        expect(total).toBe(2);
    });

    it("counts a rule once even when it appears in all four buckets at once", () => {
        // Act
        const total = countEvaluatedRules(
            buckets({
                passes: [{ id: "heading-order" }],
                violations: [{ id: "heading-order" }],
                incomplete: [{ id: "heading-order" }],
                inapplicable: [{ id: "heading-order" }],
            }),
        );

        // Assert
        expect(total).toBe(1);
    });

    it("returns 0 for a completely empty result set", () => {
        // Act
        const total = countEvaluatedRules(buckets({}));

        // Assert
        expect(total).toBe(0);
    });
});

describe("compareQualityObservation", () => {
    it("fails naming the rule when an observed id is not in the baseline", () => {
        // Act
        const result = compareQualityObservation({
            observation: observation({ "button-name": 1, "color-contrast": 1 }),
            entry: entry(),
        });

        // Assert
        expect(result.passed).toBe(false);
        expect(!result.passed && result.message).toContain("color-contrast");
        expect(!result.passed && result.message).toContain("not in the baseline");
    });

    it("fails naming the rule and both counts when a recorded rule's count rises", () => {
        // Act
        const result = compareQualityObservation({
            observation: observation({ "button-name": 3 }),
            entry: entry({ axeRuleCounts: { "button-name": 1 } }),
        });

        // Assert
        expect(result.passed).toBe(false);
        const message = !result.passed ? result.message : "";
        expect(message).toContain("button-name");
        expect(message).toContain("1");
        expect(message).toContain("3");
    });

    it("passes and reports a disappeared rule as an improvement, never a failure", () => {
        // Act
        const result = compareQualityObservation({
            observation: observation({}),
            entry: entry({ axeRuleCounts: { "button-name": 1 } }),
        });

        // Assert
        expect(result.passed).toBe(true);
        expect(result.improvements).toEqual([
            expect.objectContaining({ kind: "rule-disappeared", ruleId: "button-name", recordedCount: 1 }),
        ]);
    });

    it("passes and reports a partial improvement when a recorded rule's count falls", () => {
        // Act
        const result = compareQualityObservation({
            observation: observation({ "button-name": 1 }),
            entry: entry({ axeRuleCounts: { "button-name": 3 } }),
        });

        // Assert
        expect(result.passed).toBe(true);
        expect(result.improvements).toEqual([
            expect.objectContaining({
                kind: "rule-count-decreased",
                ruleId: "button-name",
                recordedCount: 3,
                observedCount: 1,
            }),
        ]);
    });

    it("fails naming the key when there is no baseline entry at all", () => {
        // Act
        const result = compareQualityObservation({ observation: observation({}), entry: undefined });

        // Assert
        expect(result.passed).toBe(false);
        expect(!result.passed && result.message).toContain(KEY);
    });

    it("fails naming the evaluated-rule total when it is below the recorded vacuity floor", () => {
        // Act
        const result = compareQualityObservation({
            observation: buildQualityObservation({
                key: KEY,
                specRelativePath: SPEC,
                axeRuleCounts: {},
                evaluatedRuleTotal: 2,
                layoutShiftScore: 0,
            }),
            entry: entry({ evaluatedRuleFloor: 10 }),
        });

        // Assert
        expect(result.passed).toBe(false);
        const message = !result.passed ? result.message : "";
        expect(message).toContain("2");
        expect(message).toContain("10");
    });

    it("passes with no improvements when counts match, regardless of a flaky rule's presence, absence or count", () => {
        // Act — a flaky rule present at a different count than its own (irrelevant) recorded entry.
        const result = compareQualityObservation({
            observation: observation({ "button-name": 1, "aria-hidden-focus": 9 }),
            entry: entry({
                axeRuleCounts: { "button-name": 1, "aria-hidden-focus": 1 },
                flakyRuleIds: ["aria-hidden-focus"],
            }),
        });

        // Assert
        expect(result.passed).toBe(true);
        expect(result.improvements).toEqual([]);

        // Act — the same flaky rule, this time absent from the observation entirely.
        const withoutFlaky = compareQualityObservation({
            observation: observation({ "button-name": 1 }),
            entry: entry({
                axeRuleCounts: { "button-name": 1, "aria-hidden-focus": 1 },
                flakyRuleIds: ["aria-hidden-focus"],
            }),
        });

        // Assert — an absent flaky rule is not reported as an improvement either.
        expect(withoutFlaky.passed).toBe(true);
        expect(withoutFlaky.improvements).toEqual([]);
    });

    const FIXED_TOLERANCES: QualityTolerances = { layoutShiftFloor: 0, layoutShiftTolerance: 1 };

    it("fails when the observed layout-shift score exceeds the allowed ceiling", () => {
        // Act
        const result = compareQualityObservation({
            observation: buildQualityObservation({
                key: KEY,
                specRelativePath: SPEC,
                axeRuleCounts: {},
                evaluatedRuleTotal: 100,
                layoutShiftScore: 0.2,
            }),
            entry: entry({ layoutShiftScore: 0.1 }),
            tolerances: FIXED_TOLERANCES,
        });

        // Assert
        expect(result.passed).toBe(false);
        const message = !result.passed ? result.message : "";
        expect(message).toContain("layout-shift");
        expect(message).toContain("0.2");
    });

    it("passes when the observed layout-shift score is under the allowed ceiling", () => {
        // Act
        const result = compareQualityObservation({
            observation: buildQualityObservation({
                key: KEY,
                specRelativePath: SPEC,
                axeRuleCounts: {},
                evaluatedRuleTotal: 100,
                layoutShiftScore: 0.05,
            }),
            entry: entry({ layoutShiftScore: 0.1 }),
            tolerances: FIXED_TOLERANCES,
        });

        // Assert
        expect(result.passed).toBe(true);
    });
});
