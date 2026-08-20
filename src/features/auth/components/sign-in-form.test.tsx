import { composeStories } from "@storybook/react";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render, type RenderResult } from "vitest-browser-react";

import { AUTH_ACTION_IDLE, type AuthActionState } from "@/features/auth/action-state";
import { signInAction } from "@/features/auth/actions/sign-in";
import { PROBLEM_CODE, type ProblemCode } from "@/lib/core/api-contract/problem-detail";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { SignInForm } from "./sign-in-form";
import * as signInStories from "./sign-in-form.stories";

/*
 * Reuses sign-in-form.stories.tsx's own staged args/decorators (GC-08) instead of restating them
 * here — the Storybook preview annotations registered in vitest.setup.ts (provider tree, theme
 * class) are applied automatically since `setProjectAnnotations` runs once for this whole
 * "browser" project. Every assertion below still lives in this file, per D-25 — composing a story
 * only reuses its render setup, never its (nonexistent) play function.
 */
const { Filled, WithFieldErrors, WithServerError, Submitting, PasswordRevealed } = composeStories(signInStories);

/*
 * `SignInForm` submits directly to `signInAction` (`@/features/auth/actions`) through
 * `useActionState` — the server function this app's form now calls, replacing the deleted fetch
 * wrapper and mutation hook (plan 01-33). Stubbing that module boundary — not a network layer —
 * keeps the real component tree, the real resolver and real rendering under test, while never
 * depending on any server (real or mock) actually being reachable (GC-22: no fake HTTP layer of
 * any kind remains in this repository). `AUTH_ACTION_IDLE` is re-declared here rather than
 * imported through the mock factory (Vitest's hoisting forbids referencing an out-of-scope
 * variable inside `vi.mock`'s factory) — its shape must stay byte-identical to the real constant.
 */
vi.mock("@/features/auth/actions/sign-in", () => ({
    signInAction: vi.fn(),
    AUTH_ACTION_IDLE: { status: "idle" },
}));

const mockedSignInAction = vi.mocked(signInAction);

const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

const renderSignInForm = () => renderWithProviders(<SignInForm />);

const formDataToObject = (formData: FormData): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
            result[key] = value;
        }
    }
    return result;
};

const buildErrorState = ({
    code,
    message,
    fieldErrors,
}: {
    code: ProblemCode;
    message: string;
    fieldErrors?: Record<string, string>;
}): AuthActionState => ({ status: "error", code, message, fieldErrors });

/*
 * One case per composed story asserting the staged state that story is supposed to demonstrate —
 * parametrised (D-26y) rather than a near-identical `it()` per story. These props are declared in
 * sign-in-form.stories.tsx and, until this task, asserted nowhere; a human opening Storybook was
 * their only check.
 */
