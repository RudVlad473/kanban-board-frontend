import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
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
                /*
                 * Root-level `*.config.mjs`/`*.config.js` files sit outside tsconfig.json's
                 * `include`; `allowDefaultProject` parses them via a synthetic default project
                 * instead (see docs/adr/tech/0007).
                 */
                projectService: {
                    allowDefaultProject: ["*.config.mjs", "*.config.js", "scripts/*.mjs"],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    /*
     * These files only get a synthetic "default project" (no real tsconfig), so Node ESM globals
     * come back untyped and trip strictTypeChecked's rules — type-aware linting adds no value for
     * tooling scripts, so it's turned off for just these (see docs/adr/tech/0007).
     */
    {
        files: ["*.config.mjs", "*.config.js", "scripts/*.mjs"],
        ...tseslint.configs.disableTypeChecked,
    },

    // 2. Next.js recommended + core-web-vitals rules.
    ...nextVitals,
    ...nextTs,
    /*
     * eslint-plugin-react@7.37.5 has no ESLint 10 support yet — its "detect" version auto-probe
     * crashes the linter (upstream gap, verified in isolation). Pinning the version explicitly
     * skips the auto-probe entirely (see docs/adr/tech/0007).
     */
    { settings: { react: { version: "19.2.8" } } },

    // 3. react-hooks/exhaustive-deps escalated to error (D-26n — Next.js ships it as warn).
    {
        rules: {
            "react-hooks/exhaustive-deps": "error",
        },
    },

    /*
     * 3a. `@next/next/no-img-element` escalated to error (ships as warn in core-web-vitals) — same
     * "raw HTML element bypassing a Next-provided optimized equivalent" class as the raw `<a>` ban
     * below (8f); a probe confirmed zero existing `<img>` usage to migrate.
     */
    {
        rules: {
            "@next/next/no-img-element": "error",
        },
    },

    // 3b. Blank line required between sibling JSX elements/expressions (fixable).
    {
        rules: {
            "react/jsx-newline": ["error", { prevent: false }],
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
     * 4c. Ban inline `import("module").Type` type queries — selector lives in 8d's array, not
     * here: a second `no-restricted-syntax` block matching the same files would be silently
     * replaced by 8d's later one (flat config replaces per-file, never merges).
     */

    /*
     * 5. Import order/grouping (D-26p) — eslint-plugin-import's fixer crashes under ESLint 10
     * (removed SourceCode method); import-x is the actively-maintained, ESLint-10-compatible fork
     * used here instead (see docs/adr/tech/0007).
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
                        { pattern: "@/test-utils/**", group: "internal" },
                        { pattern: "@/types/**", group: "internal" },
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
            "app/global-error.tsx",
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
             * Playwright's own `globalSetup` config option requires the referenced file to export
             * its setup function as the default export (Playwright loads it that way itself) —
             * same framework-forced category as the entries above.
             */
            "e2e/global-setup.ts",
            /*
             * Storybook's own framework-forced default-export files (main config + preview config),
             * same category as next.config.ts above.
             */
            ".storybook/main.ts",
            ".storybook/preview.tsx",
        ],
        rules: {
            "import-x/no-default-export": "off",
        },
    },

    /*
     * 7. Feature-boundary enforcement plus the three-ring `lib/` split (GC-25/GC-28) — prevents a
     * server-only module's dependency chain from reaching browser-bundled code, the defect class
     * that produced the 01-33 Storybook stub (see CONVENTIONS.md, 01-37-SUMMARY.md).
     */
    {
        plugins: {
            boundaries,
        },
        settings: {
            "boundaries/elements": [
                { type: "feature", pattern: "src/features/*" },
                { type: "ui", pattern: "src/components/ui/*" },
                { type: "layout", pattern: "src/components/layout/*" },
                { type: "lib-core", pattern: "src/lib/core/**" },
                { type: "lib-server", pattern: "src/lib/server/**" },
                { type: "lib-client", pattern: "src/lib/client/**" },
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
                                { to: { element: { type: "lib-core" } } },
                                { to: { element: { type: "lib-server" } } },
                                { to: { element: { type: "lib-client" } } },
                            ],
                        },
                        {
                            from: { element: { type: "ui" } },
                            allow: [
                                { to: { element: { type: "lib-core" } } },
                                { to: { element: { type: "lib-client" } } },
                            ],
                        },
                        {
                            /*
                             * `layout -> feature` added this phase — CONVENTIONS.md's placement rule
                             * already treats `components/layout/` as domain-aware chrome (Sidebar
                             * composing `useBoards()`); this is the read direction composition needs.
                             */
                            from: { element: { type: "layout" } },
                            allow: [
                                { to: { element: { type: "ui" } } },
                                { to: { element: { type: "feature" } } },
                                { to: { element: { type: "lib-core" } } },
                                { to: { element: { type: "lib-client" } } },
                            ],
                        },
                        {
                            from: { element: { type: "lib-core" } },
                            allow: [{ to: { element: { type: "lib-core" } } }],
                        },
                        {
                            from: { element: { type: "lib-server" } },
                            allow: [
                                { to: { element: { type: "lib-core" } } },
                                { to: { element: { type: "lib-server" } } },
                            ],
                        },
                        {
                            from: { element: { type: "lib-client" } },
                            allow: [
                                { to: { element: { type: "lib-core" } } },
                                { to: { element: { type: "lib-client" } } },
                            ],
                        },
                    ],
                },
            ],
        },
    },

    /*
     * 7b. Storybook stories/behavioral tests are dev-only fixtures never imported by production
     * code — a story/test composing a sibling primitive (e.g. Modal's stories composing Button)
     * isn't the runtime coupling policy 7 exists to prevent. Scoped to *.stories.tsx/*.test.tsx only.
     */
    {
        files: ["src/components/ui/**/*.stories.tsx", "src/components/ui/**/*.test.tsx"],
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

    /*
     * 8c. Every function is a `const` arrow function, never a `function` declaration/expression
     * (ADR tech/0015), except Next.js framework-forced default-export files. `func-style` backstops
     * `prefer-arrow-functions` in case a future rule change narrows what it catches.
     */
    {
        plugins: {
            "prefer-arrow-functions": preferArrowFunctions,
        },
        rules: {
            "prefer-arrow-functions/prefer-arrow-functions": [
                "error",
                {
                    allowedNames: [],
                    allowNamedFunctions: false,
                    allowObjectProperties: true,
                    classPropertiesAllowed: false,
                    disallowPrototype: false,
                    returnStyle: "unchanged",
                    singleReturnOnly: false,
                },
            ],
            "func-style": ["error", "expression"],
        },
    },

    /*
     * 8d. Multi-param functions take one destructured object parameter, not positional args (ADR
     * tech/0016), except a function/arrow expression whose arity is API-dictated (e.g. array-method
     * callbacks, forwardRef) — each selector targets a declaration site, excluding those.
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
                {
                    selector: "FunctionDeclaration[params.length>=2]",
                    message:
                        "Functions with 2+ parameters take one destructured object parameter instead of positional arguments (ADR tech/0016).",
                },
                {
                    selector:
                        "VariableDeclarator > ArrowFunctionExpression[params.length>=2], VariableDeclarator > FunctionExpression[params.length>=2]",
                    message:
                        "Functions with 2+ parameters take one destructured object parameter instead of positional arguments (ADR tech/0016).",
                },
                {
                    selector:
                        "MethodDefinition > FunctionExpression[params.length>=2], Property[method=true] > FunctionExpression[params.length>=2]",
                    message:
                        "Methods with 2+ parameters take one destructured object parameter instead of positional arguments (ADR tech/0016).",
                },
                {
                    selector: "Property > ArrowFunctionExpression[params.length>=2]",
                    message:
                        "Functions with 2+ parameters take one destructured object parameter instead of positional arguments (ADR tech/0016).",
                },
                /*
                 * 8f. Ban a raw `<a>` JSX element outright — `@next/next/no-html-link-for-pages`
                 * only fires on a static string-literal `href`, missing a computed one; this gap
                 * shipped a real full-page-reload bug in phase 02-08 (see 02-08-SUMMARY.md).
                 */
                {
                    selector: "JSXOpeningElement[name.name='a']",
                    message:
                        "Use next/link's Link for internal navigation, not a raw <a> — @next/next/no-html-link-for-pages only catches a static string-literal href, not a computed one. If this is a genuinely deliberate full-page-reload/external link, add a `// eslint-disable-next-line no-restricted-syntax` with a one-line reason.",
                },
                /*
                 * 8g. D-06: ban composeStories' `.run()` repo-wide, incl. *.stories.tsx
                 * (docs/adr/tech/0025, supersedes tech/0021) — no-restricted-properties can't
                 * express this since .run() is called on a differently-named object per file.
                 */
                {
                    selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='run']",
                    message:
                        "composeStories' story-runner .run() is banned repo-wide (docs/adr/tech/0025-direct-composed-story-rendering.md, supersedes tech/0021) — render the composed story directly instead, e.g. `render(<Primary />)`. If this is a genuinely deliberate exception, add a `// eslint-disable-next-line no-restricted-syntax` with a one-line reason.",
                },
                /*
                 * 8h: JSX is always returned explicitly (docs/adr/tech/0028). Scoped to a JSX body
                 * rather than core `arrow-body-style: always`, which would also brace every
                 * non-JSX one-liner — a far wider change than the decision this encodes.
                 */
                {
                    selector: "ArrowFunctionExpression > JSXElement",
                    message:
                        "Return JSX with an explicit `return` inside a block body, never a concise body (docs/adr/tech/0028-jsx-return-style.md).",
                },
                {
                    selector: "ArrowFunctionExpression > JSXFragment",
                    message:
                        "Return JSX with an explicit `return` inside a block body, never a concise body (docs/adr/tech/0028-jsx-return-style.md).",
                },
            ],
        },
    },

    /*
     * 8d-2. D-04/D-19: no vi.mock/vi.spyOn outside Storybook stories (docs/adr/tech/0020) — a
     * distinct rule ID (not another no-restricted-syntax block, which would replace 8d's own) keeps
     * both independent.
     */
    {
        files: ["**/*.{ts,tsx}"],
        ignores: ["**/*.stories.tsx", "**/*.stories.ts"],
        rules: {
            "no-restricted-properties": [
                "error",
                {
                    object: "vi",
                    property: "mock",
                    message:
                        "Mocking is banned outside Storybook stories (docs/adr/tech/0020). Rewrite the test against the real deployed backend, or — if and only if this stands in for a genuine framework/environment limitation (e.g. next/headers' cookies() has no request scope in Vitest) — add an eslint-disable-next-line no-restricted-properties directive whose trailing reason names that specific limitation.",
                },
                {
                    object: "vi",
                    property: "spyOn",
                    message:
                        "Mocking is banned outside Storybook stories (docs/adr/tech/0020). Rewrite the test against the real deployed backend, or — if and only if this stands in for a genuine framework/environment limitation (e.g. next/headers' cookies() has no request scope in Vitest) — add an eslint-disable-next-line no-restricted-properties directive whose trailing reason names that specific limitation.",
                },
            ],
        },
    },

    /*
     * 8e. Flag unsanitized DOM sinks (`innerHTML`/`outerHTML`/`insertAdjacentHTML`,
     * `dangerouslySetInnerHTML`, `document.write`, etc.) as errors — the realistic XSS vector in a
     * React app, with near-zero false positives since it only fires on the specific sink APIs.
     */
    {
        ...noUnsanitized.configs.recommended,
    },

    // 9. Generated/vendored trees are never hand-edited or worth linting.
    globalIgnores([
        ".next/**",
        "node_modules/**",
        "src/styles/tokens.css",
        "src/lib/core/api-contract/generated-types.ts",
        // Stray worktree checkouts (isolation="worktree" executor dispatch) are never lint targets.
        ".claude/worktrees/**",
        // MSW's own generated browser worker script (`msw init public/ --save`, plan 01-10) — vendored, never hand-edited.
        "public/mockServiceWorker.js",
        "storybook-static/**",
        "coverage/**",
        "test-results/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),
]);

export default eslintConfig;
