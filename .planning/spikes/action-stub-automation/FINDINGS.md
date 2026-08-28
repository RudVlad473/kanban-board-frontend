# Spike — automating (or eliminating) the Server Action stubs

Run 2026-08-28, prompted by a user question during the Phase 03 review: can the twelve
hand-written `src/test-utils/*-action-storybook-stub.ts` modules be generated automatically, or
bypassed entirely so no doubling is needed at all?

## Question 1 — can the doubling be avoided outright?

**No.** ADR tech/0020's carve-out claims real `"use server"` actions "cannot execute" in the
browser Vitest project. Measured today, the truth is stronger: they cannot even be **imported**.

A throwaway spec importing `src/features/boards/actions/create-column-action.ts` through a
relative path (bypassing `serverActionStubAlias`) fails at module evaluation:

```
ReferenceError: process is not defined
  node_modules/.vite/vitest/.../deps/next_cache.js:6895
```

`next/cache`'s `refresh()` is the first blocker, reached before `verifySession` ever pulls
`node:crypto` in. This is the same `process is not defined` pitfall ADR tech/0021 already records
for `@storybook/nextjs-vite`'s mock subpaths.

The carve-out's unwind trigger has **not** fired. `@storybook/nextjs-vite@10.5.7` (installed today,
alongside `next@16.3.0`, `vitest@4.1.10`) ships no `"use server"` transform — grepping its `dist/`
for `use server`, `serverAction`, and `server-action` returns nothing, and its export map offers
only `cache.mock`, `headers.mock`, `link.mock`, `navigation.mock`, `router.mock`.

Dependency injection was considered and rejected on the same grounds ADR tech/0025 rejects
hand-wrapped trees: passing each action into its hook, or through a provider, does not remove the
double. It relocates it from an alias into a story decorator while reshaping production code to
serve tests.

## Question 2 — can the stubs be generated?

**Yes, and it was demonstrated working.** The prototype in this directory replaces both the twelve
stub modules and the twelve-entry `serverActionStubAlias` register with one Vite plugin plus one
generic runtime.

- `vite-plugin-server-action-stub.mjs` — a `transform` hook that detects a leading `"use server"`
  directive, reads the module's exported arrow-function names off the TypeScript AST, and emits a
  recorder module with the same export names.
- `action-stub-registry.ts` — one generic programmable recorder, replacing the
  queue/hold/settle/reset/calls skeleton that is currently copy-pasted across eight stub files.

Wired into the `browser` project in place of `serverActionStubAlias`, a spec importing the **real**
action module through its real specifier passed:

```
stub.queue({ status: "DUPLICATE" });
await createColumnAction({ boardId: "b1", name: "Backlog" });
// -> { status: "DUPLICATE" }, calls === [{ boardId: "b1", name: "Backlog" }]
```

A new Server Action would need no stub file and no config entry, which also removes the register
drift recorded below.

## The gap this does not close

Full `browser` project run with the register off and the plugin on:

| Measure | Value |
|---|---|
| Tests passed | 724 |
| Tests failed | 104 |
| Files affected | 4 |

Affected: `board-view.test.tsx`, `board-list.test.tsx`, `sortable-column.test.tsx`,
`rename-override-provider.test.tsx`.

The failures are one design gap, not many. Each hand-written stub returns a **domain-shaped success
payload** by default, e.g. `{ status: SUCCESS, column: { id: STUB_CREATED_COLUMN_ID, name, version: 0,
position: 0 } }`. A generic recorder cannot invent that. It returns `undefined`, and every test
relying on an unqueued call succeeding breaks.

Two ways to close it, both far smaller than the current twelve modules:

1. Register one success factory per action in a single map. Keeps today's ergonomics; roughly one
   line per action instead of roughly ninety.
2. Require every test to queue its own outcome explicitly. No per-action code at all, at the cost
   of touching the 104 assertions and losing the "unqueued means success" default.

## Register drift found along the way

ADR tech/0020's Server Action alias carve-out documents **four** stub modules and four aliased
specifiers. Reality:

| | Documented | Actual |
|---|---|---|
| Stub modules | 4 | 12 |
| `serverActionStubAlias` entries | 4 | 12 |

Phases 02 and 03 added eight (create-board, create-board-columns, rename-board, delete-board,
create-column, rename-column, delete-column, reorder-column) without amending the record. Nothing
gates the two against each other. Adopting the plugin removes the register, and therefore the
drift, as a side effect rather than needing its own checker.

