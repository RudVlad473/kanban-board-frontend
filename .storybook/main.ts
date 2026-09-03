import { existsSync } from "node:fs";
import path from "node:path";

import type { StorybookConfig } from "@storybook/nextjs-vite";

import { serverActionStubPlugin } from "../scripts/vite-plugin-server-action-stub.mjs";

const rootDir = path.join(import.meta.dirname, "..");

/*
 * No dedicated "Tokens" documentation page — primitives' own stories are the
 * documentation, so no @storybook/addon-docs entry is registered here.
 */
const config: StorybookConfig = {
    framework: "@storybook/nextjs-vite",
    stories: ["../src/**/*.stories.tsx"],
    addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
    ...(existsSync(path.join(rootDir, "public")) ? { staticDirs: ["../public"] } : {}),
    /*
     * The `pnpm storybook` dev server resolves Server Actions the same way the "browser" and
     * "storybook" Vitest projects do. Without this it loaded the real modules and any story whose
     * import chain reached `src/lib/server/session.ts` died on externalized `node:crypto`.
     */
    viteFinal: (viteConfig) => ({
        ...viteConfig,
        plugins: [...(viteConfig.plugins ?? []), serverActionStubPlugin({ rootDir })],
    }),
};

export default config;
