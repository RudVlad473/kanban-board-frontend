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
                     * Node-mode tests for the session module and, since plan 01-11, the BFF auth
                     * Route Handlers — both mock `next/headers`' `cookies()` (no real Next.js
                     * request scope exists outside an actual render). No mock server stands in for
                     * the external API anymore (GC-22) — every call this project resolves dials the
                     * deployed nonprod backend directly, the same path the deployed app uses, not a
                     * browser environment.
                     */
                    name: "node",
                    environment: "node",
                    include: [
                        "src/lib/server/session.test.ts",
                        "app/api/auth/**/*.test.ts",
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
                resolve: { alias },
                test: {
                    name: "browser",
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
                 * Aliased with the `server-only` stub too (not just plain `alias`) — a jsdom test
                 * can import a module that starts with `import "server-only"` (e.g.
                 * `session-cookie.ts`) the same way the `node` project already can, per this
                 * repo's own `server-only-stub.ts` documentation, which states the stub applies
                 * "for every test project."
                 */
                resolve: { alias: aliasWithServerOnlyStub },
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
                    /*
                     * `actions.unit.test.ts` (plan 01-33) imports `@/features/auth/actions`, which
                     * imports the real (unmocked) `@/lib/server/session` — that module throws at
                     * import time when `SESSION_SECRET` is unset, the same guard the "node"
                     * project's own `env` block above already works around for `session.test.ts`.
                     * Mirrors that project's fallback exactly.
                     */
                    env: {
                        SESSION_SECRET: process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production",
                    },
                },
            },
            {
                /*
                 * The sign-in/sign-up stories (plan 01-33) render `SignInForm`/`SignUpForm`, which
                 * import the real `signInAction`/`signUpAction` from `@/features/auth/actions` — a
                 * `"use server"` module whose import chain reaches `node:crypto` via
                 * `@/lib/server/session`. `@storybook/nextjs-vite`'s Vitest-driven story rendering has
                 * no server/client build split for `"use server"` modules, so it bundles that chain
                 * whole for the browser and fails on the Node built-in. Aliased to a no-op stand-in
                 * for this project only — no story ever submits a form (D-25), so the real action
                 * is never actually invoked, only referenced.
                 */
                resolve: {
                    /*
                     * The specific alias must be listed BEFORE the general `@` -> `src` alias:
                     * Vite tries aliases in array order and the general `@` prefix rule would
                     * otherwise match first (every `@/...` import starts with `@`), rewriting the
                     * path before this more specific entry ever gets a chance to apply.
                     */
                    alias: [
                        {
                            find: "@/features/auth/actions",
                            replacement: path.resolve(rootDir, "src/test-utils/actions-storybook-stub.ts"),
                        },
                        {
                            find: "@/features/theme/actions",
                            replacement: path.resolve(rootDir, "src/test-utils/theme-actions-storybook-stub.ts"),
                        },
                        ...alias,
                    ],
                },
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
