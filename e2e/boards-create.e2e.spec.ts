import { randomUUID } from "node:crypto";

import { expect, isServerActionPost, test } from "./quality-fixtures";
import { readBoardFull, seedAccount } from "./seed";
import { ROUTE } from "../src/lib/core/routing/routes";

/** How long the fan-out's own POST is parked — long enough that a re-coupled navigate would visibly stall past `NAVIGATE_TIMEOUT_MS`. */
const COLUMN_FAN_OUT_HOLD_MS = 6000;

/*
 * The budget the navigate AND the optimistic paint must both land inside — comfortably under
 * `COLUMN_FAN_OUT_HOLD_MS` (a re-coupled navigate cannot land this fast) yet wide enough to absorb
 * local contention (naturally lands in ~300-900ms isolated; 2500ms flaked once under `pnpm verify`).
 */
const NAVIGATE_TIMEOUT_MS = 4000;

/*
 * BOARD-02 against the real deployed nonprod backend: a board created from the sidebar, with the
 * columns typed, appears immediately without a reload — structural, business-level assertions only,
 * no validation copy or microcopy (docs/adr/tech/0022).
 */
test.describe("BOARD-02: create a board", () => {
    test("creates a board with its named columns in order and lists each new board in the sidebar", async ({
        page,
    }) => {
        // Arrange — one curl-seeded account; a second would exceed the backend's 2-session cap.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const boardName = `E2E Create ${suffix}`;

        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        /*
         * Armed BEFORE the submit — the fan-out now fires from `BoardView`'s own mount effect, not
         * synchronously with the navigate, so a backend read issued right after the URL moves can
         * outrun it. A wait created afterwards races the response it waits for.
         */
        const fanOutResponse = page.waitForResponse(
            (response) =>
                isServerActionPost(response.request()) && (response.request().postData() ?? "").includes("Todo"),
        );

        // Act — the form opens with no rows; add two and name both.
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(boardName);
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column 1", { exact: true }).fill("Todo");
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column 2", { exact: true }).fill("Doing");
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Assert — navigated to the new board, which is in the sidebar with no reload.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));
        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await expect(sidebar.getByRole("link", { name: boardName })).toBeVisible();
        await fanOutResponse;

        // Assert — exactly the two named rows became columns, in the order typed, once persisted.
        const boardId = new URL(page.url()).pathname.split("/").pop() ?? "";
        const created = readBoardFull({ account, boardId });
        expect(created.columns.map((column) => column.name)).toEqual(["Todo", "Doing"]);
        expect(created.columns.map((column) => column.position)).toEqual([0, 1]);

        /*
         * Act — a second board with no columns, which now needs no cleanup: the form seeds no rows,
         * because a blank one blocks the submit. The name must differ: the backend refuses a
         * duplicate with 409 DUPLICATE_RESOURCE — see 02-10-SUMMARY.md.
         */
        const secondBoardName = `E2E Create Later ${suffix}`;
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(secondBoardName);
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        /*
         * Assert — both boards are listed, in no asserted order: `GET /boards` exposes no
         * createdAt and takes no sort parameter, so the newest-first is unguaranteed
         * (deferred-items.md, 02-10). Asserting it produced a real order-dependent flake.
         */
        await expect(sidebar.getByRole("link")).toHaveCount(2);
        await expect(sidebar.getByRole("link", { name: secondBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link", { name: boardName })).toBeVisible();

        /*
         * The sidebar now settles off the optimistic cache write, which lands BEFORE the client
         * navigation (tech/0030) — so the new board's URL has to be waited on, not assumed from the
         * assertions above. Without this the id read below is still the first board's.
         */
        await expect(page).not.toHaveURL(new RegExp(`${ROUTE.BOARDS}/${boardId}$`));
        const secondBoardId = new URL(page.url()).pathname.split("/").pop() ?? "";
        expect(readBoardFull({ account, boardId: secondBoardId }).columns).toEqual([]);
    });
});

// comment-length-exempt: records the measured mechanism this case pins, since the assertion shape otherwise reads as an arbitrary pair of timeouts
/*
 * BOARD-02's fan-out, made optimistic (docs/adr/tech/0030). Measured live: firing the columns
 * fan-out concurrently with `router.push()` stalled the WHOLE navigation — no URL change, no
 * skeleton, nothing — until the fan-out settled, because both shared Next's one pending-transition
 * commit. The fix moved the fan-out to `BoardView`'s own mount effect, so this proves BOTH halves
 * together: the navigate lands fast regardless of the fan-out's own timing, AND the typed columns
 * are already on screen, under client-generated ids, the instant it does — not once the (held)
 * fan-out resolves.
 */
test.describe("BOARD-02: create a board — optimistic columns", () => {
    test("navigates fast and paints the typed columns immediately, while the fan-out is still held", async ({
        page,
    }) => {
        // Arrange
        const account = seedAccount();
        const boardSuffix = randomUUID().slice(0, 8);
        const columnSuffix = randomUUID().slice(0, 8);
        const boardName = `E2E Optimistic Board ${boardSuffix}`;
        const columnNames = ["Alpha", "Beta", "Gamma"].map((label) => `${label} Col ${columnSuffix}`);

        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        /*
         * Holds only the fan-out's own POST — discriminated by its body carrying the FIRST typed
         * column name, mirroring `tasks-create.e2e.spec.ts`'s own discrimination of the subtask
         * fan-out from every other Server Action POST to the same URL.
         */
        await page.route("**/*", async (route, request) => {
            const matched = isServerActionPost(request) && (request.postData() ?? "").includes(columnNames[0]);
            if (matched) {
                await new Promise((resolve) => setTimeout(resolve, COLUMN_FAN_OUT_HOLD_MS));
            }

            await route.continue();
        });

        /* Armed BEFORE the submit — a wait created afterwards races the response it waits for. */
        const fanOutResponse = page.waitForResponse(
            (response) =>
                isServerActionPost(response.request()) &&
                (response.request().postData() ?? "").includes(columnNames[0]),
        );

        // Act
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(boardName);
        for (const [index, name] of columnNames.entries()) {
            await page.getByRole("button", { name: "+ Add New Column" }).click();
            await page.getByLabel(`Column ${String(index + 1)}`, { exact: true }).fill(name);
        }
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Assert — the navigate lands fast, well inside the fan-out's own held window.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`), { timeout: NAVIGATE_TIMEOUT_MS });

        // Assert — the three typed columns are already on screen, WHILE the fan-out is still held.
        const columnHeadings = page.getByRole("region").getByRole("heading", { level: 2 });
        await expect(columnHeadings).toHaveText(
            columnNames.map((name) => `${name} (0)`),
            { timeout: NAVIGATE_TIMEOUT_MS },
        );

        // Assert — OPT-01: a placeholder column names nothing upstream yet, so its own controls refuse.
        const firstColumnActions = page.getByRole("button", { name: `Column actions for ${columnNames[0]}` });
        await expect(firstColumnActions).toBeDisabled();

        // Act — the hold elapses on its own; wait for the real response and let the app settle.
        await fanOutResponse;
        await expect(firstColumnActions).toBeEnabled({ timeout: COLUMN_FAN_OUT_HOLD_MS });

        // Assert — reload, and the three columns persisted, still in the order typed.
        await page.reload();
        await expect(columnHeadings).toHaveText(columnNames.map((name) => `${name} (0)`));
        const boardId = new URL(page.url()).pathname.split("/").pop() ?? "";
        const created = readBoardFull({ account, boardId });
        expect(created.columns.map((column) => column.name)).toEqual(columnNames);
    });
});
