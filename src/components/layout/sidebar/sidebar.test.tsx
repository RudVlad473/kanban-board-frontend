import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter's main entry eagerly imports real Next.js internals (`process.env` read at
 * module-evaluation time) that only resolve under the Vite plugin the separate "storybook" Vitest
 * project loads; this "browser" project does not (vitest.setup.ts documents this in full).
 */

import * as stories from "./sidebar.stories";

/*
 * `next/link`/`next/navigation` are the D-19 environment-shim exception (see the vi.mock below) —
 * every other seam this file used to stub (`useBoards`) is gone: `Sidebar` is RSC-fed via props
 * now (D-02/D-03), so there is no business-logic hook left to mock.
 */
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
    usePathname: () => "/boards",
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

const { Populated, Empty, LoadFailed } = composeStories(stories);

test("renders one row per board and the matching ALL BOARDS caption when populated", async () => {
    // Act
    await Populated.run();

    // Assert
    expect(screen.getByText("ALL BOARDS (3)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fixture Board 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fixture Board 2" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fixture Board 3" })).toBeInTheDocument();
});

test("renders a zero count and no rows when there are no boards", async () => {
    // Act
    await Empty.run();

    // Assert
    expect(screen.getByText("ALL BOARDS (0)")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
});

test("renders the authored load-failure copy and a retry control", async () => {
    // Act
    await LoadFailed.run();

    // Assert
    expect(screen.getByText("Couldn't load your boards.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again." })).toBeInTheDocument();
});
