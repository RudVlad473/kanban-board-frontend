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

    /*
     * 3a. `@next/next/no-img-element` escalated to error (ships as warn in core-web-vitals) — same
     * "raw HTML element bypassing a Next-provided optimized equivalent" failure class as the raw
     * `<a>` ban below (8f), and confirmed by a probe file this project has zero existing `<img>`
     * usage to migrate, so there is nothing for this escalation to break.
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
     * 7. Feature-boundary enforcement (CONVENTIONS.md's no-cross-feature-import rule) plus the
     * three-ring `lib/` split (GC-25/GC-28). `src/lib/` is now three disjoint rings — `lib-core`
     * (pure, framework-agnostic), `lib-server` (server-only, every file opens `import "server-only"`),
     * and `lib-client` (browser/React-runtime infra) — with no flat file left directly under
     * `src/lib/`. Plans 01-36 and 01-37 moved every file into a ring a few at a time behind a
     * transitional element scaffold that kept lint green while files were still flat; 01-37 Task 3
     * removed that scaffold once the last flat file moved, leaving only the strict ring
     * directionality below.
     *
     * Ring directionality (GC-25): `lib-core` never reaches `lib-server`/`lib-client`; `lib-server`/
     * `lib-client` may each reach `lib-core` and themselves but never each other. This is the
     * mechanical control that prevents a server-only, secret-holding module's dependency chain from
     * reaching browser-bundled code (the class of bug that produced the 01-33 Storybook stub).
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
                             * `layout -> feature` added this phase: CONVENTIONS.md's own placement
                             * rule (step 4) already describes `components/layout/` as "domain-aware
                             * layout/chrome" — Sidebar composing `features/boards`'s `useBoards()`
                             * (02-RESEARCH.md's Recommended Project Structure) is exactly that, not
                             * a new category of coupling. `feature -> layout` was already allowed
                             * above; this is the read direction that composition actually needs.
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
     * 7b. Storybook stories and behavioral tests are dev-only fixtures, never imported by
     * production code (Storybook's own build entry point globs *.stories.tsx directly; *.test.tsx
     * is only ever imported by the test runner) — a story or test composing a sibling primitive
     * for a realistic fixture (e.g. Modal's footer stories/tests composing Button) is not the same
     * "ui" primitives silently coupling to each other at runtime that policy 7 exists to prevent.
     * Scoped to *.stories.tsx and *.test.tsx only; modal.tsx itself (and every other primitive's
     * own implementation file) still cannot import a sibling primitive. Extended to *.test.tsx in
     * plan 01-25 (Modal's isLoading-dismissal test composing Button, same rationale as stories).
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
     * 8c. Every function is a `const` bound to an arrow function expression, never a `function`
     * declaration or function expression (ADR tech/0015) — except Next.js framework-forced
     * default-export files, which declare the arrow-const normally and `export default` it on
     * its own line. `allowObjectProperties: true` leaves class methods and object-literal method
     * shorthand alone, per the ADR's own carve-out; every other option is the plugin's default
     * (converts both declarations and expressions). `func-style` is a backstop against bare
     * function declarations specifically, in case a future rule/plugin change ever narrows what
     * `prefer-arrow-functions` itself catches.
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
     * 8d. Multi-param functions take one destructured object parameter, not positional args
     * (ADR tech/0016) — except a function/arrow expression sitting directly in a call/new
     * argument list, whose arity is dictated by the API it's passed to (array-method callbacks,
     * Promise executors, forwardRef, event handlers) and which this project cannot reshape.
     * Each selector targets a *declaration* site (variable/class-method/object-method), which is
     * exactly what excludes an inline callback argument — that arrow/function's parent is a
     * CallExpression/NewExpression argument, never a VariableDeclarator/MethodDefinition/Property.
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
                 * (already active via `nextVitals` above) only fires on a static string-literal
                 * `href`; it silently passes on `href={boardDetail(board.id)}` or any other
                 * non-literal expression, because it can't statically evaluate arbitrary JS to know
                 * the target is an internal route. That gap shipped a real bug this phase (02-08):
                 * a `Sidebar` board row using a raw `<a>` instead of `next/link`'s `Link`, causing a
                 * full page reload on every click instead of a client-side transition — passed type
                 * -check and looked identical in a screenshot. This selector fires on every `<a>`
                 * regardless of what its `href` expression is, forcing each one to be a conscious,
                 * justified `// eslint-disable-next-line no-restricted-syntax` rather than an
                 * unreviewed copy-paste.
                 */
                {
                    selector: "JSXOpeningElement[name.name='a']",
                    message:
                        "Use next/link's Link for internal navigation, not a raw <a> — @next/next/no-html-link-for-pages only catches a static string-literal href, not a computed one. If this is a genuinely deliberate full-page-reload/external link, add a `// eslint-disable-next-line no-restricted-syntax` with a one-line reason.",
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
