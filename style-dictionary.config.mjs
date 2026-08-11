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

/**
 * Breakpoint tokens are authored as `breakpoint.mobile/tablet/desktop` (D-07) but Tailwind v4's
 * responsive-variant namespace expects `--breakpoint-sm/md/lg` — this is a deliberate rename,
 * not a pass-through.
 */
const BREAKPOINT_ALIASES = { mobile: "sm", tablet: "md", desktop: "lg" };

/**
 * A `fontFamily` DTCG value names a family (e.g. "Plus Jakarta Sans"); the actual font file is
 * loaded elsewhere via `next/font/google`, which exposes it under a CSS variable rather than the
 * literal family name (browsers resolve an unadorned family string against locally installed
 * fonts only — virtually no user has "Plus Jakarta Sans" installed, so a literal value silently
 * falls back to the system default everywhere the token is consumed). `next/font`'s own
 * convention names that variable `--font-<kebab-case-family>` (see the `variable:` option in
 * `app/layout.tsx`), so deriving the same slug here keeps the two files coupled by convention
 * without a shared constant.
 */
function fontFamilyVariableSlug(fontFamily) {
    return fontFamily.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Expands one composite `typography` token into Tailwind v4's separately-addressable custom
 * properties. Tailwind v4 has no composite type, so `font-heading-xl` becomes four (or five,
 * with letter-spacing) individual properties: `--font-<name>` (family), `--text-<name>` (size),
 * `--font-weight-<name>` (weight), `--leading-<name>` (line height), and `--tracking-<name>`
 * (letter-spacing, only when present).
 */
function typographyDeclarations(token) {
    const value = token.$value ?? token.value;
    /*
     * token.path is e.g. ["font", "heading-xl"] — drop the leading category segment so the
     * per-property suffix is "heading-xl", not "font-heading-xl" (which would double the prefix).
     */
    const suffix = token.path.slice(1).join("-");
    const fontVar = `--font-${fontFamilyVariableSlug(value.fontFamily)}`;
    const lines = [
        `  --font-${suffix}: var(${fontVar}), ui-sans-serif, system-ui, sans-serif;`,
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
        /*
         * Tailwind v4 base spacing unit (D-04's extension): generates the whole numeric utility
         * ladder (p-1 ... p-16) mechanically from this one value, so 12px (space-3) needs no
         * special case.
         */
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

// The five categories that don't vary by color mode — included in every build.
const modeInvariantSources = [
    "tokens/spacing.tokens.json",
    "tokens/typography.tokens.json",
    "tokens/radius.tokens.json",
    "tokens/shadow.tokens.json",
    "tokens/breakpoint.tokens.json",
];

/**
 * Style Dictionary v5 has no per-platform `source` override (`_exportPlatform` clones the
 * INSTANCE-level `this.tokens`, built once from the top-level `source`) and no built-in
 * "append to an existing output file" option. Loading `color.light.tokens.json` and
 * `color.dark.tokens.json` into the same dictionary would collide on every identical semantic
 * path (`color.bg.app` etc.) and silently drop one mode's values. So light and dark are built
 * as two separate configs/instances with disjoint sources (see scripts/build-tokens.mjs, which
 * builds both and concatenates the CSS text itself — @theme block first, .dark block second).
 */
export function createConfig(mode) {
    if (mode === "dark") {
        return {
            source: ["tokens/color.tokens.json", "tokens/color.dark.tokens.json"],
            platforms: {
                "css-dark": {
                    transformGroup: "css-raw",
                    files: [
                        {
                            destination: "tokens.dark.part.css",
                            format: "css/tailwind-dark-scope",
                        },
                    ],
                },
            },
        };
    }

    return {
        source: ["tokens/color.tokens.json", "tokens/color.light.tokens.json", ...modeInvariantSources],
        platforms: {
            css: {
                transformGroup: "css-raw",
                files: [
                    {
                        destination: "tokens.theme.part.css",
                        format: "css/tailwind-theme",
                    },
                ],
            },
        },
    };
}

export default createConfig("light");
