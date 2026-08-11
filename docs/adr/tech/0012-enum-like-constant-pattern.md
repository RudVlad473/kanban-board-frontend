# 0012 — Enum-like constant declaration pattern

## Context

TypeScript's native `enum` keyword has known downsides for this project's stack (numeric enums
allow invalid values through, `const enum` doesn't survive isolatedModules-style transpilation
used by Next.js/SWC, and enums aren't erasable the way `type` aliases are). A bare string-literal
union (`type DeviceType = "MOBILE" | "DESKTOP"`) avoids those problems but gives up a runtime
value to iterate, switch on, or pass as a default — exactly what came up authoring plan 01-09's
mobile/desktop test-viewport wrapper, the first place this project needed an enum-like value.

This is a direct user decision, not a researched comparison — recorded as an ADR because it's a
project-wide declaration pattern every future enum-like value should follow, the same class of
constraint the rest of this project's ADRs govern.

## Decision Outcome

**Declare enum-like sets of string values as a `const` object literal whose keys mirror their own
string values, derive the union type from it, never use TypeScript's `enum` keyword.**

```ts
export const DEVICE_TYPE = {
    MOBILE: "MOBILE",
    DESKTOP: "DESKTOP",
} as const;

export type DeviceType = (typeof DEVICE_TYPE)[keyof typeof DEVICE_TYPE];
```

- Keys and values are both SCREAMING_SNAKE_CASE and identical (`MOBILE: "MOBILE"`), not an
  abbreviated key mapped to a different runtime string — this keeps `Object.keys`/`Object.values`
  and the literal string interchangeable at every use site, and keeps `grep`-ability (the runtime
  value already tells you the constant name).
- The corresponding type is always derived (`(typeof X)[keyof typeof X]`), never hand-declared
  separately — a value added to the object automatically appears in the type, so the two cannot
  drift apart.
- `as const` is required — without it, the object's values widen to `string` and the derived type
  becomes `string` instead of the literal union.

## Consequences

- Every future enum-like value (device/viewport type, status, mode, variant set not already
  covered by an existing prop union) follows this pattern from first authorship.
- Existing string-literal unions already in the codebase (e.g. Button's `variant`/`size` props)
  are not retrofitted by this decision — they're component prop types, not standalone
  enum-like constants meant to be iterated or referenced by a shared runtime value, which is the
  problem this pattern solves. Revisit only if a specific existing union actually needs the same
  runtime-iterability this pattern provides.

Unwind trigger: none anticipated — this is a low-cost, reversible-per-instance pattern; revisit
only if a specific case genuinely needs TypeScript's native `enum` semantics (e.g. reverse
numeric mapping), which no case so far has.
