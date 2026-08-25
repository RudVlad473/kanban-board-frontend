"use client";

import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch/switch";
import { useThemePreference } from "@/features/theme/hooks/use-theme-preference";
import { TOGGLE_LABEL } from "@/features/theme/model";
import { THEME, type Theme } from "@/lib/core/theme/theme";

type Props = {
    initialTheme: Theme;
    isAuthenticated: boolean;
    /** Storybook-only staging — renders the failure message without a real failed persistence call. */
    forceErrorMessage?: string;
};

/**
 * Composes `Switch` with static sun/moon glyphs flanking it (UAT finding 4 — the reference design
 * flanks the track, it does not nest an icon in the moving thumb) and a live-region status message,
 * replacing UI-SPEC's unconfirmed toast recommendation since no toast primitive exists (D-13's set).
 */
export const ThemeToggle = ({ initialTheme, isAuthenticated, forceErrorMessage }: Props) => {
    const { theme, toggleTheme, errorMessage } = useThemePreference({ initialTheme, isAuthenticated });
    const displayedErrorMessage = forceErrorMessage ?? errorMessage;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex w-full items-center justify-center gap-4 rounded-lg bg-bg-app p-4">
                <Sun aria-hidden="true" className="size-5 shrink-0 text-text-muted" />

                <Switch label={TOGGLE_LABEL} isChecked={theme === THEME.DARK} onCheckedChange={toggleTheme} />

                <Moon aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
            </div>

            {/* Always rendered (even empty) so assistive technology has a stable live region to watch, per Task 2's action text. */}
            <p
                role="status"
                className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-danger"
            >
                {displayedErrorMessage}
            </p>
        </div>
    );
};