## Appendix — the prototype

Kept inline rather than as files: ESLint's project service rejects any `.ts`/`.mjs` outside
`tsconfig.json` and `allowDefaultProject`, so a prototype parked under `.planning/` cannot be
committed as source. To run it, drop these two back into `scripts/` and `src/test-utils/`, then
swap the `browser` project's `resolve: { alias: [...serverActionStubAlias, ...alias] }` for
`plugins: [serverActionStubPlugin({ rootDir })], resolve: { alias }`.

### scripts/vite-plugin-server-action-stub.mjs

```js
/*
 * SPIKE (2026-08-28): candidate replacement for the 12 hand-written
 * `src/test-utils/*-action-storybook-stub.ts` modules and their `serverActionStubAlias` register.
 * Transforms any `"use server"` module into a generated recorder with the same export names, so a
 * new Server Action needs no stub file and no config entry.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

const readExportedFunctionNames = (source, filePath) => {
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const names = [];

    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }
        const isExported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (!isExported) {
            continue;
        }
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.initializer && ts.isArrowFunction(declaration.initializer)) {
                names.push(declaration.name.text);
            }
        }
    }

    return names;
};

const hasUseServerDirective = (source) => /^\s*(["'])use server\1/.test(source);

const buildStubModule = ({ names, moduleKey }) =>
    [
        `import { registerActionStub } from "/src/test-utils/action-stub-registry.ts";`,
        ...names.map(
            (name) =>
                `export const ${name} = registerActionStub(${JSON.stringify(moduleKey)}, ${JSON.stringify(name)});`,
        ),
    ].join("\n");

export const serverActionStubPlugin = ({ rootDir }) => ({
    name: "server-action-stub",
    enforce: "pre",
    transform(source, id) {
        if (!id.includes("/actions/") || !/\.tsx?$/.test(id) || !hasUseServerDirective(source)) {
            return null;
        }

        const names = readExportedFunctionNames(source, id);
        if (names.length === 0) {
            return null;
        }

        const moduleKey = path.relative(rootDir, id.split("?")[0]).replaceAll("\\", "/");
        return { code: buildStubModule({ names, moduleKey }), map: null };
    },
});

export const readActionExportsForTest = (filePath) =>
    readExportedFunctionNames(readFileSync(filePath, "utf8"), filePath);
```

### src/test-utils/action-stub-registry.ts

```ts
/*
 * SPIKE (2026-08-28): the runtime half of `scripts/vite-plugin-server-action-stub.mjs`. One
 * programmable recorder per action export, replacing the per-action stub modules' duplicated
 * queue/hold/settle/reset skeleton with a single generic one.
 */
type Outcome = unknown;

type Stub = {
    calls: unknown[];
    queue: (outcome: Outcome) => void;
    hold: () => void;
    settle: () => void;
    reset: () => void;
};

type StubState = {
    calls: unknown[];
    queued: Outcome[];
    shouldHold: boolean;
    settleHeld: (() => void) | null;
    fallback: Outcome;
};

const states = new Map<string, StubState>();

const stateFor = (key: string): StubState => {
    const existing = states.get(key);
    if (existing) {
        return existing;
    }
    const created: StubState = { calls: [], queued: [], shouldHold: false, settleHeld: null, fallback: undefined };
    states.set(key, created);
    return created;
};

export const registerActionStub = (moduleKey: string, exportName: string) => {
    const key = `${moduleKey}#${exportName}`;
    const state = stateFor(key);

    return (...args: unknown[]): Promise<Outcome> => {
        state.calls.push(args.length === 1 ? args[0] : args);
        const result = state.queued.length > 0 ? state.queued.shift() : state.fallback;

        if (!state.shouldHold) {
            return Promise.resolve(result);
        }

        state.shouldHold = false;
        return new Promise((resolve) => {
            state.settleHeld = () => {
                resolve(result);
            };
        });
    };
};

export const actionStub = (moduleKey: string, exportName: string): Stub => {
    const key = `${moduleKey}#${exportName}`;
    const state = stateFor(key);

    return {
        get calls() {
            return state.calls;
        },
        queue: (outcome) => {
            state.queued.push(outcome);
        },
        hold: () => {
            state.shouldHold = true;
        },
        settle: () => {
            state.settleHeld?.();
            state.settleHeld = null;
        },
        reset: () => {
            state.calls.length = 0;
            state.queued.length = 0;
            state.shouldHold = false;
            state.settleHeld = null;
        },
    };
};
```
