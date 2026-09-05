/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (vitest.setup.ts documents this in full; text-field.test.tsx is the proven precedent).
 */
import { composeStories } from "@storybook/react";
import { isNil } from "es-toolkit";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./textarea.stories";

/* `Error` is aliased rather than destructured bare — the CSF name shadows the global constructor. */
const {
    Idle,
    Error: ErrorStory,
    ErrorMessageWithoutError,
    Disabled,
    Loading,
    WithDescription,
    LongValue,
} = composeStories(stories);

/** 04-UI-SPEC.md's tier-2 `min-h-28` row — 112px, measured 110.9px on PDF p6. */
const MINIMUM_BOX_HEIGHT = 112;

/*
 * Narrows a render's own container to its control. Needed only where two renders share a label,
 * which a page-wide role query rejects under Playwright's strict mode.
 */
const readTextarea = (container: HTMLElement) => {
    const control = container.querySelector("textarea");
    if (isNil(control)) {
        throw new Error("expected the composed story to render a textarea");
    }
    return control;
};

/*
 * ADR tech/0014: every primitive's suite runs at both viewports by default. Textarea has no
 * viewport-conditional behaviour of its own; the box's minimum height is viewport-independent.
 */
describeForEachDevice({
    name: "Textarea",
    body: () => {
        it("associates the visible label with the control as its accessible name", async () => {
            // Act
            const screen = await render(<Idle />);

            // Assert
            await expect.element(screen.getByRole("textbox", { name: "Description" })).toBeInTheDocument();
        });

        /*
         * The whole reason this primitive exists rather than a TextField variant: text-field.tsx
         * mounts a fixed-height `<input>`, which cannot be a Description box.
         */
        it("mounts a real textarea element rather than the input TextField renders", async () => {
            // Act
            const screen = await render(<Idle />);
            const control = screen.getByRole("textbox", { name: "Description" });

            // Assert
            expect(control.element().tagName).toBe("TEXTAREA");
        });

        it("renders the error message, marks the control invalid, and exposes the message as its accessible description when hasError", async () => {
            // Act
            const screen = await render(<ErrorStory />);
            const control = screen.getByRole("textbox", { name: "Description" });
            const message = screen.getByText("Can't be empty");

            // Assert
            await expect.element(message).toBeVisible();
            await expect.element(control).toHaveAttribute("aria-invalid", "true");
            expect(control.element().getAttribute("aria-describedby")).toContain(message.element().id);
        });

        it("renders no error message element and does not mark the control invalid when an errorMessage is supplied without hasError", async () => {
            // Act
            const screen = await render(<ErrorMessageWithoutError />);
            const control = screen.getByRole("textbox", { name: "Description" });

            // Assert
            expect(screen.container.textContent).not.toContain("Can't be empty");
            await expect.element(control).not.toHaveAttribute("aria-invalid");
        });

        it("renders its description text when one is supplied", async () => {
            // Act
            const screen = await render(<WithDescription />);

            // Assert
            await expect.element(screen.getByText("Optional — subtasks carry the detail.")).toBeVisible();
        });

        it("renders disabled when isDisabled", async () => {
            // Act
            const screen = await render(<Disabled />);

            // Assert
            await expect.element(screen.getByRole("textbox", { name: "Description" })).toBeDisabled();
        });

        it("renders disabled and reports itself busy when isLoading", async () => {
            // Act
            const screen = await render(<Loading />);
            const control = screen.getByRole("textbox", { name: "Description" });

            // Assert
            await expect.element(control).toBeDisabled();
            await expect.element(control).toHaveAttribute("aria-busy", "true");
        });

        /*
         * IsLoading composes into native disabled, so the base disabled:opacity-50 always
         * outranks isBusy's class; cursor stays the sole busy-vs-disabled differentiator.
         */
        it("a loading box visually matches disabled but keeps a distinct busy cursor", async () => {
            /*
             * Arrange — both stories carry the same label and a composed story may not be
             * re-configured (ADR tech/0025), so each control is read out of its own render's
             * container rather than through a page-wide, strict-mode role query.
             */
            const loading = await render(<Loading />);
            const disabled = await render(<Disabled />);
            const loadingControl = readTextarea(loading.container);
            const disabledControl = readTextarea(disabled.container);

            // Act
            const loadingStyle = getComputedStyle(loadingControl);
            const disabledStyle = getComputedStyle(disabledControl);

            // Assert
            expect(loadingStyle.opacity).toBe("0.5");
            expect(disabledStyle.opacity).toBe("0.5");
            expect(loadingStyle.cursor).toBe("progress");
            expect(disabledStyle.cursor).not.toBe("progress");
        });

        it("focuses the control when its label is clicked", async () => {
            // Arrange
            const screen = await render(<Idle />);
            const control = screen.getByRole("textbox", { name: "Description" });

            // Act
            await screen.getByText("Description").click();

            // Assert
            expect(control.element()).toBe(document.activeElement);
        });

        it("renders at no less than its 112px minimum box when empty", async () => {
            // Act
            const screen = await render(<Idle />);
            const control = screen.getByRole("textbox", { name: "Description" });

            // Assert
            expect(control.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(MINIMUM_BOX_HEIGHT);
        });

        it("scrolls content past its minimum box instead of growing to fit it", async () => {
            // Act
            const screen = await render(<LongValue />);
            const control = screen.getByRole("textbox", { name: "Description" }).element() as HTMLTextAreaElement;

            // Assert — overflowing content stays inside the box rather than expanding the layout.
            expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(MINIMUM_BOX_HEIGHT);
            await expect.poll(() => control.scrollHeight > control.clientHeight).toBe(true);
        });

        it("holds its height when multi-line content is typed into it", async () => {
            // Arrange
            const screen = await render(<Idle />);
            const control = screen.getByRole("textbox", { name: "Description" }).element() as HTMLTextAreaElement;
            const emptyHeight = control.getBoundingClientRect().height;

            // Act — real keystrokes; "\n" inserts a newline in a textarea rather than submitting.
            await userEvent.type(control, "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight");

            // Assert
            expect(control.value).toContain("\n");
            expect(control.getBoundingClientRect().height).toBe(emptyHeight);
            expect(emptyHeight).toBeGreaterThanOrEqual(MINIMUM_BOX_HEIGHT);
        });
    },
});
