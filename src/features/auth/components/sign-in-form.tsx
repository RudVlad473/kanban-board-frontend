"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { AUTH_ACTION_IDLE, signInAction } from "@/features/auth/api/auth-actions";
import { ROUTE } from "@/lib/routes";
import { signInSchema, type SignInInput } from "@/lib/validation/auth-schemas";

/*
 * Duplicated verbatim from src/lib/validation/auth-schemas.ts's own (unexported)
 * REQUIRED_FIELD_MESSAGE — see sign-up-form.tsx's identical comment for the rationale.
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
 * React Hook Form + Zod sign-in form, mirroring sign-up-form.tsx's structure over `signInSchema` —
 * Email and Password fields, the "Sign In" primary CTA, and the same form-level live error
 * region. Submits through the form element's own `action` (`useActionState` + `signInAction`), so
 * it works before hydration — React Hook Form stays for display-time validation only (`mode:
 * "onTouched"`), never gating submission itself. A rejected sign-in clears the password field
 * (retyping a mistyped password is friction with no security benefit) while leaving the email in
 * place.
 */
export const SignInForm = ({
    defaultValues,
    forceFieldErrors = false,
    forceServerError,
    forceSubmitting = false,
    defaultPasswordRevealed = false,
}: Props) => {
    const [isPasswordRevealed, setIsPasswordRevealed] = useState(defaultPasswordRevealed);
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
     * React resets every uncontrolled field inside a `<form action={fn}>` once the action settles
     * — the same progressive-enhancement default a plain HTML form gets after a completed,
     * non-navigating submission (React's own `requestFormReset`, fired unconditionally by the host
     * `<form>` component around every action call, success or failure alike). Captured here so it
     * can be undone selectively below: `null` until the first real submission, so the effect never
     * fires on mount.
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
     * Undoes React's own reset once the action settles, restoring the email in every case and the
     * password only when there was no error — a rejected sign-in instead explicitly clears the
     * password (retyping a mistyped password is friction with no security benefit, and retyping a
     * correct address is friction with no benefit at all). Keyed on `isActionPending`, not `state`:
     * a mocked/real resolution that happens to be reference-equal to the previous state (e.g. this
     * component's own tests resolving back to the shared `AUTH_ACTION_IDLE` constant) would
     * otherwise never re-run this effect at all, since `useActionState`'s `Object.is` bailout skips
     * updating `state` for a value identical to what it already held.
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
        if (state.status === "error") {
            resetField("password");
        } else {
            setValue("password", submitted.password);
        }
    }, [isActionPending, state, resetField, setValue]);

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
    const passwordErrorMessage =
        errors.password?.message ?? (state.status === "error" ? state.fieldErrors?.password : undefined);

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
                Sign In
            </Button>

            <p className="text-center font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary">
                {/*
                 * A plain anchor, not next/link's `Link` — see sign-up-form.tsx's identical comment
                 * for the rationale (no client-side router state worth preserving across this
                 * transition, and next/link relies on `process.env`, undefined in this project's
                 * plain Vitest Browser Mode test environment).
                 */}
                {"Don't have an account? "}

                <a href={ROUTE.SIGN_UP} className="text-bg-primary hover:text-bg-primary-hover">
                    Create Account
                </a>
            </p>
        </form>
    );
};
