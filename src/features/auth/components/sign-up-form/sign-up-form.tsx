"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signUpAction } from "@/features/auth/actions/sign-up-action";
import { readFormField } from "@/features/auth/model";
import { REQUIRED_FIELD_MESSAGE, signUpSchema, type SignUpInput } from "@/features/auth/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";

type Props = {
    /** Pre-fills field values (a plain React Hook Form `defaultValues` passthrough) — used by the "Filled"/"LongValues" stories, mirroring Dropdown's `defaultOpen`/TextField's `defaultValue` staging pattern (D-25's non-interactive alternative to a play function). */
    defaultValues?: Partial<SignUpInput>;
    /** Storybook-only staging — renders Email/Password's required-error state without a real submit. */
    forceFieldErrors?: boolean;
    /** Storybook-only staging — renders the Name field's error state with this message, without a real submit. */
    forceNameError?: string;
    /** Storybook-only staging — renders the Password field's error state with this message, without a real submit. */
    forcePasswordError?: string;
    /** Storybook-only staging — renders the form-level failure banner without a real failed action. */
    forceServerError?: string;
    /** Storybook-only staging — renders the submit control's disabled/loading state without a real pending action. */
    forceSubmitting?: boolean;
    /** Storybook-only staging — renders the password field already revealed. */
    defaultPasswordRevealed?: boolean;
};

/**
 * React Hook Form + Zod sign-up form composed from the design-system primitives only, submitted
 * via `useActionState` + `signUpAction` so it works pre-hydration — React Hook Form is
 * display-only validation (`mode: "onTouched"`), never gating submission (see 01-33-SUMMARY.md).
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
    const { value: isPasswordRevealed, toggle: togglePasswordRevealed } = useBoolean(defaultPasswordRevealed);
    const [state, dispatch, isActionPending] = useActionState(signUpAction, AUTH_ACTION_IDLE);
    const {
        register,
        setValue,
        formState: { errors },
    } = useForm<SignUpInput>({
        resolver: zodResolver(signUpSchema),
        mode: "onTouched",
        defaultValues,
    });

    /*
     * React's `requestFormReset` clears every uncontrolled field once the action settles
     * (progressive-enhancement default) — sign-up restores every field as submitted (no deliberate
     * clear, unlike sign-in's password). `null` until the first submission so this never fires on mount.
     */
    const lastSubmittedRef = useRef<{ email: string; displayName: string; password: string } | null>(null);
    const formAction = (formData: FormData) => {
        lastSubmittedRef.current = {
            email: readFormField({ formData, key: "email" }),
            displayName: readFormField({ formData, key: "displayName" }),
            password: readFormField({ formData, key: "password" }),
        };
        dispatch(formData);
    };

    /*
     * Keyed on `isActionPending`, not `state` — `useActionState`'s `Object.is` bailout can skip a
     * reference-equal resolution (e.g. tests reusing the shared `AUTH_ACTION_IDLE` constant).
     */
    useEffect(() => {
        if (isActionPending) {
            return;
        }

        const submitted = lastSubmittedRef.current;
        if (!submitted) {
            return;
        }

        setValue("email", submitted.email);
        setValue("displayName", submitted.displayName);
        setValue("password", submitted.password);
    }, [isActionPending, setValue]);

    const isPending = forceSubmitting || isActionPending;
    const serverErrorMessage = forceServerError ?? (state.status === RESULT_STATUS.ERROR ? state.message : undefined);

    /*
     * Client-side field errors (React Hook Form) take precedence over the server's, since they
     * reflect the user's current typing rather than the last submission (which may be stale).
     */
    const emailErrorMessage =
        errors.email?.message ?? (state.status === RESULT_STATUS.ERROR ? state.fieldErrors?.email : undefined);
    const nameErrorMessage =
        forceNameError ??
        errors.displayName?.message ??
        (state.status === RESULT_STATUS.ERROR ? state.fieldErrors?.displayName : undefined);
    const passwordErrorMessage =
        forcePasswordError ??
        errors.password?.message ??
        (state.status === RESULT_STATUS.ERROR ? state.fieldErrors?.password : undefined);

    return (
        <form noValidate action={formAction} className="flex flex-col gap-4">
            <TextField
                label="Email"
                type="email"
                isLoading={isPending}
                hasError={forceFieldErrors || Boolean(emailErrorMessage)}
                errorMessage={forceFieldErrors ? REQUIRED_FIELD_MESSAGE : emailErrorMessage}
                {...register("email")}
            />

            <TextField
                label="Name"
                type="text"
                description="Optional"
                isLoading={isPending}
                hasError={Boolean(nameErrorMessage)}
                errorMessage={nameErrorMessage}
                {...register("displayName")}
            />

            <TextField
                label="Password"
                type={isPasswordRevealed ? "text" : "password"}
                isLoading={isPending}
                hasError={forceFieldErrors || Boolean(passwordErrorMessage)}
                errorMessage={forceFieldErrors ? REQUIRED_FIELD_MESSAGE : passwordErrorMessage}
                trailing={
                    <IconButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        /*
                         * Ghost's default hover reads as a jarring blob against TextField's white surface —
                         * overridden here, not on IconButton itself, since this is specific to an icon
                         * nested in a bordered input.
                         */
                        className="hover:bg-transparent"
                        label={isPasswordRevealed ? "Hide password" : "Show password"}
                        icon={isPasswordRevealed ? <EyeOff /> : <Eye />}
                        isLoading={isPending}
                        onClick={togglePasswordRevealed}
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
                 * A plain anchor, not next/link's `Link` — auth issues an httpOnly cookie (ADR tech/0001),
                 * so router state isn't worth preserving; `next/link` needs `process.env`, unset in Vitest tests.
                 */}
                {"Already have an account? "}

                {/* eslint-disable-next-line no-restricted-syntax -- see comment above: intentional full navigation, next/link unusable in this project's test environment */}
                <a href={ROUTE.SIGN_IN} className="text-bg-primary hover:text-bg-primary-hover">
                    Sign In
                </a>
            </p>
        </form>
    );
};
