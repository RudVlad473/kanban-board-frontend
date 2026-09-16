/*
 * One-off demo recorder for the README's Demo section — not a test, delete after use.
 * Run: pnpm exec tsx e2e/zz-demo-recording.ts (output: e2e/.demo-output/<timestamp>/*.webm)
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";

import { chromium, type Locator, type Page } from "@playwright/test";

const PRODUCTION_URL = "https://kanban-board-frontend-ecru.vercel.app";

const VIEWPORT = { width: 1440, height: 900 };

const OUTPUT_DIR = `e2e/.demo-output/${new Date().toISOString().replace(/[:.]/g, "-")}`;

/** Randomized human-scale pause so consecutive actions don't land on identical frame intervals. */
const humanPause = async ({ minMs, maxMs }: { minMs: number; maxMs: number }): Promise<void> => {
    const ms = minMs + Math.random() * (maxMs - minMs);
    await new Promise((resolve) => setTimeout(resolve, ms));
};

const log = (step: string): void => {
    console.log(`\x1b[36m▶ ${step}\x1b[0m`);
};

/** Injected once per page load — draws a fake cursor dot and a click ripple, both CSS-only. */
const CURSOR_OVERLAY_SCRIPT = `
(() => {
  const setup = () => {
    const cursor = document.createElement("div");
    cursor.id = "__demo_cursor__";
    Object.assign(cursor.style, {
      position: "fixed",
      zIndex: "2147483647",
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      background: "rgba(255, 60, 60, 0.9)",
      border: "2px solid white",
      boxShadow: "0 0 6px rgba(0,0,0,0.4)",
      pointerEvents: "none",
      transform: "translate(-50%, -50%)",
      left: "-100px",
      top: "-100px",
      transition: "left 60ms linear, top 60ms linear",
    });
    document.documentElement.appendChild(cursor);

    window.demoMoveCursor = (x, y) => {
      cursor.style.left = x + "px";
      cursor.style.top = y + "px";
    };

    window.demoClickRipple = (x, y) => {
      const ripple = document.createElement("div");
      Object.assign(ripple.style, {
        position: "fixed",
        zIndex: "2147483646",
        left: x + "px",
        top: y + "px",
        width: "8px",
        height: "8px",
        marginLeft: "-4px",
        marginTop: "-4px",
        borderRadius: "50%",
        border: "2px solid rgba(255, 60, 60, 0.9)",
        pointerEvents: "none",
        transition: "all 420ms ease-out",
      });
      document.documentElement.appendChild(ripple);
      requestAnimationFrame(() => {
        ripple.style.width = "48px";
        ripple.style.height = "48px";
        ripple.style.marginLeft = "-24px";
        ripple.style.marginTop = "-24px";
        ripple.style.opacity = "0";
      });
      setTimeout(() => ripple.remove(), 450);
    };

    window.demoCursorReady = true;
  };

  /*
   * addInitScript runs at document-start, before <html> exists in this Chromium build — appending
   * to document.documentElement here throws "Cannot read properties of null" (found running this
   * script against production, 2026-09-16). Deferring to DOMContentLoaded is the fix.
   */
  if (document.documentElement) {
    setup();
  } else {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  }
})();
`;

/*
 * Node-side tracking of the overlay cursor's last position, so moveCursorTo can interpolate
 * from where it actually is rather than re-deriving it from the DOM.
 */
let lastCursorPosition = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };

/** Moves the overlay cursor to an element's center via real mouse movement, in visible steps. */
const moveCursorTo = async ({ page, locator }: { page: Page; locator: Locator }): Promise<{ x: number; y: number }> => {
    const box = await locator.boundingBox();
    if (!box) {
        throw new Error("Element has no bounding box — is it visible?");
    }
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    /*
     * The invisible mouse and the visible overlay dot travel together in the same loop, not the
     * overlay jumping once after the real move finishes (agy review 2026-09-16).
     */
    const { x: startX, y: startY } = lastCursorPosition;
    const steps = 20;
    for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const stepX = startX + (x - startX) * t;
        const stepY = startY + (y - startY) * t;
        await page.mouse.move(stepX, stepY, { steps: 1 });
        await page.evaluate(
            ([px, py]) => {
                window.demoMoveCursor(px, py);
            },
            [stepX, stepY] as const,
        );
    }
    lastCursorPosition = { x, y };
    return { x, y };
};

