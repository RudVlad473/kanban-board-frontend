// Covered by: `e2e/boards-list.e2e.spec.ts`
import { Button } from "@/components/ui/button/button";
import { SignOutButton } from "@/features/auth/components/sign-out-button/sign-out-button";

/**
 * The `<Suspense>` fallback for `DashboardHeader`, mirroring its chrome without the board title.
 *
 * Renders no board data on purpose: `DashboardHeader` reads the shared `boards` query, and a
 * fallback that read it too would seed that entry empty for the whole server render (tech/0030).
 */
export const DashboardHeaderSkeleton = ({ displayName }: { displayName: string }) => {
    return (
        <header className="flex shrink-0 items-center gap-4 border-b border-border-default bg-bg-surface px-6 py-4">
            <div className="ml-auto flex shrink-0 items-center gap-4">
                {/* Disabled until the board is known — there is nowhere to post a task to yet. */}
                <Button type="button" variant="primary" isDisabled={true}>
                    + Add New Task
                </Button>

                <span className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary">
                    {displayName}
                </span>

                <SignOutButton />
            </div>
        </header>
    );
};
