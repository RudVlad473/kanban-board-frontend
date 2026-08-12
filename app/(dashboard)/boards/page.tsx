/*
 * This phase's protected surface — COVERAGE.md scopes every board operation to Phase 2, so this
 * route makes no board API call, only proves the route guard's prefix rule against a real path.
 */
const BoardsPage = () => {
    return (
        <div className="flex flex-col gap-2 p-6">
            <h1 className="font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-primary">
                Boards
            </h1>

            <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                Board content arrives in phase 2.
            </p>
        </div>
    );
};

export default BoardsPage;
