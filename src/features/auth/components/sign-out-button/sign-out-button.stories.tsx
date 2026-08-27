import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SignOutButton } from "./sign-out-button";

/*
 * Visual-only CSF3 (D-25); behavioral assertions live in sign-out-button.test.tsx.
 * `signOutAction` resolves through the shared Server Action stub alias (docs/adr/tech/0020),
 * never invoked for real. No `forceX` prop exists on this component to stage a pending story.
 */
const meta: Meta<typeof SignOutButton> = {
    component: SignOutButton,
};

export default meta;

type Story = StoryObj<typeof SignOutButton>;

export const Default: Story = {};
