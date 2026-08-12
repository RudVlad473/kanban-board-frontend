import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthCard } from "./auth-card";
import { SignUpForm } from "./sign-up-form";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (typing, validation, submit, server error, password reveal) live exclusively in
 * sign-up-form.test.tsx. Every state below is reached through this file's own staging props
 * (`defaultValues`/`forceFieldErrors`/`forceServerError`/`forceSubmitting`/
 * `defaultPasswordRevealed`), the same non-interactive pattern Dropdown/Modal already use via
 * `defaultOpen`. `QueryProvider` is supplied globally (.storybook/preview.tsx) because
 * `SignUpForm` calls `useSignUp`, which calls `useMutation` — there is no play function here to
 * ever trigger a real request, so no MSW handler is needed either.
 */
const meta: Meta<typeof SignUpForm> = {
    component: SignUpForm,
    /*
     * `useSignUp` calls `next/navigation`'s `useRouter` — `@storybook/nextjs-vite` only mounts a
     * working App Router context (rather than throwing "expected app router to be mounted") once
     * `parameters.nextjs.appDirectory` is set, per the framework's own documented requirement for
     * any story that imports an App Router `next/navigation` consumer.
     */
    parameters: {
        nextjs: {
            appDirectory: true,
        },
    },
    decorators: [
        (Story) => (
            <AuthCard title="Sign Up">
                <Story />
            </AuthCard>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof SignUpForm>;

export const Empty: Story = {};

export const Filled: Story = {
    args: {
        defaultValues: {
            email: "user@example.com",
            displayName: "Jamie Rivera",
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
        forceServerError:
            "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.",
    },
};

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

/*
 * UI-SPEC's overflow backstop: a long Name/Email value scrolls horizontally within the field
 * rather than wrapping or breaking the card's layout — the deliberately long values here
 * demonstrate that inside the same bounded card width every other story renders at.
 */
export const LongValues: Story = {
    args: {
        defaultValues: {
            email: `${"a".repeat(60)}@example.com`,
            displayName: "A very long display name that will definitely overflow the field width",
        },
    },
};
