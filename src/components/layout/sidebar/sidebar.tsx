"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { Board } from "@/features/boards/schemas";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";
import { cn } from "@/lib/core/styling/cn";

/*
 * This phase's tracer slice — the sidebar's own board list, read-only, now RSC-fed via props
 * instead of `useBoards()`. Create/rename/delete, the kebab menu and the collapse/expand toggle
 * are all later plans (02-09 through 02-13); this component renders exactly the caption +
 * board-row list this task's `<action>` scopes.
 */

export const Sidebar = ({ boards, loadFailed = false }: { boards: Board[]; loadFailed?: boolean }) => {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <nav
            aria-label="Boards"
            className="flex h-full w-75 shrink-0 flex-col border-r border-border-default bg-bg-surface"
        >
            <p className="p-6 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase">
                {`ALL BOARDS (${String(boards.length)})`}
            </p>

            {/* The board-list region is the panel's only scrolling part (UI-SPEC overflow rule). */}
            <div className="flex-1 overflow-y-auto">
                {loadFailed ? (
                    <div className="flex flex-col items-start gap-2 px-6 py-4">
                        <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                            Couldn&apos;t load your boards.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                router.refresh();
                            }}
                            className="rounded-sm font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary underline decoration-1 underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2"
                        >
                            Try again.
                        </button>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2 px-4">
                        {boards.map((board) => {
                            const isSelected = pathname === buildBoardDetailPath(board.id);

                            return (
                                <li key={board.id} className="min-w-0">
                                    <Link
                                        href={buildBoardDetailPath(board.id)}
                                        className={cn(
                                            "flex h-11 min-w-0 items-center rounded-r-lg px-4 font-body-m text-body-m [font-weight:var(--font-weight-body-m)]",
                                            isSelected
                                                ? "bg-bg-primary text-text-on-primary"
                                                : "text-text-muted hover:text-text-primary",
                                        )}
                                    >
                                        <span className="truncate">{board.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </nav>
    );
};
