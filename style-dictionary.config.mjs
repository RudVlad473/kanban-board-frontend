import StyleDictionary from "style-dictionary";

/**
 * A minimal transform group: `name/kebab` gives every token a Tailwind-v4-friendly
 * custom-property suffix (`color.bg.app` -> `color-bg-app`). Deliberately does NOT include
 * Style Dictionary's built-in `css` transformGroup, because that group's
 * `typography/css/shorthand` and `shadow/css/shorthand` value transforms collapse a composite
 * token's sub-values into a single shorthand string before a format ever sees them — exactly
 * what RESEARCH.md Pitfall 4 warns can silently drop a sub-value. Skipping those transforms
 * keeps every composite `$value` as an object so the formats below can address each sub-value
 * individually. It also skips `color/css` (which would lowercase authored hex literals via
 * tinycolor2's `toHexString()`), preserving the exact-case hex values authored in the primitive
 * color tier.
 */
StyleDictionary.registerTransformGroup({
  name: "css-raw",
  transforms: ["name/kebab"],
});

/** Breakpoint tokens are authored as `breakpoint.mobile/tablet/desktop` (D-07) but Tailwind v4's
 * responsive-variant namespace expects `--breakpoint-sm/md/lg` — this is a deliberate rename,
 * not a pass-through. */
const BREAKPOINT_ALIASES = { mobile: "sm", tablet: "md", desktop: "lg" };

/**
 * Expands one composite `typography` token into Tailwind v4's separately-addressable custom
 * properties. Tailwind v4 has no composite type, so `font-heading-xl` becomes four (or five,
 * with letter-spacing) individual properties: `--font-<name>` (family), `--text-<name>` (size),
 * `--font-weight-<name>` (weight), `--leading-<name>` (line height), and `--tracking-<name>`
 * (letter-spacing, only when present).
 */
function typographyDeclarations(token) {
  const value = token.$value ?? token.value;
  // token.path is e.g. ["font", "heading-xl"] — drop the leading category segment so the
  // per-property suffix is "heading-xl", not "font-heading-xl" (which would double the prefix).
  const suffix = token.path.slice(1).join("-");
  const lines = [
    `  --font-${suffix}: ${value.fontFamily};`,
    `  --text-${suffix}: ${value.fontSize};`,
    `  --font-weight-${suffix}: ${value.fontWeight};`,
    `  --leading-${suffix}: ${value.lineHeight};`,
  ];
  if (value.letterSpacing) {
    lines.push(`  --tracking-${suffix}: ${value.letterSpacing};`);
  }
  return lines;
}

function breakpointDeclaration(token) {
  const suffix = token.path.slice(1).join("-");
  const alias = BREAKPOINT_ALIASES[suffix] ?? suffix;
  const value = token.$value ?? token.value;
  return `  --breakpoint-${alias}: ${value};`;
}

function tokenDeclarations(dictionary) {
  const lines = [];
  for (const token of dictionary.allTokens) {
    const type = token.$type ?? token.type;
    if (type === "typography") {
      lines.push(...typographyDeclarations(token));
      continue;
    }
    if (token.path[0] === "breakpoint") {
      lines.push(breakpointDeclaration(token));
      continue;
    }
    const value = token.$value ?? token.value;
    lines.push(`  --${token.name}: ${value};`);
  }
  return lines;
}

StyleDictionary.registerFormat({
  name: "css/tailwind-theme",
  format: ({ dictionary }) => {
    const lines = tokenDeclarations(dictionary);
    // Tailwind v4 base spacing unit (D-04's extension): generates the whole numeric utility
    // ladder (p-1 ... p-16) mechanically from this one value, so 12px (space-3) needs no
    // special case.
    lines.unshift("  --spacing: 4px;");
    return `@theme {\n${lines.join("\n")}\n}\n`;
  },
});

StyleDictionary.registerFormat({
  name: "css/tailwind-dark-scope",
  format: ({ dictionary }) => {
    const lines = tokenDeclarations(dictionary);
    return `.dark {\n${lines.join("\n")}\n}\n`;
  },
});

const config = {
  source: ["tokens/**/*.tokens.json"],
  platforms: {
    css: {
      transformGroup: "css-raw",
      buildPath: "src/styles/",
      files: [
        {
          destination: "tokens.css",
          format: "css/tailwind-theme",
        },
      ],
    },
  },
};

export default config;
