import { Toast as BaseToast } from "@base-ui/react/toast";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";

import { ToastProvider } from "./toast";
import { useToast } from "./use-toast";

type ToastConfig = Parameters<ReturnType<typeof useToast>["add"]>[0];

/*
 * Visual-only CSF3 (D-25) — behavioural assertions live in toast.test.tsx. A story can't drive
 * useToast().add() from a play function, so each story seeds its own Toast.createToastManager()
 * and hands it to ToastProvider via toastManager, Base UI's documented outside-React-component API.
 */
const SeededToastCanvas = ({ configs }: { configs: ToastConfig[] }) => {
    const [manager] = useState(() => BaseToast.createToastManager());

    /*
     * add() runs in an effect, not the useState initializer: ToastProvider only subscribes to the
     * manager from its OWN effect, and React commits child effects before parent ones, so seeding
     * any earlier (verified directly) emits to zero listeners and the toast never appears.
     */
    useEffect(() => {
        configs.forEach((config) => {
            manager.add(config);
        });
        // configs is a story-static prop — re-seeding on every render is unnecessary work.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manager]);

    return (
        <div className="relative h-96 w-full bg-bg-app">
            <ToastProvider toastManager={manager} />
        </div>
    );
};

/*
 * Opts out of the global `ToastProvider` decorator (`.storybook/preview-annotations.tsx`) — this
 * file mounts its own so it can inject a pre-seeded manager, and two would render two viewports.
 */
const meta: Meta<typeof SeededToastCanvas> = {
    component: SeededToastCanvas,
    parameters: { toast: { hasOwnProvider: true } },
};

export default meta;

type Story = StoryObj<typeof SeededToastCanvas>;

export const Default: Story = {
    args: {
        /*
         * `timeout: 0` disables the auto-close timer — Storybook's chrome takes long enough to
         * boot that Base UI's 5000ms default had often already fired before a human ever saw the
         * toast (reproduced directly comparing ~1s vs ~9s post-navigation screenshots).
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
 * Deliberately longer than any real Copywriting Contract string — long enough that both Title
 * (2-line clamp) and Description (3-line clamp) visibly truncate, which the other stories'
 * shorter copy wouldn't demonstrate. Full text stays reachable via the native title tooltip.
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
