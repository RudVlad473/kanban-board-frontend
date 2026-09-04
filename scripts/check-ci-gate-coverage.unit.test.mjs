import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { checkGateCoverage, parseWorkflowJobs } from "./check-ci-gate-coverage.mjs";
import { VERIFY_STEPS } from "./verify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const indent = (n) => " ".repeat(n);

/** Fixture builder only — matches ci.yml's own 4/8/12/14/18-space layout, no case reads real fs. */
const buildWorkflow = ({ jobs }) => {
    const lines = ["name: CI", "", "jobs:"];

    for (const job of jobs) {
        lines.push(`${indent(4)}${job.name}:`);
        lines.push(`${indent(8)}steps:`);

        for (const step of job.steps ?? []) {
            if (step.run !== undefined) {
                lines.push(`${indent(12)}- run: ${step.run}`);
            } else if (step.nameRun !== undefined) {
                lines.push(`${indent(12)}- name: ${step.nameRun.name}`);
                lines.push(`${indent(14)}run: ${step.nameRun.run}`);
            } else if (step.runBlock !== undefined) {
                lines.push(`${indent(12)}- name: ${step.runBlock.name}`);
                lines.push(`${indent(14)}run: |`);
                for (const cmd of step.runBlock.commands) lines.push(`${indent(18)}${cmd}`);
            } else if (step.uses !== undefined) {
                lines.push(`${indent(12)}- uses: ${step.uses}`);
            }
        }
    }

    return lines.join("\n");
};

const scannedJobs = ["quality"];
const jobExceptions = [{ job: "secrets", reason: "test-only exception" }];
const stepExceptions = [{ command: "pnpm setup:only", reason: "test-only exception" }];

describe("checkGateCoverage — regression pin", () => {
    it("passes against the real committed ci.yml (the case that would have caught the comments:check gap)", () => {
        // Arrange
        const workflow = readFileSync(path.resolve(repoRoot, ".github/workflows/ci.yml"), "utf8");

        // Act, Assert
        expect(checkGateCoverage({ workflow, verifySteps: VERIFY_STEPS })).toEqual([]);
    });
});

describe("parseWorkflowJobs", () => {
    it("reads all three run: spellings — dash-inline, after name:, and a run: | block", () => {
        // Arrange
        const workflow = buildWorkflow({
            jobs: [
                {
                    name: "quality",
                    steps: [
                        { run: "pnpm a:check" },
                        { nameRun: { name: "B check", run: "pnpm b:check" } },
                        { runBlock: { name: "Two-command block", commands: ["pnpm c:one", "pnpm c:two"] } },
                    ],
                },
            ],
        });

        // Act
        const jobs = parseWorkflowJobs({ workflow });

        // Assert
        expect(jobs).toEqual([
            { name: "quality", commands: ["pnpm a:check", "pnpm b:check", "pnpm c:one", "pnpm c:two"] },
        ]);
    });
});

describe("checkGateCoverage — fixtures", () => {
    it("uncovered-step: an uncovered command in a scanned job produces exactly one violation naming it", () => {
        // Arrange
        const workflow = buildWorkflow({
            jobs: [
                { name: "secrets", steps: [{ uses: "gitleaks/gitleaks-action@v3" }] },
                { name: "quality", steps: [{ run: "pnpm bogus:check" }] },
            ],
        });

        // Act
        const violations = checkGateCoverage({
            workflow,
            verifySteps: [],
            scannedJobs,
            jobExceptions,
            stepExceptions: [],
        });

        // Assert
        expect(violations).toEqual([{ kind: "uncovered-step", detail: expect.stringContaining("pnpm bogus:check") }]);
    });

    it("unknown-job: a job that is neither scanned nor excepted fails, naming it", () => {
        // Arrange
        const workflow = buildWorkflow({
            jobs: [
                { name: "secrets", steps: [{ uses: "gitleaks/gitleaks-action@v3" }] },
                { name: "quality", steps: [{ run: "pnpm ok:check" }] },
                { name: "deploy", steps: [{ run: "pnpm deploy" }] },
            ],
        });

        // Act
        const violations = checkGateCoverage({
            workflow,
            verifySteps: [{ ciCommand: "pnpm ok:check" }],
            scannedJobs,
            jobExceptions,
            stepExceptions: [],
        });

        // Assert
        expect(violations).toEqual([{ kind: "unknown-job", detail: expect.stringContaining("deploy") }]);
    });

    it("stale-exception: a job exception matching no job in the workflow fails", () => {
        // Arrange
        const workflow = buildWorkflow({ jobs: [{ name: "quality", steps: [{ run: "pnpm ok:check" }] }] });

        // Act
        const violations = checkGateCoverage({
            workflow,
            verifySteps: [{ ciCommand: "pnpm ok:check" }],
            scannedJobs,
            jobExceptions,
            stepExceptions: [],
        });

        // Assert
        expect(violations).toEqual([{ kind: "stale-exception", detail: expect.stringContaining("secrets") }]);
    });

    it("stale-exception: a step exception matching nothing in the workflow fails", () => {
        // Arrange
        const workflow = buildWorkflow({
            jobs: [
                { name: "secrets", steps: [] },
                { name: "quality", steps: [{ run: "pnpm ok:check" }] },
            ],
        });

        // Act
        const violations = checkGateCoverage({
            workflow,
            verifySteps: [{ ciCommand: "pnpm ok:check" }],
            scannedJobs,
            jobExceptions,
            stepExceptions,
        });

        // Assert
        expect(violations).toEqual([{ kind: "stale-exception", detail: expect.stringContaining("pnpm setup:only") }]);
    });

    it("no-steps: a scanned job with zero run: steps fails rather than reading as agreement", () => {
        // Arrange
        const workflow = buildWorkflow({
            jobs: [
                { name: "secrets", steps: [] },
                { name: "quality", steps: [{ uses: "actions/checkout@v5" }] },
            ],
        });

        // Act
        const violations = checkGateCoverage({
            workflow,
            verifySteps: [],
            scannedJobs,
            jobExceptions,
            stepExceptions: [],
        });

        // Assert
        expect(violations).toEqual([{ kind: "no-steps", detail: expect.stringContaining("quality") }]);
    });

    it("unparsed-workflow: empty input fails rather than passing", () => {
        // Arrange, Act
        const violations = checkGateCoverage({ workflow: "", verifySteps: [] });

        // Assert
        expect(violations).toEqual([{ kind: "unparsed-workflow", detail: expect.any(String) }]);
    });
});
