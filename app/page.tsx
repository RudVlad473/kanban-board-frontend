// Covered by: nothing to test — the public landing route, which no test navigates to
import { ROUTE } from "@/lib/core/routing/routes";

/*
 * The public landing route (`PUBLIC_PATHS`) — a signed-in visitor is redirected away to `/boards`
 * by `proxy.ts` before this ever renders.
 */
const Home = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-app">
            <div className="flex flex-col items-center gap-4 rounded-lg bg-bg-surface p-6">
                <h1 className="font-heading-xl text-heading-xl text-text-primary">Kanban Board</h1>

                <p className="font-body-l text-body-l text-text-muted">
                    Organize your work into boards, columns, and tasks.
                </p>

                <div className="flex gap-4">
                    {/*
                     * Plain anchors, not next/link's `Link` — a one-time transition, and
                     * next/link needs `process.env`, undefined in Vitest Browser Mode (see 01-12-SUMMARY.md).
                     */}
                    {/* eslint-disable-next-line no-restricted-syntax -- see comment above */}
                    <a href={ROUTE.SIGN_IN} className="text-bg-primary hover:text-bg-primary-hover">
                        Sign In
                    </a>

                    {/* eslint-disable-next-line no-restricted-syntax -- see comment above */}
                    <a href={ROUTE.SIGN_UP} className="text-bg-primary hover:text-bg-primary-hover">
                        Create Account
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Home;
