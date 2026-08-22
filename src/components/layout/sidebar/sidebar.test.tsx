/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { BoardListSkeleton } from "@/features/boards/components/board-list-skeleton";
import { ROUTE } from "@/lib/core/routing/routes";
import { THEME, type Theme } from "@/lib/core/theme/theme";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { Sidebar } from "./sidebar";
import * as stories from "./sidebar.stories";

/*
 * `next/link`/`next/navigation` are the D-19 environment-shim exception — needed here because the
 * `Expanded`/`Overflowing` stories' children compose a real `BoardList` (identical justification
 * to board-list.test.tsx).
 */
const mockRefresh = vi.fn();

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () => ({
    usePathname: () => ROUTE.BOARDS,
    useRouter: () => ({ refresh: mockRefresh }),
}));

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see board-list.test.tsx)
vi.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, className, children }: { href: string; className?: string; children?: ReactNode }) => (
        // eslint-disable-next-line no-restricted-syntax -- this IS the next/link stand-in itself (see comment above), not a component opting out of it
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const { Expanded, Collapsed, Overflowing } = composeStories(stories);

const renderSidebar = (props: { initialTheme: Theme; children: ReactNode; defaultIsExpanded?: boolean }) =>
    renderWithProviders(<Sidebar {...props} />);

describeForEachDevice({
    name: "Sidebar",
    body: () => {
        afterEach(() => {
            document.body.innerHTML = "";
        });

        // Shallow: composed structural states (D-08).
        it("renders the brand mark, the Boards landmark and Hide Sidebar when expanded", async () => {
            // Act
            await Expanded.run();

            // Assert
            expect(screen.getByText("kanban")).toBeInTheDocument();
            expect(screen.getByRole("navigation", { name: "Boards" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });

        it("renders only Show Sidebar, with no Boards landmark, when collapsed", async () => {
            // Act
            await Collapsed.run();

            // Assert
            expect(screen.queryByRole("navigation", { name: "Boards" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Hide Sidebar" })).not.toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();
        });

        it("keeps the brand mark and Hide Sidebar reachable once the board list overflows its region", async () => {
            // Act
            await Overflowing.run();

            // Assert
            expect(screen.getByText("kanban")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
            expect(screen.getAllByRole("link")).toHaveLength(15);
        });

        // Deep: real toggling, keyboard reachability, remount and the C-009 no-persistence guarantee.
        it("collapses on activating Hide Sidebar, hiding the Boards landmark and showing Show Sidebar instead", async () => {
            // Arrange
            const rendered = await renderSidebar({ initialTheme: THEME.LIGHT, children: <div>List</div> });

            // Act
            await rendered.getByRole("button", { name: "Hide Sidebar" }).click();

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();
            expect(rendered.getByRole("button", { name: "Hide Sidebar" }).elements().length).toBe(0);
            expect(rendered.getByRole("navigation", { name: "Boards" }).elements().length).toBe(0);
        });

        it("restores the panel on activating Show Sidebar", async () => {
            // Arrange
            const rendered = await renderSidebar({ initialTheme: THEME.LIGHT, children: <div>List</div> });
            await rendered.getByRole("button", { name: "Hide Sidebar" }).click();

            // Act
            await rendered.getByRole("button", { name: "Show Sidebar" }).click();

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
            expect(rendered.getByRole("button", { name: "Show Sidebar" }).elements().length).toBe(0);
        });

        it("activates Hide Sidebar and Show Sidebar on both Enter and Space", async () => {
            // Arrange
            const rendered = await renderSidebar({ initialTheme: THEME.LIGHT, children: <div>List</div> });

            // Act
            rendered.getByRole("button", { name: "Hide Sidebar" }).element().focus();
            await userEvent.keyboard("{Enter}");

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();

            // Act
            rendered.getByRole("button", { name: "Show Sidebar" }).element().focus();
            await userEvent.keyboard(" ");

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });

        it("renders expanded on a fresh mount, even after a prior instance was collapsed", async () => {
            // Arrange
            const first = await renderSidebar({ initialTheme: THEME.LIGHT, children: <div>List</div> });
            await first.getByRole("button", { name: "Hide Sidebar" }).click();
            await expect.element(first.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();
            document.body.innerHTML = "";

            // Act
            const second = await renderSidebar({ initialTheme: THEME.LIGHT, children: <div>List</div> });

            // Assert
            await expect.element(second.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });

        it("leaves document.cookie byte-identical and writes nothing to storage when toggled", async () => {
            // Arrange
            const rendered = await renderSidebar({ initialTheme: THEME.LIGHT, children: <div>List</div> });
            const cookieBefore = document.cookie;

            // Act
            await rendered.getByRole("button", { name: "Hide Sidebar" }).click();

            // Assert
            expect(document.cookie).toBe(cookieBefore);
            expect(window.localStorage.length).toBe(0);
            expect(window.sessionStorage.length).toBe(0);
        });

        it("renders the brand mark and Hide Sidebar alongside a not-yet-resolved board list", async () => {
            // Act
            const rendered = await renderSidebar({ initialTheme: THEME.LIGHT, children: <BoardListSkeleton /> });

            // Assert
            await expect.element(rendered.getByText("kanban")).toBeInTheDocument();
            await expect.element(rendered.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });
    },
});
