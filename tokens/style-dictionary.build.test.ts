import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import StyleDictionary from "style-dictionary";
import { describe, expect, it } from "vitest";

import config from "../style-dictionary.config.mjs";

/**
 * D-12: a pipeline-level test asserting the Style Dictionary build's generated CSS actually
 * contains the expected token values, separate from any component test — a broken token edit
 * fails here with one clear error instead of N confusing component-test failures.
 *
 * Builds into a temp directory (never the committed `src/styles/tokens.css`) so running the
 * test suite has no side effect on tracked output.
 */
async function buildToTempDir(overrideConfig: Record<string, unknown> = {}) {
  const outDir = mkdtempSync(path.join(tmpdir(), "sd-test-"));
  const sd = new StyleDictionary({
    ...config,
    ...overrideConfig,
    platforms: {
      css: {
        ...config.platforms.css,
        buildPath: `${outDir}/`,
      },
    },
  });
  await sd.buildAllPlatforms();
  const css = readFileSync(path.join(outDir, "tokens.css"), "utf8");
  return { css, outDir };
}

describe("style dictionary token pipeline", () => {
  it("expands the composite font-heading-xl typography token into four individually-addressable custom properties", async () => {
    const { css, outDir } = await buildToTempDir();
    try {
      expect(css).toContain("@theme");
      expect(css).toContain("--font-heading-xl: Plus Jakarta Sans;");
      expect(css).toContain("--text-heading-xl: 24px;");
      expect(css).toContain("--font-weight-heading-xl: 700;");
      expect(css).toContain("--leading-heading-xl: 30px;");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("carries font-heading-s's letter-spacing as a distinct --tracking-* custom property", async () => {
    const { css, outDir } = await buildToTempDir();
    try {
      expect(css).toContain("--tracking-heading-s: 2.4px;");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
