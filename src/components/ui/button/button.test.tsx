import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { Button } from "./button";

describe("Button", () => {
    it("is found by its accessible role and name", async () => {
        const screen = await render(<Button onClick={vi.fn()}>Create Account</Button>);

        await expect.element(screen.getByRole("button", { name: "Create Account" })).toBeVisible();
    });

    it("invokes onClick exactly once on click", async () => {
        const onClick = vi.fn();
        const screen = await render(<Button onClick={onClick}>Submit</Button>);

        await screen.getByRole("button", { name: "Submit" }).click();

        expect(onClick).toHaveBeenCalledOnce();
    });

    it("invokes onClick on keyboard Enter", async () => {
        const onClick = vi.fn();
        const screen = await render(<Button onClick={onClick}>Submit</Button>);
        const button = screen.getByRole("button", { name: "Submit" });

        button.element().focus();
        await userEvent.keyboard("{Enter}");

        expect(onClick).toHaveBeenCalledOnce();
    });

    it("invokes onClick on keyboard Space", async () => {
        const onClick = vi.fn();
        const screen = await render(<Button onClick={onClick}>Submit</Button>);
        const button = screen.getByRole("button", { name: "Submit" });

        button.element().focus();
        await userEvent.keyboard(" ");

        expect(onClick).toHaveBeenCalledOnce();
    });

    it("renders disabled and suppresses activation on click and keyboard when isDisabled", async () => {
        const onClick = vi.fn();
        const screen = await render(
            <Button isDisabled onClick={onClick}>
                Submit
            </Button>,
        );
        const button = screen.getByRole("button", { name: "Submit" });

        await expect.element(button).toBeDisabled();

        // A native DOM click() on a disabled button never dispatches the click event — proves
        // activation is genuinely suppressed by the browser, not merely unasserted.
        (button.element() as HTMLButtonElement).click();
        expect(onClick).not.toHaveBeenCalled();

        button.element().focus();
        await userEvent.keyboard("{Enter}");
        expect(onClick).not.toHaveBeenCalled();
    });

    it("lets a consumer className win over a conflicting base background class (merge, not concatenation)", async () => {
        const screen = await render(<Button className="bg-bg-danger">Delete</Button>);
        const button = screen.getByRole("button", { name: "Delete" });

        const backgroundColor = getComputedStyle(button.element()).backgroundColor;

        // #C93F3C — the danger background — must win over the primary-variant default (#635FC7).
        expect(backgroundColor).toBe("rgb(201, 63, 60)");
    });

    it("renders a distinct background for each variant", async () => {
        const primary = await render(<Button variant="primary">Primary</Button>);
        const secondary = await render(<Button variant="secondary">Secondary</Button>);
        const destructive = await render(<Button variant="destructive">Destructive</Button>);

        const primaryBg = getComputedStyle(primary.getByRole("button", { name: "Primary" }).element()).backgroundColor;
        const secondaryBg = getComputedStyle(
            secondary.getByRole("button", { name: "Secondary" }).element(),
        ).backgroundColor;
        const destructiveBg = getComputedStyle(
            destructive.getByRole("button", { name: "Destructive" }).element(),
        ).backgroundColor;

        expect(new Set([primaryBg, secondaryBg, destructiveBg]).size).toBe(3);
    });

    it("renders a distinct height for each size", async () => {
        const sm = await render(<Button size="sm">Small</Button>);
        const md = await render(<Button size="md">Medium</Button>);
        const lg = await render(<Button size="lg">Large</Button>);

        const smHeight = getComputedStyle(sm.getByRole("button", { name: "Small" }).element()).height;
        const mdHeight = getComputedStyle(md.getByRole("button", { name: "Medium" }).element()).height;
        const lgHeight = getComputedStyle(lg.getByRole("button", { name: "Large" }).element()).height;

        expect(new Set([smHeight, mdHeight, lgHeight]).size).toBe(3);
    });
});
