/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't load
 * the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ROUTE } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";

import * as stories from "./dashboard-header.stories";

/*
 * `next/navigation` is the D-19 environment-shim exception. Its pathname is a getter here, not a
 * fixed string, because this suite is precisely about how the header reacts to three of them.
 */
const routerState = vi.hoisted(() => ({ pathname: "/" }));
const mockRefresh = vi.hoisted(() => vi.fn());

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () =>
    createNextNavigationShim({ pathname: () => routerState.pathname, refresh: mockRefresh }),
);

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { OpenBoard, NoBoardSelected, BoardAbsentFromList } = composeStories(stories);

/*
 * The path each story declares for the `storybook` project, read back here so the browser shim
 * stages the same one — no second hand-typed copy that could silently drift from the story.
 */
const readStoryPathname = (parameters: Record<string, unknown>): string => {
    const nextjs = parameters.nextjs as { navigation?: { pathname?: string } } | undefined;

    return nextjs?.navigation?.pathname ?? ROUTE.BOARDS;
};

/* The display token, `--text-heading-xl` (02-UI-SPEC Typography) — a real computed value, not a class name. */
const DISPLAY_FONT_SIZE = "24px";

describeForEachDevice({
    name: "DashboardHeader",
    body: () => {
        beforeEach(() => {
            routerState.pathname = "/";
        });

        it("renders the open board's name at the display type size", async () => {
            // Arrange
            routerState.pathname = readStoryPathname(OpenBoard.parameters);

            // Act
            await render(<OpenBoard />);

            // Assert
            const title = screen.getByRole("heading", { level: 1, name: "Fixture Board 2" });
            expect(getComputedStyle(title).fontSize).toBe(DISPLAY_FONT_SIZE);
        });

        it("renders no board name on a route with no board selected", async () => {
            // Arrange
            routerState.pathname = readStoryPathname(NoBoardSelected.parameters);

            // Act
            await render(<NoBoardSelected />);

            // Assert
            expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
        });

        /* Never a stale title: an id absent from the list is as good as no selection at all. */
        it("renders no board name when the path names a board absent from the list", async () => {
            // Arrange
            routerState.pathname = readStoryPathname(BoardAbsentFromList.parameters);

            // Act
            await render(<BoardAbsentFromList />);

            // Assert
            expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
            expect(screen.queryByText("Fixture Board 1")).not.toBeInTheDocument();
        });

        it("still renders the signed-in display name and the sign-out control", async () => {
            // Arrange
            routerState.pathname = readStoryPathname(OpenBoard.parameters);

            // Act
            await render(<OpenBoard />);

            // Assert
            expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
        });
    },
});
