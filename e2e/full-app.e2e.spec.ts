import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { signUpViaUi } from "./signed-up-user";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";
import { THEME } from "../src/lib/core/theme/theme";

// comment-length-exempt: states what this spec covers that 21 per-feature specs structurally cannot, and the rule that keeps its step list honest — both facts a future reader would otherwise have to reconstruct before deciding whether to extend it
/*
 * Every other e2e spec proves one feature from its own fresh seed. That leaves the failures that
 * only appear when features meet: a board created through the real create flow not being the shape
 * the column flow expects, a drag leaving state the detail modal reads differently, one action's
 * revalidation invalidating a query another feature depends on. None of those are visible to a
 * spec that reseeds between steps.
 *
 * So this one walks the whole application as a single continuous session, carrying state forward
 * and never reseeding. It is deliberately ONE test: splitting it into independent tests would
 * reintroduce the isolation it exists to remove.
 *
 * Its step titles start with a requirement id, and `pnpm smoke:check` fails when a requirement
 * marked complete in .planning/REQUIREMENTS.md has no step here. That is what stops this from
 * decaying into a stale checklist covering thirteen of fourteen features while reading as
 * coverage — the gate is tied to the file a new feature cannot avoid updating.
 *
 * RUN IT BY HAND. Neither this spec nor `smoke:check` is wired into CI, deliberately: across six
 * runs on 2026-09-03 it failed intermittently, twice at BOARD-02 with exactly one of two columns
 * created and no failure toast. The same interaction was then driven by hand and SUCCEEDED three
 * times — dev, and a production build, on both the sidebar and empty-state creation paths — so the
 * cause is in this spec or its environment, not the application, and it is not yet identified.
 * Wiring an unexplained intermittent failure into CI would train people to ignore a red build.
 */

/** Long enough for a cold Server Action against the real nonprod backend, not a UI transition. */
const ACTION_TIMEOUT_MS = 20_000;

const openBoardMenu = async ({ page, name }: { page: Page; name: string }): Promise<void> => {
    await page.getByRole("button", { name: `Board actions for ${name}` }).click();
};

const openColumnMenu = async ({ page, name }: { page: Page; name: string }): Promise<void> => {
    await page.getByRole("button", { name: `Column actions for ${name}` }).click();
};

const openTaskDetail = async ({ page, title }: { page: Page; title: string }): Promise<void> => {
    await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
};