/** Click with visible cursor travel + ripple, then a short human-scale settle pause. */
const demoClick = async ({ page, locator }: { page: Page; locator: Locator }): Promise<void> => {
    const { x, y } = await moveCursorTo({ page, locator });
    await page.evaluate(
        ([px, py]) => {
            window.demoClickRipple(px, py);
        },
        [x, y] as const,
    );
    await humanPause({ minMs: 80, maxMs: 180 });
    await locator.click();
    await humanPause({ minMs: 400, maxMs: 900 });
};

/** Types with a per-character delay so the recording shows text appearing, not snapping in. */
const demoType = async ({ page, locator, text }: { page: Page; locator: Locator; text: string }): Promise<void> => {
    await moveCursorTo({ page, locator });
    await locator.click();
    await humanPause({ minMs: 150, maxMs: 300 });
    await locator.pressSequentially(text, { delay: 55 + Math.random() * 45 });
    await humanPause({ minMs: 300, maxMs: 700 });
};

const waitVisible = async ({
    locator,
    timeoutMs = 20_000,
}: {
    locator: Locator;
    timeoutMs?: number;
}): Promise<void> => {
    await locator.waitFor({ state: "visible", timeout: timeoutMs });
};

const waitHidden = async ({ locator, timeoutMs = 20_000 }: { locator: Locator; timeoutMs?: number }): Promise<void> => {
    await locator.waitFor({ state: "hidden", timeout: timeoutMs });
};

/** The init script's globals exist only after navigation runs it — fail loudly if they're missing. */
const waitCursorOverlayReady = async ({ page }: { page: Page }): Promise<void> => {
    await page.waitForFunction(() => window.demoCursorReady === true, undefined, { timeout: 15_000 });
};

