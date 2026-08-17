"use client";

import "@/styles/globals.css";

import { ErrorFallback } from "@/components/layout/error-fallback/error-fallback";

/*
 * Next.js swaps the entire root layout out when this boundary fires, so this file restates
 * everything app/layout.tsx normally provides (lang, html/body class lists, the stylesheet
 * import) — nothing from the root layout can be relied on to still be there. QueryProvider is
 * deliberately not imported here: it could itself be the thing that just failed.
 */
type Props = {
    error: Error & { digest?: string };
    reset: () => void;
};

const GlobalError = ({ error, reset }: Props) => {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="flex min-h-full flex-col bg-bg-app text-text-primary">
                <ErrorFallback
                    title="Something went wrong"
                    description="The app ran into a problem and couldn't finish loading."
                    digest={error.digest}
                    onRetry={reset}
                />
            </body>
        </html>
    );
};

export default GlobalError;
