import type { ComponentProps } from "react";
import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { DEVICE_TYPE } from "@/lib/viewport-breakpoints";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

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
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default, a
 * blanket regression net rather than a hand-picked set of viewport-conditional assertions. Most
 * tests below run identically at both sizes; the padding test further down branches on `device`
 * because that assertion genuinely differs by viewport (the whole reason describeForEachDevice
 * exists in the first place).
 */
describeForEachDevice("Modal", (device) => {
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
         * Arrange — `rounded-lg`/`shadow-lg`/`overflow-hidden` live on the dialog popup itself;
         * the scrollable region is a separate inner wrapper. Putting `overflow-y-auto` directly on
         * the rounded/shadowed element let the native scrollbar and the scrolled content's edge
         * render outside the rounded corners once the body actually scrolled, breaking the panel's
         * silhouette. This guards that regression by asserting the popup itself never grows past
         * its cap (so it never needs to scroll) while its inner child does.
         */
        const longContent = Array.from({ length: 40 }, (_, index) => {
            const position = String(index);
            return <p key={position}>{`Activity entry ${position} — long content to force scrolling.`}</p>;
        });
        const screen = await render(
            <Modal.Root defaultOpen>
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
         * Arrange — ADR tech/0010: the panel's own width already scales down correctly at a
         * narrow viewport (w-[min(90vw,28rem)]), but the padding did not — asserts the
         * mobile-first p-4 md:p-6 utility pair actually resolves to different real computed
         * padding at the two viewports (page.viewport already resized the test iframe to this
         * device's size in describeForEachDevice's beforeEach), not just that both class names
         * are present in the className string.
         */
        const screen = await render(
            <Modal.Root defaultOpen>
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
});
