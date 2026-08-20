import type { Metadata } from "next";
import "@/styles/globals.css";

import { QueryProvider } from "@/lib/client/query-client";
import { cn } from "@/lib/core/styling/cn";
import { THEME } from "@/lib/core/theme/theme";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";

export const metadata: Metadata = {
    title: "Kanban Board",
    description: "A kanban board for organizing work into columns and tasks.",
};

/*
 * The whole flash-avoidance mechanism (THEME-01): the theme cookie is read server-side and the
 * `dark` scope is applied here, before any client script runs, so the very first byte of HTML
 * already carries the right scope — no client-side correction after paint. Async because
 * `themeCookie.read()` calls `next/headers`'s `cookies()`.
 */
const RootLayout = async ({ children }: LayoutProps<"/">) => {
    const theme = await themeCookie.read();

    return (
        <html lang="en" className={cn("h-full antialiased", theme === THEME.DARK && "dark")}>
            <body className="flex min-h-full flex-col bg-bg-app text-text-primary">
                <QueryProvider>{children}</QueryProvider>
            </body>
        </html>
    );
};

export default RootLayout;
