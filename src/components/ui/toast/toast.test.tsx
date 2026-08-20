import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { ToastProvider, useToast } from "./toast";

type ToastConfig = Parameters<ReturnType<typeof useToast>["add"]>[0];

/*
 * A thin harness rendering one button per config — each click calls the real manager's `add()`,
 * exactly the call shape any mutation hook's `onError`/`onSuccess` uses. Kept generic (configs in,
 * buttons out) rather than one bespoke component per scenario, so every behavior bullet below
 * drives the primitive the same way a real consumer would. Labels are 1-indexed strings baked in
 * up front (not a template literal over `index` at render time) — configs are static per render
 * and never reordered, so a plain index key is safe here.
 */
const ToastHarness = ({ configs }: { configs: ToastConfig[] }) => {
    const manager = useToast();
    return (
        <div>
            {configs.map((config, index) => {
                const label = `Add toast ${String(index + 1)}`;
                return (
                    <button
                        key={label}
                        type="button"
                        onClick={() => {
                            manager.add(config);
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

const renderToastHarness = (configs: ToastConfig[]) =>
    render(
        <ToastProvider>
            <ToastHarness configs={configs} />
        </ToastProvider>,
    );

/*
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default.
 */
describeForEachDevice({
    name: "Toast",
    body: () => {
        it("renders a toast with the given title and description when add() is called", async () => {
            // Arrange
            const screen = await renderToastHarness([{ title: "Couldn't rename board.", description: "Try again." }]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();

            // Assert
            await expect.element(screen.getByText("Couldn't rename board.")).toBeVisible();
            await expect.element(screen.getByText("Try again.")).toBeVisible();
        });

        it("exposes the title by text and the viewport as an aria-live=polite region — asserted against the installed Base UI version, not assumed", async () => {
            // Arrange
            const screen = await renderToastHarness([{ title: "Couldn't delete board.", description: "Try again." }]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();

            // Assert
            const viewport = screen.getByRole("region", { name: "Notifications" });
            await expect.element(viewport).toHaveAttribute("aria-live", "polite");
            await expect.element(screen.getByText("Couldn't delete board.")).toBeVisible();
        });

        it("renders the danger token accent when the toast's type is danger, and does not for the default type", async () => {
            // Arrange
            const screen = await renderToastHarness([
                { title: "Rollback complete", description: "The board name was restored." },
                { type: "danger", title: "Couldn't delete board.", description: "Try again." },
            ]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            await screen.getByRole("button", { name: "Add toast 2" }).click();

            // Assert
            const defaultToast = screen.getByRole("dialog", { name: "Rollback complete" });
            const dangerToast = screen.getByRole("dialog", { name: "Couldn't delete board." });
            const defaultBorderColor = getComputedStyle(defaultToast.element()).borderLeftColor;
            const dangerBorderColor = getComputedStyle(dangerToast.element()).borderLeftColor;

            expect(dangerBorderColor).toBe("rgb(201, 63, 60)");
            expect(defaultBorderColor).not.toBe("rgb(201, 63, 60)");
        });

        it("exposes an action affordance as a button with the given label, invoking the supplied callback exactly once on click", async () => {
            // Arrange
            const onRetry = vi.fn();
            const screen = await renderToastHarness([
                {
                    title: "Couldn't create 2 column(s).",
                    description: "Try again.",
                    actionProps: { children: "Retry", onClick: onRetry },
                },
            ]);
            await screen.getByRole("button", { name: "Add toast 1" }).click();

            // Act
            await screen.getByRole("button", { name: "Retry" }).click();

            // Assert
            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it("dismisses the toast when its close control is activated, removing the title from the document", async () => {
            /*
             * Arrange — Close is `aria-hidden` unless the viewport is "expanded" (hover or focus;
             * installed store.js: `expanded: hovering || focused`), so this hovers the toast first —
             * exactly what a real pointer user does before reaching for the dismiss control — rather
             * than reaching into the DOM past the accessibility tree.
             */
            const screen = await renderToastHarness([{ title: "Couldn't rename board.", description: "Try again." }]);
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            const toastDialog = screen.getByRole("dialog", { name: "Couldn't rename board." });
            await toastDialog.hover();

            // Act
            await screen.getByRole("button", { name: "Dismiss notification" }).click();

            // Assert
            await expect.element(screen.getByText("Couldn't rename board.")).not.toBeInTheDocument();
        });

        it("stacks two toasts added in sequence rather than replacing the first", async () => {
            // Arrange
            const screen = await renderToastHarness([{ title: "First failure" }, { title: "Second failure" }]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            await screen.getByRole("button", { name: "Add toast 2" }).click();

            // Assert
            await expect.element(screen.getByText("First failure")).toBeVisible();
            await expect.element(screen.getByText("Second failure")).toBeVisible();
        });

        it("updates a toast in place, rather than stacking a second one, when add() is called twice with the same id", async () => {
            /*
             * Arrange — plan 02-10's D-04 retry depends on this upsert: a retry narrows the existing
             * failure toast instead of stacking a second one alongside it. Asserted here against the
             * installed version's `add()` (installed d.ts: "Adding a toast with an existing ID
             * updates it in place"), not taken from documentation.
             */
            const screen = await renderToastHarness([
                { id: "column-retry", title: "Couldn't create 2 column(s).", description: "Try again." },
                { id: "column-retry", title: "Couldn't create 1 column(s).", description: "Try again." },
            ]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            await expect.element(screen.getByText("Couldn't create 2 column(s).")).toBeVisible();
            await screen.getByRole("button", { name: "Add toast 2" }).click();

            /*
             * Assert — updated in place: the new text is present, the old text is gone, and only one
             * toast dialog exists in total (not two).
             */
            await expect.element(screen.getByText("Couldn't create 1 column(s).")).toBeVisible();
            await expect.element(screen.getByText("Couldn't create 2 column(s).")).not.toBeInTheDocument();
            expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
        });

        it("clamps a very long description to a bounded height instead of growing the card, exposing the full text via a native title tooltip", async () => {
            /*
             * Arrange — long enough that, unclamped, it would wrap to well over 3 lines at the
             * card's fixed width. `-webkit-line-clamp`/`overflow: hidden` (Tailwind's `line-clamp-3`)
             * caps the rendered box regardless of how much text is behind it.
             */
            const longDescription =
                "The board itself was created successfully, but every column listed above failed to save to the server. You can retry to add them automatically, or add each one manually from the board view instead — either path leaves the board itself intact and only affects these columns.";
            const screen = await renderToastHarness([
                { title: "Couldn't create columns.", description: longDescription },
            ]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            const description = screen.getByText(longDescription);
            const descriptionElement = description.element();
            const descriptionStyle = getComputedStyle(descriptionElement);

            /*
             * Assert — the clamp is applied (a 3-line-tall box regardless of text length) and the
             * full text is still reachable via the native `title` attribute Description sets from
             * its own string children, not just visually truncated with nothing behind it.
             */
            expect(descriptionStyle.overflow).toBe("hidden");
            expect(descriptionElement.getAttribute("title")).toBe(longDescription);
            /*
             * A 3-line clamp box is nowhere near tall enough to fit this description unclamped —
             * this bounds the box height rather than asserting an exact pixel value tied to font
             * metrics, which would be a brittle, unrelated regression trigger.
             */
            expect(descriptionElement.getBoundingClientRect().height).toBeLessThan(100);
        });

        it("renders the panel at the TextField/Dropdown radius token, not Modal's", async () => {
            // Arrange
            const screen = await renderToastHarness([{ title: "Couldn't rename board.", description: "Try again." }]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            const dialog = screen.getByRole("dialog", { name: "Couldn't rename board." });

            // Assert — radius.sm (4px), per human review; NOT radius.lg (28px) Modal.Content uses.
            expect(getComputedStyle(dialog.element()).borderRadius).toBe("4px");
        });

        it("aligns the action button's visible text flush-left with the title and description above it", async () => {
            /*
             * Arrange — Action's `px-2` widens its click/hover target beyond the visible "Retry"
             * glyph; a `-ml-2` on the same element cancels only that horizontal shift so the
             * rendered text's left edge still lines up with Title/Description, which come from
             * Content's own `p-4` with no extra horizontal inset of their own. Deliberately measures
             * the actual rendered glyph position via a DOM `Range`, not `element.getBoundingClientRect()`
             * on the button itself — the button's own box is *intentionally* offset left by `-ml-2`
             * so that its padded-in text lands flush, so comparing box edges directly would assert
             * the wrong thing (and did, the first time this test was written: the button's box edge
             * came out 8px left of Title's, exactly the `-ml-2` compensating for `px-2`).
             */
            const getTextLeft = (element: HTMLElement) => {
                const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
                if (!textNode) {
                    throw new Error("Expected a text node as a direct child of the element.");
                }
                const range = document.createRange();
                range.selectNodeContents(textNode);
                return range.getBoundingClientRect().left;
            };
            const onRetry = vi.fn();
            const screen = await renderToastHarness([
                {
                    title: "Couldn't create 2 column(s).",
                    description: "Try again.",
                    actionProps: { children: "Retry", onClick: onRetry },
                },
            ]);
            await screen.getByRole("button", { name: "Add toast 1" }).click();

            // Act
            const titleTextLeft = getTextLeft(
                screen.getByText("Couldn't create 2 column(s).").element() as HTMLElement,
            );
            const actionTextLeft = getTextLeft(screen.getByRole("button", { name: "Retry" }).element() as HTMLElement);

            // Assert
            expect(actionTextLeft).toBe(titleTextLeft);
        });

        it("reserves room for the close button so a wrapped title never runs under it", async () => {
            /*
             * Arrange — long enough to wrap to two lines at the card's fixed width, reproducing the
             * LongContent story's shape where a wrapped title line ran under the close icon before
             * `pr-6` was added. Hovers first so Close is reachable per the "aria-hidden unless
             * expanded" behavior already asserted elsewhere in this file.
             *
             * Deliberately measures actual rendered glyph extent via a DOM `Range`'s per-line
             * `getClientRects()` (the max `right` across every line), not
             * `element.getBoundingClientRect()` on the title itself — under Tailwind's global
             * `border-box` sizing plus this element's flex-stretch width, the title's own box stays
             * exactly as wide as its unpadded sibling regardless of how much right padding it
             * carries (only the CONTENT area, where text is free to wrap into, shrinks). Comparing
             * the outer box directly asserts the wrong thing — the same class of mistake the Action-
             * alignment test above already caught once this session with `-ml-2`.
             */
            const getMaxLineRight = (element: HTMLElement) => {
                const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
                if (!textNode) {
                    throw new Error("Expected a text node as a direct child of the element.");
                }
                const range = document.createRange();
                range.selectNodeContents(textNode);
                const lineRects = Array.from(range.getClientRects());
                return Math.max(...lineRects.map((rect) => rect.right));
            };
            const wrappingTitle =
                "Couldn't create 6 column(s): Backlog, To Do, In Progress, In Review, Blocked, Done — every one of them failed to save.";
            const screen = await renderToastHarness([{ title: wrappingTitle, description: "Try again." }]);
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            const dialog = screen.getByRole("dialog", { name: wrappingTitle });
            await dialog.hover();

            // Act
            const titleMaxLineRight = getMaxLineRight(screen.getByText(wrappingTitle).element() as HTMLElement);
            const closeRect = screen
                .getByRole("button", { name: "Dismiss notification" })
                .element()
                .getBoundingClientRect();

            /*
             * Assert — no rendered line of the wrapped title extends as far right as the close
             * button's left edge, on either line (not just the first).
             */
            expect(titleMaxLineRight).toBeLessThanOrEqual(closeRect.left);
        });
    },
});
