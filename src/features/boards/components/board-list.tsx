"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { Board } from "@/features/boards/schemas";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";
import { cn } from "@/lib/core/styling/cn";

/*
 * The sidebar's board list, RSC-fed via props (not `useBoards()`, per docs/adr/tech/0019). Split
 * out of the old combined `Sidebar` (plan 02-09) so the panel chrome paints immediately while
 * this streams in behind `Suspense`; renders only the caption and scroll region, never a `nav`.
 */
type Props = { boards: Board[]; loadFailed?: boolean };

export const BoardList = ({ boards, loadFailed = false }: Props) => {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <>
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
        </>
    );
};
