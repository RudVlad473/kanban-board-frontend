import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Moon, Sun } from "lucide-react";

import { Switch } from "./switch";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (keyboard/click/controlled/hit-area) live exclusively in switch.test.tsx.
 */
const meta: Meta<typeof Switch> = {
    component: Switch,
    args: {
        label: "Toggle dark mode",
    },
};

export default meta;

type Story = StoryObj<typeof Switch>;

export const Off: Story = {};

export const On: Story = {
    args: {
        defaultChecked: true,
    },
};

/*
 * Hover is staged via class application on a wrapping decorator, never a real pointer
 * interaction (D-25 keeps stories visual-only) — the track is a plain nested `span`, not the
 * `role=switch` element itself, so the selector reaches one level in.
 */
export const Hover: Story = {
    args: {
        defaultChecked: true,
    },
    decorators: [
        (Story) => {
            return (
                <div className="[&_[role=switch]>span]:bg-bg-primary-hover">
                    <Story />
                </div>
            );
        },
    ],
};

export const Focus: Story = {
    decorators: [
        (Story) => {
            return (
                <div className="[&_[role=switch]]:outline-2 [&_[role=switch]]:outline-offset-2 [&_[role=switch]]:outline-ring-focus">
                    <Story />
                </div>
            );
        },
    ],
};

export const Disabled: Story = {
    args: {
        isDisabled: true,
    },
};

export const Sizes: Story = {
    render: (args) => {
        return (
            <div className="flex items-center gap-4">
                <Switch {...args} size="sm" label="Small" defaultChecked={true} />

                <Switch {...args} size="md" label="Medium" defaultChecked={true} />

                <Switch {...args} size="lg" label="Large" defaultChecked={true} />
            </div>
        );
    },
};

/*
 * The theme toggle in plan 01-14 is this slot pair's first real consumer — sun/moon glyphs from
 * the icon library selected in plan 01-06, passed in rather than hardcoded as a theme concept.
 */
export const WithIcons: Story = {
    args: {
        defaultChecked: true,
        iconOn: <Sun />,
        iconOff: <Moon />,
    },
};
