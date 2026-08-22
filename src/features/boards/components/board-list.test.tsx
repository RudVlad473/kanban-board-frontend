/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ROUTE } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";

import * as stories from "./board-list.stories";

/*
 * `next/link`/`next/navigation` are the D-19 environment-shim exception (see the vi.mock below) —
 * every other seam this file used to stub (`useBoards`) is gone: `BoardList` is RSC-fed via props
 * now (D-02/D-03), so there is no business-logic hook left to mock.
 */
const mockRefresh = vi.hoisted(() => vi.fn());

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () => createNextNavigationShim({ pathname: ROUTE.BOARDS, refresh: mockRefresh }));

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { Populated, Empty, LoadFailed } = composeStories(stories);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. BoardList
 * has no viewport-conditional behavior of its own (carried over from `sidebar.test.tsx`, plan 02-09).
 */
describeForEachDevice({
    name: "BoardList",
    body: () => {
        it("renders one row per board and the matching ALL BOARDS caption when populated", async () => {
            // Act
            await render(<Populated />);

            // Assert
            expect(screen.getByText("ALL BOARDS (3)")).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Fixture Board 1" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Fixture Board 2" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Fixture Board 3" })).toBeInTheDocument();
        });

        it("renders a zero count and no rows when there are no boards", async () => {
            // Act
            await render(<Empty />);

            // Assert
            expect(screen.getByText("ALL BOARDS (0)")).toBeInTheDocument();
            expect(screen.queryAllByRole("link")).toHaveLength(0);
        });

        it("renders the authored load-failure copy and a retry control", async () => {
            // Act
            await render(<LoadFailed />);

            // Assert
            expect(screen.getByText("Couldn't load your boards.")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Try again." })).toBeInTheDocument();
        });
    },
});
