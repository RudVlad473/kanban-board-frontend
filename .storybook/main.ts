import { existsSync } from "node:fs";
import path from "node:path";

import type { StorybookConfig } from "@storybook/nextjs-vite";

const rootDir = path.join(import.meta.dirname, "..");

// D-11: no dedicated "Tokens" documentation page — primitives' own stories are the
// documentation, so no @storybook/addon-docs entry is registered here.
const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  ...(existsSync(path.join(rootDir, "public")) ? { staticDirs: ["../public"] } : {}),
};

export default config;
