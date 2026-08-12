# 0016 — Multi-parameter functions take one destructured object parameter

## Context

Plan 01-11 introduced functions like `createSessionService(secret)` (one param, fine) alongside
Route Handler helpers taking multiple positional arguments. The user flagged positional
multi-argument signatures (`const func1 = (param1, param2) => {}`) as a readability problem at
call sites — `func1(a, b)` doesn't say what `a` and `b` mean without checking the definition,
whereas `func2({ userId, theme })` documents itself at every call site.

This is a direct user decision, not a researched comparison — recorded as an ADR for the same
reason as ADR tech/0015: it's a project-wide style rule every future function should follow.

The rule cannot be applied blindly to every function in the codebase. Callback arguments handed
to another API — `array.map((item, index) => ...)`, `array.reduce((acc, item) => ...)`,
`new Promise((resolve, reject) => ...)`, `React.forwardRef((props, ref) => ...)` — have their
arity and positional order dictated by the API being called, not by this project. The caller
passes separate positional arguments; there is no way for the callback to "collect" them into one
object, since object destructuring in a parameter position only applies within a single argument
slot. Forcing an object wrapper there is both impossible to do meaningfully and not what the user
asked for — they distinguished this case explicitly when scoping the rule.

## Decision Outcome

**A function or arrow function *declared* by this project — a `function` declaration, a
`const`-bound arrow (ADR tech/0015), a class method, or an object-literal method — that needs 2
or more parameters takes exactly one parameter: a destructured object.**

```ts
// Preferred
const createSession = ({ userId, theme }: { userId: string; theme: Theme }) => {
    /* ... */
};

// Not this
const createSession = (userId: string, theme: Theme) => {
    /* ... */
};
```

**Exempt: function/arrow expressions passed inline as an argument to a call or constructor** —
their signature is the callback contract of the API they're passed to, not a signature this
project controls:

```ts
// Exempt — array method dictates (item, index) positionally
items.map((item, index) => ...);
items.reduce((acc, item) => ...);

// Exempt — Promise executor dictates (resolve, reject) positionally
new Promise((resolve, reject) => { ... });
```

A function that is itself declared with 2+ params and only *later* passed by reference as a
callback (`items.map(myNamedHandler)`) is still governed by this rule at its declaration site —
the exemption is about the *argument-list position of the function expression itself*, not about
whether the function is ever used as a callback anywhere.

**Also exempt, via `eslint-disable-next-line` with a comment, not a selector:** an object method
that fakes a fixed third-party interface, where the positional shape is the thing being mocked
(e.g. a test double for `next/headers`'s `cookies().set(name, value, options)`). Reshaping the
fake's parameter list would make it stop matching the real API it stands in for — the exemption
belongs to a case-by-case documented comment, not a general selector carve-out, since a selector
cannot distinguish "faking a fixed external shape" from an ordinary object-literal method this
rule should still catch.

**Enforcement:** `no-restricted-syntax` selectors in `eslint.config.mjs` targeting
`FunctionDeclaration`, `VariableDeclarator > (ArrowFunctionExpression | FunctionExpression)`,
`MethodDefinition > FunctionExpression`, `Property[method=true] > FunctionExpression`, and
`Property > ArrowFunctionExpression` with `params.length >= 2` — none of these selectors match a
function expression sitting directly in a `CallExpression`/`NewExpression` argument list, which is
exactly the callback case the exemption covers.

## Consequences

- Every future multi-param function is declared with one destructured object parameter from
  first authorship; call sites self-document their arguments' meaning.
- Native/library callback contracts (array methods, Promise executor, `forwardRef`, event
  handlers) are unaffected — this rule cannot reach into a signature dictated by code outside this
  project.
- A function later needing a third related value only touches its object type, not every call
  site's argument order.
- Existing multi-positional-param functions across the codebase are retrofitted to match as part
  of landing this decision, not left as inconsistent prior art (same precedent as ADR tech/0015).

Unwind trigger: none anticipated — mechanically enforceable via lint, not autofixable (rewriting
call sites requires judgment about field names), so violations surface as review-time lint errors
rather than silent drift.
