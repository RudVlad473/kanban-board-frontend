import { Toast as BaseToast } from "@base-ui/react/toast";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";

import { ToastProvider, useToast } from "./toast";

type ToastConfig = Parameters<ReturnType<typeof useToast>["add"]>[0];

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions (add,
 * upsert, action click, close, stacking) live exclusively in toast.test.tsx. A story cannot drive
 * `useToast().add()` from a play function per D-25, so each story instead seeds its own
 * `Toast.createToastManager()` instance and hands it to `ToastProvider` via the `toastManager`
 * prop Base UI documents specifically "for use outside of a React component" — Storybook's
 * per-story, client-only module evaluation is exactly that context, not the concurrent-SSR-request
 * hazard `toast.tsx`'s own WHY-comment forbids that factory for at the app-runtime level. This
 * file is the one place in this plan that constructs a manager directly.
 *
 * `add()` is called from a `useEffect` here, NOT from the `useState` initializer that constructs
 * the manager. The installed `ToastProvider` (provider/ToastProvider.js) only reacts to a
 * `toastManager` prop via its own `useEffect` subscribing to FUTURE events — the manager itself
 * (createToastManager.js) is a bare emitter with no event buffer, so any `add()` called before
 * that subscribe effect has run is emitted to zero listeners and silently lost. Verified directly:
 * seeding inside the `useState` initializer (this component's very first render, before any
 * effect anywhere has run) rendered every story with an empty, toast-less viewport region — a real
 * bug caught by opening the stories in a browser, not by the automated test suite, which drives
 * `add()` through `useToast()` from a component already mounted *inside* `ToastProvider` and so
 * never hits this ordering at all. Seeding from this component's own `useEffect` instead relies on
 * React's child-before-parent effect commit order: `ToastProvider` renders as this component's
 * child, so its subscribe effect is guaranteed to run before this effect does.
 */
const SeededToastCanvas = ({ configs }: { configs: ToastConfig[] }) => {
    const [manager] = useState(() => BaseToast.createToastManager());

    useEffect(() => {
        configs.forEach((config) => {
            manager.add(config);
        });
        /*
         * configs is a story-static prop (never reassigned after mount) — re-seeding on every
         * render would re-run add() for the same ids, which the installed manager treats as an
         * update-in-place, not a duplicate, but is still unnecessary work on every re-render.
         */
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manager]);

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
        /*
         * `timeout: 0` (store.js: `duration > 0` gates whether an auto-close timer is ever
         * scheduled at all) — a story is meant to sit still for human review, not auto-dismiss
         * mid-review. Without it, the outer Storybook manager URL (full chrome: sidebar, addon
         * panels, a11y panel) takes long enough to finish booting that Base UI's 5000ms default
         * timeout had often already fired and closed the toast before a human ever saw it —
         * reproduced directly by comparing a ~1s-after-navigation screenshot (toast visible) against
         * a ~9s-after-navigation one (empty canvas) at the same URL.
         */
        configs: [{ title: "Rollback complete", description: "The board name was restored.", timeout: 0 }],
    },
};

export const Danger: Story = {
    args: {
        configs: [{ type: "danger", title: "Couldn't delete board.", description: "Try again.", timeout: 0 }],
    },
};

export const WithAction: Story = {
    args: {
        configs: [
            {
                title: "Couldn't create 2 column(s).",
                description: "Try again.",
                actionProps: { children: "Retry" },
                timeout: 0,
            },
        ],
    },
};

export const Stacked: Story = {
    args: {
        configs: [
            { title: "Couldn't rename board.", description: "Try again.", timeout: 0 },
            { type: "danger", title: "Couldn't delete board.", description: "Try again.", timeout: 0 },
        ],
    },
};

/*
 * Deliberately longer than any real Copywriting Contract string this phase actually uses — long
 * enough that both `Title` (2-line clamp) and `Description` (3-line clamp) visibly truncate with
 * an ellipsis instead of growing the card, which the shorter, realistic copy in the other stories
 * wouldn't demonstrate. The full text of each is still reachable via the native `title` tooltip
 * (hover or focus) `Title`/`Description` set from their own string children.
 */
export const LongContent: Story = {
    args: {
        configs: [
            {
                type: "danger",
                title: "Couldn't create 6 column(s): Backlog, To Do, In Progress, In Review, Blocked, Done — every one of them failed to save.",
                description:
                    "The board itself was created successfully, but every column listed above failed to save to the server. You can retry to add them automatically, or add each one manually from the board view instead — either path leaves the board itself intact and only affects these columns.",
                actionProps: { children: "Retry" },
                timeout: 0,
            },
        ],
    },
};
