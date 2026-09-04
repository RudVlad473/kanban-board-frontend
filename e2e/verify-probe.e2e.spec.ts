import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, seedTask, type SeededAccount, type SeededBoard } from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

const SIGN_IN_TIMEOUT_MS = 20_000;
const DRAG_MOVE_STEPS = 10;
const TASK_TITLE = "Probe Movable Task";
const DEST_TITLES = ["Probe Bravo One", "Probe Bravo Two", "Probe Bravo Three"];

const taskDragHandle = ({ page, title }: { page: Page; title: string }): Locator =>
    page.getByRole("button", { name: `Reorder ${title}` });

const columnSection = ({ page, name }: { page: Page; name: string }): Locator =>
    page.locator("section").filter({ has: page.getByRole("heading", { name: new RegExp(`^${name}`) }) });

const centerOf = async (locator: Locator): Promise<{ x: number; y: number }> => {
    const box = await locator.boundingBox();

    if (box === null) {
        throw new Error("no bounding box");
    }

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const readTaskTitlesInColumn = async ({ page, name }: { page: Page; name: string }): Promise<string[]> => {
    const texts = await columnSection({ page, name }).locator("li button span:first-child").allInnerTexts();

    return texts.filter((text) => text.length > 0);
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

const seedTwoColumns = ({
    destinationTasks,
}: {
    destinationTasks: string[];
}): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `Probe ${randomUUID().slice(0, 8)}` });
    const source = seedColumn({ account, boardId: board.id, name: "Alpha" });
    const destination = seedColumn({ account, boardId: board.id, name: "Bravo" });
    seedTask({ account, boardId: board.id, columnId: source.id, title: TASK_TITLE });

    for (const title of destinationTasks) {
        seedTask({ account, boardId: board.id, columnId: destination.id, title });
    }

    return { account, board };
};

const dragTo = async ({
    page,
    source,
    target,
}: {
    page: Page;
    source: { x: number; y: number };
    target: { x: number; y: number };
}) => {
    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    await page.mouse.move(source.x + 16, source.y, { steps: 4 });
    await page.mouse.move(target.x, target.y, { steps: DRAG_MOVE_STEPS });
};

/** Every fixed-position element on the page, which is where dnd-kit parks its drag overlay. */
const readFixedElements = (page: Page) =>
    page.evaluate(() =>
        Array.from(document.querySelectorAll("body *"))
            .filter((element) => getComputedStyle(element).position === "fixed")
            .map((element) => ({
                tag: element.tagName,
                text: (element.textContent ?? "").slice(0, 40),
                transform: getComputedStyle(element).transform,
                transition: getComputedStyle(element).transition,
            })),
    );

