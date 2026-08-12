import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

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

export default defineConfig({
    test: {
        projects: [
            {
                resolve: { alias },
                test: {
                    name: "tokens",
                    environment: "node",
                    include: ["tokens/**/*.test.ts"],
                },
            },
            {
                resolve: { alias: aliasWithServerOnlyStub },
                test: {
                    /*
                     * Node-mode tests for the MSW mock backend (plan 01-10) and, since plan 01-11,
                     * the session module and BFF auth Route Handlers — both mock `next/headers`'
                     * `cookies()` (no real Next.js request scope exists outside an actual render)
                     * and, for the Route Handler tests, also drive the handlers through the real
                     * `externalApi` client with the Node MSW server listening, the same path the
                     * deployed app uses, not a browser environment.
                     */
                    name: "node",
                    environment: "node",
                    include: ["src/lib/mocks/**/*.test.ts", "src/lib/session.test.ts", "app/api/auth/**/*.test.ts"],
                    env: {
                        EXTERNAL_API_BASE_URL: process.env.EXTERNAL_API_BASE_URL ?? "http://localhost:8080/api",
                        SESSION_SECRET: process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production",
                    },
                },
            },
            {
                resolve: { alias },
                test: {
                    name: "browser",
                    include: ["src/**/*.test.tsx"],
                    exclude: ["src/**/*.unit.test.tsx"],
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
                resolve: { alias },
                test: {
                    /*
                     * jsdom, not real-browser: for pure logic/hook tests with no CSS layout or
                     * paint dependency (e.g. React Testing Library + user-event). Component tests
                     * that assert computed styles (variant/size CSS, axe-core) belong in the
                     * "browser" project above instead — jsdom fakes computed styles from declared
                     * rules rather than actually resolving Tailwind's custom-property-driven
                     * values, so it can't stand in for real rendering there.
                     */
                    name: "unit",
                    environment: "jsdom",
                    include: ["src/**/*.unit.test.{ts,tsx}"],
                    setupFiles: ["./vitest.setup.unit.ts"],
                },
            },
            {
                resolve: { alias },
                plugins: [storybookTest({ configDir: path.join(rootDir, ".storybook") })],
                test: {
                    name: "storybook",
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
