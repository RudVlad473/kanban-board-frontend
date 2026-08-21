import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import { boardDetail, ROUTE } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { Sidebar } from "./sidebar";

let currentPathname: string = ROUTE.BOARDS;
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
    usePathname: () => currentPathname,
    useRouter: () => ({ refresh: mockRefresh }),
}));

/*
 * `next/link`'s real implementation reads `process.env` internally — undefined in this
 * project's plain Vitest Browser Mode test environment (confirmed directly: importing it
 * unmocked throws `ReferenceError: process is not defined` from
 * `next/dist/client/has-base-path.js`). Mocked to a plain anchor so the test environment gap
 * doesn't force `Sidebar` itself off client-side routing — `sidebar.tsx` keeps the real
 * `next/link` for production navigation between boards, this project's single most frequent
 * interaction, unlike the one-time auth-page transition `sign-in-form.tsx`/`sign-up-form.tsx`
 * reasonably opted out of instead.
 */
vi.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, className, children }: { href: string; className?: string; children?: ReactNode }) => (
        // eslint-disable-next-line no-restricted-syntax -- this IS the next/link stand-in itself (see comment above), not a component opting out of it
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const boards = [
    { id: "board-1", name: "Platform Launch", version: 0 },
    { id: "board-2", name: "Marketing Plan", version: 0 },
];

describeForEachDevice({
    name: "Sidebar",
    body: () => {
        it("renders the authored load-failure copy with a working retry control on error", async () => {
            // Arrange
            mockRefresh.mockClear();

            // Act
            const screen = await renderWithProviders(<Sidebar boards={[]} loadFailed />);
            await expect.element(screen.getByText("Couldn't load your boards.")).toBeVisible();
            const retry = screen.getByRole("button", { name: "Try again." });
            await retry.click();

            // Assert
            expect(mockRefresh).toHaveBeenCalledOnce();
        });

        it("renders one row per board and the ALL BOARDS caption with the matching count", async () => {
            // Arrange — boards passed directly as a prop (RSC-fed, D-02).

            // Act
            const screen = await renderWithProviders(<Sidebar boards={boards} />);

            // Assert
            await expect.element(screen.getByText("ALL BOARDS (2)")).toBeVisible();
            await expect.element(screen.getByRole("link", { name: "Platform Launch" })).toBeVisible();
            await expect.element(screen.getByRole("link", { name: "Marketing Plan" })).toBeVisible();
        });

        it("renders a zero count and no rows when there are no boards", async () => {
            // Arrange — no boards, no failure.

            // Act
            const screen = await renderWithProviders(<Sidebar boards={[]} />);

            // Assert
            await expect.element(screen.getByText("ALL BOARDS (0)")).toBeVisible();
            expect(screen.container.querySelectorAll("li")).toHaveLength(0);
        });

        it("gives the row whose id matches the current path the selected treatment", async () => {
            // Arrange
            currentPathname = boardDetail("board-2");

            // Act
            const screen = await renderWithProviders(<Sidebar boards={boards} />);

            // Assert
            const selectedLink = screen.getByRole("link", { name: "Marketing Plan" });
            const otherLink = screen.getByRole("link", { name: "Platform Launch" });
            expect(selectedLink.element().getAttribute("class")).toContain("bg-bg-primary");
            expect(otherLink.element().getAttribute("class")).not.toContain("bg-bg-primary");

            // Cleanup
            currentPathname = ROUTE.BOARDS;
        });

        it("does not widen the sidebar panel beyond its declared width for a 200-character board name", async () => {
            // Arrange
            const longName = "A".repeat(200);

            // Act
            const screen = await renderWithProviders(
                <Sidebar boards={[{ id: "board-1", name: longName, version: 0 }]} />,
            );

            // Assert
            const nav = screen.container.querySelector("nav");
            expect(nav).not.toBeNull();
            await expect.poll(() => nav?.getBoundingClientRect().width).toBe(300);
        });
    },
});
