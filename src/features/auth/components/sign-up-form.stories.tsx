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

/*
 * `forceFieldErrors` now stages only Email/Password's required-message state (GC-02) — Name is
 * optional, so an untouched Name field never produces the required-field error the resolver
 * would have shown before this plan.
 */
export const WithFieldErrors: Story = {
    args: {
        forceFieldErrors: true,
    },
};

/*
 * The Name-specific and password-complexity messages aren't reachable through `forceFieldErrors`
 * (that staging path only ever produces the required-field message) — staged here instead through
 * their own dedicated force props, the same non-interactive pattern `forceServerError` already
 * uses (D-25: no play function, a visual-only CSF3 story).
 */
export const WithNameAndPasswordComplexityErrors: Story = {
    args: {
        forceNameError: "Name must be between 3 and 32 characters.",
        forcePasswordError:
            "Password must include an uppercase letter, a lowercase letter, a number, and a special character.",
    },
};

export const WithServerError: Story = {
    args: {
        forceServerError:
            "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.",
    },
};

/*
 * `forceSubmitting` now stages the whole form's busy state through the single `isPending` value
 * every control reads from (plan 01-16) — all three fields, the password toggle and the submit
 * button all render their loading state together, not the button alone.
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
