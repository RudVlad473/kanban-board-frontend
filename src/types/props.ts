/**
 * Shared, cross-cutting, runtime-free prop-trait types (ADR tech/0013) — composed into a
 * component's own props via intersection (`&`), never folded into one do-it-all generic wrapper.
 * `src/types/` is scoped specifically to type-only declarations reused across ≥2 otherwise-
 * unrelated components; it is not a general `src/shared/`-style dumping ground.
 */

/** A component's own escape hatch for merging a consumer-supplied className onto its root class list. */
export type ClassNameProp = { className?: string };
