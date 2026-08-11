import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { HarnessProbe } from "./harness-probe";

describe("HarnessProbe", () => {
  it("is found by its accessible role and name", async () => {
    const screen = await render(<HarnessProbe label="Probe" onActivate={vi.fn()} />);

    await expect.element(screen.getByRole("button", { name: "Probe" })).toBeVisible();
  });

  it("invokes onActivate on click", async () => {
    const onActivate = vi.fn();
    const screen = await render(<HarnessProbe label="Probe" onActivate={onActivate} />);

    await screen.getByRole("button", { name: "Probe" }).click();

    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("invokes onActivate on keyboard Enter", async () => {
    const onActivate = vi.fn();
    const screen = await render(<HarnessProbe label="Probe" onActivate={onActivate} />);
    const button = screen.getByRole("button", { name: "Probe" });

    button.element().focus();
    await userEvent.keyboard("{Enter}");

    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("renders disabled and suppresses activation", async () => {
    const onActivate = vi.fn();
    const screen = await render(<HarnessProbe label="Probe" isDisabled onActivate={onActivate} />);
    const button = screen.getByRole("button", { name: "Probe" });

    await expect.element(button).toBeDisabled();

    // A native DOM click() on a disabled button never dispatches the click event — proves
    // activation is genuinely suppressed by the browser, not merely unasserted.
    (button.element() as HTMLButtonElement).click();

    expect(onActivate).not.toHaveBeenCalled();
  });
});
