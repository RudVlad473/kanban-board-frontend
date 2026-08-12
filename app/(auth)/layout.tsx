import type { ReactNode } from "react";

/*
 * Both auth screens centre their single AuthCard on the dominant app background — kept thin per
 * CONVENTIONS.md's "app/ is routing only" rule; no business logic lives here.
 */
const AuthLayout = ({ children }: { children: ReactNode }) => {
    return <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-bg-app px-4">{children}</div>;
};

export default AuthLayout;
