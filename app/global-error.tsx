"use client";

import "@/styles/globals.css";

import { ErrorFallback } from "@/components/layout/error-fallback/error-fallback";

/*
 * Next.js swaps out the entire root layout when this boundary fires, so this file restates what
 * `app/layout.tsx` provides (lang, html/body, stylesheet) — `QueryProvider` deliberately excluded,
 * since it could be the thing that just failed (see 01-17-SUMMARY.md).
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
