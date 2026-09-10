import { randomUUID } from "node:crypto";

import { type Locator, type Page } from "@playwright/test";

import { expect, isServerActionPost, test } from "./quality-fixtures";
import { readBoardFull, seedAccount, seedBoard, seedColumn, type SeededAccount } from "./seed";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

/** How long the fan-out's own POST is parked — long enough that a re-coupled navigate would visibly stall past `NAVIGATE_TIMEOUT_MS`. */
const COLUMN_FAN_OUT_HOLD_MS = 6000;

/*
 * The budget the navigate AND the optimistic paint must both land inside — comfortably under
 * `COLUMN_FAN_OUT_HOLD_MS` (a re-coupled navigate cannot land this fast) yet wide enough to absorb
 * local contention (naturally lands in ~300-900ms isolated; 2500ms flaked once under `pnpm verify`).
 */
const NAVIGATE_TIMEOUT_MS = 4000;

/** The zero-boards screen's own body copy — the thing that must not be on screen beside a board. */
const ZERO_BOARDS_COPY = "Create a new board to get started.";

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

        // comment-length-exempt: records why a second wait is needed where the URL alone used to be the settle signal, which is the 404 a reader would otherwise reintroduce
        /*
         * TWO waits, not one. The URL moves at SUBMIT now (260908-g5z), so it names the new board
         * while the server has never heard of it — reading the board back off it races the create
         * and 404s (measured 2026-09-08 on a dev server). The row's own unconfirmed marker is the
         * signal that the create has actually landed, and the URL wait still rules out reading the
         * FIRST board's id.
         */
        await expect(sidebar.getByRole("link", { name: secondBoardName })).not.toHaveAttribute("aria-disabled", "true");
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

/** How long the BOARD's own POST is parked — long enough that a navigate waiting on it could not land inside the budget below. */
const CREATE_HOLD_MS = 5000;

/*
 * The budget the URL, the title and the typed columns must ALL land inside. Far under
 * `CREATE_HOLD_MS`, so anything gated on the create's own response fails it by construction.
 */
const INSTANT_CREATE_BUDGET_MS = 1500;

/** A Server Action POSTs to the page's own URL, so this covers every one of them and no static asset — an everything-glob slows a dev-server run by intercepting each chunk. */
const BOARD_ROUTE_GLOB = "**/boards/**";

