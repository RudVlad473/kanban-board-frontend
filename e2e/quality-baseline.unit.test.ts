import { describe, expect, it } from "vitest";

import { buildQualityObservation, compareQualityObservation, type QualityBaselineEntry } from "./quality-baseline";

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
});
