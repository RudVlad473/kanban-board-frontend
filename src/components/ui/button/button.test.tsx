import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { Button } from "./button";

describe("Button", () => {
    it("is found by its accessible role and name", async () => {
        // Arrange
        const screen = await render(<Button onClick={vi.fn()}>Create Account</Button>);

        // Assert
        await expect.element(screen.getByRole("button", { name: "Create Account" })).toBeVisible();
    });

    it("invokes onClick exactly once on click", async () => {
        // Arrange
        const onClick = vi.fn();
        const screen = await render(<Button onClick={onClick}>Submit</Button>);

        // Act
        await screen.getByRole("button", { name: "Submit" }).click();

        // Assert
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("invokes onClick on keyboard Enter", async () => {
        // Arrange
        const onClick = vi.fn();
        const screen = await render(<Button onClick={onClick}>Submit</Button>);
        const button = screen.getByRole("button", { name: "Submit" });

        // Act
        button.element().focus();
        await userEvent.keyboard("{Enter}");

        // Assert
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("invokes onClick on keyboard Space", async () => {
        // Arrange
        const onClick = vi.fn();
        const screen = await render(<Button onClick={onClick}>Submit</Button>);
        const button = screen.getByRole("button", { name: "Submit" });

        // Act
        button.element().focus();
        await userEvent.keyboard(" ");

        // Assert
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("renders disabled and suppresses activation on click and keyboard when isDisabled", async () => {
        // Arrange
        const onClick = vi.fn();
        const screen = await render(
            <Button isDisabled onClick={onClick}>
                Submit
            </Button>,
        );
        const button = screen.getByRole("button", { name: "Submit" });

        // Assert (rendered state)
        await expect.element(button).toBeDisabled();

        /*
         * Act + Assert (click) — a native DOM click() on a disabled button never dispatches the
         * click event, proving activation is genuinely suppressed by the browser, not merely
         * unasserted.
         */
        (button.element() as HTMLButtonElement).click();
        expect(onClick).not.toHaveBeenCalled();

        // Act + Assert (keyboard)
        button.element().focus();
        await userEvent.keyboard("{Enter}");
        expect(onClick).not.toHaveBeenCalled();
    });

    it("lets a consumer className win over a conflicting base background class (merge, not concatenation)", async () => {
        // Arrange
        const screen = await render(<Button className="bg-bg-danger">Delete</Button>);
        const button = screen.getByRole("button", { name: "Delete" });

        // Act
        const backgroundColor = getComputedStyle(button.element()).backgroundColor;

        /*
         * Assert — #C93F3C (the danger background) must win over the primary-variant default
         * (#635FC7).
         */
        expect(backgroundColor).toBe("rgb(201, 63, 60)");
    });

    it("keeps the on-primary (white) label color when a filled variant is disabled, instead of the low-contrast muted-text token", async () => {
        /*
         * Arrange — `text-muted` is tuned for muted text on a *light surface*. Swapping to it on
         * disable for a *filled* button (primary/destructive) combined with the shared
         * `disabled:opacity-50` collapsed the label to near-invisible: a dark-grey label over an
         * already-faded purple/red fill. The label must stay on the same on-primary token disabled
         * as enabled — opacity alone communicates the disabled state.
         */
        const primary = await render(
            <Button variant="primary" isDisabled>
                Primary
            </Button>,
        );
        const destructive = await render(
            <Button variant="destructive" isDisabled>
                Destructive
            </Button>,
        );

        // Act
        const primaryColor = getComputedStyle(primary.getByRole("button", { name: "Primary" }).element()).color;
        const destructiveColor = getComputedStyle(
            destructive.getByRole("button", { name: "Destructive" }).element(),
        ).color;

        /*
         * Assert — rgb(255, 255, 255) is `text-on-primary`; text-muted (#66707F) would read
         * rgb(102, 112, 127).
         */
        expect(primaryColor).toBe("rgb(255, 255, 255)");
        expect(destructiveColor).toBe("rgb(255, 255, 255)");
    });

    it("renders a distinct background for each variant", async () => {
        // Arrange
        const primary = await render(<Button variant="primary">Primary</Button>);
        const secondary = await render(<Button variant="secondary">Secondary</Button>);
        const destructive = await render(<Button variant="destructive">Destructive</Button>);

        // Act
        const primaryBg = getComputedStyle(primary.getByRole("button", { name: "Primary" }).element()).backgroundColor;
        const secondaryBg = getComputedStyle(
            secondary.getByRole("button", { name: "Secondary" }).element(),
        ).backgroundColor;
        const destructiveBg = getComputedStyle(
            destructive.getByRole("button", { name: "Destructive" }).element(),
        ).backgroundColor;

        // Assert
        expect(new Set([primaryBg, secondaryBg, destructiveBg]).size).toBe(3);
    });

    it("renders a distinct height for each size", async () => {
        // Arrange
        const sm = await render(<Button size="sm">Small</Button>);
        const md = await render(<Button size="md">Medium</Button>);
        const lg = await render(<Button size="lg">Large</Button>);

        // Act
        const smHeight = getComputedStyle(sm.getByRole("button", { name: "Small" }).element()).height;
        const mdHeight = getComputedStyle(md.getByRole("button", { name: "Medium" }).element()).height;
        const lgHeight = getComputedStyle(lg.getByRole("button", { name: "Large" }).element()).height;

        // Assert
        expect(new Set([smHeight, mdHeight, lgHeight]).size).toBe(3);
    });
});
