import { randomUUID } from "node:crypto";

import { type Page, type Request } from "@playwright/test";

import { expect, test } from "./quality-fixtures";
import { seedAccount, seedBoard, seedColumn, seedTask, updateTaskOutOfBand } from "./seed";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records the observable this spec is built around and the cheaper assertion it deliberately rejects, which is the whole reason it is shaped this way
/*
 * BOARD-04: a board switch paints from what was already loaded, then swaps in the fresh read.
 *
 * Asserted against a DIVERGENCE deliberately introduced between the two — the task is renamed
 * out-of-band after the app has loaded every board, so "the already-loaded board" and "the fresh
 * board" carry different text and one assertion can say which is on screen. A timing-only check
 * (no skeleton, arrived fast) cannot distinguish them: a warm route cache looks identical.
 */

/** How long every read is held open, so a paint that beats it cannot have come from the server. */
const SERVER_HOLD_MS = 3000;

/** The budget the already-loaded paint must land inside — far under `SERVER_HOLD_MS`. */
const INSTANT_PAINT_BUDGET_MS = 1500;

/*
 * A Server Action POSTs to the URL the browser is on, so a board read issued from a DIFFERENT
 * board is one of these — which is what makes "the app loaded a board it never showed" observable.
 */
const isServerActionPost = (request: Request): boolean =>
    request.method() === "POST" && "next-action" in request.headers();

// comment-length-exempt: records the listener-placement mistake that makes this spec silently report a working feature as absent
/*
 * Counts background reads issued FROM a board — matched on the URL a Server Action posts to, which
 * is the page the browser is on. Attached before the first board is opened, because the reads this
 * exists to observe are issued by that very page load; a listener attached afterwards sees none of
 * them and reports a working prefetch as absent.
 */
const countBoardReads = (page: Page): { total: () => number } => {
    let total = 0;

    page.on("request", (request) => {
        if (isServerActionPost(request) && request.url().includes(`${ROUTE.BOARDS}/`)) {
            total += 1;
        }
    });

    return { total: () => total };
};

/** Holds every read the app issues, so only something already in the browser can paint. */
const holdEveryRead = async (page: Page): Promise<void> => {
    await page.route("**/*", async (route, request) => {
        if (isServerActionPost(request) || "rsc" in request.headers()) {
            await new Promise((resolve) => setTimeout(resolve, SERVER_HOLD_MS));
        }

        await route.continue();
    });
};

test.describe("BOARD-04: switching boards shows the loaded board immediately", () => {
    test("paints the already-loaded board on switch, then replaces it with the fresh read", async ({ page }) => {
        // Arrange — two boards; the second holds the one task whose text distinguishes the two reads.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const boardA = seedBoard({ account, name: `E2E Switch A ${suffix}` });
        seedColumn({ account, boardId: boardA.id, name: "Alpha" });
        const boardB = seedBoard({ account, name: `E2E Switch B ${suffix}` });
        const columnB = seedColumn({ account, boardId: boardB.id, name: "Beta" });
        const task = seedTask({ account, boardId: boardB.id, columnId: columnB.id, title: "Loaded at sign-in" });

        const skeleton = page.getByTestId("board-view-skeleton");
        const boardALink = page.getByRole("link", { name: `E2E Switch A ${suffix}` });
        const boardBLink = page.getByRole("link", { name: `E2E Switch B ${suffix}` });

        const reads = countBoardReads(page);

        // Act — sign in, then settle on board A so board B is the one that was never displayed.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        await page.goto(buildBoardDetailPath(boardA.id));
        await expect(page.getByRole("heading", { name: /^alpha \(0\)$/i })).toBeVisible();

        /*
         * Assert — every board is loaded while only board A is on screen. This is the precondition
         * the rest of the test rests on: without it, the paint below has nothing to come from.
         */
        await expect.poll(() => reads.total(), { timeout: 15_000 }).toBeGreaterThan(0);
        await page.waitForLoadState("networkidle");

        // Arrange — the server and the loaded copy now disagree, by exactly one task title.
        updateTaskOutOfBand({
            account,
            boardId: boardB.id,
            columnId: columnB.id,
            taskId: task.id,
            title: "Fetched on switch",
            version: task.version,
        });

        await holdEveryRead(page);

        // Act — the switch itself.
        await boardBLink.click();

        /*
         * Assert — the already-loaded board is on screen while the fresh read is still in flight,
         * so the user never waits on it. The stale title is the proof of which copy painted.
         */
        await expect(page.getByText("Loaded at sign-in")).toBeVisible({ timeout: INSTANT_PAINT_BUDGET_MS });
        await expect(page.getByRole("heading", { name: /^beta \(1\)$/i })).toBeVisible({
            timeout: INSTANT_PAINT_BUDGET_MS,
        });
        await expect(skeleton).toHaveCount(0);

        // Assert — the fresh read lands and replaces it, with no further interaction.
        await expect(page.getByText("Fetched on switch")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText("Loaded at sign-in")).toHaveCount(0);

        /*
         * Act/Assert — the same guarantee on a RETURN switch, which is the case the recording shows
         * blanking: by now every route has been navigated once, so a warm Next router-cache entry
         * can no longer be what paints, and only the app's own loaded copy can.
         */
        await boardALink.click();
        await expect(page.getByRole("heading", { name: /^alpha \(0\)$/i })).toBeVisible({
            timeout: INSTANT_PAINT_BUDGET_MS,
        });
        await expect(skeleton).toHaveCount(0);

        await boardBLink.click();
        await expect(page.getByRole("heading", { name: /^beta \(1\)$/i })).toBeVisible({
            timeout: INSTANT_PAINT_BUDGET_MS,
        });
        await expect(page.getByText("Fetched on switch")).toBeVisible({ timeout: INSTANT_PAINT_BUDGET_MS });
        await expect(skeleton).toHaveCount(0);
    });
});

