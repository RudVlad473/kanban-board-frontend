# 0015 — Function declaration style: arrow-const only

## Context

The codebase currently mixes function declarations (`export function foo() {}`) and arrow-const
expressions (`export const foo = () => {}`) — a quick scan of the 01-09 worktree found the
`function` form in `use-overflow-indicator.ts`/`.test.tsx`, `rtl-harness-probe.tsx`,
`describe-for-each-device.ts` (ADR tech/0014's own new util), and `app/layout.tsx`'s default
export. No prior convention picked one style, so it drifted per-author.

This is a direct user decision, not a researched comparison — recorded as an ADR because it's a
project-wide declaration-style rule every future function should follow, the same class of
constraint the rest of this project's ADRs govern.

## Decision Outcome

**Every function is declared as a `const` bound to an arrow function expression, not a `function`
declaration or a `function` expression.**

```ts
// Preferred
export const describeForEachDevice = (name: string, body: (device: DeviceType) => void) => {
    /* ... */
};

// Not this
export function describeForEachDevice(name, body) { /* ... */ }
```

**Next.js framework-forced default exports** (`app/**/page.tsx`, `layout.tsx`, `route.ts`, etc. —
the same file set CONVENTIONS.md's import/order rules already carve out for `no-default-export`)
cannot use `export default const foo = () => {}` (invalid syntax — a `const` cannot be inlined
into a `default export` statement). For these files only: declare the arrow-const normally, then
`export default` it on its own line:

```ts
const RootLayout = ({ children }: { children: React.ReactNode }) => {
    /* ... */
};

export default RootLayout;
```

**Enforcement:** `eslint-plugin-prefer-arrow-functions` (autofix-capable), configured to convert
both function declarations and function expressions to arrow functions, combined with core
ESLint's `func-style: ["error", "expression"]` as a backstop against bare function declarations
specifically. Existing `function`-style code across the codebase is retrofitted to match as part
of landing this decision, not left as inconsistent prior art.

## Consequences

- Every future function (component, hook, handler, util) is declared as an arrow-const from
  first authorship.
- Class methods and object-literal method shorthand are unaffected — this rule targets standalone
  function declarations/expressions, not method syntax inside a class or object literal.
- Next.js special files keep working via the two-line const-then-default-export pattern above,
  the only case this project's own file conventions require an exception to the direct
  `export const foo = () => {}` form.

Unwind trigger: none anticipated — this is a low-cost, mechanically-enforceable, autofixable
style rule.
