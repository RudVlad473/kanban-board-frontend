import { composeStories } from "@storybook/react";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render, type RenderResult } from "vitest-browser-react";

import { AUTH_ACTION_IDLE, signUpAction, type AuthActionState } from "@/features/auth/api/auth-actions";
import { PROBLEM_CODE, type ProblemCode } from "@/lib/api/problem-detail";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { SignUpForm } from "./sign-up-form";
import * as signUpStories from "./sign-up-form.stories";

/*
 * Reuses sign-up-form.stories.tsx's own staged args/decorators (GC-08) instead of restating them
 * here — the Storybook preview annotations registered in vitest.setup.ts (provider tree, theme
 * class) are applied automatically since `setProjectAnnotations` runs once for this whole
 * "browser" project. Every assertion below still lives in this file, per D-25 — composing a story
 * only reuses its render setup, never its (nonexistent) play function.
 */
const { Filled, WithFieldErrors, WithServerError, Submitting, PasswordRevealed } = composeStories(signUpStories);

/*
 * `SignUpForm` submits directly to `signUpAction` (`@/features/auth/api/auth-actions`) through
 * `useActionState` — the server function this app's form now calls, replacing the deleted fetch
 * wrapper and mutation hook (plan 01-33). Stubbing that module boundary — not a network layer —
 * keeps the real component tree, the real resolver and real rendering under test, while never
 * depending on any server (real or mock) actually being reachable (GC-22: no fake HTTP layer of
 * any kind remains in this repository). `AUTH_ACTION_IDLE` is re-declared here rather than
 * imported through the mock factory (Vitest's hoisting forbids referencing an out-of-scope
 * variable inside `vi.mock`'s factory) — its shape must stay byte-identical to the real constant.
 */
vi.mock("@/features/auth/api/auth-actions", () => ({
    signUpAction: vi.fn(),
    AUTH_ACTION_IDLE: { status: "idle" },
}));

const mockedSignUpAction = vi.mocked(signUpAction);

const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const SIGN_UP_FAILURE_MESSAGE =
    "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";

const renderSignUpForm = () => renderWithProviders(<SignUpForm />);

