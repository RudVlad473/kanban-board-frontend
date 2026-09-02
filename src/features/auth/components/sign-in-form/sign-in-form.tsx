"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signInAction } from "@/features/auth/actions/sign-in-action";
import { readFormField } from "@/features/auth/model";
import { REQUIRED_FIELD_MESSAGE, signInSchema, type SignInInput } from "@/features/auth/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";

type Props = {
    /** Pre-fills field values (a plain React Hook Form `defaultValues` passthrough) — used by the "Filled" story, mirroring Dropdown's `defaultOpen`/TextField's `defaultValue` staging pattern (D-25's non-interactive alternative to a play function). */
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
 * React Hook Form + Zod sign-in form submitted via `useActionState` + `signInAction` so it works
 * pre-hydration; React Hook Form is display-only validation, never gating submission (see
 * 01-33-SUMMARY.md). A rejected sign-in clears the password field, not the email.
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
        resetField,
        setValue,
        formState: { errors },
    } = useForm<SignInInput>({
        resolver: zodResolver(signInSchema),
        mode: "onTouched",
        defaultValues,
    });

    /*
     * React's `requestFormReset` clears every uncontrolled field once the action settles
     * (progressive-enhancement default) — captured here so it can be selectively restored below;
     * `null` until the first real submission so the effect never fires on mount.
     */
    const lastSubmittedRef = useRef<{ email: string; password: string } | null>(null);
    const formAction = (formData: FormData) => {
        lastSubmittedRef.current = {
            email: readFormField({ formData, key: "email" }),
            password: readFormField({ formData, key: "password" }),
        };
        dispatch(formData);
    };

    /*
     * Restores email always, clears password on error instead — undoes React's own field reset
     * once the action settles. Keyed on `isActionPending`, not `state`, since `useActionState`'s
     * `Object.is` bailout can skip a reference-equal resolution (e.g. tests reusing `AUTH_ACTION_IDLE`).
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
        if (state.status === RESULT_STATUS.ERROR) {
            resetField("password");
        } else {
            setValue("password", submitted.password);
        }
    }, [isActionPending, state, resetField, setValue]);

    const isPending = forceSubmitting || isActionPending;
    const serverErrorMessage = forceServerError ?? (state.status === RESULT_STATUS.ERROR ? state.message : undefined);

    /*
     * Client-side field errors (React Hook Form) take precedence over the server's, since they
     * reflect the user's current typing rather than the last submission (which may be stale).
     */
    const emailErrorMessage =
        errors.email?.message ?? (state.status === RESULT_STATUS.ERROR ? state.fieldErrors?.email : undefined);
    const passwordErrorMessage =
        errors.password?.message ?? (state.status === RESULT_STATUS.ERROR ? state.fieldErrors?.password : undefined);

    return (
        <form noValidate={true} action={formAction} className="flex flex-col gap-4">
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
                <p
                    role="alert"
                    className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-danger"
                >
                    {serverErrorMessage}
                </p>
            ) : null}

            <Button type="submit" variant="primary" isDisabled={isPending} isLoading={isPending}>
                Sign In
            </Button>

            <p className="text-center font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary">
                {"Don't have an account? "}

                <Link href={ROUTE.SIGN_UP} className="text-bg-primary hover:text-bg-primary-hover">
                    Create Account
                </Link>
            </p>
        </form>
    );
};
