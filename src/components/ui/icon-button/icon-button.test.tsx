import { Eye } from "lucide-react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { IconButton } from "./icon-button";

/*
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default, a
 * blanket regression net rather than a hand-picked set of viewport-conditional assertions.
 * IconButton has no viewport-conditional behavior of its own (confirmed in the ADR tech/0010
 * mobile review — fixed-size hit areas, no md:/lg: classes) — every test here runs identically
 * at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "IconButton",
    body: () => {
        it("exposes the label prop as its accessible name even though it renders no visible text", async () => {
            // Arrange
            const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={vi.fn()} />);
            const button = screen.getByRole("button", { name: "Show password" });

            // Assert
            await expect.element(button).toBeVisible();
            expect(button.element().textContent).toBe("");
        });

        it("invokes onClick exactly once on click", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={onClick} />);

            // Act
            await screen.getByRole("button", { name: "Show password" }).click();

            // Assert
            expect(onClick).toHaveBeenCalledOnce();
        });

        it("invokes onClick on keyboard Enter", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={onClick} />);
            const button = screen.getByRole("button", { name: "Show password" });

            // Act
            button.element().focus();
            await userEvent.keyboard("{Enter}");

            // Assert
            expect(onClick).toHaveBeenCalledOnce();
        });

        it("suppresses activation when isDisabled", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(
                <IconButton label="Show password" icon={<Eye />} isDisabled onClick={onClick} />,
            );
            const button = screen.getByRole("button", { name: "Show password" });

            // Assert (rendered state)
            await expect.element(button).toBeDisabled();

            // Act + Assert (click)
            (button.element() as HTMLButtonElement).click();
            expect(onClick).not.toHaveBeenCalled();

            // Act + Assert (keyboard)
            button.element().focus();
            await userEvent.keyboard("{Enter}");
            expect(onClick).not.toHaveBeenCalled();
        });

        it("has a hit area of at least 44 x 44 CSS pixels at every size, including sm", async () => {
            // Arrange
            const sm = await render(<IconButton label="Small" icon={<Eye />} size="sm" />);
            const md = await render(<IconButton label="Medium" icon={<Eye />} size="md" />);
            const lg = await render(<IconButton label="Large" icon={<Eye />} size="lg" />);

            // Assert
            for (const [screen, name] of [
                [sm, "Small"],
                [md, "Medium"],
                [lg, "Large"],
            ] as const) {
                const rect = screen.getByRole("button", { name }).element().getBoundingClientRect();
                expect(rect.width).toBeGreaterThanOrEqual(44);
                expect(rect.height).toBeGreaterThanOrEqual(44);
            }
        });

        it("lets a consumer className win over a conflicting base background class (merge, not concatenation)", async () => {
            // Arrange
            const screen = await render(<IconButton label="Delete" icon={<Eye />} className="bg-bg-danger" />);
            const button = screen.getByRole("button", { name: "Delete" });

            // Act
            const backgroundColor = getComputedStyle(button.element()).backgroundColor;

            // Assert — #C93F3C (the danger background) must win, proving merge over concatenation.
            expect(backgroundColor).toBe("rgb(201, 63, 60)");
        });
    },
});
