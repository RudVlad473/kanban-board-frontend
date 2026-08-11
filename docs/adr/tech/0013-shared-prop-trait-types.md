# 0013 — Shared cross-cutting prop-trait types

## Context

`{ className?: string }` is currently declared inline, separately, in 13 places across the seven
`components/ui/` primitives (confirmed via `grep -rn "className?: string" src/components/ui/` in
the 01-09 worktree) — once per primitive's own root props, plus once per Modal's five compound
sub-components. `CONVENTIONS.md`'s existing placement rule (docs/adr/tech/0009) covers where
*runtime* code goes (features/ui/layout/hooks/lib) but has no slot for domain-agnostic,
runtime-free TYPE declarations meant to be reused across many otherwise-unrelated components —
this is a distinct category from all six existing placement destinations, not a fit for any of
them (and the placement rule explicitly rules out an ad-hoc `src/shared/` catch-all).

Modal (`modal.tsx`) already independently arrived at the composition idiom this ADR formalizes:
`type ContentProps = Omit<DialogPopupProps, "className"> & { className?: string };` — an
intersection of a base shape with an inline className trait. This ADR extracts that trait into a
shared, named, single-source-of-truth type instead of restating the same `{ className?: string }`
literal at every call site.

## Decision Outcome

**A new `src/types/` directory holds shared, cross-cutting, runtime-free TYPE declarations**,
added as a 7th destination in `CONVENTIONS.md`'s placement rule, structurally parallel to how
`hooks/` is carved out for generic domain-agnostic runtime logic:

> Is it a domain-agnostic TYPE declaration with no runtime code, reused across ≥2 otherwise-
> unrelated components? → `src/types/`.

**Prop traits compose via intersection (`&`) of small, atomic, single-purpose types — not a
single do-it-all generic wrapper.** First trait:

```ts
// src/types/props.ts
export type ClassNameProp = { className?: string };
```

Usage, replacing the inline literal:

```ts
type ButtonProps = ClassNameProp & {
    variant?: "primary" | "secondary" | "destructive";
    size?: "sm" | "md" | "lg";
    isDisabled?: boolean;
};
```

Future cross-cutting prop traits (e.g. a shared `children`/`id` shape, if a real duplication
case arises the same way this one did) get their own atomic type in the same file or a sibling
file under `src/types/`, composed the same way — never folded into one large generic options
object, which would force every consumer to opt out of fields it doesn't want.

## Consequences

- All 13 existing inline `{ className?: string }` declarations across the seven primitives (and
  Modal's five compound sub-component prop types) are retrofitted to `ClassNameProp` as part of
  landing this decision — not left as inconsistent prior art.
- `CONVENTIONS.md`'s placement rule gains a 7th destination; the existing "no `src/shared/`
  catch-all" rule is unaffected — `src/types/` is scoped specifically to type-only, zero-runtime
  declarations, not a general dumping ground.
- Every future component's `className?: string` prop uses `ClassNameProp` from first authorship
  rather than restating the inline literal.

Unwind trigger: if `src/types/` starts accumulating non-trait, single-use types out of
convenience (defeating its "reused across ≥2 unrelated components" scope) → tighten the
placement rule or split `src/types/` into narrower sub-files rather than letting scope creep in
silently.
