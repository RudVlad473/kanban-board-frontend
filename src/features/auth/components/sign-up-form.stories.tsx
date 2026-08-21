import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthCard } from "./auth-card";
import { SignUpForm } from "./sign-up-form";

/*
 * Visual-only CSF3 (D-25); behavioral assertions live in sign-up-form.test.tsx. Every state below
 * is reached through this file's own staging props, the same non-interactive pattern Dropdown/
 * Modal already use via `defaultOpen` — `signUpAction` is referenced but never actually invoked.
 */
const meta: Meta<typeof SignUpForm> = {
    component: SignUpForm,
    /*
     * `appDirectory` mounts a working App Router context — required since the form imports
     * `signUpAction` from a `"use server"` module, resolved through that same machinery.
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
 * (that path only ever produces the required-field message) — staged here through their own
 * dedicated force props instead, the same non-interactive pattern `forceServerError` uses.
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
