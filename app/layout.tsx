import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";

// UI-SPEC.md: Plus Jakarta Sans, weights Medium (500) and Bold (700) only — the two weights
// this design system's typography tokens (tokens/typography.tokens.json) use. Exposed as a CSS
// variable so the browser has the actual font file loaded under the "Plus Jakarta Sans" family
// name the generated --font-* token custom properties reference (src/styles/tokens.css).
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Kanban Board",
  description: "A kanban board for organizing work into columns and tasks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
