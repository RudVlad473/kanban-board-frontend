import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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

async function buildModeCss(mode: "light" | "dark", platform: string, baseDir: string = repoRoot) {
  const config = createConfig(mode) as unknown as Config;
  const absoluteConfig: Config = {
    ...config,
    source: (config.source ?? []).map((sourcePath) => path.join(baseDir, sourcePath)),
  };
  const sd = new StyleDictionary(absoluteConfig);
  const [{ output }] = await sd.formatPlatform(platform);
  return output as string;
}

async function buildFullCss(baseDir: string = repoRoot) {
  const [theme, dark] = await Promise.all([
    buildModeCss("light", "css", baseDir),
    buildModeCss("dark", "css-dark", baseDir),
  ]);
  return `${theme}\n${dark}`;
}

/** Copies the real tokens/ tree into an isolated temp dir so a test-local mutation never
 * touches the tracked source files. Caller is responsible for removing the returned dir. */
async function copyTempTokens() {
  const tmpRoot = await mkdtemp(path.join(tmpdir(), "sd-pipeline-"));
  await cp(path.join(repoRoot, "tokens"), path.join(tmpRoot, "tokens"), { recursive: true });
  return tmpRoot;
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

  it("has every one of the six DTCG categories contribute at least one custom property to the generated stylesheet", async () => {
    const css = await buildFullCss();
    expect(css).toMatch(/--color-bg-app:\s*#/); // color
    expect(css).toMatch(/--space-4:\s*16px/); // spacing
    expect(css).toMatch(/--font-heading-xl:\s*Plus Jakarta Sans/); // typography
    expect(css).toMatch(/--radius-sm:\s*4px/); // radius
    expect(css).toMatch(/--shadow-sm:\s*0px/); // shadow
    expect(css).toMatch(/--breakpoint-sm:\s*375px/); // breakpoint
  });

  it("resolves color-bg-app to the light hex in the @theme block and the dark hex in the .dark block, under the same custom-property name", async () => {
    const css = await buildFullCss();
    const themeBlock = css.slice(css.indexOf("@theme"), css.indexOf(".dark"));
    const darkBlock = css.slice(css.indexOf(".dark"));
    expect(themeBlock).toContain("--color-bg-app: #F4F7FD;");
    expect(darkBlock).toContain("--color-bg-app: #20212C;");
  });

  it("rebuilds with a changed token value rather than silently serving a stale artefact", async () => {
    const tmpRoot = await copyTempTokens();
    try {
      const spacingPath = path.join(tmpRoot, "tokens/spacing.tokens.json");
      const spacingTokens = JSON.parse(await readFile(spacingPath, "utf8")) as {
        space: Record<string, { $value: string }>;
      };
      spacingTokens.space["1"].$value = "5px";
      await writeFile(spacingPath, JSON.stringify(spacingTokens, null, 2));

      const css = await buildModeCss("light", "css", tmpRoot);
      expect(css).toContain("--space-1: 5px;");
      expect(css).not.toContain("--space-1: 4px;");
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("fails the build rather than emitting an unresolved reference string when a semantic token's alias target doesn't exist", async () => {
    const tmpRoot = await copyTempTokens();
    try {
      const lightPath = path.join(tmpRoot, "tokens/color.light.tokens.json");
      const lightTokens = JSON.parse(await readFile(lightPath, "utf8")) as {
        color: { bg: { app: { $value: string } } };
      };
      lightTokens.color.bg.app.$value = "{color.nonexistent.999}";
      await writeFile(lightPath, JSON.stringify(lightTokens, null, 2));

      await expect(buildModeCss("light", "css", tmpRoot)).rejects.toBeTruthy();
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
