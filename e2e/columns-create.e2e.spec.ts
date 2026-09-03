import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn } from "./seed";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records the two entry points this spec separates and the reason its order assertion reads text rather than the accessible name, so a future reader does not collapse either
/*
 * COLUMN-01 against the real deployed nonprod backend: a column created from the ghost column of a
 * populated board, and one created from the zero-columns empty state — structural, business-level
 * assertions only, no validation copy or microcopy (docs/adr/tech/0022). The two entry points get a
 * test each because they are different controls with different copy ("+ New Column" on a populated
 * board, "+ Add New Column" in the empty state), and only the second one proves the board leaves
 * the empty state. Order is asserted from each heading's TEXT, not its accessible name: the caption
 * is upper-cased by CSS, which the accessible name picks up and `textContent` does not.
 */
/* The real backend's sign-in round trip outruns the 5s default often enough to flake on its own. */
const SIGN_IN_TIMEOUT_MS = 20_000;

test.describe("COLUMN-01: create a column", () => {
    test("appends a column from the ghost column and keeps it last across a reload", async ({ page }) => {
        // Arrange — one curl-seeded account; a second would exceed the backend's 2-session cap.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const board = seedBoard({ account, name: `E2E Add Column ${suffix}` });
        /* Seeded one call at a time: the backend derives position from creation order (P5). */
        seedColumn({ account, boardId: board.id, name: "Backlog" });
        seedColumn({ account, boardId: board.id, name: "Doing" });
        const addedName = `Shipped ${suffix}`;

        // Arrange — sign in through the real form, then open the seeded board.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        /* The account's only board, so D-11 auto-selects it — waited on rather than navigated to. */
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), {
            timeout: SIGN_IN_TIMEOUT_MS,
        });

        /* Every column's own `h2`, in document order — the sequence the append is observable in. */
        const columnHeadings = page.getByRole("region").getByRole("heading", { level: 2 });
        await expect(columnHeadings).toHaveText(["Backlog (0)", "Doing (0)"]);

        // Act — the ghost column that trails the row, then the modal it opens.
        await page.getByRole("button", { name: "+ New Column" }).click();
        await page.getByLabel("Column Name", { exact: true }).fill(addedName);
        await page.getByRole("button", { name: "Create New Column" }).click();

        // Assert — D-01: the new column is a swimlane of its own, appended LAST rather than inserted.
        await expect(columnHeadings).toHaveText(["Backlog (0)", "Doing (0)", `${addedName} (0)`]);

        // Act — reload, so nothing on screen can be standing in for the server's own value.
        await page.reload();

        // Assert — the create persisted, still in last position.
        await expect(columnHeadings).toHaveText(["Backlog (0)", "Doing (0)", `${addedName} (0)`]);
    });

    test("creates the first column from the empty state and leaves that state showing it", async ({ page }) => {
        // Arrange — a board with no columns at all, so the board opens in the zero-columns state.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const board = seedBoard({ account, name: `E2E First Column ${suffix}` });
        const addedName = `Todo ${suffix}`;

        // Arrange — sign in through the real form, then open the seeded board.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        /* The account's only board, so D-11 auto-selects it — waited on rather than navigated to. */
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), {
            timeout: SIGN_IN_TIMEOUT_MS,
        });

        // Assert — the empty state is what a board with no columns shows, and it replaces the ghost column.
        await expect(page.getByText("This board is empty. Create a new column to get started.")).toBeVisible();
        await expect(page.getByRole("button", { name: "+ New Column" })).toBeHidden();

        // Act — the empty state's own call to action, which opens the same modal.
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column Name", { exact: true }).fill(addedName);
        await page.getByRole("button", { name: "Create New Column" }).click();

        // Assert — the board left the empty state and now renders that one column as a swimlane.
        await expect(page.getByRole("region").getByRole("heading", { level: 2 })).toHaveText([`${addedName} (0)`]);
        await expect(page.getByText("This board is empty. Create a new column to get started.")).toBeHidden();
    });
});
