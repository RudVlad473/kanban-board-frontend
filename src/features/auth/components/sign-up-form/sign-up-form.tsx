"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signUpAction } from "@/features/auth/actions/sign-up-action";
import {
    DISPLAY_NAME_MAX_LENGTH,
    PASSWORD_REQUIREMENT_HINT,
    REQUIRED_FIELD_MESSAGE,
    signUpSchema,
    type SignUpInput,
} from "@/features/auth/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";

type Props = {
    /** Pre-fills field values (a plain React Hook Form `defaultValues` passthrough) — used by the "Filled"/"LongValues" stories, mirroring Dropdown's `defaultOpen`/TextField's `defaultValue` staging pattern (the non-interactive alternative to a play function). */
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
 * React Hook Form + Zod sign-up form composed from the design-system primitives only.
 *
 * Dispatched through `useActionState` + `signUpAction`, gated on the client schema: nothing
 * reaches the server that the schema refuses, and nothing typed is lost when it does.
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
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpInput>({
        resolver: zodResolver(signUpSchema),
        mode: "onTouched",
        defaultValues,
    });

    /*
     * `handleSubmit` validates the untouched fields `mode: "onTouched"` never reaches, and its
     * `preventDefault` stops React also running `action`. FormData is read before the first await,
     * while `currentTarget` is still the form; `startTransition` is what `action` gave for free.
     */
    const submit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
        const formData = new FormData(event.currentTarget);

        void handleSubmit(() => {
            startTransition(() => {
                dispatch(formData);
            });
        })(event);
    };

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
        <form noValidate={true} action={dispatch} onSubmit={submit} className="flex flex-col gap-4">
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
                characterLimit={DISPLAY_NAME_MAX_LENGTH}
                description="Optional"
                isLoading={isPending}
                hasError={Boolean(nameErrorMessage)}
                errorMessage={nameErrorMessage}
                {...register("displayName")}
            />

            <TextField
                label="Password"
                type={isPasswordRevealed ? "text" : "password"}
                description={PASSWORD_REQUIREMENT_HINT}
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
                <p role="alert" className="font-body-l text-body-l text-text-danger">
                    {serverErrorMessage}
                </p>
            ) : null}

            <Button type="submit" variant="primary" isDisabled={isPending} isLoading={isPending}>
                Create Account
            </Button>

            <p className="text-center font-body-l text-body-l text-text-primary">
                {"Already have an account? "}

                <Link href={ROUTE.SIGN_IN} className="text-bg-primary hover:text-bg-primary-hover">
                    Sign In
                </Link>
            </p>
        </form>
    );
};
