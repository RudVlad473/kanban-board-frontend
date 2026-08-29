import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { resolveTestApiBaseUrl } from "./src/test-utils/api-base-url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/*
 * Derive the `@/...` Vite/Vitest resolve aliases from tsconfig.json's own `compilerOptions.paths`
 * instead of restating the five aliases by hand — an alias added later to tsconfig.json is picked
 * up here automatically, so the two files can never drift apart.
 */
type TsconfigShape = {
    compilerOptions: { paths: Record<string, string[]> };
};

const tsconfig = JSON.parse(readFileSync(path.join(rootDir, "tsconfig.json"), "utf-8")) as TsconfigShape;

const alias = Object.entries(tsconfig.compilerOptions.paths).map(([key, [target]]) => ({
    find: key.replace(/\/\*$/, ""),
    replacement: path.resolve(rootDir, target.replace(/\/\*$/, "")),
}));

/*
 * `server-only`'s real package throws unconditionally when required outside Next.js's own
 * webpack build (see src/test-utils/server-only-stub.ts) — every test project gets this alias so
 * any module under test that starts with `import "server-only"` can still be imported here.
 */
const serverOnlyAlias = {
    find: "server-only",
    replacement: path.resolve(rootDir, "src/test-utils/server-only-stub.ts"),
};
const aliasWithServerOnlyStub = [...alias, serverOnlyAlias];

/*
 * Real stub modules (not Vitest mocks; must stay before the general `@` alias) for every Server
 * Action a story test imports — real import chains reach `node:crypto`, unbundlable in a browser
 * test page. Formally carved out in docs/adr/tech/0020's "Server Action alias carve-out".
 */
const serverActionStubAlias = [
    {
        find: "@/features/auth/actions/sign-in",
        replacement: path.resolve(rootDir, "src/test-utils/sign-in-action-storybook-stub.ts"),
    },
    {
        find: "@/features/auth/actions/sign-up",
        replacement: path.resolve(rootDir, "src/test-utils/sign-up-action-storybook-stub.ts"),
    },
    {
        find: "@/features/auth/actions/sign-out",
        replacement: path.resolve(rootDir, "src/test-utils/sign-out-action-storybook-stub.ts"),
    },
    {
        find: "@/features/theme/actions/update-theme",
        replacement: path.resolve(rootDir, "src/test-utils/update-theme-action-storybook-stub.ts"),
    },
    /*
     * The columns entry must precede the board one — Vite matches a string `find` by prefix, so
     * `create-board` would otherwise swallow `create-board-columns` too.
     */
    {
        find: "@/features/boards/actions/create-board-columns",
        replacement: path.resolve(rootDir, "src/test-utils/create-board-columns-action-storybook-stub.ts"),
    },
    {
        find: "@/features/boards/actions/create-board",
        replacement: path.resolve(rootDir, "src/test-utils/create-board-action-storybook-stub.ts"),
    },
    {
        find: "@/features/boards/actions/rename-board",
        replacement: path.resolve(rootDir, "src/test-utils/rename-board-action-storybook-stub.ts"),
    },
    {
        find: "@/features/boards/actions/delete-board",
        replacement: path.resolve(rootDir, "src/test-utils/delete-board-action-storybook-stub.ts"),
    },
];

export default defineConfig({
    test: {
        projects: [
            {
                resolve: { alias },
                test: {
                    name: "tokens",
                    sequence: { groupOrder: 0 },
                    environment: "node",
                    include: ["tokens/**/*.test.ts"],
                },
            },
            {
                resolve: { alias: aliasWithServerOnlyStub },
                test: {
                    /*
                     * Real-backend integration project (CONVENTIONS.md's test-location table) — no
                     * mock server stands in for the external API (GC-22); every call dials the
                     * deployed nonprod backend directly, the same path the deployed app uses.
                     */
                    name: "node",
                    sequence: { groupOrder: 0 },
                    environment: "node",
                    globalSetup: ["./src/test-utils/vitest-nonprod-cleanup.ts"],
                    include: [
                        "src/lib/server/session.test.ts",
                        "src/**/*.integration.test.ts",
                        // Plain Node ESM with no jsdom/React dependency — belongs here, not "unit".
                        "scripts/**/*.unit.test.mjs",
                    ],
                    env: {
                        EXTERNAL_API_BASE_URL: resolveTestApiBaseUrl(),
                        SESSION_SECRET: process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production",
                    },
                },
            },
            {
                resolve: { alias: [...serverActionStubAlias, ...alias] },
                test: {
                    name: "browser",
                    sequence: { groupOrder: 1 },
                    /*
                     * Capped so the two Chromium projects cannot starve each other under `pnpm test`
                     * (CONVENTIONS.md, "Test runner concurrency").
                     */
                    maxWorkers: 2,
                    include: ["src/**/*.test.tsx", "app/**/*.test.tsx"],
                    exclude: ["src/**/*.unit.test.tsx", "app/**/*.unit.test.tsx"],
                    setupFiles: ["./vitest.setup.ts"],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
            {
                /*
                 * Aliased with the `server-only` stub too — a jsdom test can import a module
                 * starting `import "server-only"` the same way the `node` project already can.
                 */
                resolve: { alias: aliasWithServerOnlyStub },
                test: {
                    /*
                     * Hook/logic project (CONVENTIONS.md's test-location table) — jsdom fakes
                     * computed styles from declared rules rather than resolving Tailwind's real
                     * custom-property values, so component style assertions stay in "browser".
                     */
                    name: "unit",
                    sequence: { groupOrder: 0 },
                    environment: "jsdom",
                    include: ["src/**/*.unit.test.{ts,tsx}"],
                    setupFiles: ["./vitest.setup.unit.ts"],
                    /*
                     * Mirrors the "node" project's own `env` fallback above — a real (unmocked)
                     * `@/lib/server/session` import throws at import time when `SESSION_SECRET` is
                     * unset (hit by `actions.unit.test.ts`, plan 01-33).
                     */
                    env: {
                        SESSION_SECRET: process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production",
                    },
                },
            },
            {
                /*
                 * Stories render components importing real Server Action modules, but Storybook's
                 * Vitest-driven rendering has no server/client build split for them — the same
                 * `serverActionStubAlias` used by "browser" above stands in here too.
                 */
                resolve: {
                    alias: [...serverActionStubAlias, ...alias],
                },
                plugins: [storybookTest({ configDir: path.join(rootDir, ".storybook") })],
                test: {
                    name: "storybook",
                    sequence: { groupOrder: 2 },
                    // Capped for the same contention reason as the "browser" project above.
                    maxWorkers: 2,
                    setupFiles: ["./.storybook/vitest.setup.ts"],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
        ],
    },
});
