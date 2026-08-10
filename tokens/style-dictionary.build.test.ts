import path from "node:path";
import { fileURLToPath } from "node:url";

import StyleDictionary from "style-dictionary";
import type { Config } from "style-dictionary/types";
import { describe, expect, it } from "vitest";

import { createConfig } from "../style-dictionary.config.mjs";

/**
 * D-12: a pipeline-level test asserting the Style Dictionary build's generated CSS actually
 * contains the expected token values, separate from any component test — a broken token edit
 * fails here with one clear error instead of N confusing component-test failures.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function buildModeCss(mode: "light" | "dark", platform: string) {
  const config = createConfig(mode) as unknown as Config;
  const absoluteConfig: Config = {
    ...config,
    source: (config.source ?? []).map((sourcePath) => path.join(repoRoot, sourcePath)),
  };
  const sd = new StyleDictionary(absoluteConfig);
  const [{ output }] = await sd.formatPlatform(platform);
  return output as string;
}

describe("style dictionary token pipeline (D-12)", () => {
  it("expands the composite font-heading-xl typography token into four individually-addressable custom properties", async () => {
    const css = await buildModeCss("light", "css");
    expect(css).toContain("@theme");
    expect(css).toContain("--font-heading-xl: Plus Jakarta Sans;");
    expect(css).toContain("--text-heading-xl: 24px;");
    expect(css).toContain("--font-weight-heading-xl: 700;");
    expect(css).toContain("--leading-heading-xl: 30px;");
  });

  it("carries font-heading-s's letter-spacing as a distinct --tracking-* custom property", async () => {
    const css = await buildModeCss("light", "css");
    expect(css).toContain("--tracking-heading-s: 2.4px;");
  });
});
