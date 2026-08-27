import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn } from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records why the reload is the assertion and not a convenience, so a future reader does not simplify it away into a second read of the same rendered DOM
/*
 * COLUMN-02 against the real deployed nonprod backend: a column renamed from its own header kebab,
 * with the new name still there after a reload — structural, business-level assertions only, no
 * validation copy or microcopy (docs/adr/tech/0022). The reload is the whole point of this spec:
 * U-05 makes the rename optimistic, so the header carries the new name before the server has
 * agreed, and an assertion made without reloading would pass even if the write never landed. That
 * is COLUMN-02's success criterion, so it is asserted the only way it can be observed.
 */
/* The real backend's sign-in round trip outruns the 5s default often enough to flake on its own. */
const SIGN_IN_TIMEOUT_MS = 20_000;

test.describe("COLUMN-02: rename a column", () => {
    test("renames a column from its header kebab and keeps the new name across a reload", async ({ page }) => {
        // Arrange — one curl-seeded account; a second would exceed the backend's 2-session cap.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const board = seedBoard({ account, name: `E2E Rename Column ${suffix}` });
        /* Seeded one call at a time: the backend derives position from creation order (P5). */
        seedColumn({ account, boardId: board.id, name: "Backlog" });
        seedColumn({ account, boardId: board.id, name: "Doing" });
        const renamedName = `Renamed ${suffix}`;

        // Arrange — sign in through the real form; D-11 auto-selects this account's only board.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), {
            timeout: SIGN_IN_TIMEOUT_MS,
        });

        /* Every column's own `h2`, in document order — read as TEXT, since CSS upper-cases the caption. */
        const columnHeadings = page.getByRole("region").getByRole("heading", { level: 2 });
        await expect(columnHeadings).toHaveText(["Backlog (0)", "Doing (0)"]);

        // Act — rename the first column from its own header's overflow menu.
        await page.getByRole("button", { name: "Column actions for Backlog" }).click();
        await page.getByRole("menuitem", { name: "Rename Column" }).click();
        await page.getByLabel("Column Name", { exact: true }).fill(renamedName);
        /* Created before the click it waits on, per createServerActionSettled's own contract. */
        const settled = createServerActionSettled(page);
        await page.getByRole("button", { name: "Save Changes" }).click();

        // Assert — the header carries the new name, in place, and the modal is gone.
        await expect(columnHeadings).toHaveText([`${renamedName} (0)`, "Doing (0)"]);
        /* Exact: an accessible name is matched as a substring otherwise, and the board's own `h1` contains this one. */
        await expect(page.getByRole("heading", { name: "Rename Column", exact: true })).toBeHidden();

        // Act — let the write reach the server, then reload; the override cannot answer for it.
        await settled;
        await page.reload();

        // Assert — the rename reached the server: it survived, and the untouched column did too.
        await expect(columnHeadings).toHaveText([`${renamedName} (0)`, "Doing (0)"]);
        await expect(page.getByRole("button", { name: `Column actions for ${renamedName}` })).toBeVisible();
        await expect(page.getByRole("button", { name: "Column actions for Backlog" })).toBeHidden();
    });
});