test.describe("full-app smoke", () => {
    /* One continuous session over the real backend, so the default per-test budget is not enough. */
    test.slow();

    test("walks every completed requirement in one session, carrying state forward", async ({ page }) => {
        const suffix = randomUUID().slice(0, 8);
        const boardName = `E2E Smoke ${suffix}`;
        const renamedBoardName = `${boardName} Renamed`;
        const email = `e2e-smoke-${suffix}@example.com`;
        const password = "E2eSmokePwd1!";

        await test.step("AUTH-03 — a signed-out visitor asking for a board lands on sign-in", async () => {
            await page.goto(buildBoardDetailPath("not-a-real-board-id"));
            await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        });

        await test.step("AUTH-01 — sign up through the real form", async () => {
            await signUpViaUi({ page, email, password });
        });

        await test.step("THEME-01 — the theme toggle flips and survives a reload", async () => {
            /*
             * Read off the switch's own `aria-checked` and the server's HTML, the two signals
             * `theme.e2e.spec.ts` proves. A live `classList` read looked equivalent and is not:
             * the dark scope is applied by the server render, so the class does not flip in place.
             */
            const toggle = page.getByRole("switch", { name: "Toggle dark mode" });
            const before = await toggle.getAttribute("aria-checked");
            const after = before === "true" ? "false" : "true";

            await toggle.click();
            await expect(toggle).toHaveAttribute("aria-checked", after, { timeout: ACTION_TIMEOUT_MS });

            /*
             * The cookie lags the toggle by ~1.5s, so reloading on the flipped control alone races
             * the persistence write and reads the OLD theme back — measured in theme.e2e.spec.ts,
             * and reproduced here on the first run of this spec.
             */
            await expect
                .poll(() => page.evaluate(() => document.cookie), { timeout: ACTION_TIMEOUT_MS })
                .toContain(`theme=${after === "true" ? THEME.DARK : THEME.LIGHT}`);

            await page.reload();
            await expect(page.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute(
                "aria-checked",
                after,
                { timeout: ACTION_TIMEOUT_MS },
            );
        });

        await test.step("BOARD-02 — create a board, naming its initial columns", async () => {
            await page.getByRole("button", { name: "Create your first board" }).click();
            const createDialog = page.getByRole("dialog");
            await createDialog.getByLabel("Board Name", { exact: true }).fill(boardName);
            await createDialog.getByLabel("Column 1", { exact: true }).fill("Backlog");
            await createDialog.getByRole("button", { name: "+ Add New Column" }).click();
            await createDialog.getByLabel("Column 2", { exact: true }).fill("Doing");

            /*
             * Read the fields back before submitting. A row added and left empty is dropped
             * silently, and the miss then surfaces two steps later as a column that never existed —
             * which is exactly how this spec first failed.
             */
            await expect(createDialog.getByLabel("Column 1", { exact: true })).toHaveValue("Backlog");
            await expect(createDialog.getByLabel("Column 2", { exact: true })).toHaveValue("Doing");

            await createDialog.getByRole("button", { name: "Create New Board", exact: true }).click();

            await expect(page.getByRole("heading", { level: 1, name: boardName })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });

            /*
             * Both columns asserted HERE rather than in a later step, on a SHORT budget: the column
             * phase belongs to this creation, and its partial-failure toast auto-dismisses in 5s,
             * so a long wait reports an empty notification region and loses the cause.
             */
            await expect(page.getByRole("heading", { name: /^Backlog/ })).toBeVisible({ timeout: 8_000 });
            await expect(page.getByRole("heading", { name: /^Doing/ })).toBeVisible({ timeout: 8_000 });
        });

        await test.step("BOARD-01 — the new board is listed in the sidebar", async () => {
            await expect(
                page.getByRole("navigation", { name: "Boards" }).getByRole("link", { name: boardName }),
            ).toBeVisible();
        });

        await test.step("BOARD-03 — selecting the board reads its full contents back from the server", async () => {
            /* A fresh document, so this proves the persisted read rather than the create's own cache write. */
            await page.reload();
            await expect(page.getByRole("heading", { name: /^Backlog/ })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });
            await expect(page.getByRole("heading", { name: /^Doing/ })).toBeVisible({ timeout: ACTION_TIMEOUT_MS });
        });

        await test.step("COLUMN-01 — add a third column to the live board", async () => {
            await page.getByRole("button", { name: "+ New Column" }).click();
            await page.getByLabel("Column Name", { exact: true }).fill("Review");
            await page.getByRole("dialog").getByRole("button", { name: "Create New Column" }).click();

            await expect(page.getByRole("heading", { name: /^Review/ })).toBeVisible({ timeout: ACTION_TIMEOUT_MS });
        });

        await test.step("COLUMN-02 — rename that column", async () => {
            await openColumnMenu({ page, name: "Review" });
            await page.getByRole("menuitem", { name: "Rename Column" }).click();
            await page.getByLabel("Column Name", { exact: true }).fill("Done");
            await page.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();

            await expect(page.getByRole("heading", { name: /^Done/ })).toBeVisible({ timeout: ACTION_TIMEOUT_MS });
        });

        await test.step("TASK-01 — create a task with an initial subtask", async () => {
            await page.getByRole("button", { name: "+ Add New Task" }).click();
            const dialog = page.getByRole("dialog");
            await dialog.getByLabel("Title", { exact: true }).fill("Smoke Task");
            await dialog.getByLabel("Description", { exact: true }).fill("Written by the full-app smoke.");
            await dialog.getByRole("button", { name: "+ Add New Subtask" }).click();
            await dialog.getByRole("textbox", { name: "Subtask 1", exact: true }).fill("Smoke Subtask One");
            await dialog.getByRole("button", { name: "Create Task" }).click();

            await expect(page.getByRole("button", { name: /^Smoke Task/ })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });
        });

        await test.step("TASK-02 — open the task's detail view", async () => {
            await openTaskDetail({ page, title: "Smoke Task" });
            const dialog = page.getByRole("dialog");
            await expect(dialog.getByText("Written by the full-app smoke.")).toBeVisible();
            await expect(dialog.getByRole("checkbox", { name: "Smoke Subtask One" })).toBeVisible();
        });

        await test.step("SUBTASK-02 — toggle that subtask complete from the detail view", async () => {
            const checkbox = page.getByRole("dialog").getByRole("checkbox", { name: "Smoke Subtask One" });
            await checkbox.click();
            await expect(checkbox).toBeChecked({ timeout: ACTION_TIMEOUT_MS });
        });

        await test.step("TASK-04 — move the task to another column via the detail view's status control", async () => {
            const dialog = page.getByRole("dialog");
            await dialog.getByRole("combobox").click();
            await page.getByRole("option", { name: "Doing" }).click();

            /*
             * Closed before the board is read: Base UI marks everything outside an open dialog
             * `aria-hidden`, so a role query for the moved card finds nothing while it is up and
             * the move reads as having failed.
             */
            await page.keyboard.press("Escape");
            await expect(dialog).toBeHidden({ timeout: ACTION_TIMEOUT_MS });

            await expect(
                page
                    .locator("section")
                    .filter({ has: page.getByRole("heading", { name: /^Doing/ }) })
                    .getByRole("button", { name: /^Smoke Task/ }),
            ).toBeVisible({ timeout: ACTION_TIMEOUT_MS });
        });

        await test.step("SUBTASK-01/03/04 — add, rename and delete a subtask from the edit modal", async () => {
            await openTaskDetail({ page, title: "Smoke Task" });
            await page.getByRole("button", { name: "Task actions for Smoke Task" }).click();
            await page.getByRole("menuitem", { name: "Edit Task" }).click();
            const dialog = page.getByRole("dialog");

            await dialog.getByRole("button", { name: "+ Add New Subtask" }).click();
            const added = dialog.getByRole("textbox", { name: "Subtask 2", exact: true });
            await added.fill("Smoke Subtask Two");
            await added.press("Tab");

            const renamed = dialog.getByRole("textbox", { name: "Subtask 1", exact: true });
            await renamed.fill("Smoke Subtask One Renamed");
            await renamed.press("Tab");

            await dialog.getByRole("button", { name: "Remove subtask 'Smoke Subtask Two'" }).click();
            await expect(dialog.getByRole("textbox", { name: "Subtask 2", exact: true })).toBeHidden({
                timeout: ACTION_TIMEOUT_MS,
            });
        });

        await test.step("TASK-03 — edit the task's title and description", async () => {
            const dialog = page.getByRole("dialog");
            await dialog.getByLabel("Title", { exact: true }).fill("Smoke Task Edited");
            await dialog.getByLabel("Description", { exact: true }).fill("Edited by the full-app smoke.");
            await dialog.getByRole("button", { name: "Save Changes" }).click();

            await expect(page.getByRole("button", { name: /^Smoke Task Edited/ })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });
        });

        await test.step("SYNC-01 — a stale edit is rejected, surfaced and reverted", async () => {
            /*
             * A second TAB, not a second context: tabs share one session cookie, staying inside the
             * backend's two-session cap. It loads the board BEFORE the first tab edits it, which is
             * what leaves it holding a version the server has already moved past.
             */
            const staleTab = await page.context().newPage();
            await staleTab.goto(page.url());
            await expect(staleTab.getByRole("button", { name: /^Smoke Task Edited/ })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });

            await openTaskDetail({ page, title: "Smoke Task Edited" });
            await page.getByRole("button", { name: "Task actions for Smoke Task Edited" }).click();
            await page.getByRole("menuitem", { name: "Edit Task" }).click();
            await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill("Smoke Task Server Wins");
            await page.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();
            await expect(page.getByRole("button", { name: /^Smoke Task Server Wins/ })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });

            await openTaskDetail({ page: staleTab, title: "Smoke Task Edited" });
            await staleTab.getByRole("button", { name: "Task actions for Smoke Task Edited" }).click();
            await staleTab.getByRole("menuitem", { name: "Edit Task" }).click();
            await staleTab.getByRole("dialog").getByLabel("Title", { exact: true }).fill("Smoke Task Stale Wins");
            await staleTab.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();

            /* The rejection is surfaced, and the losing title never survives it. */
            await expect(staleTab.getByRole("status").or(staleTab.getByRole("alert"))).toContainText(/./, {
                timeout: ACTION_TIMEOUT_MS,
            });
            await expect(staleTab.getByRole("button", { name: /^Smoke Task Stale Wins/ })).toBeHidden({
                timeout: ACTION_TIMEOUT_MS,
            });

            await staleTab.close();

            /* Renamed by the winning edit, so every later step names the task the server actually holds. */
            await expect(page.getByRole("button", { name: /^Smoke Task Server Wins/ })).toBeVisible();
        });

        await test.step("COLUMN-03 — reorder the columns by keyboard", async () => {
            const firstBefore = await page.locator("section").first().getByRole("heading").first().textContent();
            await page.getByRole("button", { name: /^Backlog/ }).focus();
            await page.keyboard.press("Space");
            await page.keyboard.press("ArrowRight");
            await page.keyboard.press("Space");

            await expect
                .poll(async () => page.locator("section").first().getByRole("heading").first().textContent(), {
                    timeout: ACTION_TIMEOUT_MS,
                })
                .not.toBe(firstBefore);
        });

        await test.step("TASK-05 — delete the task behind its confirmation", async () => {
            await openTaskDetail({ page, title: "Smoke Task Server Wins" });
            await page.getByRole("button", { name: "Task actions for Smoke Task Server Wins" }).click();
            await page.getByRole("menuitem", { name: "Delete Task" }).click();
            await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();

            await expect(page.getByRole("button", { name: /^Smoke Task Server Wins/ })).toBeHidden({
                timeout: ACTION_TIMEOUT_MS,
            });
        });

        await test.step("COLUMN-04 — delete a column behind its confirmation", async () => {
            await openColumnMenu({ page, name: "Done" });
            await page.getByRole("menuitem", { name: "Delete Column" }).click();
            await page.getByRole("dialog").getByRole("button", { name: "Delete Column" }).click();

            await expect(page.getByRole("heading", { name: /^Done/ })).toBeHidden({ timeout: ACTION_TIMEOUT_MS });
        });

        await test.step("BOARD-04 — rename the board", async () => {
            await openBoardMenu({ page, name: boardName });
            await page.getByRole("menuitem", { name: "Edit Board" }).click();
            await page.getByLabel("Board Name", { exact: true }).fill(renamedBoardName);
            await page.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();

            await expect(page.getByRole("heading", { level: 1, name: renamedBoardName })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });
        });

        await test.step("BOARD-06 — collapse and expand the sidebar", async () => {
            await page.getByRole("button", { name: "Hide Sidebar" }).click();
            await expect(page.getByRole("navigation", { name: "Boards" })).toBeHidden();
            await page.getByRole("button", { name: "Show Sidebar" }).click();
            await expect(page.getByRole("navigation", { name: "Boards" })).toBeVisible();
        });

        await test.step("BOARD-05 — delete the board and land on the empty state", async () => {
            await openBoardMenu({ page, name: renamedBoardName });
            await page.getByRole("menuitem", { name: "Delete Board" }).click();
            await page.getByRole("dialog").getByRole("button", { name: "Delete Board" }).click();

            await expect(page.getByRole("button", { name: "Create your first board" })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });
        });

        await test.step("AUTH-02 — sign out and back in, reaching the same account", async () => {
            await page.getByRole("button", { name: "Sign Out" }).click();
            await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));

            await page.getByLabel("Email", { exact: true }).fill(email);
            await page.getByLabel("Password", { exact: true }).fill(password);
            await page.getByRole("button", { name: "Sign In" }).click();

            await expect(page.getByRole("button", { name: "Create your first board" })).toBeVisible({
                timeout: ACTION_TIMEOUT_MS,
            });
        });
    });
});
