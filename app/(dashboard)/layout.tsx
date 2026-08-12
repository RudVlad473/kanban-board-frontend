import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { verifySession } from "@/lib/dal";
import { SIGN_IN_PATH } from "@/lib/routes";

/*
 * The authoritative check (RESEARCH.md Security Domain, T-01-05) — `proxy.ts`'s guard is an
 * optimisation only, and this layout does not assume it already ran. Calling `verifySession()`
 * here itself is what keeps this route group closed even if the guard were disabled entirely
 * (the CVE-2025-29927 proxy-bypass class).
 */
const DashboardLayout = async ({ children }: { children: ReactNode }) => {
    const identity = await verifySession();

    if (!identity) {
        redirect(SIGN_IN_PATH);
    }

    return (
        <div className="flex min-h-full flex-col bg-bg-app">
            <header className="flex items-center justify-between border-b border-border-default bg-bg-surface px-6 py-4">
                <span className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary">
                    {identity.displayName}
                </span>
                <SignOutButton />
            </header>
            <main className="flex flex-1 flex-col">{children}</main>
        </div>
    );
};

export default DashboardLayout;
