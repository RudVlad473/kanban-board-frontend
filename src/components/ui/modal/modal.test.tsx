import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { Modal } from "./modal";

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

// The floating backdrop `<div>` (no ARIA role of its own) rendered by `Modal.Content` — the
// dialog's own popup gets `role="dialog"`, so filtering it out unambiguously isolates the backdrop
// regardless of DOM order.
const getBackdropElement = () => {
    const backdrop = Array.from(document.querySelectorAll<HTMLElement>("[data-open]")).find(
        (el) => el.getAttribute("role") !== "dialog",
    );
    if (!backdrop) {
        throw new Error("Modal backdrop element not found — is the dialog open?");
    }
    return backdrop;
};

describe("Modal", () => {
    it("renders nothing into the accessibility tree while closed, leaving the page behind it reachable", async () => {
        // Arrange
        const screen = await renderModal();

        // Act
        const outside = screen.getByRole("button", { name: "Outside link" });

        // Assert
        await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
        await expect.element(outside).toBeVisible();
    });

    it("renders a dialog whose accessible name is the Modal.Title text once open", async () => {
        // Arrange
        const screen = await renderModal({ defaultOpen: true });

        // Act
        const dialog = screen.getByRole("dialog", { name: "Delete board" });

        // Assert
        await expect.element(dialog).toBeVisible();
    });

    it("exposes Modal.Description as the dialog's accessible description", async () => {
        // Arrange
        const screen = await renderModal({ defaultOpen: true });

        // Act
        const dialog = screen.getByRole("dialog", { name: "Delete board" });

        // Assert
        await expect.element(dialog).toHaveAccessibleDescription("This action cannot be undone.");
    });

    it("traps Tab focus inside the dialog — tabbing past the last focusable element wraps to the first rather than escaping to the page behind it", async () => {
        // Arrange
        const screen = await renderModal({ defaultOpen: true });
        const input = screen.getByRole("textbox", { name: "Confirmation text" });
        const confirm = screen.getByRole("button", { name: "Confirm" });

        // Act — focus the last focusable element inside the dialog (Confirm), then Tab once more.
        confirm.element().focus();
        await userEvent.tab();

        // Assert — focus wrapped to the first focusable element inside the dialog, not the page's
        // own "Outside link" button sitting behind it.
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

        // Act — click a corner of the full-viewport backdrop that the centered dialog panel does
        // not cover.
        const backdrop = page.elementLocator(getBackdropElement());
        await backdrop.click({ position: { x: 4, y: 4 } });

        // Assert
        expect(onOpenChange).toHaveBeenCalledWith(false);
        await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
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
});
