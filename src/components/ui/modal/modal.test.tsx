// Import source: @storybook/react, not the Next.js-aware framework package — see vitest.setup.ts.
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { DEVICE_TYPE } from "@/lib/core/viewport/viewport-breakpoints";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Modal } from "./modal";
import * as stories from "./modal.stories";
import { Button } from "../button/button";

const { Closed, Open, WithDescription } = composeStories(stories);

type RootProps = ComponentProps<typeof Modal.Root>;

const renderModal = (props: RootProps = {}) =>
    render(
        <div>
            <button type="button">Outside link</button>

            <Modal.Root {...props}>
                <Modal.Trigger>Open modal</Modal.Trigger>

                <Modal.Content>
                    <Modal.Title>Delete board</Modal.Title>

                    <Modal.Description>This action cannot be undone.</Modal.Description>

                    <input type="text" aria-label="Confirmation text" />

                    <Modal.Footer>
                        <button type="button">Cancel</button>

                        <button type="button">Confirm</button>
                    </Modal.Footer>
                </Modal.Content>
            </Modal.Root>
        </div>,
    );

/*
 * The floating backdrop `<div>` (no ARIA role of its own) rendered by `Modal.Content` — the
 * dialog's own popup gets `role="dialog"`, so filtering it out unambiguously isolates the backdrop
 * regardless of DOM order.
 */
const getBackdropElement = () => {
    const backdrop = Array.from(document.querySelectorAll<HTMLElement>("[data-open]")).find(
        (el) => el.getAttribute("role") !== "dialog",
    );
    if (!backdrop) {
        throw new Error("Modal backdrop element not found — is the dialog open?");
    }
    return backdrop;
};

/*
 * ADR tech/0014: every primitive's whole suite runs at both viewports; the padding test below
 * branches on `device` since that assertion genuinely differs by viewport.
 */
