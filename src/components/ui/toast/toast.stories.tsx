import { Toast as BaseToast } from "@base-ui/react/toast";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ToastProvider, useToast } from "./toast";

type ToastConfig = Parameters<ReturnType<typeof useToast>["add"]>[0];

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions (add,
 * upsert, action click, close, stacking) live exclusively in toast.test.tsx. A story cannot drive
 * `useToast().add()` from a play function per D-25, so each story instead seeds its own
 * `Toast.createToastManager()` instance synchronously (before the first render) and hands it to
 * `ToastProvider` via the `toastManager` prop Base UI documents specifically "for use outside of a
 * React component" — Storybook's per-story, client-only module evaluation is exactly that context,
 * not the concurrent-SSR-request hazard `toast.tsx`'s own WHY-comment forbids that factory for at
 * the app-runtime level. This file is the one place in this plan that constructs a manager
 * directly.
 */
const SeededToastCanvas = ({ configs }: { configs: ToastConfig[] }) => {
    const [manager] = useState(() => {
        const seeded = BaseToast.createToastManager();
        configs.forEach((config) => {
            seeded.add(config);
        });
        return seeded;
    });

    return (
        <div className="relative h-96 w-full bg-bg-app">
            <ToastProvider toastManager={manager} />
        </div>
    );
};

const meta: Meta<typeof SeededToastCanvas> = {
    component: SeededToastCanvas,
};

export default meta;

type Story = StoryObj<typeof SeededToastCanvas>;

export const Default: Story = {
    args: {
        configs: [{ title: "Rollback complete", description: "The board name was restored." }],
    },
};

export const Danger: Story = {
    args: {
        configs: [{ type: "danger", title: "Couldn't delete board.", description: "Try again." }],
    },
};

export const WithAction: Story = {
    args: {
        configs: [
            {
                title: "Couldn't create 2 column(s).",
                description: "Try again.",
                actionProps: { children: "Retry" },
            },
        ],
    },
};

export const Stacked: Story = {
    args: {
        configs: [
            { title: "Couldn't rename board.", description: "Try again." },
            { type: "danger", title: "Couldn't delete board.", description: "Try again." },
        ],
    },
};

export const LongContent: Story = {
    args: {
        configs: [
            {
                type: "danger",
                title: "Couldn't create 4 column(s): Backlog, To Do, In Progress, Done.",
                description:
                    "The board was created, but these columns failed to save. Retry to add them, or add them manually from the board view.",
                actionProps: { children: "Retry" },
            },
        ],
    },
};
