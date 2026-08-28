# 0028 — JSX is always returned explicitly from a block body

## Context

`docs/adr/tech/0015` settled how a function is *declared* (arrow-const, never a `function`
declaration) but said nothing about its *body*, so concise-body versus block-body drifted per
author for every function returning JSX.

Measured 2026-08-28 across `src/**/*.tsx` and `app/**/*.tsx`:

| Kind | Block body with `return` | Concise body |
|---|---:|---:|
| Named components | 76 | 8 |
| Inline callbacks | 7 | 58 |

Two de-facto conventions had formed, opposite to each other and split by call site. Even single
files carried both: `sortable-column.stories.tsx` and `board-view.tsx` each contained one of each.
Raised by a user during the Phase 03 review as something to decide explicitly rather than leave to
whichever majority a given file happened to sit in.

This is a direct user decision, not a researched comparison — the same class of project-wide
declaration-style rule as `tech/0015`, and recorded the same way.

## Considered Options

**Option 1 — chosen: every arrow returning JSX uses a block body and an explicit `return`.**
One rule with no call-site exception to remember, and the only option a reader can apply without
first classifying what kind of function they are looking at.
- Pros: uniform; a concise body that grows a second statement never needs re-bracing; mechanically
  enforceable from a single AST shape.
- Cons: 66 sites to convert, and the verbose form on genuinely one-line callbacks.

**Option 2 — codify the existing split** (components block-bodied, callbacks concise). Would have
changed 15 sites instead of 66, but encodes a rule whose boundary is "is this a component", which
no lint selector can decide and every reader must judge. Rejected: cheaper to land, more expensive
to hold.

**Option 3 — always concise where possible.** 83 sites, and it inverts on the first added
statement. Rejected.

## Decision Outcome

Chosen: **Option 1.** All 66 concise JSX bodies were converted in the same commit that landed this
record, so no file is left as inconsistent prior art. The rule applies to any arrow whose body is a
JSX element or fragment, parenthesized or not, at any nesting depth.

```tsx
// Preferred
const ColumnHeader = ({ name }: Props) => {
    return <h2>{name}</h2>;
};

{columns.map((column) => {
    return <Column key={column.id} {...column} />;
})}

// Not this
const ColumnHeader = ({ name }: Props) => <h2>{name}</h2>;
```

Nothing else changes. An arrow returning a non-JSX expression keeps its concise body, and
`tech/0015`'s two-line const-then-default-export pattern for Next.js special files is untouched.

**Enforcement:** two `no-restricted-syntax` selectors in `eslint.config.mjs` section 8h,
`ArrowFunctionExpression > JSXElement` and `ArrowFunctionExpression > JSXFragment`. Blocking, and
`pnpm lint` runs in CI's `quality` job.

Core ESLint's `arrow-body-style: ["error", "always"]` was deliberately **not** used despite being
autofix-capable. It cannot be scoped to a JSX body, so it would also brace every non-JSX one-liner
in the repository — a far wider change than this record decides, and one nobody asked for.

## Consequences

- A JSX-returning arrow is brace-and-`return` from first authorship, everywhere, with no
  component-versus-callback judgment call.
- Losing the autofixer is the real cost: a violation is a blocking lint error the author fixes by
  hand. Accepted as the price of not silently reformatting every unrelated one-liner.
- ESTree exposes no parenthesis node, so the selectors match `() => (<div />)` as well as
  `() => <div />`. Verified against the 65 sites ESLint reported before the conversion.

Unwind trigger: if a future ESLint or typescript-eslint rule can express "block body for JSX
returns only" with an autofixer, swap the selectors for it. The convention itself would not change.
