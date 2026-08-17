import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorFallback } from "./error-fallback";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (retry callback, digest presence/absence, link) live exclusively in error-fallback.test.tsx.
 * No `visual/*.visual.spec.ts` entry — ADR tech/0011 scopes baselines to `components/ui/` only.
 */
const meta: Meta<typeof ErrorFallback> = {
    component: ErrorFallback,
    args: {
        title: "Something went wrong",
        description: "This part of the app ran into a problem. Your other work is unaffected.",
        onRetry: () => undefined,
        homeHref: "/boards",
    },
};

export default meta;

type Story = StoryObj<typeof ErrorFallback>;

export const Default: Story = {};

export const WithReference: Story = {
    args: {
        digest: "a1b2c3d4",
    },
};
