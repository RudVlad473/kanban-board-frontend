import { Button } from "@/components/ui/button/button";

/*
 * Domain-agnostic app chrome shown in place of a route's content — placement rule 4
 * (CONVENTIONS.md), not a feature or a `components/ui/` primitive. Both route boundaries
 * (`app/(dashboard)/error.tsx`, `app/global-error.tsx`) render this same shared surface.
 */
type Props = {
    title: string;
    description: string;
    digest?: string;
    onRetry: () => void;
    homeHref?: string;
};

export const ErrorFallback = ({ title, description, digest, onRetry, homeHref }: Props) => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-app">
            <div className="flex flex-col items-center gap-4 rounded-lg bg-bg-surface p-6">
                <h1 className="font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-primary">
                    {title}
                </h1>

                <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                    {description}
                </p>

                {/*
                 * digest is a framework-computed hash of the error, never the error's own text —
                 * safe to display (T-01-44). The thrown error's own message/stack is never read here.
                 */}
                {digest ? (
                    <p className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                        {"Reference: "}

                        {digest}
                    </p>
                ) : null}

                <div className="flex items-center gap-4">
                    <Button type="button" variant="primary" onClick={onRetry}>
                        Try again
                    </Button>

                    {homeHref ? (
                        /*
                         * A plain anchor, not `next/link`'s `Link` — a full reload is safer here,
                         * discarding whatever in-memory state triggered the crash (01-17-SUMMARY.md).
                         */
                        // eslint-disable-next-line no-restricted-syntax -- see comment above
                        <a href={homeHref} className="text-bg-primary hover:text-bg-primary-hover">
                            Back to boards
                        </a>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
