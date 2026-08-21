import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import { useBoards } from "@/features/boards/hooks/use-boards";
import { boardDetail, ROUTE } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { Sidebar } from "./sidebar";

/*
 * `useBoards` is this component's own data hook — stubbed directly so each test can stage the
 * pending/error/populated states without a real network call, mirroring
 * `theme-toggle.test.tsx`'s pattern of mocking the module boundary it consumes.
 */
vi.mock("@/features/boards/hooks/use-boards", () => ({
    useBoards: vi.fn(),
}));

const mockedUseBoards = vi.mocked(useBoards);

let currentPathname: string = ROUTE.BOARDS;
vi.mock("next/navigation", () => ({
    usePathname: () => currentPathname,
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

/*
 * A partial `UseQueryResult`-shaped stub — only the fields Sidebar actually reads
 * (`data`/`isPending`/`isError`/`refetch`) are asserted or consumed, so a full mock is more
 * misleading than useful.
 */
const stagePending = () => {
    mockedUseBoards.mockReturnValue({
        data: undefined,
        isPending: true,
        isError: false,
        refetch: vi.fn(),
    } as unknown as ReturnType<typeof useBoards>);
};

const stageError = (refetch = vi.fn()) => {
    mockedUseBoards.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: true,
        refetch,
    } as unknown as ReturnType<typeof useBoards>);
};

const stagePopulated = (data: typeof boards = boards) => {
    mockedUseBoards.mockReturnValue({
        data,
        isPending: false,
        isError: false,
        refetch: vi.fn(),
    } as unknown as ReturnType<typeof useBoards>);
};

describeForEachDevice({
    name: "Sidebar",
    body: () => {
        it("renders three skeleton rows while pending, matching a board row's height, and no board data", async () => {
            // Arrange
            stagePending();

            // Act
            const screen = await renderWithProviders(<Sidebar />);

            // Assert
            const skeletons = screen.container.querySelectorAll(".animate-pulse");
            expect(skeletons).toHaveLength(3);
            for (const skeleton of skeletons) {
                expect(skeleton.className).toContain("h-11");
            }
            expect(screen.container.textContent).not.toContain("Platform Launch");
        });

        it("renders the authored load-failure copy with a working retry control on error", async () => {
            // Arrange
            const refetch = vi.fn();
            stageError(refetch);

            // Act
            const screen = await renderWithProviders(<Sidebar />);
            await expect.element(screen.getByText("Couldn't load your boards.")).toBeVisible();
            const retry = screen.getByRole("button", { name: "Try again." });
            await retry.click();

            // Assert
            expect(refetch).toHaveBeenCalledOnce();
        });

        it("renders one row per board and the ALL BOARDS caption with the matching count", async () => {
            // Arrange
            stagePopulated();

            // Act
            const screen = await renderWithProviders(<Sidebar />);

            // Assert
            await expect.element(screen.getByText("ALL BOARDS (2)")).toBeVisible();
            await expect.element(screen.getByRole("link", { name: "Platform Launch" })).toBeVisible();
            await expect.element(screen.getByRole("link", { name: "Marketing Plan" })).toBeVisible();
        });

        it("renders a zero count and no rows when there are no boards", async () => {
            // Arrange
            stagePopulated([]);

            // Act
            const screen = await renderWithProviders(<Sidebar />);

            // Assert
            await expect.element(screen.getByText("ALL BOARDS (0)")).toBeVisible();
            expect(screen.container.querySelectorAll("li")).toHaveLength(0);
        });

        it("gives the row whose id matches the current path the selected treatment", async () => {
            // Arrange
            currentPathname = boardDetail("board-2");
            stagePopulated();

            // Act
            const screen = await renderWithProviders(<Sidebar />);

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
            stagePopulated([{ id: "board-1", name: longName, version: 0 }]);

            // Act
            const screen = await renderWithProviders(<Sidebar />);

            // Assert
            const nav = screen.container.querySelector("nav");
            expect(nav).not.toBeNull();
            await expect.poll(() => nav?.getBoundingClientRect().width).toBe(300);
        });
    },
});
