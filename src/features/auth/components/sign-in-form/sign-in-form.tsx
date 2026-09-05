"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isNil } from "es-toolkit";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signInAction } from "@/features/auth/actions/sign-in-action";
import { REQUIRED_FIELD_MESSAGE, signInSchema, type SignInInput } from "@/features/auth/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";

type Props = {
    /** Pre-fills field values (a plain React Hook Form `defaultValues` passthrough) — used by the "Filled" story, mirroring Dropdown's `defaultOpen`/TextField's `defaultValue` staging pattern (the non-interactive alternative to a play function). */
    defaultValues?: Partial<SignInInput>;
    /** Storybook-only staging — renders both fields' required-error state without a real submit. */
    forceFieldErrors?: boolean;
    /** Storybook-only staging — renders the form-level failure banner without a real failed action. */
    forceServerError?: string;
    /** Storybook-only staging — renders the submit control's disabled/loading state without a real pending action. */
    forceSubmitting?: boolean;
    /** Storybook-only staging — renders the password field already revealed. */
    defaultPasswordRevealed?: boolean;
};

/**
 * React Hook Form + Zod sign-in form dispatched through `useActionState` + `signInAction`.
 *
 * The client schema gates the dispatch: nothing reaches the server that the schema refuses. A
 * rejected sign-in clears the password field, not the email.
 */
export const SignInForm = ({
    defaultValues,
    forceFieldErrors = false,
    forceServerError,
    forceSubmitting = false,
    defaultPasswordRevealed = false,
}: Props) => {
    const { value: isPasswordRevealed, toggle: togglePasswordRevealed } = useBoolean(defaultPasswordRevealed);
    const [state, dispatch, isActionPending] = useActionState(signInAction, AUTH_ACTION_IDLE);
    const {
        register,
        handleSubmit,
        resetField,
        formState: { errors },
    } = useForm<SignInInput>({
        resolver: zodResolver(signInSchema),
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

    /*
     * Only a real server refusal clears the password — a client-side one never left the browser,
     * so wiping what the user typed would cost them the correction they were about to make.
     */
    useEffect(() => {
        if (state.status === RESULT_STATUS.ERROR) {
            resetField("password");
        }
    }, [state, resetField]);

    const isPending = forceSubmitting || isActionPending;

    /*
     * The same precedence the field messages below use, applied to the form-level alert: a client
     * error means this submit never reached the server, so the refusal on screen describes an older
     * one. Leaving both up put "Can't be empty" and "Invalid email or password." on screen together.
     */
    const hasClientFieldError = !isNil(errors.email) || !isNil(errors.password);
    const serverErrorMessage =
        forceServerError ?? (state.status === RESULT_STATUS.ERROR && !hasClientFieldError ? state.message : undefined);

    /*
     * Client-side field errors (React Hook Form) take precedence over the server's, since they
     * reflect the user's current typing rather than the last submission (which may be stale).
     */
    const emailErrorMessage =
        errors.email?.message ?? (state.status === RESULT_STATUS.ERROR ? state.fieldErrors?.email : undefined);
    const passwordErrorMessage =
        errors.password?.message ?? (state.status === RESULT_STATUS.ERROR ? state.fieldErrors?.password : undefined);

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
                <p role="alert" className="font-body-l text-body-l text-text-danger">
                    {serverErrorMessage}
                </p>
            ) : null}

            <Button type="submit" variant="primary" isDisabled={isPending} isLoading={isPending}>
                Sign In
            </Button>

            <p className="text-center font-body-l text-body-l text-text-primary">
                {"Don't have an account? "}

                <Link href={ROUTE.SIGN_UP} className="text-bg-primary hover:text-bg-primary-hover">
                    Create Account
                </Link>
            </p>
        </form>
    );
};
