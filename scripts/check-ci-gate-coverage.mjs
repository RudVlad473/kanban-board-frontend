#!/usr/bin/env node
/*
 * Fails when a `run:` command in .github/workflows/ci.yml is covered by neither `pnpm verify`'s
 * VERIFY_STEPS nor a written exception below. Same shape as check-gitleaks-version.mjs: this file
 * treats ci.yml as the single source of truth, and this script extends that to the step list.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { VERIFY_STEPS } from "./verify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";

/*
 * Fixed-indent line parser, not a YAML parser (no dependency added). Assumes ci.yml's own layout:
 * 4-space job names under `jobs:`, 12-space `- run:` or `- name:`, 14-space bare `run:`, and a
 * `run: |` block whose members sit deeper than the `run:` line itself.
 */
export const parseWorkflowJobs = ({ workflow }) => {
    const jobs = [];
    let currentJob = null;
    let pendingRunBlock = null;
    let insideJobs = false;

    for (const rawLine of workflow.split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        const trimmed = line.trim();
        const indent = line.length - line.trimStart().length;

        if (pendingRunBlock) {
            if (trimmed === "") continue;
            if (indent > pendingRunBlock.indent) {
                currentJob.commands.push(trimmed);
                continue;
            }
            pendingRunBlock = null;
        }

        if (trimmed === "" || trimmed.startsWith("#")) continue;

        if (!insideJobs) {
            if (/^jobs:$/.test(line)) insideJobs = true;
            continue;
        }

        if (indent === 0) {
            insideJobs = false;
            currentJob = null;
            continue;
        }

        const jobMatch = /^ {4}([A-Za-z0-9_-]+):$/.exec(line);
        if (jobMatch) {
            currentJob = { name: jobMatch[1], commands: [] };
            jobs.push(currentJob);
            continue;
        }

        if (!currentJob) continue;

        const match = /^ {12}- run:\s*(.+)$/.exec(line) ?? /^ {14}run:\s*(.+)$/.exec(line);
        if (!match) continue;

        const value = match[1].trim();
        if (value === "|") {
            pendingRunBlock = { indent };
        } else {
            currentJob.commands.push(value);
        }
    }

    return jobs;
};

export const normalizeCommand = (command) => command.replace(/\s+/g, " ").trim();

/* Jobs never compared against VERIFY_STEPS. Every job in ci.yml must land in exactly one of this list or SCANNED_JOBS. */
export const JOB_EXCEPTIONS = [
    {
        job: "secrets",
        reason: "only this job sees full history, via the push event's ref range; the local hook only ever sees staged changes",
    },
    {
        job: "visual",
        reason: "348s locally, needs CI=1 and a fresh pnpm build-storybook (docs/adr/tech/0008's ignoreSnapshots), covers Storybook primitives only — reachable via pnpm test:visual",
    },
];

export const SCANNED_JOBS = ["quality", "e2e"];

/* Commands present in a scanned job's steps that are runner provisioning or CI-only plumbing, not gates. */
export const STEP_EXCEPTIONS = [
    { command: "pnpm install --frozen-lockfile", reason: "runner provisioning, not a gate" },
    {
        command: "pnpm exec playwright install --with-deps chromium",
        reason: "runner provisioning, not a gate",
    },
    {
        command: 'echo "SESSION_SECRET=$(openssl rand -base64 32)" >> "$GITHUB_ENV"',
        reason: "CI-only env plumbing; locally .env.local already supplies SESSION_SECRET",
    },
    {
        command: "pnpm e2e:cleanup",
        reason: "an if: always() safety net for a cancelled runner; locally globalTeardown already deletes what the run seeded",
    },
];

export const checkGateCoverage = ({
    workflow,
    verifySteps,
    scannedJobs = SCANNED_JOBS,
    jobExceptions = JOB_EXCEPTIONS,
    stepExceptions = STEP_EXCEPTIONS,
}) => {
    const jobs = parseWorkflowJobs({ workflow });
    if (jobs.length === 0) {
        return [{ kind: "unparsed-workflow", detail: "no jobs could be parsed from the workflow" }];
    }

    const violations = [];
    const coverage = new Set(
        verifySteps
            .map((step) => step.ciCommand)
            .filter(Boolean)
            .map(normalizeCommand),
    );
    const jobExceptionNames = new Set(jobExceptions.map((entry) => entry.job));
    const matchedStepExceptions = new Set();

    for (const job of jobs) {
        if (jobExceptionNames.has(job.name)) continue;

        if (!scannedJobs.includes(job.name)) {
            violations.push({
                kind: "unknown-job",
                detail: `job "${job.name}" is neither scanned nor in the exception list`,
            });
            continue;
        }

        if (job.commands.length === 0) {
            violations.push({ kind: "no-steps", detail: `job "${job.name}" has zero parsed run: steps` });
            continue;
        }

        for (const command of job.commands) {
            const normalized = normalizeCommand(command);
            if (coverage.has(normalized)) continue;

            const stepException = stepExceptions.find((entry) => normalizeCommand(entry.command) === normalized);
            if (stepException) {
                matchedStepExceptions.add(normalized);
                continue;
            }

            violations.push({
                kind: "uncovered-step",
                detail: `"${command}" in job "${job.name}" is covered by neither VERIFY_STEPS nor the exception list`,
            });
        }
    }

    for (const entry of jobExceptions) {
        if (!jobs.some((job) => job.name === entry.job)) {
            violations.push({
                kind: "stale-exception",
                detail: `job exception "${entry.job}" matches no job in the workflow`,
            });
        }
    }

    for (const entry of stepExceptions) {
        if (!matchedStepExceptions.has(normalizeCommand(entry.command))) {
            violations.push({
                kind: "stale-exception",
                detail: `step exception "${entry.command}" matches nothing in the workflow`,
            });
        }
    }

    return violations;
};

const runCli = () => {
    const workflow = readFileSync(path.resolve(repoRoot, CI_WORKFLOW_PATH), "utf8");
    const violations = checkGateCoverage({ workflow, verifySteps: VERIFY_STEPS });

    if (violations.length > 0) {
        console.error(`gates:check failed — ${CI_WORKFLOW_PATH} carries a gate pnpm verify does not cover.\n`);
        for (const violation of violations) {
            console.error(`  [${violation.kind}] ${violation.detail}`);
        }
        process.exit(1);
    }

    console.log(`gates:check passed — every ${CI_WORKFLOW_PATH} job is scanned or a documented exception.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