const formDataToObject = (formData: FormData): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && value !== "") {
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
 * sign-up-form.stories.tsx and, until this task, asserted nowhere; a human opening Storybook was
 * their only check.
 */
const signUpStagedStoryCases = [
    {
        name: "Filled",
        Story: Filled,
        verify: async (screen: RenderResult) => {
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toHaveValue("user@example.com");
            await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Jamie Rivera");
            await expect
                .element(screen.getByLabelText("Password", { exact: true }))
                .toHaveValue("correct-horse-battery-staple");
        },
    },
    {
        name: "WithFieldErrors",
        Story: WithFieldErrors,
        verify: async (screen: RenderResult) => {
            // Only Email and Password stage the required-field message — Name is optional (GC-02).
            await expect.poll(() => screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(2);
        },
    },
    {
        name: "WithServerError",
        Story: WithServerError,
        verify: async (screen: RenderResult) => {
            await expect.element(screen.getByRole("alert")).toHaveTextContent(SIGN_UP_FAILURE_MESSAGE);
        },
    },
    {
        name: "Submitting",
        Story: Submitting,
        verify: async (screen: RenderResult) => {
            const submitButton = screen.getByRole("button", { name: "Create Account" });
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
 * sign-up form has no viewport-conditional behavior of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "SignUpForm",
    body: () => {
        afterEach(() => {
            mockedSignUpAction.mockReset();
        });

        it("renders three labelled fields and the primary submit control, each reachable by its accessible name", async () => {
            // Arrange
            const screen = await renderSignUpForm();

            // Assert
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toBeVisible();
            await expect.element(screen.getByLabelText("Name")).toBeVisible();
            await expect.element(screen.getByLabelText("Password", { exact: true })).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Create Account" })).toBeVisible();
        });

        it("submits through the form element's own action, not a submit handler, so it works before hydration", async () => {
            // Arrange
            const screen = await renderSignUpForm();

            /*
             * Assert — React renders a function-based `action` as a distinctive no-JS fallback
             * (`javascript:throw new Error("A React form was unexpectedly submitted...")`), never
             * as a real URL — the property that makes the form work before hydration, and it is
             * invisible to every other assertion in this file.
             */
            const form = screen.container.querySelector("form");
            expect(form?.getAttribute("action")).toContain("A React form was unexpectedly submitted");
        });

        it("marks the Name field optional through its accessible description, not its label", async () => {
            // Arrange
            const screen = await renderSignUpForm();

            // Assert
            await expect.element(screen.getByLabelText("Name")).toHaveAccessibleDescription("Optional");
            await expect.element(screen.getByLabelText("Name")).toHaveAccessibleName("Name");
        });

        it("renders the server-returned field errors on their own fields (Name excluded, it is optional) when an empty submission is rejected, calling signUpAction exactly once", async () => {
            // Arrange
            mockedSignUpAction.mockResolvedValueOnce(
                buildErrorState({
                    code: PROBLEM_CODE.VALIDATION_FAILED,
                    message: SIGN_UP_FAILURE_MESSAGE,
                    fieldErrors: { email: REQUIRED_FIELD_MESSAGE, password: REQUIRED_FIELD_MESSAGE },
                }),
            );
            const screen = await renderSignUpForm();

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(2);
            expect(mockedSignUpAction).toHaveBeenCalledOnce();
        });

        it("shows the email-format message on blur for an invalid email, and no other field", async () => {
            // Arrange
            const screen = await renderSignUpForm();

            // Act
            await screen.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await userEvent.tab();

            // Assert
            await expect.element(screen.getByText("Enter a valid email address.")).toBeVisible();
            expect(screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(0);
        });

        /*
         * Parametrised over the rejected-value families (D-26y) rather than repeating
         * near-identical blur-then-assert blocks — each case isolates exactly one rule violation.
         */
        const onBlurRejectedCases: {
            description: string;
            field: "Name" | "Password";
            value: string;
            message: string;
        }[] = [
            {
                description: "a too-short name",
                field: "Name",
                value: "Al",
                message: "Name must be between 3 and 32 characters.",
            },
            {
                description: "a name containing a digit",
                field: "Name",
                value: "Alice1",
                message: "Name can only contain letters and spaces.",
            },
            {
                description: "a too-short password",
                field: "Password",
                value: "Short1!",
                message: "Password must be between 8 and 64 characters.",
            },
            {
                description: "a too-long password",
                field: "Password",
                value: `Aa1!${"a".repeat(63)}`,
                message: "Password must be between 8 and 64 characters.",
            },
            {
                description: "a password missing a character class",
                field: "Password",
                value: "nocomplexity1",
                message:
                    "Password must include an uppercase letter, a lowercase letter, a number, and a special character.",
            },
        ];

        for (const { description, field, value, message } of onBlurRejectedCases) {
            it(`shows the ${field} field's own message on blur for ${description}, and no other field`, async () => {
                // Arrange
                const screen = await renderSignUpForm();
                const locator =
                    field === "Name"
                        ? screen.getByRole("textbox", { name: "Name" })
                        : screen.getByLabelText("Password", { exact: true });

                // Act
                await locator.fill(value);
                await userEvent.tab();

                // Assert
                await expect.element(screen.getByText(message)).toBeVisible();
                expect(screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(0);
            });
        }

        it("does not show an error on an untouched field even while a sibling field shows one", async () => {
            // Arrange
            const screen = await renderSignUpForm();

            // Act
            await screen.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await userEvent.tab();

            // Assert
            await expect.element(screen.getByText("Enter a valid email address.")).toBeVisible();
            await expect
                .element(screen.getByRole("textbox", { name: "Name" }))
                .not.toHaveAttribute("aria-invalid", "true");
            await expect
                .element(screen.getByLabelText("Password", { exact: true }))
                .not.toHaveAttribute("aria-invalid", "true");
        });

        it("calls signUpAction exactly once, with no name key at all, when the Name field is left empty", async () => {
            // Arrange
            mockedSignUpAction.mockResolvedValueOnce(AUTH_ACTION_IDLE);
            const screen = await renderSignUpForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");
            // Name is deliberately left empty — the field being empty must not block the request.

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => mockedSignUpAction.mock.calls.length).toBe(1);
            /*
             * `formDataToObject` drops empty-string entries — a native `<form>` still submits an
             * untouched text field as `""`, unlike the deleted mutation hook's plain object, which
             * never had a `displayName` key at all when the field was empty. The behaviour this
             * test protects (the server function receives no *meaningful* name) is unchanged; only
             * the wire representation of "absent" is native `FormData`'s own, not this app's.
             */
            const submittedFormData = mockedSignUpAction.mock.calls[0]?.[1];
            expect(submittedFormData).toBeInstanceOf(FormData);
            expect(formDataToObject(submittedFormData)).toEqual({
                email: "new@example.com",
                password: "CorrectPassword1!",
            });
        });

        it("calls signUpAction exactly once with the entered values, including the name, on a valid submit", async () => {
            // Arrange
            mockedSignUpAction.mockResolvedValueOnce(AUTH_ACTION_IDLE);
            const screen = await renderSignUpForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await screen.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => mockedSignUpAction.mock.calls.length).toBe(1);
            const submittedFormData = mockedSignUpAction.mock.calls[0]?.[1];
            expect(formDataToObject(submittedFormData)).toEqual({
                email: "new@example.com",
                displayName: "Jamie Rivera",
                password: "CorrectPassword1!",
            });
        });

        it("disables the submit control and shows a loading state while in flight, freezes all three fields and the password toggle, then returns everything to normal", async () => {
            // Arrange — a manually-resolved gate holds the response open until the assertion runs.
            let resolveAction: (state: AuthActionState) => void = () => undefined;
            const actionGate = new Promise<AuthActionState>((resolve) => {
                resolveAction = resolve;
            });
            mockedSignUpAction.mockImplementationOnce(async () => actionGate);
            const screen = await renderSignUpForm();
            const emailField = screen.getByRole("textbox", { name: "Email" });
            const nameField = screen.getByRole("textbox", { name: "Name" });
            const passwordField = screen.getByLabelText("Password", { exact: true });
            const emailValue = "new@example.com";
            const nameValue = "Jamie Rivera";
            const passwordValue = "CorrectPassword1!";
            await emailField.fill(emailValue);
            await nameField.fill(nameValue);
            await passwordField.fill(passwordValue);
            const submitButton = screen.getByRole("button", { name: "Create Account" });

            // Act
            await submitButton.click();

            // Assert — disabled/loading while the request is in flight.
            await expect.element(submitButton).toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "true");

            /*
             * Act + Assert — all three fields refuse focus while pending (GC-17: isLoading now
             * composes into disabled), so a subsequent keypress never registers a value change.
             */
            await expect.element(emailField).toBeDisabled();
            (emailField.element() as HTMLInputElement).focus();
            expect(emailField.element()).not.toBe(document.activeElement);
            await userEvent.keyboard("z");
            expect((emailField.element() as HTMLInputElement).value).toBe(emailValue);

            await expect.element(nameField).toBeDisabled();
            (nameField.element() as HTMLInputElement).focus();
            expect(nameField.element()).not.toBe(document.activeElement);
            await userEvent.keyboard("z");
            expect((nameField.element() as HTMLInputElement).value).toBe(nameValue);

            await expect.element(passwordField).toBeDisabled();
            (passwordField.element() as HTMLInputElement).focus();
            expect(passwordField.element()).not.toBe(document.activeElement);
            await userEvent.keyboard("z");
            expect((passwordField.element() as HTMLInputElement).value).toBe(passwordValue);

            /*
             * Act + Assert — the visibility toggle does not flip the password field's type while
             * pending (it is non-activatable, the same suppressed-click proof the disabled tests
             * use elsewhere).
             */
            const toggleButton = screen.getByRole("button", { name: "Show password" });
            (toggleButton.element() as HTMLButtonElement).click();
            await expect.element(passwordField).toHaveAttribute("type", "password");

            // Act — let the action resolve.
            resolveAction(AUTH_ACTION_IDLE);

            // Assert — back to normal.
            await expect.element(submitButton).not.toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "false");
            await expect.element(emailField).toHaveAttribute("aria-busy", "false");
            await expect.element(nameField).toHaveAttribute("aria-busy", "false");
            await expect.element(passwordField).toHaveAttribute("aria-busy", "false");
            /*
             * React resets every uncontrolled field the instant a `<form action={fn}>` submission
             * settles (its own built-in `requestFormReset`, fired around every action call); the
             * form's effect restores the value straight after, in a separate, asynchronously
             * flushed passive effect — polled for explicitly here rather than assumed synchronous
             * with the `aria-busy` flip above, which can otherwise resolve first.
             */
            await expect.poll(() => (passwordField.element() as HTMLInputElement).value).toBe(passwordValue);

            /*
             * Act + Assert — editable again once the action settles. The earlier `.focus()` call
             * was refused by the browser (the field was genuinely disabled, not readOnly), so focus
             * must be re-acquired explicitly now that the field is enabled again.
             */
            (passwordField.element() as HTMLInputElement).focus();
            await userEvent.keyboard("z");
            expect((passwordField.element() as HTMLInputElement).value).toBe(`${passwordValue}z`);
        });

        it("recovers every control to editable/pressable again once a pending submission is rejected", async () => {
            /*
             * Arrange — a form that stays frozen after an error is the failure mode this test rules
             * out; the success path alone would not catch it.
             */
            let resolveAction: (state: AuthActionState) => void = () => undefined;
            const actionGate = new Promise<AuthActionState>((resolve) => {
                resolveAction = resolve;
            });
            mockedSignUpAction.mockImplementationOnce(async () => actionGate);
            const screen = await renderSignUpForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await screen.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");
            const submitButton = screen.getByRole("button", { name: "Create Account" });

            // Act
            await submitButton.click();
            await expect.element(submitButton).toBeDisabled();
            resolveAction(buildErrorState({ code: PROBLEM_CODE.INTERNAL_ERROR, message: "simulated failure" }));

            // Assert — every control is editable/pressable again once the failure lands.
            await expect.element(submitButton).not.toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "false");
            const emailField = screen.getByRole("textbox", { name: "Email" });
            await expect.element(emailField).toHaveAttribute("aria-busy", "false");
            await userEvent.type(emailField.element(), "z");
            expect((emailField.element() as HTMLInputElement).value).toBe("new@example.comz");
        });

        it("renders the generic failure message at form level and keeps the entered values after a failed sign-up", async () => {
            // Arrange
            mockedSignUpAction.mockResolvedValueOnce(
                buildErrorState({ code: PROBLEM_CODE.DUPLICATE_RESOURCE, message: SIGN_UP_FAILURE_MESSAGE }),
            );
            const screen = await renderSignUpForm();
            const emailValue = "existing@example.com";
            await screen.getByRole("textbox", { name: "Email" }).fill(emailValue);
            await screen.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent(SIGN_UP_FAILURE_MESSAGE);
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toHaveValue(emailValue);
        });

        it("renders the password field masked by default, reveals it via the toggle, and updates the toggle's accessible name", async () => {
            // Arrange
            const screen = await renderSignUpForm();
            const passwordField = screen.getByLabelText("Password", { exact: true });

            // Assert (initial masked state)
            await expect.element(passwordField).toHaveAttribute("type", "password");

            // Act
            await screen.getByRole("button", { name: "Show password" }).click();

            // Assert
            await expect.element(passwordField).toHaveAttribute("type", "text");
            await expect.element(screen.getByRole("button", { name: "Hide password" })).toBeVisible();
        });

        for (const { name, Story, verify } of signUpStagedStoryCases) {
            it(`renders the "${name}" story's staged state`, async () => {
                // Arrange
                const screen = await render(<Story />);

                // Assert
                await verify(screen);
            });
        }
    },
});