const signIn = async ({ page, account }: { page: Page; account: SeededAccount }): Promise<void> => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    /* An account holding a seeded board lands on that board, not on the list route. */
    await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}(/[^/]+)?$`));
};

// comment-length-exempt: records why a bespoke sampler is used where the harness already ships a flicker instrument, which a reader would otherwise read as an unchecked reinvention
/**
 * Whether the skeleton or the empty-board copy was ever PAINTED during the window.
 *
 * `flickerTracker` counts `MutationRecord`s per selector and cannot answer "was this element on
 * screen at any instant", which is the whole assertion here. One sample per animation frame is the
 * granularity of "painted": anything the browser drew, this saw.
 */
const sampleBoardArea = ({
    page,
    windowMs,
}: {
    page: Page;
    windowMs: number;
}): Promise<{ skeleton: boolean; emptyCopy: boolean }> =>
    page.evaluate(async (deadlineMs) => {
        const seen = { skeleton: false, emptyCopy: false };
        const deadline = Date.now() + deadlineMs;

        while (Date.now() < deadline) {
            if (document.querySelector('[data-testid="board-view-skeleton"]')) seen.skeleton = true;
            if (document.body.textContent.includes("This board is empty")) seen.emptyCopy = true;
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        return seen;
    }, windowMs);

// comment-length-exempt: records the two stacked gaps this case pins and the held POST that makes them observable, neither of which the assertions state on their own
/*
 * BOARD-02's navigation, made optimistic. The board's OWN create POST is held, so every assertion
 * below is made against a board the server has not created yet: the URL is the new board's, the
 * header names it, and the typed columns are on screen as placeholders — none of which can come
 * from a response that has not arrived. The sampler covers the second gap the recording showed:
 * neither the skeleton nor the empty-board copy is painted at any instant of that window.
 */
test.describe("BOARD-02: create a board — optimistic navigation", () => {
    test("moves the URL and paints the new board with its typed columns while the create is still held", async ({
        page,
    }) => {
        // Arrange — an origin board to submit FROM, so "the URL moved" is distinguishable from "it never moved".
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const origin = seedBoard({ account, name: `E2E Origin ${suffix}` });
        /* The origin board needs a column of its own, or IT renders the empty-board copy the sampler below watches for. */
        seedColumn({ account, boardId: origin.id, name: `Origin Col ${suffix}` });
        const boardName = `E2E Instant Board ${suffix}`;
        const columnNames = ["Delta", "Epsilon"].map((label) => `${label} Col ${suffix}`);

        await signIn({ page, account });
        await page.goto(buildBoardDetailPath(origin.id));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(origin.name);

        /* Every Server Action body this page sends, so the assertion at the end can say which reads were NOT issued. */
        const actionBodies: string[] = [];
        page.on("request", (request) => {
            if (isServerActionPost(request)) actionBodies.push(request.postData() ?? "");
        });

        /* Holds the BOARD's own POST — discriminated by its body carrying the board name, which no other Server Action's does. */
        await page.route(BOARD_ROUTE_GLOB, async (route, request) => {
            if (isServerActionPost(request) && (request.postData() ?? "").includes(boardName)) {
                await new Promise((resolve) => setTimeout(resolve, CREATE_HOLD_MS));
            }

            await route.continue();
        });

        /* Armed BEFORE the submit — a wait created afterwards races the response it waits for. */
        const createResponse = page.waitForResponse(
            (response) =>
                isServerActionPost(response.request()) && (response.request().postData() ?? "").includes(boardName),
            { timeout: CREATE_HOLD_MS + 20_000 },
        );

        // Act
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(boardName);
        for (const [index, name] of columnNames.entries()) {
            await page.getByRole("button", { name: "+ Add New Column" }).click();
            await page.getByLabel(`Column ${String(index + 1)}`, { exact: true }).fill(name);
        }

        const boardArea = sampleBoardArea({ page, windowMs: INSTANT_CREATE_BUDGET_MS * 2 });
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Assert — the URL is a board path that is NOT the one submitted from, while the create is still held.
        await expect
            .poll(() => new URL(page.url()).pathname, { timeout: INSTANT_CREATE_BUDGET_MS })
            .toMatch(new RegExp(`^${ROUTE.BOARDS}/(?!${origin.id}$)[^/]+$`));

        // Assert — the header and both typed columns paint from cache inside the same budget.
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(boardName, {
            timeout: INSTANT_CREATE_BUDGET_MS,
        });
        const columnHeadings = page.getByRole("region").getByRole("heading", { level: 2 });
        await expect(columnHeadings).toHaveText(
            columnNames.map((name) => `${name} (0)`),
            { timeout: INSTANT_CREATE_BUDGET_MS },
        );

        // Assert — neither stand-in was painted at any instant of the window.
        expect(await boardArea).toEqual({ skeleton: false, emptyCopy: false });

        // Act — let the hold elapse, so the settle-gated fan-out dispatches against a board that now exists.
        await createResponse;
        await expect(page.getByRole("button", { name: `Column actions for ${columnNames[0]}` })).toBeEnabled({
            timeout: CREATE_HOLD_MS + 15_000,
        });

        // Assert — the board and both columns really persisted, in the order typed.
        const boardId = new URL(page.url()).pathname.split("/").pop() ?? "";
        const created = readBoardFull({ account, boardId });
        expect(created.columns.map((column) => column.name)).toEqual(columnNames);

        // comment-length-exempt: records the race this absence closes and the exact wire shape it is matched on, neither of which the one-line filter carries
        /*
         * Assert — BOARD-04's per-switch revalidation was SKIPPED for this board. `getBoardAction`'s
         * body is the boardId ALONE, which is what distinguishes it from the fan-out's. Issued, its
         * accurate-but-momentarily-stale zero-column answer overwrites the placeholders the fan-out
         * staged — the ~100-300ms empty/column oscillation `.planning/debug/board-create-optimistic.md`
         * measured. There is nothing on the server to revalidate against for a board this client minted.
         */
        expect(actionBodies.filter((body) => body.includes(`[{"boardId":"${boardId}"}]`))).toEqual([]);
    });
});

/** How long a doomed create is held before it is refused — long enough to click a different board first. */
const REFUSED_CREATE_HOLD_MS = 1500;

/** How long the recorder below keeps running AFTER the failure lands, so a late toast is caught rather than merely not-yet-arrived. */
const LATE_TOAST_GRACE_MS = 2500;

/** Scoped to the notifications region, mirroring `tasks-conflict.e2e.spec.ts`'s own toast query shape. */
const toasts = (page: Page): Locator => page.getByRole("region", { name: "Notifications" }).getByRole("dialog");

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmenting the global Window interface via declaration merging requires `interface`; `type` cannot merge
    interface Window {
        __g5zToastLog?: string[];
    }
}

// comment-length-exempt: records the auto-dismiss that makes a retrying absence assertion useless here, and the blocking that rules out a long in-page poll — the two traps this recorder designs out
/**
 * Records every toast text that EVER appears, from install until it is read back.
 *
 * A retrying `toHaveCount(0)` cannot express "never appeared": the column-failure toast
 * auto-dismisses, so the poll simply waits for it to leave and then passes (measured 2026-09-08,
 * with the toast on screen throughout the assertion that reported its absence). A long-running
 * `page.evaluate` poll cannot express it either — it blocks the very click it is meant to observe,
 * so the log fills with the still-open modal (measured the same day). An install-then-read-back
 * observer, the shape `flickerTracker` already uses, is the only one that does.
 */
const installToastRecorder = (page: Page): Promise<void> =>
    page.evaluate(() => {
        const log: string[] = [];
        window.__g5zToastLog = log;

        const record = (): void => {
            for (const dialog of document.querySelectorAll('[role="dialog"]')) {
                const text = dialog.textContent;
                if (!log.includes(text)) log.push(text);
            }
        };

        record();
        new MutationObserver(record).observe(document.body, { childList: true, subtree: true, characterData: true });
    });

const readToastRecorder = (page: Page): Promise<string[]> => page.evaluate(() => window.__g5zToastLog ?? []);

/** What `buildColumnFailureTitle` produces, whatever the count — the toast that must NOT appear beside the board's own. */
const COLUMN_FAILURE_TITLE_PATTERN = /Couldn't create \d+ column\(s\)\./;

// comment-length-exempt: records why the refusal is provoked through the backend's own rule rather than at the network, which reads as a needlessly elaborate arrangement otherwise
/*
 * The refusal both cases below provoke: a name already taken, which the backend answers `409
 * DUPLICATE_RESOURCE` for. A real refusal travelling the real path, rather than an aborted request
 * — Next's action client recovers from a network-level failure with its own hard navigation, which
 * reset the URL and wiped the toasts, i.e. it faked the very outcome under test (measured 2026-09-08).
 */
const DUPLICATE_FAILURE_TITLE = "A board with that name already exists.";

// comment-length-exempt: records the two independent promises this case pins and why the absence assertion is the load-bearing half, neither of which the assertions state on their own
/*
 * The other half of the optimistic navigate: a create that is REFUSED must undo the move it made.
 *
 * The absence assertion is the one that earns this case. Without it the test passes while the user
 * gets two toasts for one failure — the board's own, plus a column-failure toast for placeholders
 * whose board never existed — which is exactly what the fan-out did before it could tell the two
 * apart.
 */
test.describe("BOARD-02: create a board — a refused create", () => {
    test("rolls the URL back to the path submitted from, with one toast and no column toast beside it", async ({
        page,
    }) => {
        // Arrange — the name is already taken, so the create is refused by the backend's own rule.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const origin = seedBoard({ account, name: `E2E Refuse Origin ${suffix}` });
        const boardName = `E2E Refused Board ${suffix}`;
        const taken = seedBoard({ account, name: boardName });

        await signIn({ page, account });
        await page.goto(buildBoardDetailPath(origin.id));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(origin.name);

        // comment-length-exempt: records the race the hold removes, which reads as an arbitrary delay on a request the case only wants refused
        /*
         * Held, then allowed through to its real refusal. Without the hold the 409 can land before
         * `BoardView` has mounted, in which case the fan-out is never even claimed and the absence
         * assertion below passes for the wrong reason — the race, not the fix.
         */
        await page.route(BOARD_ROUTE_GLOB, async (route, request) => {
            if (isServerActionPost(request) && (request.postData() ?? "").includes(boardName)) {
                await new Promise((resolve) => setTimeout(resolve, REFUSED_CREATE_HOLD_MS));
            }

            await route.continue();
        });

        // Act — one column row typed, so the fan-out is claimed and the path under test is the real one.
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(boardName);
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column 1", { exact: true }).fill(`Doomed Col ${suffix}`);
        await installToastRecorder(page);
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Assert — the board's own failure toast, carrying the Retry that reopens the modal prefilled.
        const boardFailureToast = toasts(page).filter({ hasText: DUPLICATE_FAILURE_TITLE });
        await expect(boardFailureToast).toBeVisible({ timeout: REFUSED_CREATE_HOLD_MS + 12_000 });
        await expect(boardFailureToast.getByRole("button", { name: "Retry" })).toBeVisible();

        // Assert — ONE failure, ONE toast: no column-failure toast appeared at any instant, then or later.
        await page.waitForTimeout(LATE_TOAST_GRACE_MS);
        expect((await readToastRecorder(page)).filter((text) => COLUMN_FAILURE_TITLE_PATTERN.test(text))).toEqual([]);

        // Assert — the user is back where they submitted from.
        expect(new URL(page.url()).pathname).toBe(buildBoardDetailPath(origin.id));

        /* One row of that name, and it is the one that really exists — the optimistic row under the minted id is gone. */
        const rowsWithThatName = page
            .getByRole("navigation", { name: "Boards" })
            .getByRole("link", { name: boardName });
        await expect(rowsWithThatName).toHaveCount(1);
        await expect(rowsWithThatName).toHaveAttribute("href", buildBoardDetailPath(taken.id));
    });

    /*
     * The guard on that rollback: a user who chose another board mid-flight keeps it. Yanking someone
     * out of a board they deliberately opened is worse than the stale entry the rollback removes.
     */
    test("leaves a user who navigated away mid-flight where they chose to be", async ({ page }) => {
        // Arrange
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const origin = seedBoard({ account, name: `E2E Away Origin ${suffix}` });
        const destination = seedBoard({ account, name: `E2E Away Destination ${suffix}` });
        const boardName = `E2E Away Board ${suffix}`;
        const taken = seedBoard({ account, name: boardName });

        await signIn({ page, account });
        await page.goto(buildBoardDetailPath(origin.id));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(origin.name);

        /* Held, then allowed through to its real refusal — the hold is the window in which the user chooses somewhere else to be. */
        await page.route(BOARD_ROUTE_GLOB, async (route, request) => {
            if (isServerActionPost(request) && (request.postData() ?? "").includes(boardName)) {
                await new Promise((resolve) => setTimeout(resolve, REFUSED_CREATE_HOLD_MS));
            }

            await route.continue();
        });

        // Act
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(boardName);
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column 1", { exact: true }).fill(`Doomed Col ${suffix}`);
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Act — the user picks a different board while the create is still in the air.
        await page.getByRole("navigation", { name: "Boards" }).getByRole("link", { name: destination.name }).click();
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(destination.id)}$`));

        // Assert — the failure still reports itself, and still removes its row.
        await expect(toasts(page).filter({ hasText: DUPLICATE_FAILURE_TITLE })).toBeVisible({
            timeout: REFUSED_CREATE_HOLD_MS + 10_000,
        });
        const rowsWithThatName = page
            .getByRole("navigation", { name: "Boards" })
            .getByRole("link", { name: boardName });
        await expect(rowsWithThatName).toHaveCount(1);
        await expect(rowsWithThatName).toHaveAttribute("href", buildBoardDetailPath(taken.id));

        // Assert — and it leaves the user exactly where they chose to be, not where they submitted from.
        await page.waitForTimeout(2000);
        expect(new URL(page.url()).pathname).toBe(buildBoardDetailPath(destination.id));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(destination.name);
    });
});

