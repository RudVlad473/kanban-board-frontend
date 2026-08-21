import StyleDictionary from "style-dictionary";

/**
 * `name/kebab` gives every token a Tailwind-v4-friendly custom-property suffix. Skips Style
 * Dictionary's built-in `css` transformGroup, whose shorthand transforms collapse a composite
 * token's sub-values (RESEARCH.md Pitfall 4) and lowercase authored hex literals.
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
 * A `fontFamily` DTCG value names a family, but the font file loads elsewhere via
 * `next/font/google` under a CSS variable — `next/font`'s own `--font-<kebab-case-family>`
 * convention (`app/layout.tsx`'s `variable:` option) is re-derived here, not shared.
 */
const fontFamilyVariableSlug = (fontFamily) => fontFamily.toLowerCase().replace(/\s+/g, "-");

/**
 * Expands one composite `typography` token into Tailwind v4's separately-addressable custom
 * properties, since Tailwind v4 has no composite type — `font-heading-xl` becomes four or five
 * individual `--font-`/`--text-`/`--font-weight-`/`--leading-`/`--tracking-<name>` properties.
 */
const typographyDeclarations = (token) => {
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
};

const breakpointDeclaration = (token) => {
    const suffix = token.path.slice(1).join("-");
    const alias = BREAKPOINT_ALIASES[suffix] ?? suffix;
    const value = token.$value ?? token.value;
    return `  --breakpoint-${alias}: ${value};`;
};

const tokenDeclarations = (dictionary) => {
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
};

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
 * Style Dictionary v5 has no per-platform `source` override or "append to output" option —
 * loading light/dark color tokens into one dictionary would collide on every shared semantic
 * path. Built as two separate configs instead (scripts/build-tokens.mjs concatenates the CSS).
 */
export const createConfig = (mode) => {
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
};

export default createConfig("light");
