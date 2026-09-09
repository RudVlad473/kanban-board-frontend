import { randomUUID } from "node:crypto";

import { expect, test } from "./quality-fixtures";
import { seedAccount, seedBoard, seedColumn } from "./seed";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records the seeding order this spec's assertions depend on and what it deliberately leaves to the composed-story tests (docs/adr/tech/0023)
/*
 * BOARD-05 against the real deployed nonprod backend: a board deleted from its sidebar overflow
 * menu, the cascade proved to have persisted across a reload, and both of the destination
 * branches — happy paths only, structural assertions only, no confirmation wording or toast copy
 * (docs/adr/tech/0022; those are covered by delete-board-confirm.test.tsx and board-list.test.tsx).
 * One curl-seeded account throughout: a second would exceed the backend's 2-session cap. Boards are
 * seeded oldest-first and the sidebar renders newest-first, so the SECOND board seeded here
 * is the one D-11 auto-selects at sign-in and the one the first delete lands on.
 */
test.describe("BOARD-05: delete a board", () => {
    test("deletes a board with its columns, moves to the remaining board, then to the empty state", async ({
        page,
    }) => {
        // Arrange — one account, two boards; the older one carries columns so the cascade has scope.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const doomedName = `E2E Doomed ${suffix}`;
        const survivorName = `E2E Survivor ${suffix}`;
        const doomed = seedBoard({ account, name: doomedName });
        seedColumn({ account, boardId: doomed.id, name: "Todo" });
        seedColumn({ account, boardId: doomed.id, name: "Doing" });
        const survivor = seedBoard({ account, name: survivorName });

        // Arrange — sign in through the real form.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        // Arrange — open the board that is about to be deleted, so the move branch is the one taken.
        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await sidebar.getByRole("link", { name: doomedName }).click();
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(doomed.id)}$`));
        await expect(page.getByRole("heading", { name: /^todo \(0\)$/i })).toBeVisible();

        // Act — delete it from its own row's overflow menu, confirming in the modal that opens.
        await sidebar.getByRole("button", { name: `Board actions for ${doomedName}` }).click();
        await page.getByRole("menuitem", { name: "Delete Board" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Delete Board" }).click();

        // Assert — gone from the sidebar, and the app moved to the remaining board with the URL to match.
        await expect(sidebar.getByRole("link", { name: doomedName })).toBeHidden();
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(survivor.id)}$`));
        await expect(page.getByRole("heading", { level: 1, name: survivorName })).toBeVisible();

        // Act — reload, so nothing on screen can be standing in for the server's own state.
        await page.reload();

        // Assert — the cascade persisted: the board is still gone and its columns did not come back.
        await expect(sidebar.getByRole("link", { name: doomedName })).toBeHidden();
        await expect(sidebar.getByRole("link", { name: survivorName })).toBeVisible();
        await expect(page.getByRole("heading", { name: /^todo \(0\)$/i })).toBeHidden();

        // Act — delete the last remaining board, which is also the one now open.
        await sidebar.getByRole("button", { name: `Board actions for ${survivorName}` }).click();
        await page.getByRole("menuitem", { name: "Delete Board" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Delete Board" }).click();

        // Assert — the other branch: the zero-boards empty state, at the board-list route.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByText("Create a new board to get started.")).toBeVisible();
        await expect(page.getByRole("button", { name: "Create your first board" })).toBeVisible();
    });
});

// comment-length-exempt: records what this case pins now that the delete issues no navigation request at all, why the (now inert) RSC hold is deliberately kept, and the measured history the assertions descend from
/*
 * The delete moves the URL through `window.history.replaceState`, which issues no request and
 * updates `usePathname()` in the same commit as the boards-list cache write beside it — so the
 * header title, the board body and the address bar can never disagree about which board is open.
 * This case pins that as DIRECT reads at the sync point below.
 *
 * History: until 260908-g61 the URL moved through `router.replace`, whose own `replaceState` runs
 * from a `useInsertionEffect` on the next router state. That left readers resolving the deleted id
 * — measured 151ms-819ms of blank `<h1>` beside the doomed board's own column (260907-q83), and a
 * further 247ms (production build) where the address alone still named it (260908-g61).
 *
 * The `optimisticRoute` hold now delays NOTHING on this path: 260908-g61 measured zero `rsc`
 * requests after the confirm click, on both a dev server and a production build. It is kept
 * deliberately — a change that reintroduces a request-carrying navigation here would be widened by
 * it and caught, which is exactly the regression this case exists for. It matches the `rsc` header
 * rather than the default Server-Action match because the delete's own POST must stay unheld, or
 * the mutation itself would never settle.
 */
test.describe("board-delete stranding window", () => {
    test("never shows the deleted board's content or a blank header title while the destination is still loading", async ({
        page,
        optimisticRoute,
    }) => {
        // Arrange — one account, two boards; the doomed one carries a column unique enough to assert on by name.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const doomedName = `E2E Strand Doomed ${suffix}`;
        const survivorName = `E2E Strand Survivor ${suffix}`;
        const doomed = seedBoard({ account, name: doomedName });
        seedColumn({ account, boardId: doomed.id, name: "Strandcol" });
        const survivor = seedBoard({ account, name: survivorName });

        // Arrange — sign in, then open the board that is about to be deleted.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await sidebar.getByRole("link", { name: doomedName }).click();
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(doomed.id)}$`));
        const doomedColumnHeading = page.getByRole("heading", { name: /^strandcol \(0\)$/i });
        await expect(doomedColumnHeading).toBeVisible();

        // Arrange — open the menu and the confirm dialog BEFORE the hold, so opening them is never held.
        await sidebar.getByRole("button", { name: `Board actions for ${doomedName}` }).click();
        await page.getByRole("menuitem", { name: "Delete Board" }).click();
        const confirmButton = page.getByRole("dialog").getByRole("button", { name: "Delete Board" });
        await expect(confirmButton).toBeVisible();

        // Arrange — widen the navigation's own round trip; the delete's own Server Action is untouched.
        await optimisticRoute({
            urlPattern: "**/*",
            delayMs: 3000,
            match: (request) => "rsc" in request.headers(),
        });

        // Act — the confirm click itself.
        await confirmButton.click();

        /*
         * Sync point, not the assertion: the sidebar row leaves the instant `onMutate` lands. A
         * polling `toBeHidden()`/`toBeVisible()` on the symptoms below would pass the moment the RSC
         * hold releases instead — DIRECT reads pin it (`boards-switch.e2e.spec.ts`'s own note on this).
         */
        await expect(sidebar.getByRole("link", { name: doomedName })).toBeHidden();

        // Assert — the mechanism, taken as direct reads while the destination's RSC response is still held open.
        const headerHeadingCount = await page.locator("h1").count();
        const headerText = headerHeadingCount > 0 ? await page.locator("h1").first().textContent() : null;
        const doomedColumnVisible = await doomedColumnHeading.isVisible();

        expect(headerText?.trim()).toBe(survivorName);
        expect(doomedColumnVisible).toBe(false);

        // Assert — the destination still lands once the hold releases.
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(survivor.id)}$`));
        await expect(page.getByRole("heading", { level: 1, name: survivorName })).toBeVisible();
    });
});