test.describe("probe", () => {
    test.setTimeout(90_000);

    for (const [label, offset] of [
        ["12px above the first card (header band)", -12],
        ["inside the first card's top half", 8],
    ] as const) {
        test(`claim1: drop ${label} lands first`, async ({ page }) => {
            const { account, board } = seedTwoColumns({ destinationTasks: DEST_TITLES });
            await signIn({ page, account, board });
            await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual(DEST_TITLES);

            const source = await centerOf(taskDragHandle({ page, title: TASK_TITLE }));
            const firstCardBox = await columnSection({ page, name: "Bravo" }).locator("li").first().boundingBox();

            if (firstCardBox === null) {
                throw new Error("no first card box");
            }

            const target = { x: firstCardBox.x + firstCardBox.width / 2, y: firstCardBox.y + offset };
            await dragTo({ page, source, target });
            const settled = createServerActionSettled(page);
            await page.mouse.up();

            await expect
                .poll(() => readTaskTitlesInColumn({ page, name: "Bravo" }))
                .toEqual([TASK_TITLE, ...DEST_TITLES]);
            await settled;
            await page.reload();
            await expect
                .poll(() => readTaskTitlesInColumn({ page, name: "Bravo" }))
                .toEqual([TASK_TITLE, ...DEST_TITLES]);
            await expect.poll(() => readTaskTitlesInColumn({ page, name: "Alpha" })).toEqual([]);
        });
    }

    test("claim1: drop below the last card lands last", async ({ page }) => {
        const { account, board } = seedTwoColumns({ destinationTasks: DEST_TITLES });
        await signIn({ page, account, board });
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual(DEST_TITLES);

        const source = await centerOf(taskDragHandle({ page, title: TASK_TITLE }));
        const lastCardBox = await columnSection({ page, name: "Bravo" }).locator("li").last().boundingBox();

        if (lastCardBox === null) {
            throw new Error("no last card box");
        }

        const target = { x: lastCardBox.x + lastCardBox.width / 2, y: lastCardBox.y + lastCardBox.height + 20 };
        await dragTo({ page, source, target });
        const settled = createServerActionSettled(page);
        await page.mouse.up();

        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual([...DEST_TITLES, TASK_TITLE]);
        await settled;
        await page.reload();
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual([...DEST_TITLES, TASK_TITLE]);
    });

    test("claim1: drop into an empty column still works", async ({ page }) => {
        const { account, board } = seedTwoColumns({ destinationTasks: [] });
        await signIn({ page, account, board });
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Alpha" })).toEqual([TASK_TITLE]);

        const source = await centerOf(taskDragHandle({ page, title: TASK_TITLE }));
        const target = await centerOf(columnSection({ page, name: "Bravo" }).locator("ul"));
        await dragTo({ page, source, target });
        const settled = createServerActionSettled(page);
        await page.mouse.up();

        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual([TASK_TITLE]);
        await settled;
        await page.reload();
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual([TASK_TITLE]);
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Alpha" })).toEqual([]);
    });

    test("claim2: within-column reorder settles clean on the drop frame", async ({ page }) => {
        const account = seedAccount();
        const board = seedBoard({ account, name: `Probe Reorder ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Alpha" });

        for (const title of DEST_TITLES) {
            seedTask({ account, boardId: board.id, columnId: column.id, title });
        }

        await signIn({ page, account, board });
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Alpha" })).toEqual(DEST_TITLES);

        const [first, second, third] = DEST_TITLES;
        const source = await centerOf(taskDragHandle({ page, title: first }));
        await dragTo({ page, source, target: { x: source.x, y: source.y + 150 } });
        await page.mouse.up();

        const settledStyles = await page.evaluate(() =>
            Array.from(document.querySelectorAll("section li")).map((item) => {
                const computed = getComputedStyle(item);

                return { transform: computed.transform, opacity: computed.opacity };
            }),
        );
        const overlaysOnDropFrame = await readFixedElements(page);

        console.log("DROP FRAME STYLES", JSON.stringify(settledStyles));
        console.log("DROP FRAME FIXED (task)", JSON.stringify(overlaysOnDropFrame));

        expect(settledStyles).toHaveLength(3);
        expect(settledStyles).toEqual([
            { transform: "none", opacity: "1" },
            { transform: "none", opacity: "1" },
            { transform: "none", opacity: "1" },
        ]);

        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Alpha" })).toEqual([second, first, third]);
        await page.waitForTimeout(3000);
        await page.reload();
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Alpha" })).toEqual([second, first, third]);
    });

    test("claim2: a column drag still animates its settle", async ({ page }) => {
        const account = seedAccount();
        const board = seedBoard({ account, name: `Probe Col ${randomUUID().slice(0, 8)}` });

        for (const name of ["Alpha", "Bravo", "Charlie"]) {
            seedColumn({ account, boardId: board.id, name });
        }

        await signIn({ page, account, board });
        const handle = page.getByRole("button", { name: /^Alpha \(0\)$/i });
        await expect(handle).toBeVisible();

        const source = await centerOf(handle);
        const targetHandle = page.getByRole("button", { name: /^Bravo \(0\)$/i });
        const target = await centerOf(targetHandle);
        await dragTo({ page, source, target });

        const duringDrag = await readFixedElements(page);
        console.log("DURING COLUMN DRAG FIXED", JSON.stringify(duringDrag));

        await page.mouse.up();
        const afterUp = await readFixedElements(page);
        console.log("AFTER COLUMN DROP FIXED", JSON.stringify(afterUp));

        await expect
            .poll(async () =>
                (await page.getByRole("region").getByRole("heading", { level: 2 }).allInnerTexts()).map((text) =>
                    text.replace(/\s+/g, " ").trim().toUpperCase(),
                ),
            )
            .toEqual(["BRAVO (0)", "ALPHA (0)", "CHARLIE (0)"]);
    });

    test("claim2 control: overlay presence during and after a TASK drag", async ({ page }) => {
        const { account, board } = seedTwoColumns({ destinationTasks: DEST_TITLES });
        await signIn({ page, account, board });
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual(DEST_TITLES);

        const source = await centerOf(taskDragHandle({ page, title: TASK_TITLE }));
        const firstCardBox = await columnSection({ page, name: "Bravo" }).locator("li").first().boundingBox();

        if (firstCardBox === null) {
            throw new Error("no first card box");
        }

        await dragTo({
            page,
            source,
            target: { x: firstCardBox.x + firstCardBox.width / 2, y: firstCardBox.y + 8 },
        });
        console.log("DURING TASK DRAG FIXED", JSON.stringify(await readFixedElements(page)));
        await page.mouse.up();
        console.log("AFTER TASK DROP FIXED", JSON.stringify(await readFixedElements(page)));
    });
});
