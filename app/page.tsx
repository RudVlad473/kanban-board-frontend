import { ROUTE } from "@/lib/core/routing/routes";

/*
 * The public landing route (`src/lib/core/routing/routes.ts`'s `PUBLIC_PATHS`). The temporary theme probe
 * added in plan 01-04 is gone — plan 01-14 lands the real Switch-driven, account-persisted theme
 * toggle. A signed-in visitor is redirected away from here to `/boards` by `proxy.ts` before this
 * ever renders.
 */
const Home = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-app">
            <div className="flex flex-col items-center gap-4 rounded-lg bg-bg-surface p-6">
                <h1 className="font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-primary">
                    Kanban Board
                </h1>

                <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                    Organize your work into boards, columns, and tasks.
                </p>

                <div className="flex gap-4">
                    <a href={ROUTE.SIGN_IN} className="text-bg-primary hover:text-bg-primary-hover">
                        Sign In
                    </a>

                    <a href={ROUTE.SIGN_UP} className="text-bg-primary hover:text-bg-primary-hover">
                        Create Account
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Home;
