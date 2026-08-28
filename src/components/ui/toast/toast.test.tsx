// Import source: @storybook/react, not the Next.js-aware framework package — see vitest.setup.ts.
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { ToastProvider } from "./toast";
import * as stories from "./toast.stories";
import { useToast } from "./use-toast";

const { Default, Danger } = composeStories(stories);

type ToastConfig = Parameters<ReturnType<typeof useToast>["add"]>[0];

/*
 * A thin harness rendering one button per config — each click calls the real manager's `add()`,
 * the same call shape a mutation hook's onError/onSuccess uses. Labels are static 1-indexed
 * strings since configs never reorder, so a plain index key is safe.
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

// ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default.
describeForEachDevice({
    name: "Toast",
    body: () => {
        it("renders a toast with the seeded title and description", async () => {
            // Act — the Default story already seeds one toast with timeout: 0 (toast.stories.tsx).
            await render(<Default />);

            // Assert
            expect(screen.getByText("Rollback complete")).toBeVisible();
            expect(screen.getByText("The board name was restored.")).toBeVisible();
        });

        it("exposes the viewport as an aria-live=polite region and the close control by its accessible name", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByRole("region", { name: "Notifications" })).toHaveAttribute("aria-live", "polite");
            // Close is aria-hidden until expanded (hover/focus) — hover reveals it, no click needed.
            await userEvent.hover(page.elementLocator(screen.getByText("Rollback complete")));
            expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
        });

        it("does not stamp the default variant with the danger data-type", async () => {
            // Act
            await render(<Default />);

            // Assert — Root reads toast.type and stamps it as data-type (toast.tsx's own comment).
            expect(screen.getByRole("dialog", { name: "Rollback complete" })).not.toHaveAttribute(
                "data-type",
                "danger",
            );
        });

        it("stamps the danger variant's data-type", async () => {
            // Act
            await render(<Danger />);

            // Assert
            expect(screen.getByRole("dialog", { name: "Couldn't delete board." })).toHaveAttribute(
                "data-type",
                "danger",
            );
        });

        // Deep: getComputedStyle against a Tailwind custom-property-driven token.
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

        // Deep: real click interaction + callback spy.
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
             * Arrange — Close is aria-hidden unless the viewport is "expanded" (hover/focus), so
             * this hovers first, exactly what a real pointer user does before reaching for it.
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

        it("keeps a harness-seeded toast on screen past Base UI's default auto-dismiss window", async () => {
            /*
             * Arrange — Base UI schedules dismissal through a plain `setTimeout`, so a fake clock
             * reaches it; `shouldAdvanceTime` keeps that clock ticking with real time so the
             * browser driver's own round-trips still resolve.
             */
            vi.useFakeTimers({ shouldAdvanceTime: true });
            try {
                const screen = await renderToastHarness([{ title: "Couldn't rename board." }]);
                await screen.getByRole("button", { name: "Add toast 1" }).click();
                await expect.element(screen.getByText("Couldn't rename board.")).toBeVisible();

                // Act — past Base UI's 5000ms default; a provider carrying that default loses it here.
                await vi.advanceTimersByTimeAsync(6000);

                // Assert
                await expect.element(screen.getByText("Couldn't rename board.")).toBeVisible();
            } finally {
                vi.useRealTimers();
            }
        });

        it("auto-dismisses a toast that opts into its own timeout at the call site", async () => {
            // Arrange — the opt-in route for dismissal behaviour, now that the harness provider has none.
            vi.useFakeTimers({ shouldAdvanceTime: true });
            try {
                const screen = await renderToastHarness([{ title: "Couldn't rename board.", timeout: 1000 }]);
                await screen.getByRole("button", { name: "Add toast 1" }).click();
                await expect.element(screen.getByText("Couldn't rename board.")).toBeVisible();

                // Act
                await vi.advanceTimersByTimeAsync(1500);

                // Assert
                await expect.element(screen.getByText("Couldn't rename board.")).not.toBeInTheDocument();
            } finally {
                vi.useRealTimers();
            }
        });

        // Deep: stacking behaviour, explicitly called out as Deep by this plan's action text.
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
             * Arrange — plan 02-10's D-04 retry depends on this upsert (installed d.ts: "Adding a
             * toast with an existing ID updates it in place").
             */
            const screen = await renderToastHarness([
                { id: "column-retry", title: "Couldn't create 2 column(s).", description: "Try again." },
                { id: "column-retry", title: "Couldn't create 1 column(s).", description: "Try again." },
            ]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            await expect.element(screen.getByText("Couldn't create 2 column(s).")).toBeVisible();
            await screen.getByRole("button", { name: "Add toast 2" }).click();

            // Assert — updated in place: new text present, old text gone, only one dialog total.
            await expect.element(screen.getByText("Couldn't create 1 column(s).")).toBeVisible();
            await expect.element(screen.getByText("Couldn't create 2 column(s).")).not.toBeInTheDocument();
            expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
        });

        it("clamps a very long description to a bounded height instead of growing the card, exposing the full text via a native title tooltip", async () => {
            // Arrange — long enough to wrap past 3 lines unclamped; line-clamp-3 caps the box regardless.
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

            // Assert — clamp applied, full text still reachable via the native title attribute.
            expect(descriptionStyle.overflow).toBe("hidden");
            expect(descriptionElement.getAttribute("title")).toBe(longDescription);
            // A 3-line clamp is nowhere near tall enough to fit this unclamped — bounds, not exact px.
            expect(descriptionElement.getBoundingClientRect().height).toBeLessThan(100);
        });

        it("renders the panel at the TextField/Dropdown radius token, not Modal's", async () => {
            // Arrange
            const screen = await renderToastHarness([{ title: "Couldn't rename board.", description: "Try again." }]);

            // Act
            await screen.getByRole("button", { name: "Add toast 1" }).click();
            const dialog = screen.getByRole("dialog", { name: "Couldn't rename board." });

            // Assert — radius.sm (4px) per human review, NOT radius.lg (28px) Modal.Content uses.
            expect(getComputedStyle(dialog.element()).borderRadius).toBe("4px");
        });

        it("aligns the action button's visible text flush-left with the title and description above it", async () => {
            /*
             * Arrange — Action's -ml-2 cancels its own px-2 hit-area padding so the rendered glyph
             * lines up with Title/Description. Measures the actual glyph via a DOM Range, not the
             * button's own box, which is intentionally offset left by that same -ml-2.
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
             * Arrange — long enough to wrap to two lines, reproducing the pre-pr-6 bug where a
             * wrapped title ran under the close icon. Measures per-line glyph extent via a DOM
             * Range, not the title's own box, which stays full-width under border-box sizing.
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

            // Assert — no rendered line of the wrapped title reaches the close button's left edge.
            expect(titleMaxLineRight).toBeLessThanOrEqual(closeRect.left);
        });
    },
});
