import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthCard } from "./auth-card";
import { SignInForm } from "./sign-in-form";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (typing, validation, submit, indistinguishable server error, password reveal, password
 * clearing) live exclusively in sign-in-form.test.tsx. Every state below is reached through this
 * file's own staging props, the same non-interactive pattern Dropdown/Modal already use via
 * `defaultOpen` — see sign-up-form.stories.tsx's identical comment for the full rationale,
 * including why `parameters.nextjs.appDirectory` is required (`useSignIn` calls
 * `next/navigation`'s `useRouter`).
 */
const meta: Meta<typeof SignInForm> = {
    component: SignInForm,
    parameters: {
        nextjs: {
            appDirectory: true,
        },
    },
    decorators: [
        (Story) => (
            <AuthCard title="Sign In">
                <Story />
            </AuthCard>
        ),
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
