"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { useSignIn } from "@/features/auth/hooks/use-sign-in";
import { signInSchema, type SignInInput } from "@/lib/validation/auth-schemas";

/*
 * Duplicated verbatim from src/lib/validation/auth-schemas.ts's own (unexported)
 * REQUIRED_FIELD_MESSAGE — see sign-up-form.tsx's identical comment for the rationale.
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";

type Props = {
    /** Pre-fills field values (a plain React Hook Form `defaultValues` passthrough) — used by the "Filled" story, mirroring Dropdown's `defaultOpen`/TextField's `defaultValue` staging pattern (D-25's non-interactive alternative to a play function). */
    defaultValues?: Partial<SignInInput>;
    /** Storybook-only staging — renders both fields' required-error state without a real submit. */
    forceFieldErrors?: boolean;
    /** Storybook-only staging — renders the form-level failure banner without a real failed mutation. */
    forceServerError?: string;
    /** Storybook-only staging — renders the submit control's disabled/loading state without a real pending mutation. */
    forceSubmitting?: boolean;
    /** Storybook-only staging — renders the password field already revealed. */
    defaultPasswordRevealed?: boolean;
};

/**
 * React Hook Form + Zod sign-in form, mirroring sign-up-form.tsx's structure over `signInSchema` —
 * Email and Password fields, the "Sign In" primary CTA, and the same form-level live error
 * region. A rejected sign-in clears the password field (retyping a mistyped password is friction
 * with no security benefit) while leaving the email in place.
 */
export const SignInForm = ({
    defaultValues,
    forceFieldErrors = false,
    forceServerError,
    forceSubmitting = false,
    defaultPasswordRevealed = false,
}: Props) => {
    const [isPasswordRevealed, setIsPasswordRevealed] = useState(defaultPasswordRevealed);
    const mutation = useSignIn();
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

    const isPending = forceSubmitting || mutation.isPending;
    const serverErrorMessage = forceServerError ?? (mutation.isError ? mutation.error.message : undefined);

    const onSubmit = handleSubmit((data) => {
        mutation.mutate(data, {
            onError: () => {
                resetField("password");
            },
        });
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
                hasError={forceFieldErrors || Boolean(errors.email)}
                errorMessage={forceFieldErrors ? REQUIRED_FIELD_MESSAGE : errors.email?.message}
                {...register("email")}
            />
            <TextField
                label="Password"
                type={isPasswordRevealed ? "text" : "password"}
                hasError={forceFieldErrors || Boolean(errors.password)}
                errorMessage={forceFieldErrors ? REQUIRED_FIELD_MESSAGE : errors.password?.message}
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
            <Button type="submit" variant="primary" isDisabled={isPending} aria-busy={isPending}>
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
                <a href="/register" className="text-bg-primary hover:text-bg-primary-hover">
                    Create Account
                </a>
            </p>
        </form>
    );
};
