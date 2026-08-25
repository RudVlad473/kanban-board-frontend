import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { seedAccount, seedBoard } from "./seed";
import { ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records the one behaviour this spec deliberately does not cover and where it is proved instead, so a future reader does not re-add a step the backend refuses (docs/adr/tech/0023)
/*
 * BOARD-04 against the real deployed nonprod backend: a board renamed from its sidebar overflow
 * menu, with the new name still there after a reload — structural, business-level assertions only,
 * no validation copy or microcopy (docs/adr/tech/0022). The plan's third behaviour bullet (renaming
 * to another board's exact name also succeeds) is NOT here: probed 2026-08-25, the backend refuses a
 * duplicate board name with 409 DUPLICATE_RESOURCE on rename exactly as it already does on create
 * (02-10-SUMMARY.md), so that path is a failure case and belongs in rename-board.integration.test.ts,
 * which asserts the refusal and that its code is not the optimistic-lock one.
 */
test.describe("BOARD-04: rename a board", () => {
    test("renames a board from its sidebar overflow menu and keeps the new name across a reload", async ({ page }) => {
        // Arrange — one curl-seeded account with two boards; a second account would exceed the 2-session cap.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const originalName = `E2E Rename ${suffix}`;
        const renamedName = `E2E Renamed ${suffix}`;
        seedBoard({ account, name: originalName });
        seedBoard({ account, name: `E2E Other ${suffix}` });

        // Arrange — sign in through the real form.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        // Act — rename the first board from its own row's overflow menu.
        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await sidebar.getByRole("button", { name: `Board actions for ${originalName}` }).click();
        await page.getByRole("menuitem", { name: "Edit Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(renamedName);
        await page.getByRole("button", { name: "Save Changes" }).click();

        // Assert — the sidebar row carries the new name and the modal is gone.
        await expect(sidebar.getByRole("link", { name: renamedName })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Edit Board" })).toBeHidden();

        // Act — reload, so nothing on screen can be standing in for the server's own value.
        await page.reload();

        // Assert — the rename persisted, and the other board is untouched.
        await expect(sidebar.getByRole("link", { name: renamedName })).toBeVisible();
        await expect(sidebar.getByRole("link", { name: originalName })).toBeHidden();
        await expect(sidebar.getByRole("link", { name: `E2E Other ${suffix}` })).toBeVisible();
    });
});
