# 0031 — A `components/ui/` primitive may import another primitive

## Context

`eslint.config.mjs` section 7 gave the `ui` element type a policy allowing only `lib-core` and
`lib-client`. Because `boundaries/dependencies` defaults to `disallow`, omitting `ui` from that
allow-list banned every `src/components/ui/*` module from importing any sibling primitive. The ban
was never written down as a decision — it fell out of listing what a primitive legitimately needs
downstream (`cn`, shared types) and not thinking about sideways edges.

It did buy one real guarantee: the primitive layer was acyclic by construction. No `import`-time
cycle between two primitives could exist, because no edge between two primitives could exist.

It also had a cost, paid twice:

- **Ten byte-identical close controls.** Each of the ten feature modals rendered the same nine-line
  `Modal.Close`/`IconButton`/`X` block with the same `absolute top-1 right-1 md:top-2 md:right-2`
  positioning, because `Modal` could not import `IconButton` to render it once. Ten copies of a
  control means ten places a label, an offset, or a DOM position can silently diverge — and the
  correct DOM position (a sibling of `Modal.Content`'s inner scroll region, not a child of it) was
  something every call site had to get right without any way to know it mattered.
- **`Menu.Item` hand-copying `Dropdown.Item`.** `src/components/ui/menu/menu.tsx:90` carries the
  same forty-odd Tailwind classes as `src/components/ui/dropdown/dropdown.tsx:162`, with a comment
  saying so, because sharing them was not expressible. The two are now free to drift on a padding
  or highlight change and nothing catches it.

Both are the same defect: a shared visual contract with no single place to state it.

## Decision Outcome

**A `components/ui/` primitive may import another `components/ui/` primitive.** The `ui` policy in
`eslint.config.mjs` section 7 gains `{ to: { element: { type: "ui" } } }`.

**The acyclicity guarantee is replaced, not dropped.** `import-x/no-cycle` (from the already-installed
`eslint-plugin-import-x`; no new dependency) is enabled at `error` over `src/components/ui/**/*.{ts,tsx}`
in a new section 7c, with `maxDepth: Infinity` and `ignoreExternal: true`. A cycle of any length
involving a primitive fails `pnpm lint`. This is strictly stronger than the old ban in one respect —
it also catches a cycle routed through `lib/`, which the boundary policy never could — and weaker in
one — a legitimate two-primitive edge is now allowed, which is the point of this record.

The rule is scoped to `src/components/ui/**` rather than run repository-wide. Graph traversal is the
expensive part of `no-cycle`, and this record only removes a guarantee for one element type;
extending it to `features/` would be a separate decision with its own lint-time budget. Measured
2026-09-02: full `pnpm lint` wall clock went from 46.1s to 47.4s.

### The setting that makes the rule work

`import-x/no-cycle` parses each dependency itself to walk the graph. With no `import-x/parsers`
setting it cannot parse a `.tsx` file at all, so it walks an empty graph and reports a genuine cycle
as clean — silently, with a zero exit code. Section 7c therefore carries
`"import-x/parsers": { "@typescript-eslint/parser": [".ts", ".tsx", ".cts", ".mts"] }` alongside the
resolver. The repository's existing `import/parsers` setting (contributed by `eslint-config-next`)
is under the `import` namespace and does not reach `import-x`.

This was found by testing rather than reasoning: a deliberate `button.tsx` ⇄ `icon-button.tsx` cycle
passed `pnpm lint` with exit 0 under the resolver-only configuration, and failed with two
`Dependency cycle detected` errors once `import-x/parsers` was added — in both the `@/`-alias and the
relative-path spelling. Removing the cycle returned lint to green. Anyone changing section 7c must
re-run that falsification; a `no-cycle` configuration that reports nothing is indistinguishable from
one that is not running.

### What remains disallowed

- `ui -> feature`, `ui -> layout`, `ui -> lib-server`. A primitive is domain-agnostic and
  browser-safe; none of those three edges is. Unchanged by this record.
- Any import cycle among primitives, per section 7c above.
- Everything sections 7's other policies already govern. This record touches the `ui` policy only.

## Consequences

- `src/components/ui/modal/modal.tsx` imports `IconButton` and renders the pinned close control
  itself, deleting the ten duplicated blocks. That is the immediate motivating change and lands in
  the commit after this one.
- `Menu.Item`/`Dropdown.Item`'s duplicated class string is now fixable. It is deliberately **not**
  fixed here — this record establishes the permission; collapsing that pair is its own change with
  its own visual-baseline consequences.
- A primitive importing a sibling drags that sibling into every bundle the first appears in.
  Primitives are small and already co-bundled in practice, so this is noted rather than guarded.
- The failure mode this opens is a slow accretion of sideways edges until the primitive layer has no
  readable shape. `no-cycle` catches the acute version (a cycle) and nothing catches the chronic one.

Unwind trigger: revisit if `import-x/no-cycle` proves too slow to keep in the default `pnpm lint`
path as `components/ui/` grows, or if primitive-to-primitive edges start carrying domain knowledge —
at which point the answer is a stricter policy on what a primitive may import, not a return to the
blanket ban, which this record's Context shows was paid for in duplication.

**Enforcement:** `pnpm lint`, blocking. `boundaries/dependencies` (section 7) permits the `ui -> ui`
edge; `import-x/no-cycle` (section 7c) rejects any cycle it could create. Both run in CI's `quality`
job as part of the existing lint step — no new script, no new CI wiring.

Sources:

- `eslint.config.mjs` sections 7 and 7c — the policy this record changes and the guard it adds.
- `src/components/ui/menu/menu.tsx:81-90`, `src/components/ui/dropdown/dropdown.tsx:162` — the
  duplicated item styling, with the source comment naming the duplication.
- `docs/adr/tech/0009-project-organization.md` — the layer model whose `ui` ring this record widens.
- `docs/adr/tech/0007-linter-formatter-toolchain.md` — why `eslint-plugin-import-x` is the
  ESLint 10-compatible fork already installed, so this guard adds no dependency.
