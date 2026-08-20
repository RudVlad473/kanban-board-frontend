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
    },
});