const main = async (): Promise<void> => {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const suffix = randomUUID().slice(0, 8);
    const email = `demo-${suffix}@example.com`;
    const password = "DemoRecording1!";
    const displayName = "Demo Viewer";
    const boardName = "Product Launch";

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: VIEWPORT,
        recordVideo: { dir: OUTPUT_DIR, size: VIEWPORT },
    });
    await context.addInitScript(CURSOR_OVERLAY_SCRIPT);

    const page = await context.newPage();
    page.on("console", (msg) => {
        console.log("PAGE LOG:", msg.text());
    });
    page.on("pageerror", (err) => {
        console.log("PAGE ERROR:", err);
    });

    try {
        log("Landing on sign-up");
        await page.goto(`${PRODUCTION_URL}/register`);
        await waitCursorOverlayReady({ page });
        await humanPause({ minMs: 800, maxMs: 1400 });

        await demoType({ page, locator: page.getByLabel("Email", { exact: true }), text: email });
        await demoType({ page, locator: page.getByLabel("Name", { exact: true }), text: displayName });
        await demoType({ page, locator: page.getByLabel("Password", { exact: true }), text: password });

        log("Submitting sign-up");
        await demoClick({ page, locator: page.getByRole("button", { name: "Create Account" }) });
        await waitVisible({
            locator: page.getByRole("button", { name: "Create your first board" }),
            timeoutMs: 20_000,
        });
        await humanPause({ minMs: 600, maxMs: 1000 });

        log("Toggling dark mode");
        await demoClick({ page, locator: page.getByRole("switch", { name: "Toggle dark mode" }) });
        await humanPause({ minMs: 1000, maxMs: 1600 });

        log("Creating the first board");
        await demoClick({ page, locator: page.getByRole("button", { name: "Create your first board" }) });
        const createDialog = page.getByRole("dialog");
        await waitVisible({ locator: createDialog });

        await demoType({ page, locator: createDialog.getByLabel("Board Name", { exact: true }), text: boardName });

        await demoClick({ page, locator: createDialog.getByRole("button", { name: "+ Add New Column" }) });
        await demoType({ page, locator: createDialog.getByLabel("Column 1", { exact: true }), text: "Backlog" });
        await demoClick({ page, locator: createDialog.getByRole("button", { name: "+ Add New Column" }) });
        await demoType({ page, locator: createDialog.getByLabel("Column 2", { exact: true }), text: "Doing" });
        await demoClick({ page, locator: createDialog.getByRole("button", { name: "+ Add New Column" }) });
        await demoType({ page, locator: createDialog.getByLabel("Column 3", { exact: true }), text: "Done" });

        await demoClick({ page, locator: createDialog.getByRole("button", { name: "Create New Board", exact: true }) });
        await waitVisible({ locator: page.getByRole("heading", { level: 1, name: boardName }), timeoutMs: 20_000 });
        await waitVisible({ locator: page.getByRole("heading", { name: /^Backlog/ }) });
        await waitVisible({ locator: page.getByRole("heading", { name: /^Doing/ }) });
        await waitVisible({ locator: page.getByRole("heading", { name: /^Done/ }) });
        await humanPause({ minMs: 1000, maxMs: 1500 });

        log("Adding first task with a subtask checklist");
        await demoClick({ page, locator: page.getByRole("button", { name: "+ Add New Task" }).first() });
        const taskDialog = page.getByRole("dialog");
        await waitVisible({ locator: taskDialog });

        await demoType({
            page,
            locator: taskDialog.getByLabel("Title", { exact: true }),
            text: "Design landing page hero",
        });
        await demoType({
            page,
            locator: taskDialog.getByLabel("Description", { exact: true }),
            text: "Draft three variants for the new marketing hero section.",
        });
        await demoClick({ page, locator: taskDialog.getByRole("button", { name: "+ Add New Subtask" }) });
        await demoType({
            page,
            locator: taskDialog.getByRole("textbox", { name: "Subtask 1", exact: true }),
            text: "Sketch layout options",
        });
        await demoClick({ page, locator: taskDialog.getByRole("button", { name: "+ Add New Subtask" }) });
        await demoType({
            page,
            locator: taskDialog.getByRole("textbox", { name: "Subtask 2", exact: true }),
            text: "Get feedback from design",
        });
        await demoClick({ page, locator: taskDialog.getByRole("button", { name: "Create Task" }) });
        await waitVisible({
            locator: page.getByRole("button", { name: /^Design landing page hero/ }),
            timeoutMs: 20_000,
        });
        await humanPause({ minMs: 900, maxMs: 1300 });

        log("Adding a second task");
        await demoClick({ page, locator: page.getByRole("button", { name: "+ Add New Task" }).first() });
        const secondTaskDialog = page.getByRole("dialog");
        await waitVisible({ locator: secondTaskDialog });
        await demoType({
            page,
            locator: secondTaskDialog.getByLabel("Title", { exact: true }),
            text: "Set up analytics tracking",
        });
        await demoClick({ page, locator: secondTaskDialog.getByRole("button", { name: "Create Task" }) });
        await waitVisible({
            locator: page.getByRole("button", { name: /^Set up analytics tracking/ }),
            timeoutMs: 20_000,
        });
        await humanPause({ minMs: 900, maxMs: 1300 });

        log("Opening task detail and checking off a subtask");
        await demoClick({ page, locator: page.getByRole("button", { name: /^Design landing page hero/ }) });
        const detailDialog = page.getByRole("dialog");
        await waitVisible({ locator: detailDialog });
        await humanPause({ minMs: 600, maxMs: 1000 });
        await demoClick({ page, locator: detailDialog.getByRole("checkbox", { name: "Sketch layout options" }) });
        await humanPause({ minMs: 700, maxMs: 1100 });
        await page.keyboard.press("Escape");
        /* Wait for the dialog itself, not the card behind it — Playwright treats backdrop-covered elements as visible. */
        await waitHidden({ locator: detailDialog });
        await humanPause({ minMs: 600, maxMs: 1000 });

        log("Dragging a task card from Backlog to Doing");
        /* Drag listeners live on the sibling "Reorder <title>" handle, not the card's content button. */
        const handle = page
            .locator("section")
            .filter({ has: page.getByRole("heading", { name: /^Backlog/ }) })
            .getByRole("button", { name: "Reorder Design landing page hero" });
        const targetColumn = page.locator("section").filter({ has: page.getByRole("heading", { name: /^Doing/ }) });

        const handleBox = await handle.boundingBox();
        const targetBox = await targetColumn.boundingBox();
        if (!handleBox || !targetBox) {
            throw new Error("Drag source handle or target column has no bounding box — cannot drag.");
        }

        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;
        const endX = targetBox.x + targetBox.width / 2;
        const endY = targetBox.y + Math.min(targetBox.height / 2, 200);

        await page.mouse.move(startX, startY, { steps: 20 });
        await page.evaluate(
            ([px, py]) => {
                window.demoMoveCursor(px, py);
            },
            [startX, startY] as const,
        );
        lastCursorPosition = { x: startX, y: startY };
        await humanPause({ minMs: 300, maxMs: 500 });
        await page.mouse.down();
        await humanPause({ minMs: 150, maxMs: 250 });
        /* Multiple intermediate moves so dnd-kit registers the drag rather than a teleport. */
        const dragSteps = 18;
        for (let i = 1; i <= dragSteps; i += 1) {
            const t = i / dragSteps;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            await page.mouse.move(x, y, { steps: 3 });
            await page.evaluate(
                ([px, py]) => {
                    window.demoMoveCursor(px, py);
                },
                [x, y] as const,
            );
            await humanPause({ minMs: 30, maxMs: 70 });
        }
        lastCursorPosition = { x: endX, y: endY };
        await humanPause({ minMs: 200, maxMs: 350 });
        await page.mouse.up();
        await humanPause({ minMs: 1000, maxMs: 1500 });

        log("Renaming the Backlog column");
        await demoClick({ page, locator: page.getByRole("button", { name: "Column actions for Backlog" }) });
        await demoClick({ page, locator: page.getByRole("menuitem", { name: "Rename Column" }) });
        const renameColumnDialog = page.getByRole("dialog");
        await waitVisible({ locator: renameColumnDialog });
        const columnNameField = renameColumnDialog.getByLabel("Column Name", { exact: true });
        await columnNameField.fill("");
        await demoType({ page, locator: columnNameField, text: "Ideas" });
        await demoClick({ page, locator: renameColumnDialog.getByRole("button", { name: "Save Changes" }) });
        await waitVisible({ locator: page.getByRole("heading", { name: /^Ideas/ }), timeoutMs: 20_000 });
        await humanPause({ minMs: 900, maxMs: 1300 });

        log("Renaming the board");
        await demoClick({ page, locator: page.getByRole("button", { name: `Board actions for ${boardName}` }) });
        await demoClick({ page, locator: page.getByRole("menuitem", { name: "Edit Board" }) });
        const renameBoardDialog = page.getByRole("dialog");
        await waitVisible({ locator: renameBoardDialog });
        const boardNameField = renameBoardDialog.getByLabel("Board Name", { exact: true });
        await boardNameField.fill("");
        await demoType({ page, locator: boardNameField, text: "Product Launch Q1" });
        await demoClick({ page, locator: renameBoardDialog.getByRole("button", { name: "Save Changes" }) });
        await waitVisible({
            locator: page.getByRole("heading", { level: 1, name: "Product Launch Q1" }),
            timeoutMs: 20_000,
        });
        await humanPause({ minMs: 1000, maxMs: 1500 });

        log("Collapsing and expanding the sidebar");
        await demoClick({ page, locator: page.getByRole("button", { name: "Hide Sidebar" }) });
        await humanPause({ minMs: 900, maxMs: 1300 });
        await demoClick({ page, locator: page.getByRole("button", { name: "Show Sidebar" }) });
        await humanPause({ minMs: 1200, maxMs: 1800 });

        log("Final resting shot");
        await page.mouse.move(VIEWPORT.width / 2, 80, { steps: 15 });
        await humanPause({ minMs: 2000, maxMs: 2500 });
    } finally {
        await context.close();
        await browser.close();
        log(`Done. Video saved under ${OUTPUT_DIR}/`);
    }
};

declare global {
    /* Global augmentation requires `interface`; `type` cannot merge with the existing `Window`. */
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        demoMoveCursor: (x: number, y: number) => void;
        demoClickRipple: (x: number, y: number) => void;
        demoCursorReady?: boolean;
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