// comment-length-exempt: records the mechanism that put two screens on at once and why the assertion may not be a retrying one, neither of which is readable from the two lines it holds
/*
 * The FIRST board, created from the zero-boards screen — reported in production 2026-09-10 as the
 * new board and "Create a new board to get started." on screen together for over a second.
 *
 * The create moves the URL with `history.pushState`, which repaints the layout's `BoardScreen` out
 * of the optimistic entry but re-renders no server segment, so the index route's markup stays
 * mounted until the action's `refresh()` lands. The count below is deliberately NOT a retrying
 * `expect().toHaveCount(0)`: that would pass on the defect by simply waiting out the refresh. It
 * is read once, at the instant the URL says a board is open.
 */
test.describe("BOARD-02: create the first board", () => {
    test("retires the zero-boards screen in the same commit the board opens", async ({ page }) => {
        // Arrange — an account with nothing, which lands on the zero-boards screen.
        const account = seedAccount();
        const boardName = `E2E First ${randomUUID().slice(0, 8)}`;

        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByText(ZERO_BOARDS_COPY)).toBeVisible();

        // Act — the screen's own call to action, not the sidebar's.
        await page.getByRole("button", { name: "Create your first board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(boardName);
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column 1", { exact: true }).fill("Todo");
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Assert — read once, the moment the URL names the new board.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));
        expect(await page.getByText(ZERO_BOARDS_COPY).count()).toBe(0);

        // Assert — and the board itself is what is on screen, not an empty frame.
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(boardName);
        await expect(page.getByText(ZERO_BOARDS_COPY)).toHaveCount(0);
    });
});
