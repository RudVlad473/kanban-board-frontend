"use client";

import { Eye, EyeOff, Kanban } from "lucide-react";
import { useState, type ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button/icon-button";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import type { Theme } from "@/lib/core/theme/theme";

type Props = {
    initialTheme: Theme;
    /** The streamed board-list slot — `BoardList` wrapped in `Suspense` by `app/(dashboard)/layout.tsx`. */
    children: ReactNode;
    /** Storybook-only staging for the collapsed visual — no real caller passes this (see ThemeToggle's `forceErrorMessage`). */
    defaultIsExpanded?: boolean;
};

/*
 * The sidebar's panel chrome — brand mark, the streamed `BoardList` slot, pinned foot controls
 * (plan 02-09's split off the pre-retrofit combined component). Owns collapse state OUTSIDE the
 * Suspense boundary wrapping `children`, so toggling it never depends on the board-list fetch.
 */
export const Sidebar = ({ initialTheme, children, defaultIsExpanded = true }: Props) => {
    /*
     * Ephemeral client UI state (DEFAULTS.md C-009) — no persistence mechanism reached from this
     * file; a fresh mount always starts expanded.
     */
    const [isExpanded, setIsExpanded] = useState(defaultIsExpanded);

    if (!isExpanded) {
        return (
            <IconButton
                variant="primary"
                label="Show Sidebar"
                icon={<Eye />}
                onClick={() => {
                    setIsExpanded(true);
                }}
                /*
                 * A fifth entry on UI-SPEC's accent-reservation list — the collapsed-state trigger,
                 * added deliberately for design-PDF fidelity, not an unreviewed accent use.
                 */
                className="fixed bottom-8 left-0 rounded-l-none"
            />
        );
    }

    return (
        <nav
            aria-label="Boards"
            className="flex h-full w-75 shrink-0 flex-col border-r border-border-default bg-bg-surface"
        >
            <div className="flex items-center gap-2 p-6">
                <Kanban aria-hidden="true" className="size-6 text-text-primary" />

                <span className="font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-primary">
                    kanban
                </span>
            </div>

            {/* Absorbs the panel's spare height and is allowed to shrink below its content (min-h-0). */}
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>

            <div className="flex flex-col gap-4 p-6">
                <ThemeToggle initialTheme={initialTheme} isAuthenticated />

                <button
                    type="button"
                    onClick={() => {
                        setIsExpanded(false);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-4 font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted hover:bg-bg-app hover:text-text-primary"
                >
                    <EyeOff aria-hidden="true" className="size-5 shrink-0" />
                    Hide Sidebar
                </button>
            </div>
        </nav>
    );
};
