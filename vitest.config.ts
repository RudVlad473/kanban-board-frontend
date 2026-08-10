import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Derive the `@/...` Vite/Vitest resolve aliases from tsconfig.json's own `compilerOptions.paths`
// instead of restating the five aliases by hand — an alias added later to tsconfig.json is picked
// up here automatically, so the two files can never drift apart.
type TsconfigShape = {
  compilerOptions: { paths: Record<string, string[]> };
};

const tsconfig = JSON.parse(readFileSync(path.join(rootDir, "tsconfig.json"), "utf-8")) as TsconfigShape;

const alias = Object.entries(tsconfig.compilerOptions.paths).map(([key, [target]]) => ({
  find: key.replace(/\/\*$/, ""),
  replacement: path.resolve(rootDir, target.replace(/\/\*$/, "")),
}));

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
        resolve: { alias },
        test: {
          name: "browser",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
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