test.describe("a board switch lands at the start of the column row", () => {
    test("resets the carried-over scroll offset when the destination board also overflows", async ({ page }) => {
        // Arrange — two boards, five columns each, so both overflow the viewport (fact 5).
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const boardA = seedBoard({ account, name: `E2E Scroll A ${suffix}` });
        const boardAColumnNames = ["A1", "A2", "A3", "A4", "A5"].map((label) => `${label} ${suffix}`);
        for (const name of boardAColumnNames) {
            seedColumn({ account, boardId: boardA.id, name });
        }
        const boardB = seedBoard({ account, name: `E2E Scroll B ${suffix}` });
        const boardBColumnNames = ["B1", "B2", "B3", "B4", "B5"].map((label) => `${label} ${suffix}`);
        for (const name of boardBColumnNames) {
            seedColumn({ account, boardId: boardB.id, name });
        }

        const boardBLink = page.getByRole("link", { name: `E2E Scroll B ${suffix}` });

        // Act — sign in, then land on board A.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        await page.goto(buildBoardDetailPath(boardA.id));
        await expect(
            page.getByRole("heading", { name: new RegExp(`^${boardAColumnNames[0]} \\(0\\)$`, "i") }),
        ).toBeVisible();

        const scrollRow = page.getByTestId("board-columns-scroll");

        // Assert — board A's row genuinely overflows, or scrolling it to 400 proves nothing.
        await expect.poll(() => scrollRow.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(400);

        // Act — scroll board A's row, and wait for the (scroll-smooth) write to actually land.
        await scrollRow.evaluate((el) => {
            el.scrollLeft = 400;
        });
        await expect.poll(() => scrollRow.evaluate((el) => el.scrollLeft)).toBe(400);

        // Act — the switch itself.
        await boardBLink.click();
        await expect(
            page.getByRole("heading", { name: new RegExp(`^${boardBColumnNames[0]} \\(0\\)$`, "i") }),
        ).toBeVisible();

        // Assert — board B's row also overflows, or a clamped-to-zero row would pass for the wrong reason.
        await expect.poll(() => scrollRow.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(400);

        // Assert — the new board's row starts at 0, not carrying board A's offset (direct reads, not polls).
        expect(await scrollRow.evaluate((el) => el.scrollLeft)).toBe(0);

        // Assert — still 0 once the switch's own fresh read has landed, so a later re-render didn't restore it.
        await page.waitForLoadState("networkidle");
        expect(await scrollRow.evaluate((el) => el.scrollLeft)).toBe(0);
    });
});

/** One committed-DOM reading of `<main>`'s two board-area testids, taken from inside the browser. */
type StackedAreaSample = { skeleton: boolean; board: boolean; height: number };

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmenting the global Window interface via declaration merging requires `interface`; `type` cannot merge
    interface Window {
        __stackedBoardAreaSamples?: StackedAreaSample[];
        __stackedBoardAreaObserver?: MutationObserver;
    }
}

// comment-length-exempt: records what this case asserts and, as a segregated falsifiable note, the one thing it deliberately does not hold
/*
 * Asserts that no COMMITTED DOM state during a board switch has `<main>` holding a
 * `board-view-skeleton` beside a `board-columns-scroll`, and that the scroll container's height
 * never drops below 90% of its pre-switch baseline. A `MutationObserver` on `<main>` (both testids
 * are direct children — fact 7) records every committed childList change, because
 * `expect(...).toHaveCount(0)` polls and is satisfied the instant the frame ends (fact 8) — it is
 * green today with the defect present and cannot pin this bug.
 *
 * NOT held: this is deterministic only GIVEN the switch actually suspends. If a future router
 * change stopped the `[boardId]` segment suspending at all, the vacuity guards below would fail
 * (catching a broken instrument) but a scenario where suspension itself disappears would not be
 * distinguished from a real fix — that gap is inherent to observing a transient commit, not a
 * weakness of this instrument.
 */
test.describe("a board switch never stacks two board areas", () => {
    test("never commits a skeleton beside the live board, and never halves its height", async ({ page }) => {
        // Arrange — two boards, five columns each, so the horizontal scrollbar genuinely exists (fact 10).
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const boardA = seedBoard({ account, name: `E2E Stack A ${suffix}` });
        const boardAColumnNames = ["SA1", "SA2", "SA3", "SA4", "SA5"].map((label) => `${label} ${suffix}`);
        for (const name of boardAColumnNames) {
            seedColumn({ account, boardId: boardA.id, name });
        }
        const boardB = seedBoard({ account, name: `E2E Stack B ${suffix}` });
        const boardBColumnNames = ["SB1", "SB2", "SB3", "SB4", "SB5"].map((label) => `${label} ${suffix}`);
        for (const name of boardBColumnNames) {
            seedColumn({ account, boardId: boardB.id, name });
        }

        const boardBLink = page.getByRole("link", { name: `E2E Stack B ${suffix}` });
        const scrollRow = page.getByTestId("board-columns-scroll");

        // Act — sign in, then land on board A.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        await page.goto(buildBoardDetailPath(boardA.id));
        await expect(
            page.getByRole("heading", { name: new RegExp(`^${boardAColumnNames[0]} \\(0\\)$`, "i") }),
        ).toBeVisible();

        // Assert — the baseline is a real laid-out height, or the 90%-of-baseline check below is trivially satisfiable.
        const baseline = await scrollRow.evaluate((el) => Math.round(el.getBoundingClientRect().height));
        expect(baseline).toBeGreaterThan(200);

        // Arrange — install the recorder on `<main>` before the switch, so it observes the whole transition.
        await page.evaluate(() => {
            const main = document.querySelector("main");
            if (!main) {
                return;
            }

            const samples: StackedAreaSample[] = [];
            window.__stackedBoardAreaSamples = samples;

            const readSample = (): StackedAreaSample => {
                const skeletonEl = main.querySelector('[data-testid="board-view-skeleton"]');
                const boardEl = main.querySelector('[data-testid="board-columns-scroll"]');
                /*
                 * Raw `=== null` checks, not `isNil`: this callback is serialized into the browser by
                 * `page.evaluate`, which cannot resolve the `es-toolkit` import from this module's scope.
                 */
                return {
                    // eslint-disable-next-line local/prefer-is-nil -- see comment above; querySelector never returns undefined here, but isNil isn't reachable in this browser-context closure
                    skeleton: skeletonEl !== null,
                    // eslint-disable-next-line local/prefer-is-nil -- see comment above
                    board: boardEl !== null,
                    // eslint-disable-next-line local/prefer-is-nil -- see comment above
                    height: boardEl === null ? 0 : Math.round(boardEl.getBoundingClientRect().height),
                };
            };

            const pushIfChanged = (sample: StackedAreaSample): void => {
                const previous = samples.at(-1);
                if (
                    previous?.skeleton !== sample.skeleton ||
                    previous.board !== sample.board ||
                    previous.height !== sample.height
                ) {
                    samples.push(sample);
                }
            };

            pushIfChanged(readSample());
            const observer = new MutationObserver(() => {
                pushIfChanged(readSample());
            });
            observer.observe(main, { childList: true });
            window.__stackedBoardAreaObserver = observer;
        });

        /*
         * Ladder rung 2 applied first per the plan's amendment: two independent reviewers needed a
         * delayed read to reproduce deterministically, because the default suspension window is one
         * frame wide. The hold widens the observation window; it does not weaken what is asserted.
         */
        await holdEveryRead(page);

        // Act — the switch itself.
        await boardBLink.click();
        await expect(
            page.getByRole("heading", { name: new RegExp(`^${boardBColumnNames[0]} \\(0\\)$`, "i") }),
        ).toBeVisible();
        await page.waitForLoadState("networkidle");

        const samples = await page.evaluate(() => {
            const recorded = window.__stackedBoardAreaSamples ?? [];
            window.__stackedBoardAreaObserver?.disconnect();
            return recorded;
        });

        // Assert — vacuity guards: a silently-uninstalled observer must fail here, not pass everything.
        expect(samples.length).toBeGreaterThan(0);
        expect(samples.some((sample) => sample.board)).toBe(true);

        // Assert — the mechanism: no committed sample ever holds both testids at once.
        expect(samples.filter((sample) => sample.skeleton && sample.board)).toEqual([]);

        // Assert — the user-visible symptom: the board area never collapses below 90% of its baseline.
        expect(samples.filter((sample) => sample.board && sample.height < baseline * 0.9)).toEqual([]);
    });
});