const signInStagedStoryCases = [
    {
        name: "Filled",
        Story: Filled,
        verify: async (screen: RenderResult) => {
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toHaveValue("user@example.com");
            await expect
                .element(screen.getByLabelText("Password", { exact: true }))
                .toHaveValue("correct-horse-battery-staple");
        },
    },
    {
        name: "WithFieldErrors",
        Story: WithFieldErrors,
        verify: async (screen: RenderResult) => {
            await expect.poll(() => screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(2);
        },
    },
    {
        name: "WithServerError",
        Story: WithServerError,
        verify: async (screen: RenderResult) => {
            await expect.element(screen.getByRole("alert")).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
        },
    },
    {
        name: "Submitting",
        Story: Submitting,
        verify: async (screen: RenderResult) => {
            const submitButton = screen.getByRole("button", { name: "Sign In" });
            const emailField = screen.getByRole("textbox", { name: "Email" });

            await expect.element(submitButton).toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "true");
            await expect.element(emailField).toHaveAttribute("aria-busy", "true");

            // A field refuses a typed character while the story stages it as busy.
            (emailField.element() as HTMLInputElement).focus();
            await userEvent.keyboard("z");
            expect((emailField.element() as HTMLInputElement).value).toBe("");
        },
    },
    {
        name: "PasswordRevealed",
        Story: PasswordRevealed,
        verify: async (screen: RenderResult) => {
            const passwordField = screen.getByLabelText("Password", { exact: true });

            await expect.element(passwordField).toHaveAttribute("type", "text");
            await expect.element(screen.getByRole("button", { name: "Hide password" })).toBeVisible();
        },
    },
];

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-in form has no viewport-conditional behavior of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "SignInForm",
    body: () => {
        afterEach(() => {
            mockedSignInAction.mockReset();
        });

        it("renders two labelled fields and the primary submit control, each reachable by its accessible name", async () => {
            // Arrange
            const screen = await renderSignInForm();

            // Assert
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toBeVisible();
            await expect.element(screen.getByLabelText("Password", { exact: true })).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
        });

        it("submits through the form element's own action, not a submit handler, so it works before hydration", async () => {
            // Arrange
            const screen = await renderSignInForm();

            /*
             * Assert — React renders a function-based `action` as a distinctive no-JS fallback
             * (`javascript:throw new Error("A React form was unexpectedly submitted...")`), never
             * as a real URL — the property that makes the form work before hydration, and it is
             * invisible to every other assertion in this file.
             */
            const form = screen.container.querySelector("form");
            expect(form?.getAttribute("action")).toContain("A React form was unexpectedly submitted");
        });

        it("renders the server-returned field errors on their own fields when an empty submission is rejected, calling signInAction exactly once", async () => {
            // Arrange
            mockedSignInAction.mockResolvedValueOnce(
                buildErrorState({
                    code: PROBLEM_CODE.VALIDATION_FAILED,
                    message: INVALID_CREDENTIALS_MESSAGE,
                    fieldErrors: { email: REQUIRED_FIELD_MESSAGE, password: REQUIRED_FIELD_MESSAGE },
                }),
            );
            const screen = await renderSignInForm();

            // Act
            await screen.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.poll(() => screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(2);
            expect(mockedSignInAction).toHaveBeenCalledOnce();
        });

        it("shows the email-format message on blur for an invalid email, and no other field", async () => {
            // Arrange
            const screen = await renderSignInForm();

            // Act
            await screen.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await userEvent.tab();

            // Assert
            await expect.element(screen.getByText("Enter a valid email address.")).toBeVisible();
            expect(screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(0);
        });

        it("calls signInAction exactly once with the typed values on a valid submit", async () => {
            // Arrange
            mockedSignInAction.mockResolvedValueOnce(AUTH_ACTION_IDLE);
            const screen = await renderSignInForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await screen.getByLabelText("Password", { exact: true }).fill("correct-horse-battery-staple");

            // Act
            await screen.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.poll(() => mockedSignInAction.mock.calls.length).toBe(1);
            const submittedFormData = mockedSignInAction.mock.calls[0]?.[1];
            expect(submittedFormData).toBeInstanceOf(FormData);
            expect(formDataToObject(submittedFormData)).toEqual({
                email: "demo@kanban-board.dev",
                password: "correct-horse-battery-staple",
            });
        });

        it("disables the submit control and shows a loading state while in flight", async () => {
            // Arrange
            let resolveAction: (state: AuthActionState) => void = () => undefined;
            const actionGate = new Promise<AuthActionState>((resolve) => {
                resolveAction = resolve;
            });
            mockedSignInAction.mockImplementationOnce(async () => actionGate);
            const screen = await renderSignInForm();
            const emailField = screen.getByRole("textbox", { name: "Email" });
            const emailValue = "demo@kanban-board.dev";
            await emailField.fill(emailValue);
            await screen.getByLabelText("Password", { exact: true }).fill("correct-horse-battery-staple");
            const submitButton = screen.getByRole("button", { name: "Sign In" });

            // Act
            await submitButton.click();

            // Assert
            await expect.element(submitButton).toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "true");
            await expect.element(emailField).toHaveAttribute("aria-busy", "true");

            /*
             * Act + Assert — the field refuses focus while pending (GC-17: isLoading now composes
             * into disabled), so a subsequent keypress never registers a value change.
             */
            await expect.element(emailField).toBeDisabled();
            (emailField.element() as HTMLInputElement).focus();
            expect(emailField.element()).not.toBe(document.activeElement);
            await userEvent.keyboard("z");
            expect((emailField.element() as HTMLInputElement).value).toBe(emailValue);

            // Act
            resolveAction(AUTH_ACTION_IDLE);

            // Assert
            await expect.element(submitButton).not.toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "false");
            await expect.element(emailField).toHaveAttribute("aria-busy", "false");
            /*
             * React resets every uncontrolled field the instant a `<form action={fn}>` submission
             * settles (its own built-in `requestFormReset`, fired around every action call); the
             * form's effect restores the value straight after, in a separate, asynchronously
             * flushed passive effect — polled for explicitly here rather than assumed synchronous
             * with the `aria-busy` flip above, which can otherwise resolve first.
             */
            await expect.poll(() => (emailField.element() as HTMLInputElement).value).toBe(emailValue);

            /*
             * Act + Assert — editable again once the action settles. The earlier `.focus()` call
             * was refused by the browser (the field was genuinely disabled, not readOnly), so focus
             * must be re-acquired explicitly now that the field is enabled again.
             */
            (emailField.element() as HTMLInputElement).focus();
            await userEvent.keyboard("z");
            expect((emailField.element() as HTMLInputElement).value).toBe(`${emailValue}z`);
        });

        it("renders the generic invalid-credentials message, clears the password, and keeps the email after a rejected sign-in", async () => {
            // Arrange
            mockedSignInAction.mockResolvedValueOnce(
                buildErrorState({ code: PROBLEM_CODE.BAD_CREDENTIALS, message: INVALID_CREDENTIALS_MESSAGE }),
            );
            const screen = await renderSignInForm();
            const emailValue = "demo@kanban-board.dev";
            await screen.getByRole("textbox", { name: "Email" }).fill(emailValue);
            await screen.getByLabelText("Password", { exact: true }).fill("wrong-password");

            // Act
            await screen.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toHaveValue(emailValue);
            await expect.element(screen.getByLabelText("Password", { exact: true })).toHaveValue("");
        });

        it("renders the identical failure message for two different rejection codes (the anti-enumeration collapse)", async () => {
            /*
             * The backend collapses an unknown email, a wrong password and a refused third
             * concurrent session into the exact same `BAD_CREDENTIALS` code (kanban-board-
             * backend's docs/AUTH_FLOWS.md) — there is no distinct code per cause to feed this
             * test. Feeding two genuinely different codes (`BAD_CREDENTIALS` and the
             * `INTERNAL_ERROR` fallback `signInAction` uses for a malformed upstream response)
             * instead proves the stronger property: this component's rendered message never
             * varies with the code, whatever it is.
             */
            // Arrange — the first rejection code.
            mockedSignInAction.mockResolvedValueOnce(
                buildErrorState({ code: PROBLEM_CODE.BAD_CREDENTIALS, message: INVALID_CREDENTIALS_MESSAGE }),
            );
            const firstScreen = await renderSignInForm();
            await firstScreen.getByRole("textbox", { name: "Email" }).fill("nobody@example.com");
            await firstScreen.getByLabelText("Password", { exact: true }).fill("whatever-password");
            await firstScreen.getByRole("button", { name: "Sign In" }).click();
            await expect.element(firstScreen.getByRole("alert")).toBeVisible();
            const firstMessage = firstScreen.getByRole("alert").element().textContent;
            /*
             * vitest-browser-react's queries resolve against the whole page, not the render's own
             * container — the first render must be unmounted before the second mounts, or both
             * forms' fields collide as duplicate matches for the same accessible name.
             */
            await firstScreen.unmount();

            // Arrange — a different rejection code.
            mockedSignInAction.mockResolvedValueOnce(
                buildErrorState({ code: PROBLEM_CODE.INTERNAL_ERROR, message: INVALID_CREDENTIALS_MESSAGE }),
            );
            const secondScreen = await renderSignInForm();
            await secondScreen.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await secondScreen.getByLabelText("Password", { exact: true }).fill("not-the-right-password");
            await secondScreen.getByRole("button", { name: "Sign In" }).click();
            await expect.element(secondScreen.getByRole("alert")).toBeVisible();
            const secondMessage = secondScreen.getByRole("alert").element().textContent;

            // Assert
            expect(secondMessage).toBe(firstMessage);
        });

        it("renders the password field masked by default, reveals it via the toggle, and updates the toggle's accessible name", async () => {
            // Arrange
            const screen = await renderSignInForm();
            const passwordField = screen.getByLabelText("Password", { exact: true });

            // Assert (initial masked state)
            await expect.element(passwordField).toHaveAttribute("type", "password");

            // Act
            await screen.getByRole("button", { name: "Show password" }).click();

            // Assert
            await expect.element(passwordField).toHaveAttribute("type", "text");
            await expect.element(screen.getByRole("button", { name: "Hide password" })).toBeVisible();
        });

        for (const { name, Story, verify } of signInStagedStoryCases) {
            it(`renders the "${name}" story's staged state`, async () => {
                // Arrange
                const screen = await render(<Story />);

                // Assert
                await verify(screen);
            });
        }
    },
});