describeForEachDevice({
    name: "Modal",
    body: (device) => {
        it("renders nothing into the accessibility tree while closed, leaving its own trigger reachable", async () => {
            // Act
            await render(<Closed />);

            // Assert
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Open modal" })).toBeVisible();
        });

        it("renders a dialog whose accessible name is the Modal.Title text once open", async () => {
            // Act
            await render(<Open />);

            // Assert
            expect(screen.getByRole("dialog", { name: "Delete this board?" })).toBeVisible();
        });

        it("exposes Modal.Description as the dialog's accessible description", async () => {
            // Act
            await render(<WithDescription />);

            // Assert
            expect(screen.getByRole("dialog", { name: "Delete this board?" })).toHaveAccessibleDescription(
                "This action cannot be undone. All columns and tasks inside it will be permanently deleted.",
            );
        });

        it("traps Tab focus inside the dialog — tabbing past the last focusable element wraps to the first rather than escaping to the page behind it", async () => {
            // Arrange
            const screen = await renderModal({ defaultOpen: true });
            const input = screen.getByRole("textbox", { name: "Confirmation text" });
            const confirm = screen.getByRole("button", { name: "Confirm" });

            // Act — focus the last focusable element inside the dialog (Confirm), then Tab once more.
            confirm.element().focus();
            await userEvent.tab();

            /*
             * Assert — focus wrapped to the first focusable element inside the dialog, not the page's
             * own "Outside link" button sitting behind it.
             */
            expect(document.activeElement).toBe(input.element());
        });

        it("invokes onOpenChange with false on Escape and returns focus to the element that opened it", async () => {
            // Arrange
            const onOpenChange = vi.fn();
            const screen = await renderModal({ onOpenChange });
            const trigger = screen.getByRole("button", { name: "Open modal" });

            // Act
            await trigger.click();
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            await userEvent.keyboard("{Escape}");

            // Assert
            expect(onOpenChange).toHaveBeenCalledWith(false);
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
            await expect.poll(() => document.activeElement).toBe(trigger.element());
        });

        it("invokes onOpenChange with false on a backdrop click by default", async () => {
            // Arrange
            const onOpenChange = vi.fn();
            const screen = await renderModal({ defaultOpen: true, onOpenChange });

            /*
             * Act — click a corner of the full-viewport backdrop that the centered dialog panel does
             * not cover.
             */
            const backdrop = page.elementLocator(getBackdropElement());
            await backdrop.click({ position: { x: 4, y: 4 } });

            // Assert
            expect(onOpenChange).toHaveBeenCalledWith(false);
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
        });

        it("clips the rounded/shadowed panel to its own bounds and scrolls an inner content region, not the panel itself, once content overflows", async () => {
            /*
             * Deep: computed-style + layout. The popup owns the silhouette and clips to it; a
             * separate inner wrapper scrolls — putting overflow-y-auto directly on the popup let
             * the scrollbar/content edge render outside the rounded corners once it scrolled.
             */
            const longContent = Array.from({ length: 40 }, (_, index) => {
                const position = String(index);
                return <p key={position}>{`Activity entry ${position} — long content to force scrolling.`}</p>;
            });
            const screen = await render(
                <Modal.Root defaultOpen={true}>
                    <Modal.Content>
                        <Modal.Title>Task activity</Modal.Title>

                        <div>{longContent}</div>
                    </Modal.Content>
                </Modal.Root>,
            );
            const dialog = screen.getByRole("dialog").element() as HTMLElement;
            const innerScrollRegion = dialog.firstElementChild as HTMLElement;

            // Act
            const popupStyle = getComputedStyle(dialog);
            const innerStyle = getComputedStyle(innerScrollRegion);

            // Assert — the popup carries the silhouette and clips to it; it does not itself scroll.
            expect(popupStyle.overflow).toBe("hidden");
            expect(popupStyle.borderRadius).not.toBe("0px");
            expect(popupStyle.boxShadow).not.toBe("none");
            expect(dialog.scrollHeight).toBe(dialog.clientHeight);
            // The inner wrapper is the one that actually scrolls the overflowing content.
            expect(innerStyle.overflowY).toBe("auto");
            expect(innerScrollRegion.scrollHeight).toBeGreaterThan(innerScrollRegion.clientHeight);
        });

        it("applies mobile-first internal padding — tighter on mobile, roomier at tablet/desktop: renders the padding this device's breakpoint resolves to", async () => {
            /*
             * Deep: computed-style, device-dependent. ADR tech/0010's mobile-first p-4 md:p-6 pair
             * must resolve to different real padding per viewport, not just both class names present.
             */
            const screen = await render(
                <Modal.Root defaultOpen={true}>
                    <Modal.Content>
                        <Modal.Title>Task activity</Modal.Title>
                    </Modal.Content>
                </Modal.Root>,
            );
            const dialog = screen.getByRole("dialog").element() as HTMLElement;
            const scrollWrapper = dialog.firstElementChild as HTMLElement;

            // Act
            const paddingLeft = getComputedStyle(scrollWrapper).paddingLeft;

            // Assert — p-4 (16px) below the md breakpoint (768px), md:p-6 (24px) at/above it.
            const expectedPadding = device === DEVICE_TYPE.MOBILE ? "16px" : "24px";
            expect(paddingLeft).toBe(expectedPadding);
        });

        it("does not dismiss on a backdrop click when isDismissableOnBackdropClick is false", async () => {
            // Arrange
            const onOpenChange = vi.fn();
            const screen = await renderModal({ defaultOpen: true, onOpenChange, isDismissableOnBackdropClick: false });

            // Act
            const backdrop = page.elementLocator(getBackdropElement());
            await backdrop.click({ position: { x: 4, y: 4 } });

            // Assert
            expect(onOpenChange).not.toHaveBeenCalled();
            await expect.element(screen.getByRole("dialog")).toBeVisible();
        });

        it("blocks both backdrop-click and Escape dismissal while a Modal.Footer action is loading, and restores both once loading ends — the isLoading-guards-dismissal convention documented on Modal.Root", async () => {
            /*
             * Deep: a controlled wrapper composing Modal.Root's documented isLoading-guards-
             * dismissal convention (isDismissableOnBackdropClick={!isLoading} + an onOpenChange
             * guard) — no new Modal prop; "Reopen" just re-exercises both paths post-loading.
             */
            const ControlledModal = () => {
                const [isOpen, setIsOpen] = useState(true);
                const [isLoading, setIsLoading] = useState(true);

                return (
                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(true);
                            }}
                        >
                            Reopen
                        </button>

                        <Modal.Root
                            isOpen={isOpen}
                            onOpenChange={(open) => {
                                if (isLoading) return;
                                setIsOpen(open);
                            }}
                            isDismissableOnBackdropClick={!isLoading}
                        >
                            <Modal.Content>
                                <Modal.Title>Delete board</Modal.Title>

                                <Modal.Footer>
                                    <Button isLoading={isLoading}>Confirm</Button>
                                </Modal.Footer>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoading(false);
                                    }}
                                >
                                    Finish loading
                                </button>
                            </Modal.Content>
                        </Modal.Root>
                    </div>
                );
            };
            const screen = await render(<ControlledModal />);
            await expect.element(screen.getByRole("dialog")).toBeVisible();

            // Act & Assert — while loading, a backdrop click does not close the modal.
            const backdropWhileLoading = page.elementLocator(getBackdropElement());
            await backdropWhileLoading.click({ position: { x: 4, y: 4 } });
            await expect.element(screen.getByRole("dialog")).toBeVisible();

            // Act & Assert — while loading, Escape does not close the modal either.
            await userEvent.keyboard("{Escape}");
            await expect.element(screen.getByRole("dialog")).toBeVisible();

            // Act — the loading action finishes.
            await screen.getByRole("button", { name: "Finish loading" }).click();

            // Assert — a backdrop click now closes it.
            const backdropAfterLoading = page.elementLocator(getBackdropElement());
            await backdropAfterLoading.click({ position: { x: 4, y: 4 } });
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();

            // Act — reopen the same modal to prove Escape is restored too, in the same render tree.
            await screen.getByRole("button", { name: "Reopen" }).click();
            await expect.element(screen.getByRole("dialog")).toBeVisible();

            // Assert — Escape now closes it as well.
            await userEvent.keyboard("{Escape}");
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
        });
    },
});
