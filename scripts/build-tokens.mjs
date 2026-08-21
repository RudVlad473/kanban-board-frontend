#!/usr/bin/env node
/*
 * Drives the two-pass Style Dictionary build (light, then dark) and concatenates the results into
 * one src/styles/tokens.css — @theme block first, .dark block second (D-09; see
 * style-dictionary.config.mjs's createConfig() for why this isn't one config).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import StyleDictionary from "style-dictionary";

import { createConfig } from "../style-dictionary.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "src/styles/tokens.css");

const buildModeCss = async ({ mode, platformName }) => {
    const sd = new StyleDictionary(createConfig(mode));
    const [{ output }] = await sd.formatPlatform(platformName);
    return output;
};

const main = async () => {
    const [themeCss, darkCss] = await Promise.all([
        buildModeCss({ mode: "light", platformName: "css" }),
        buildModeCss({ mode: "dark", platformName: "css-dark" }),
    ]);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${themeCss}\n${darkCss}`);
    console.log(`✔ wrote ${path.relative(repoRoot, outputPath)}`);
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
