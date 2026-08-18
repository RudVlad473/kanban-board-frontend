"use client";

import { ErrorFallback } from "@/components/layout/error-fallback/error-fallback";
import { ROUTE } from "@/lib/routes";

/*
 * Next.js requires every error boundary to be a client component. This is the protected route
 * group's segment boundary (CONVENTIONS placement rule 1 — it renders a route, so it lives in
 * `app/`) — a crash here is scoped to the segment, leaving the surrounding session chrome intact.
 */
type Props = {
    error: Error & { digest?: string };
    reset: () => void;
};

const DashboardError = ({ error, reset }: Props) => {
    return (
        <ErrorFallback
            title="Something went wrong"
            description="This part of the app ran into a problem. Your other work is unaffected."
            digest={error.digest}
            onRetry={reset}
            homeHref={ROUTE.BOARDS}
        />
    );
};

export default DashboardError;
