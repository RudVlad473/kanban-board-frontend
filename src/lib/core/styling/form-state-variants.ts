// Covered by: `src/components/ui/text-field/text-field.test.tsx`, `src/components/ui/checkbox/checkbox.test.tsx`, `src/components/ui/dropdown/dropdown.test.tsx`
/*
 * The two semantic border tokens every bordered form primitive shares, so a change to the error
 * visual lands on TextField, Checkbox and Dropdown at once.
 */
export const formStateVariants = {
    default: "border-border-default",
    error: "border-border-danger",
} as const;
