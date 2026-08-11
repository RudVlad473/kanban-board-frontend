import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
    title: "Kanban Board",
    description: "A kanban board for organizing work into columns and tasks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="flex min-h-full flex-col">{children}</body>
        </html>
    );
}
