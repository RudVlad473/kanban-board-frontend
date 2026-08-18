"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { useSignUp } from "@/features/auth/hooks/use-sign-up";
import { ROUTE } from "@/lib/routes";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth-schemas";

/*
 * Duplicated verbatim from src/lib/validation/auth-schemas.ts's own (unexported)
 * REQUIRED_FIELD_MESSAGE — this file's story-staging-only "every field is required" demonstration
 * needs the exact copy the real resolver produces. Same string-duplication pattern already used
 * between the sign-in Route Handler and its MSW mock counterpart (src/lib/mocks/handlers.ts).
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";

type Props = {
    /** Pre-fills field values (a plain React Hook Form `defaultValues` passthrough) — used by the "Filled"/"LongValues" stories, mirroring Dropdown's `defaultOpen`/TextField's `defaultValue` staging pattern (D-25's non-interactive alternative to a play function). */
    defaultValues?: Partial<SignUpInput>;
    /** Storybook-only staging — renders Email/Password's required-error state without a real submit. */
    forceFieldErrors?: boolean;
    /** Storybook-only staging — renders the Name field's error state with this message, without a real submit. */
    forceNameError?: string;
    /** Storybook-only staging — renders the Password field's error state with this message, without a real submit. */
    forcePasswordError?: string;
    /** Storybook-only staging — renders the form-level failure banner without a real failed mutation. */
    forceServerError?: string;
    /** Storybook-only staging — renders the submit control's disabled/loading state without a real pending mutation. */
    forceSubmitting?: boolean;
    /** Storybook-only staging — renders the password field already revealed. */
    defaultPasswordRevealed?: boolean;
};

/**
 * React Hook Form + Zod sign-up form composed from the design-system primitives (`TextField`,
 * `Button`, `IconButton`) — no bespoke input or button element. `mode: "onTouched"` shows a
 * field's error once it has been touched or the form has been submitted, and not before, so a
 * sibling field's error never appears on an untouched field.
 */
export const SignUpForm = ({
    defaultValues,
    forceFieldErrors = false,
    forceNameError,
    forcePasswordError,
    forceServerError,
    forceSubmitting = false,
    defaultPasswordRevealed = false,
}: Props) => {
    const [isPasswordRevealed, setIsPasswordRevealed] = useState(defaultPasswordRevealed);
    const mutation = useSignUp();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpInput>({
        resolver: zodResolver(signUpSchema),
        mode: "onTouched",
        defaultValues,
    });

    const isPending = forceSubmitting || mutation.isPending;
    const serverErrorMessage = forceServerError ?? (mutation.isError ? mutation.error.message : undefined);

    const onSubmit = handleSubmit((data) => {
        mutation.mutate(data);
    });

    return (
        <form
            noValidate
            onSubmit={(event) => {
                void onSubmit(event);
            }}
            className="flex flex-col gap-4"
        >
            <TextField
                label="Email"
                type="email"
                isLoading={isPending}
                hasError={forceFieldErrors || Boolean(errors.email)}
                errorMessage={forceFieldErrors ? REQUIRED_FIELD_MESSAGE : errors.email?.message}
                {...register("email")}
            />

            <TextField
                label="Name"
                type="text"
                description="Optional"
                isLoading={isPending}
                hasError={Boolean(forceNameError) || Boolean(errors.displayName)}
                errorMessage={forceNameError ?? errors.displayName?.message}
                {...register("displayName")}
            />

            <TextField
                label="Password"
                type={isPasswordRevealed ? "text" : "password"}
                isLoading={isPending}
                hasError={forceFieldErrors || Boolean(forcePasswordError) || Boolean(errors.password)}
                errorMessage={
                    forceFieldErrors ? REQUIRED_FIELD_MESSAGE : (forcePasswordError ?? errors.password?.message)
                }
                trailing={
                    <IconButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        /*
                         * Ghost's default hover (`hover:bg-bg-app`) fills a visibly-tinted circle
                         * against the field's own white surface, reading as a jarring blob rather
                         * than a quiet affordance once nested inside TextField's trailing slot —
                         * overridden here (not on IconButton itself) since this is specific to icons
                         * embedded inside an already-bordered input, not ghost buttons generally.
                         */
                        className="hover:bg-transparent"
                        label={isPasswordRevealed ? "Hide password" : "Show password"}
                        icon={isPasswordRevealed ? <EyeOff /> : <Eye />}
                        isLoading={isPending}
                        onClick={() => {
                            setIsPasswordRevealed((revealed) => !revealed);
                        }}
                    />
                }
                {...register("password")}
            />

            {serverErrorMessage ? (
                <p
                    role="alert"
                    className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-danger"
                >
                    {serverErrorMessage}
                </p>
            ) : null}

            <Button type="submit" variant="primary" isDisabled={isPending} isLoading={isPending}>
                Create Account
            </Button>

            <p className="text-center font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary">
                {/*
                 * A plain anchor, not next/link's `Link` — this app's own BFF Route Handlers issue
                 * an httpOnly cookie on sign-in/sign-up (ADR tech/0001), so there is no client-side
                 * router state worth preserving across this transition; a full navigation also
                 * sidesteps `next/link`'s own reliance on `process.env`, which is undefined in this
                 * project's plain (non-Next-runtime) Vitest Browser Mode test environment.
                 */}
                {"Already have an account? "}

                <a href={ROUTE.SIGN_IN} className="text-bg-primary hover:text-bg-primary-hover">
                    Sign In
                </a>
            </p>
        </form>
    );
};
