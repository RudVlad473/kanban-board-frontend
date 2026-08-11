import { Eye } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { IconButton } from "./icon-button";

describe("IconButton", () => {
    it("exposes the label prop as its accessible name even though it renders no visible text", async () => {
        const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={vi.fn()} />);

        const button = screen.getByRole("button", { name: "Show password" });
        await expect.element(button).toBeVisible();
        expect(button.element().textContent).toBe("");
    });

    it("invokes onClick exactly once on click", async () => {
        const onClick = vi.fn();
        const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={onClick} />);

        await screen.getByRole("button", { name: "Show password" }).click();

        expect(onClick).toHaveBeenCalledOnce();
    });

    it("invokes onClick on keyboard Enter", async () => {
        const onClick = vi.fn();
        const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={onClick} />);
        const button = screen.getByRole("button", { name: "Show password" });

        button.element().focus();
        await userEvent.keyboard("{Enter}");

        expect(onClick).toHaveBeenCalledOnce();
    });

    it("suppresses activation when isDisabled", async () => {
        const onClick = vi.fn();
        const screen = await render(<IconButton label="Show password" icon={<Eye />} isDisabled onClick={onClick} />);
        const button = screen.getByRole("button", { name: "Show password" });

        await expect.element(button).toBeDisabled();

        (button.element() as HTMLButtonElement).click();
        expect(onClick).not.toHaveBeenCalled();

        button.element().focus();
        await userEvent.keyboard("{Enter}");
        expect(onClick).not.toHaveBeenCalled();
    });

    it("has a hit area of at least 44 x 44 CSS pixels at every size, including sm", async () => {
        const sm = await render(<IconButton label="Small" icon={<Eye />} size="sm" />);
        const md = await render(<IconButton label="Medium" icon={<Eye />} size="md" />);
        const lg = await render(<IconButton label="Large" icon={<Eye />} size="lg" />);

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
        const screen = await render(<IconButton label="Delete" icon={<Eye />} className="bg-bg-danger" />);
        const button = screen.getByRole("button", { name: "Delete" });

        const backgroundColor = getComputedStyle(button.element()).backgroundColor;

        // #C93F3C — the danger background — must win, proving merge over concatenation.
        expect(backgroundColor).toBe("rgb(201, 63, 60)");
    });
});
