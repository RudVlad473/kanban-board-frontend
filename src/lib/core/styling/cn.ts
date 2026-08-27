// Covered by: `src/components/ui/button/button.test.tsx`
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * Fixes a real tailwind-merge bug: its default `font-size` group doesn't recognise this project's
 * composite typography tokens (`text-body-m` etc.), so it silently dropped them whenever a
 * text-color utility appeared later in the same `cn()` call (see 01-06-SUMMARY.md).
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
 * The single className combiner every primitive forwards `className` through (D-26v; see
 * 01-06-SUMMARY.md), resolving conflicting Tailwind utilities so a later class wins.
 */
// eslint-disable-next-line tailwindcss/no-custom-classname -- `inputs` is a rest param passed to clsx(), not a literal class name
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
