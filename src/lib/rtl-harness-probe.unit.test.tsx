import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RtlHarnessProbe } from "./rtl-harness-probe";

describe("RtlHarnessProbe (RTL/jsdom harness smoke test)", () => {
    it("is found by its accessible role and name", () => {
        // Arrange
        render(<RtlHarnessProbe onClick={vi.fn()} />);

        // Assert
        expect(screen.getByRole("button", { name: "Probe" })).toBeInTheDocument();
    });

    it("invokes onClick exactly once on click", async () => {
        // Arrange
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<RtlHarnessProbe onClick={onClick} />);

        // Act
        await user.click(screen.getByRole("button", { name: "Probe" }));

        // Assert
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("invokes onClick on keyboard Enter", async () => {
        // Arrange
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<RtlHarnessProbe onClick={onClick} />);
        const button = screen.getByRole("button", { name: "Probe" });

        // Act
        button.focus();
        await user.keyboard("{Enter}");

        // Assert
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("renders disabled and suppresses activation on click when isDisabled", async () => {
        // Arrange
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<RtlHarnessProbe isDisabled onClick={onClick} />);
        const button = screen.getByRole("button", { name: "Probe" });

        // Assert (rendered state)
        expect(button).toBeDisabled();

        // Act + Assert (click)
        await user.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });
});
