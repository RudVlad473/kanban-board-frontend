"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/features/auth/components/sign-out-button/sign-out-button";
import { createBoardsQueryOptions } from "@/features/boards/queries/boards-query";
import type { Board } from "@/features/boards/schemas";
import { AddTaskButton } from "@/features/tasks/components/add-task-button/add-task-button";
import { toBoardIdFromPath } from "@/lib/core/routing/routes";

/**
 * The dashboard's own header bar. Takes the board list rather than the open board so plan 02-12's
 * optimistic rename reaches the title with no new wiring — it is the same list the sidebar renders.
 */
type Props = {
    displayName: string;
    boards: Board[];
};

export const DashboardHeader = ({ displayName, boards: seedBoards }: Props) => {
    const { data: boards } = useQuery({ ...createBoardsQueryOptions(), initialData: seedBoards });
    const pathname = usePathname();
    const openBoardId = toBoardIdFromPath(pathname);
    /*
     * The same cache entry the sidebar row renders, so an optimistic rename reaches the title
     * in the same instant — no provider, because the QueryClient is the shared owner.
     */
    const openBoard = boards.find(
        // A path naming no board, or one absent from this list, renders no title rather than a stale one.
        (board) => board.id === openBoardId,
    );

    return (
        <header className="flex shrink-0 items-center gap-4 border-b border-border-default bg-bg-surface px-6 py-4">
            {openBoard ? (
                <h1 className="min-w-0 truncate font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-primary">
                    {openBoard.name}
                </h1>
            ) : null}

            <div className="ml-auto flex shrink-0 items-center gap-4">
                <AddTaskButton />

                <span className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary">
                    {displayName}
                </span>

                <SignOutButton />
            </div>
        </header>
    );
};
