import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import tailwindcss from "eslint-plugin-tailwindcss";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
    /*
     * 1. Type-aware strict + stylistic tiers (D-26n) — projectService gives the type-aware tier
     * real type information; tsconfigRootDir anchors resolution to this repo.
     */
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                // Root-level *.config.{mjs,ts} files sit outside tsconfig.json's `include` (they
                // configure the tools that read tsconfig, not application code) — allowDefaultProject
                // lets the type-aware tier parse them via a synthetic default project instead of
                // erroring that they weren't found by the project service.
                // Only *.mjs/*.js config files need this — *.ts config files (next.config.ts) are
                // already covered by tsconfig.json's own `**/*.ts` include and listing them here too
                // conflicts ("found in the project service" vs "allowDefaultProject").
                projectService: {
                    allowDefaultProject: ["*.config.mjs", "*.config.js", "scripts/*.mjs"],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    /*
     * *.config.mjs/*.config.js files (and scripts/*.mjs, standalone Node build scripts outside
     * the app's TS project) only get a synthetic "default project" (no real tsconfig), so Node
     * ESM globals like `import.meta.dirname` come back untyped/"error"-typed there and trip
     * strictTypeChecked's unsafe-assignment/misused-spread rules on this very file. Type-aware
     * linting adds no real value for tooling scripts anyway — turn it off for just these files.
     */
    {
        files: ["*.config.mjs", "*.config.js", "scripts/*.mjs"],
        ...tseslint.configs.disableTypeChecked,
    },

    // 2. Next.js recommended + core-web-vitals rules.
    ...nextVitals,
    ...nextTs,
    // eslint-plugin-react@7.37.5 (bundled by eslint-config-next@16.3.0) has no ESLint 10 support
    /*
     * yet: its "detect" React-version auto-probe calls the removed `context.getFilename()` method
     * and crashes the linter outright (upstream gap, not a config bug — verified by reproducing
     * the crash against eslint-config-next alone, isolated from every other rule in this file).
     * Pinning the version explicitly skips that auto-probe entirely, which is itself the plugin's
     * documented alternative to "detect", not a hack.
     */
    { settings: { react: { version: "19.2.8" } } },

    // 3. react-hooks/exhaustive-deps escalated to error (D-26n — Next.js ships it as warn).
    {
        rules: {
            "react-hooks/exhaustive-deps": "error",
        },
    },

    // 4. Unused vars/args/caught-errors as error, with an underscore-prefix escape hatch (D-26o).
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },

    /*
     * 4b. `type` over `interface` by default (D-26i) — stylisticTypeChecked's own default prefers
     * `interface`, the opposite of this project's convention; override explicitly rather than
     * rewriting every object-shape type alias as an interface.
     */
    {
        rules: {
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        },
    },

    /*
     * 4c. Ban inline `import("module").Type` type queries — no typescript-eslint rule targets
     * this node type directly (consistent-type-imports only covers top-level ImportDeclaration),
     * so a plain AST selector on TSImportType is the lightest way to enforce a top-level
     * `import type { Type } from "module"` instead.
     */
    {
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector: "TSImportType",
                    message:
                        'Use a top-level `import type { X } from "module"` instead of an inline `import("module").X` type query.',
                },
            ],
        },
    },

    /*
     * 5. Import order/grouping (D-26p), with the TS path-alias resolver so internal aliases
     * resolve correctly instead of reporting as unresolved. eslint-plugin-import@2.32.0's
     * import/order fixer calls `sourceCode.getTokenOrCommentBefore`, a legacy SourceCode method
     * ESLint 10 removed outright — it crashes the linter on ANY out-of-order import, not just an
     * edge case. CONVENTIONS.md/D-26p names `eslint-plugin-import`/`import-x` as interchangeable
     * for this rule; import-x is the actively-maintained fork with a declared ESLint 10 peer range
     * (verified: peerDependencies eslint "^8.57.0 || ^9.0.0 || ^10.0.0"), so it's used here instead.
     */
    {
        plugins: {
            "import-x": importX,
        },
        settings: {
            "import-x/resolver": {
                typescript: true,
            },
        },
        rules: {
            "import-x/order": [
                "error",
                {
                    groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
                    pathGroups: [
                        { pattern: "@/features/**", group: "internal" },
                        { pattern: "@/components/**", group: "internal" },
                        { pattern: "@/hooks/**", group: "internal" },
                        { pattern: "@/lib/**", group: "internal" },
                        { pattern: "@/styles/**", group: "internal" },
                        { pattern: "@/test/**", group: "internal" },
                    ],
                    "newlines-between": "always",
                    alphabetize: { order: "asc" },
                },
            ],

            // 6. No default exports (D-26j) — overridden below for Next.js framework-forced files.
            "import-x/no-default-export": "error",
        },
    },
    {
        files: [
            "app/**/page.tsx",
            "app/**/layout.tsx",
            "app/**/route.ts",
            "app/**/error.tsx",
            "app/**/loading.tsx",
            "app/**/not-found.tsx",
            "app/**/template.tsx",
            "app/**/default.tsx",
            "proxy.ts",
            "instrumentation.ts",
            "next.config.ts",
            "*.config.{ts,mjs,js}",
            "**/*.stories.tsx",
            /*
             * Storybook's own framework-forced default-export files (main config + preview config),
             * same category as next.config.ts above.
             */
            ".storybook/main.ts",
            ".storybook/preview.ts",
        ],
        rules: {
            "import-x/no-default-export": "off",
        },
    },

    // 7. Feature-boundary enforcement (CONVENTIONS.md's no-cross-feature-import rule).
    {
        plugins: {
            boundaries,
        },
        settings: {
            "boundaries/elements": [
                { type: "feature", pattern: "src/features/*" },
                { type: "ui", pattern: "src/components/ui/*" },
                { type: "layout", pattern: "src/components/layout/*" },
                { type: "lib", pattern: "src/lib/*" },
            ],
        },
        rules: {
            /*
             * v7.2.0 deprecated "element-types"/"rules" in favor of "dependencies"/"policies" with
             * entity-selector wrapping — using the current, non-deprecated syntax up front avoids a
             * "deprecated rule" warning on every future lint run.
             */
            "boundaries/dependencies": [
                "error",
                {
                    default: "disallow",
                    policies: [
                        {
                            from: { element: { type: "feature" } },
                            allow: [
                                { to: { element: { type: "ui" } } },
                                { to: { element: { type: "layout" } } },
                                { to: { element: { type: "lib" } } },
                            ],
                        },
                        {
                            from: { element: { type: "ui" } },
                            allow: [{ to: { element: { type: "lib" } } }],
                        },
                        {
                            from: { element: { type: "layout" } },
                            allow: [{ to: { element: { type: "ui" } } }, { to: { element: { type: "lib" } } }],
                        },
                    ],
                },
            ],
        },
    },

    /*
     * 7b. Storybook stories are dev-only demonstration fixtures, never imported by production
     * code (Storybook's own build entry point globs *.stories.tsx directly) — a story composing a
     * sibling primitive for a realistic preview (e.g. Modal's footer stories composing Button) is
     * not the same "ui" primitives silently coupling to each other at runtime that policy 7 exists
     * to prevent. Scoped to *.stories.tsx only; modal.tsx itself (and every other primitive's own
     * implementation file) still cannot import a sibling primitive.
     */
    {
        files: ["src/components/ui/**/*.stories.tsx"],
        rules: {
            "boundaries/dependencies": "off",
        },
    },

    /*
     * 8. Tailwind class-order/validity linting (ADR tech/0007). cssConfigPath must point at this
     * project's actual Tailwind v4 entry stylesheet (src/styles/globals.css per CONVENTIONS.md) —
     * the plugin's own default ("src/style.css") doesn't exist in this repo and crashes otherwise.
     */
    {
        ...tailwindcss.configs.recommended,
        settings: {
            tailwindcss: { cssConfigPath: "src/styles/globals.css" },
        },
    },

    // 8b. Block comments over stacked `//` lines (this project's own convention) — a single `//`
    // line is untouched; 2+ consecutive `//` lines get merged into one `/** ... */` starred block.
    // Not a ban on `//` entirely, only on the multi-line-via-repetition pattern.
    {
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@stylistic/multiline-comment-style": ["error", "starred-block"],
        },
    },

    // 9. Generated/vendored trees are never hand-edited or worth linting.
    globalIgnores([
        ".next/**",
        "node_modules/**",
        "src/styles/tokens.css",
        "src/lib/api/generated-types.ts",
        "storybook-static/**",
        "coverage/**",
        "test-results/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),
]);

export default eslintConfig;
