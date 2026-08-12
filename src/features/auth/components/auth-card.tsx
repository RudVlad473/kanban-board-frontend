import type { PropsWithChildren } from "react";

/*
 * Shared presentational shell for both auth screens (sign-up/sign-in) — UI-SPEC names the auth
 * card as the sole focal point of both screens, with everything else deliberately quiet, so this
 * shell carries no decoration of its own beyond the surface/elevation/spacing tokens named there.
 */

type Props = PropsWithChildren<{
    /** Rendered through `font-heading-l` per UI-SPEC's Typography usage mapping ("Sign Up" / "Sign In"). */
    title: string;
}>;

export const AuthCard = ({ title, children }: Props) => {
    return (
        <div className="my-8 flex w-full max-w-md flex-col gap-4 rounded-lg bg-bg-surface p-6 shadow-md">
            <h1 className="font-heading-l text-heading-l [font-weight:var(--font-weight-heading-l)] text-text-primary">
                {title}
            </h1>

            {children}
        </div>
    );
};
