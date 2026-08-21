"use client";

import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch/switch";
import { useThemePreference } from "@/features/theme/hooks/use-theme-preference";
import { THEME, type Theme } from "@/lib/core/theme/theme";

/** UI-SPEC's Copywriting Contract row for the theme toggle — no visible text, only this label. */
const TOGGLE_LABEL = "Toggle dark mode";

type Props = {
    initialTheme: Theme;
    isAuthenticated: boolean;
    /** Storybook-only staging — renders the failure message without a real failed persistence call. */
    forceErrorMessage?: string;
};

/**
 * Composes `Switch` with sun/moon glyphs (D-13/D-25) and a live-region status message — replaces
 * UI-SPEC's unconfirmed toast recommendation since no toast primitive exists (D-13's set). Switch
 * doesn't self-toggle, so `useThemePreference`'s revert alone moves it back on failure.
 */
export const ThemeToggle = ({ initialTheme, isAuthenticated, forceErrorMessage }: Props) => {
    const { theme, toggleTheme, errorMessage } = useThemePreference({ initialTheme, isAuthenticated });
    const displayedErrorMessage = forceErrorMessage ?? errorMessage;

    return (
        <div className="flex flex-col items-end gap-1">
            <Switch
                label={TOGGLE_LABEL}
                isChecked={theme === THEME.DARK}
                onCheckedChange={toggleTheme}
                iconOn={<Moon />}
                iconOff={<Sun />}
            />

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
