import type { Decorator } from "@storybook/react";

import { ToastProvider } from "@/components/ui/toast/toast";
import { QueryProvider } from "@/lib/client/query-client";
import { DEVICE_TYPE, VIEWPORT_SIZES } from "@/lib/core/viewport/viewport-breakpoints";

/*
 * Storybook's decorator signature is API-dictated `(Story, context)`; this type gives the inline
 * decorators below (not named consts — exempt from `docs/adr/tech/0016`'s one-parameter rule)
 * real parameter types instead of implicit `any` (see docs/adr/tech/0021).
 */
type DecoratorParams = Parameters<Decorator>;

/*
 * Extracted to its own module (no `@storybook/nextjs-vite` import) so `vitest.setup.ts` can reuse
 * these values; left untyped, since an explicit `Preview` annotation fails to structurally satisfy
 * `.storybook/preview.tsx`'s Next.js-augmented definePreview type when spread in (see docs/adr/tech/0021).
 */
export const previewAnnotations = {
    parameters: {
        a11y: {
            /*
             * An axe violation fails the story rather than merely annotating it — nothing ships
             * unverified.
             */
            test: "error",
            options: {
                rules: {
                    /*
                     * Storybook's own documented default for isolated component rendering: a story has no
                     * page landmarks (<main>/<nav>/etc.) to violate, so "region" is a guaranteed
                     * false-positive here, not a real accessibility gap.
                     */
                    region: { enabled: false },
                },
            },
        },
        viewport: {
            options: {
                [DEVICE_TYPE.MOBILE]: {
                    name: `Mobile (${String(VIEWPORT_SIZES[DEVICE_TYPE.MOBILE].width)}px, breakpoint.mobile)`,
                    styles: {
                        width: `${String(VIEWPORT_SIZES[DEVICE_TYPE.MOBILE].width)}px`,
                        height: `${String(VIEWPORT_SIZES[DEVICE_TYPE.MOBILE].height)}px`,
                    },
                    type: "mobile" as const,
                },
                [DEVICE_TYPE.DESKTOP]: {
                    name: `Desktop (${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].width)}px, breakpoint.desktop)`,
                    styles: {
                        width: `${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].width)}px`,
                        height: `${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].height)}px`,
                    },
                    type: "desktop" as const,
                },
            },
        },
    },
    globalTypes: {
        theme: {
            description: "Toggle the .dark class on the story canvas root",
            toolbar: {
                title: "Theme",
                icon: "circlehollow" as const,
                items: [
                    { value: "light", icon: "sun" as const, title: "Light" },
                    { value: "dark", icon: "moon" as const, title: "Dark" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: "light",
        /*
         * Desktop by default, matching every existing story's pre-ADR-0010 rendering; a human
         * flips the toolbar's Mobile/Desktop control to see the other viewport instantly, so no
         * separate `Mobile*` story export exists per component.
         */
        viewport: DEVICE_TYPE.DESKTOP,
    },
    decorators: [
        /*
         * Every provider a story's real hooks/mutations need belongs here, mirroring
         * `app/layout.tsx`'s own nesting — `useToast()` throws outside a Toast provider, and a
         * per-file wrapper broke Storybook's CSF indexing, which requires a literal default export.
         */
        (Story: DecoratorParams[0], context: DecoratorParams[1]) => {
            /*
             * `toast.stories.tsx` mounts its own provider to inject a pre-seeded manager; a second
             * one here would render a second `Toast.Viewport` live region beside it.
             */
            const toastParameters = context.parameters.toast as { hasOwnProvider?: boolean } | undefined;
            const hasOwnToastProvider = toastParameters?.hasOwnProvider === true;

            return (
                <QueryProvider>
                    {hasOwnToastProvider ? Story() : <ToastProvider>{Story()}</ToastProvider>}
                </QueryProvider>
            );
        },
        (Story: DecoratorParams[0], context: DecoratorParams[1]) => {
            document.documentElement.classList.toggle("dark", context.globals.theme === "dark");
            /*
             * Mirrors app/layout.tsx's <body> so stories render against the same themed
             * background as real usage — otherwise dark-mode text tokens sit on the
             * browser's default white canvas.
             */
            document.body.classList.add("bg-bg-app", "text-text-primary");

            return Story();
        },
    ],
};
