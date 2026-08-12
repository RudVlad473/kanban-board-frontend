/*
 * A real board-detail path so the guard's /boards prefix rule is exercised against an actual
 * route, not only asserted in a unit test. Same as boards/page.tsx: no board API call
 * (COVERAGE.md scopes that to Phase 2).
 */
const BoardDetailPage = () => {
    return (
        <div className="flex flex-col gap-2 p-6">
            <h1 className="font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-primary">
                Board
            </h1>

            <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                Board content arrives in phase 2.
            </p>
        </div>
    );
};

export default BoardDetailPage;
