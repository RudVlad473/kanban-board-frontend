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

const buildModeCss = async ({
    mode,
    platform,
    baseDir = repoRoot,
}: {
    mode: "light" | "dark";
    platform: string;
    baseDir?: string;
}) => {
    const config = createConfig(mode) as unknown as Config;
    const absoluteConfig: Config = {
        ...config,
        source: (config.source ?? []).map((sourcePath) => path.join(baseDir, sourcePath)),
    };
    const sd = new StyleDictionary(absoluteConfig);
    const [{ output }] = await sd.formatPlatform(platform);
    return output as string;
};

const buildFullCss = async (baseDir: string = repoRoot) => {
    const [theme, dark] = await Promise.all([
        buildModeCss({ mode: "light", platform: "css", baseDir }),
        buildModeCss({ mode: "dark", platform: "css-dark", baseDir }),
    ]);
    return `${theme}\n${dark}`;
};

/**
 * Copies the real tokens/ tree into an isolated temp dir so a test-local mutation never
 * touches the tracked source files. Caller is responsible for removing the returned dir.
 */
const copyTempTokens = async () => {
    const tmpRoot = await mkdtemp(path.join(tmpdir(), "sd-pipeline-"));
    await cp(path.join(repoRoot, "tokens"), path.join(tmpRoot, "tokens"), { recursive: true });
    return tmpRoot;
};

describe("style dictionary token pipeline (D-12)", () => {
    it("expands the composite font-heading-xl typography token into four individually-addressable custom properties", async () => {
        // Act
        const css = await buildModeCss({ mode: "light", platform: "css" });

        // Assert
        expect(css).toContain("@theme");
        expect(css).toContain(
            "--font-heading-xl: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;",
        );
        expect(css).toContain("--text-heading-xl: 24px;");
        expect(css).toContain("--font-weight-heading-xl: 700;");
        expect(css).toContain("--leading-heading-xl: 30px;");
    });

    /*
     * The mock's sixth type role (04-UI-SPEC.md C-02), which Phase 1 omitted because nothing
     * rendered a task card. Typography is mode-invariant, so both blocks must agree exactly.
     */
    it("expands font-heading-m into the same four custom properties in the @theme block and the .dark block", async () => {
        // Arrange
        const declarations = [
            "--font-heading-m: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;",
            "--text-heading-m: 15px;",
            "--font-weight-heading-m: 700;",
            "--leading-heading-m: 19px;",
        ];

        // Act
        const css = await buildFullCss();
        const themeBlock = css.slice(css.indexOf("@theme"), css.indexOf(".dark"));
        const darkBlock = css.slice(css.indexOf(".dark"));

        // Assert
        for (const declaration of declarations) {
            expect(themeBlock).toContain(declaration);
            expect(darkBlock).toContain(declaration);
        }
    });

    /*
     * Kerning and case are the entire difference between heading-s and body-m at 12px; heading-m
     * carries neither, so a --tracking-* property here would mean the wrong role was copied.
     */
    it("gives font-heading-m no --tracking-* property, unlike font-heading-s", async () => {
        // Act
        const css = await buildFullCss();

        // Assert
        expect(css).not.toContain("--tracking-heading-m");
    });

    it("carries font-heading-s's letter-spacing as a distinct --tracking-* custom property", async () => {
        // Act
        const css = await buildModeCss({ mode: "light", platform: "css" });

        // Assert
        expect(css).toContain("--tracking-heading-s: 2.4px;");
    });

    it("has every one of the six DTCG categories contribute at least one custom property to the generated stylesheet", async () => {
        // Act
        const css = await buildFullCss();

        // Assert
        expect(css).toMatch(/--color-bg-app:\s*#/); // color
        expect(css).toMatch(/--space-4:\s*16px/); // spacing
        expect(css).toMatch(/--font-heading-xl:\s*var\(--font-plus-jakarta-sans\)/); // typography
        expect(css).toMatch(/--radius-sm:\s*4px/); // radius
        expect(css).toMatch(/--shadow-sm:\s*0px/); // shadow
        expect(css).toMatch(/--breakpoint-sm:\s*375px/); // breakpoint
    });

    it("resolves color-bg-app to the light hex in the @theme block and the dark hex in the .dark block, under the same custom-property name", async () => {
        // Act
        const css = await buildFullCss();
        const themeBlock = css.slice(css.indexOf("@theme"), css.indexOf(".dark"));
        const darkBlock = css.slice(css.indexOf(".dark"));

        // Assert
        expect(themeBlock).toContain("--color-bg-app: #F4F7FD;");
        expect(darkBlock).toContain("--color-bg-app: #20212C;");
    });

    it("gives all three column-dot accents the identical hex in the @theme block and the .dark block (U-03)", async () => {
        // Arrange
        const dots = [
            ["--color-accent-column-1", "#49C4E5"],
            ["--color-accent-column-2", "#8471F2"],
            ["--color-accent-column-3", "#67E2AE"],
        ] as const;

        // Act
        const css = await buildFullCss();
        const themeBlock = css.slice(css.indexOf("@theme"), css.indexOf(".dark"));
        const darkBlock = css.slice(css.indexOf(".dark"));

        // Assert
        for (const [property, hex] of dots) {
            expect(themeBlock).toContain(`${property}: ${hex};`);
            expect(darkBlock).toContain(`${property}: ${hex};`);
        }
    });

    it("resolves the two ghost-column gradient stops to a different hex per theme, unlike the column dots", async () => {
        // Act
        const [light, dark] = await Promise.all([
            buildModeCss({ mode: "light", platform: "css" }),
            buildModeCss({ mode: "dark", platform: "css-dark" }),
        ]);

        // Assert
        expect(light).toContain("--color-bg-column-add-from: #E9EFFA;");
        expect(light).toContain("--color-bg-column-add-to: #EEF3FC;");
        expect(dark).toContain("--color-bg-column-add-from: #23242F;");
        expect(dark).toContain("--color-bg-column-add-to: #21222D;");
    });

    it("rebuilds with a changed token value rather than silently serving a stale artefact", async () => {
        // Arrange
        const tmpRoot = await copyTempTokens();
        try {
            const spacingPath = path.join(tmpRoot, "tokens/spacing.tokens.json");
            const spacingTokens = JSON.parse(await readFile(spacingPath, "utf8")) as {
                space: Record<string, { $value: string }>;
            };
            spacingTokens.space["1"].$value = "5px";
            await writeFile(spacingPath, JSON.stringify(spacingTokens, null, 2));

            // Act
            const css = await buildModeCss({ mode: "light", platform: "css", baseDir: tmpRoot });

            // Assert
            expect(css).toContain("--space-1: 5px;");
            expect(css).not.toContain("--space-1: 4px;");
        } finally {
            await rm(tmpRoot, { recursive: true, force: true });
        }
    });

    it("fails the build rather than emitting an unresolved reference string when a semantic token's alias target doesn't exist", async () => {
        // Arrange
        const tmpRoot = await copyTempTokens();
        try {
            const lightPath = path.join(tmpRoot, "tokens/color.light.tokens.json");
            const lightTokens = JSON.parse(await readFile(lightPath, "utf8")) as {
                color: { bg: { app: { $value: string } } };
            };
            lightTokens.color.bg.app.$value = "{color.nonexistent.999}";
            await writeFile(lightPath, JSON.stringify(lightTokens, null, 2));

            // Act + Assert
            await expect(buildModeCss({ mode: "light", platform: "css", baseDir: tmpRoot })).rejects.toBeTruthy();
        } finally {
            await rm(tmpRoot, { recursive: true, force: true });
        }
    });
});
