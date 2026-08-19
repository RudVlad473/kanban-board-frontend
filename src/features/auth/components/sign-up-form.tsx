"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { AUTH_ACTION_IDLE } from "@/features/auth/api/auth-action-state";
import { signUpAction } from "@/features/auth/api/auth-actions";
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas";
import { ROUTE } from "@/lib/core/routing/routes";

/*
 * Duplicated verbatim from src/features/auth/schemas.ts's own (unexported)
 * REQUIRED_FIELD_MESSAGE — this file's story-staging-only "every field is required" demonstration
 * needs the exact copy the real resolver produces, without importing the (unexported) constant
 * across module boundaries just for this Storybook-only staging prop.
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";

/**
 * `FormData.get()` returns `FormDataEntryValue | null` (`string | File | null`) — every field in
 * this form is a text input, so a non-string entry never legitimately occurs, but reading it
 * through `String(...)` regardless would silently stringify a `File` to `"[object File]"` rather
 * than surface the mismatch. Returns `""` for anything that isn't already a string.
 */
const readFormField = ({ formData, key }: { formData: FormData; key: string }): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
};

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
 * React Hook Form + Zod sign-up form composed from the design-system primitives (`TextField`,
 * `Button`, `IconButton`) — no bespoke input or button element. `mode: "onTouched"` shows a
 * field's error once it has been touched or the form has been submitted, and not before, so a
 * sibling field's error never appears on an untouched field. Submits through the form element's
 * own `action` (`useActionState` + `signUpAction`), so it works before hydration — React Hook Form
 * stays for display-time validation only, never gating submission itself.
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
     * React resets every uncontrolled field inside a `<form action={fn}>` once the action settles
     * — the same progressive-enhancement default a plain HTML form gets after a completed,
     * non-navigating submission (React's own `requestFormReset`, fired unconditionally by the host
     * `<form>` component around every action call, success or failure alike). Sign-up never clears
     * a field deliberately (unlike sign-in's password), so every field is simply restored to what
     * was actually submitted. Captured here so it can be undone below: `null` until the first real
     * submission, so the effect never fires on mount.
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
     * Keyed on `isActionPending`, not `state`: a mocked/real resolution that happens to be
     * reference-equal to the previous state (e.g. this component's own tests resolving back to the
     * shared `AUTH_ACTION_IDLE` constant) would otherwise never re-run this effect at all, since
     * `useActionState`'s `Object.is` bailout skips updating `state` for a value identical to what
     * it already held.
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
    const serverErrorMessage = forceServerError ?? (state.status === "error" ? state.message : undefined);

    /*
     * Merge precedence: a client-side field error (React Hook Form's own `formState.errors`, from
     * `mode: "onTouched"`) takes precedence over one the server function returned for the same
     * field, because it is the more recent judgement of what the user currently has typed — the
     * server's field errors reflect the values as of the last submission, which may already be
     * stale by the time this renders.
     */
    const emailErrorMessage =
        errors.email?.message ?? (state.status === "error" ? state.fieldErrors?.email : undefined);
    const nameErrorMessage =
        forceNameError ??
        errors.displayName?.message ??
        (state.status === "error" ? state.fieldErrors?.displayName : undefined);
    const passwordErrorMessage =
        forcePasswordError ??
        errors.password?.message ??
        (state.status === "error" ? state.fieldErrors?.password : undefined);

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
                 * A plain anchor, not next/link's `Link` — this app's own auth server functions
                 * issue an httpOnly cookie on sign-in/sign-up (ADR tech/0001), so there is no
                 * client-side router state worth preserving across this transition; a full
                 * navigation also sidesteps `next/link`'s own reliance on `process.env`, which is
                 * undefined in this project's plain (non-Next-runtime) Vitest Browser Mode test
                 * environment.
                 */}
                {"Already have an account? "}

                <a href={ROUTE.SIGN_IN} className="text-bg-primary hover:text-bg-primary-hover">
                    Sign In
                </a>
            </p>
        </form>
    );
};
