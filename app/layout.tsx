import type { Metadata } from "next";
import "@/styles/globals.css";

import { QueryProvider } from "@/lib/client/query-client";

export const metadata: Metadata = {
    title: "Kanban Board",
    description: "A kanban board for organizing work into columns and tasks.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="flex min-h-full flex-col bg-bg-app text-text-primary">
                <QueryProvider>{children}</QueryProvider>
            </body>
        </html>
    );
};

export default RootLayout;
