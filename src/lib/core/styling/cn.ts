import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * This project's DTCG composite typography tokens (D-05) are named `heading-*`/`body-*`/
 * `display-*` (`font-heading-xl`, `font-body-m`, ...). tailwind-merge's default `font-size`
 * class group only recognises Tailwind's own built-in scale (`text-sm`, `text-lg`, ...), so an
 * unrecognised value like `text-body-m` falls back into the same group as `text-color`
 * (`text-{color}`) — verified directly against tailwind-merge 3.6.0's resolved output: merging
 * `"text-body-m text-text-on-primary"` silently dropped `text-body-m`, keeping only the color
 * utility, because tailwind-merge treated them as the same conflicting group. Registering the
 * `heading-*`/`body-*`/`display-*` pattern under `font-size` here fixes that misclassification
 * for every primitive that consumes a composite typography token, not just this one.
 */
const isCompositeTypographyName = (value: string) => /^(heading|body|display)-/.test(value);

const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [{ text: [isCompositeTypographyName] }],
        },
    },
});

/**
 * The single className combiner every primitive forwards `className` through (D-26v). `clsx`
 * collapses conditional/falsy inputs into one class string; `twMerge` then resolves conflicting
 * Tailwind utilities so a later (consumer-supplied) class wins over an earlier (base) one,
 * instead of both concatenating and leaving the outcome to CSS source order/specificity.
 */
/*
 * `inputs` below is a rest-parameter identifier passed through to clsx(), not a literal class
 * name — the disable-next-line silences a false positive from tailwindcss/no-custom-classname.
 */
// eslint-disable-next-line tailwindcss/no-custom-classname
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
