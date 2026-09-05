// Covered by: `e2e/theme.e2e.spec.ts`
import type { Metadata } from "next";
import "@/styles/globals.css";

import { BoardQueryDefaults } from "@/components/layout/board-query-defaults/board-query-defaults";
import { ToastProvider } from "@/components/ui/toast/toast";
import { QueryProvider } from "@/lib/client/query-client";
import { cn } from "@/lib/core/styling/cn";
import { THEME } from "@/lib/core/theme/theme";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";

export const metadata: Metadata = {
    title: "Kanban Board",
    description: "A kanban board for organizing work into columns and tasks.",
};

/*
 * The flash-avoidance mechanism (THEME-01): the theme cookie is read server-side and the `dark`
 * scope applied here, before any client script runs — the first byte of HTML already carries it.
 */
const RootLayout = async ({ children }: LayoutProps<"/">) => {
    const theme = await themeCookie.read();

    return (
        <html lang="en" className={cn("h-full antialiased", theme === THEME.DARK && "dark")}>
            <body className="flex min-h-full flex-col bg-bg-app text-text-primary">
                <QueryProvider>
                    {/* Inside the provider and above everything that observes a board, so the
                        board entry's fetcher is registered before the first observer mounts. */}
                    <BoardQueryDefaults>
                        <ToastProvider>{children}</ToastProvider>
                    </BoardQueryDefaults>
                </QueryProvider>
            </body>
        </html>
    );
};

export default RootLayout;
