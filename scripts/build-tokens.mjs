#!/usr/bin/env node
// Drives the two-pass Style Dictionary build (light + mode-invariant categories, then dark
// color aliases) and concatenates the results into a single src/styles/tokens.css — @theme
// block first, .dark block second (D-09). See style-dictionary.config.mjs's createConfig()
// doc comment for why this can't be one config with two platforms writing the same file.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import StyleDictionary from "style-dictionary";

import { createConfig } from "../style-dictionary.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "src/styles/tokens.css");

async function buildModeCss(mode, platformName) {
  const sd = new StyleDictionary(createConfig(mode));
  const [{ output }] = await sd.formatPlatform(platformName);
  return output;
}

async function main() {
  const [themeCss, darkCss] = await Promise.all([buildModeCss("light", "css"), buildModeCss("dark", "css-dark")]);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${themeCss}\n${darkCss}`);
  console.log(`✔ wrote ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
