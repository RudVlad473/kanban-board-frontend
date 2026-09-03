import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthCard } from "./auth-card";

/*
 * Visual-only CSF3; behavioral assertions live in auth-card.test.tsx. A plain
 * presentational shell — no Server Action import, so no stub alias is needed here.
 */
const meta: Meta<typeof AuthCard> = {
    component: AuthCard,
    args: {
        title: "Sign In",
        children: <p>Card body content.</p>,
    },
};

export default meta;

type Story = StoryObj<typeof AuthCard>;

export const Default: Story = {};

export const LongTitle: Story = {
    args: {
        title: "A Very Long Title That Should Wrap Instead Of Overflowing The Card",
    },
};
