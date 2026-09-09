import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthCard } from "@/features/auth/components/auth-card/auth-card";

import { SignInForm } from "./sign-in-form";

/*
 * Visual-only CSF3; behavioral assertions live in sign-in-form.test.tsx. Every state below
 * is reached through this file's own staging props (Dropdown/Modal's `defaultOpen` pattern), and
 * `appDirectory` is required since the form imports `signInAction`, never invoked by any story.
 */
const meta: Meta<typeof SignInForm> = {
    component: SignInForm,
    parameters: {
        nextjs: {
            appDirectory: true,
        },
    },
    decorators: [
        (Story) => {
            return (
                <AuthCard title="Sign In">
                    <Story />
                </AuthCard>
            );
        },
    ],
};

export default meta;

type Story = StoryObj<typeof SignInForm>;

export const Empty: Story = {};

export const Filled: Story = {
    args: {
        defaultValues: {
            email: "user@example.com",
            password: "correct-horse-battery-staple",
        },
    },
};

export const WithFieldErrors: Story = {
    args: {
        forceFieldErrors: true,
    },
};

export const WithServerError: Story = {
    args: {
        forceServerError: "Invalid email or password.",
    },
};

/*
 * `forceSubmitting` now stages the whole form's busy state through the single `isPending` value
 * every control reads from (plan 01-16) — both fields, the password toggle and the submit button
 * all render their loading state together, not the button alone.
 */
export const Submitting: Story = {
    args: {
        forceSubmitting: true,
    },
};

export const PasswordRevealed: Story = {
    args: {
        defaultValues: {
            password: "correct-horse-battery-staple",
        },
        defaultPasswordRevealed: true,
    },
};
