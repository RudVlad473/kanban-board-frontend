import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { formDataToObject } from "@/test-utils/form-data-to-object";

import * as signUpStories from "./sign-up-form.stories";

const {
    Empty,
    Filled,
    WithFieldErrors,
    WithNameAndPasswordComplexityErrors,
    WithServerError,
    Submitting,
    PasswordRevealed,
} = composeStories(signUpStories);

const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const SIGN_UP_FAILURE_MESSAGE =
    "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";

/*
 * D-03: deep tests render the composed `Empty` story too, not a bare `<SignUpForm />` — this
 * mounts through the real `AuthCard` decorator plus the global `QueryProvider`/theme decorators
 * (docs/adr/tech/0025), closer to production usage than a hand-wrapped tree.
 */
const renderSignUpForm = () => render(<Empty />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-up form has no viewport-conditional behavior of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "SignUpForm",
    body: () => {
        // Shallow: copy, staged validation/error/pending states — asserted through composed stories (D-08).
        it("renders three labelled fields, the primary submit control, and the cross-link to Sign In, each reachable by name", async () => {
            // Act
            await render(<Empty />);

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
            expect(screen.getByLabelText("Name")).toBeInTheDocument();
            expect(screen.getByLabelText("Password", { exact: true })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
        });

        it("marks the Name field optional through its accessible description, not its label", async () => {
            // Act
            await render(<Empty />);

            // Assert
            expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Optional");
            expect(screen.getByLabelText("Name")).toHaveAccessibleName("Name");
        });

        it("submits through the form element's own action, not a submit handler, so it works before hydration", async () => {
            // Act
            await render(<Empty />);

            /*
             * Assert — React renders a function-based `action` as a distinctive no-JS fallback,
             * never a real URL — the property that makes the form work before hydration.
             */
            const form = document.querySelector("form");
            expect(form?.getAttribute("action")).toContain("A React form was unexpectedly submitted");
        });

        it("renders the staged field values from the Filled story", async () => {
            // Act
            await render(<Filled />);

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("user@example.com");
            expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Jamie Rivera");
            expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("correct-horse-battery-staple");
        });

        it("renders the required-field message on Email and Password (Name is optional) when staged with field errors", async () => {
            // Act
            await render(<WithFieldErrors />);

            // Assert
            expect(screen.getAllByText(REQUIRED_FIELD_MESSAGE)).toHaveLength(2);
        });

        it("renders the Name-length and password-complexity messages when staged with those field errors", async () => {
            // Act
            await render(<WithNameAndPasswordComplexityErrors />);

            // Assert
            expect(screen.getByText("Name must be between 3 and 32 characters.")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Password must include an uppercase letter, a lowercase letter, a number, and a special character.",
                ),
            ).toBeInTheDocument();
        });

        it("renders the generic failure message at form level when staged with a server error", async () => {
            /*
             * sign-up.ts collapses every real cause into this message (proven in
             * sign-up.integration.test.ts) — this only proves the form renders `state.message`.
             */
            // Act
            await render(<WithServerError />);

            // Assert
            expect(screen.getByRole("alert")).toHaveTextContent(SIGN_UP_FAILURE_MESSAGE);
        });

        it("disables the submit control and all three fields, and refuses typed input, while staged as submitting", async () => {
            // Act
            await render(<Submitting />);
            const submitButton = screen.getByRole("button", { name: "Create Account" });
            const emailField = screen.getByRole<HTMLInputElement>("textbox", { name: "Email" });

            // Assert
            expect(submitButton).toBeDisabled();
            expect(submitButton).toHaveAttribute("aria-busy", "true");
            expect(emailField).toHaveAttribute("aria-busy", "true");

            // Act — a field refuses a typed character while the story stages it as busy.
            emailField.focus();
            await userEvent.keyboard("z");

            // Assert
            expect(emailField.value).toBe("");
        });

        it("renders the password field revealed by default when staged that way", async () => {
            // Act
            await render(<PasswordRevealed />);

            // Assert
            expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text");
            expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
        });

        // Deep: real typing/blur/click interaction and real submitted form data — direct renders.
        it("shows the email-format message on blur for an invalid email, and no other field", async () => {
            // Arrange
            const rendered = await renderSignUpForm();

            // Act
            await rendered.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await userEvent.tab();

            // Assert
            await expect.element(rendered.getByText("Enter a valid email address.")).toBeVisible();
            expect(rendered.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(0);
        });

        /*
         * Parametrised over the rejected-value families (D-26y) rather than repeating
         * near-identical blur-then-assert blocks — each case isolates exactly one rule violation.
         * This is where D-05's relocated e2e coverage lands (02.1-CONTEXT.md D-05/D-08).
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
                const rendered = await renderSignUpForm();
                const locator =
                    field === "Name"
                        ? rendered.getByRole("textbox", { name: "Name" })
                        : rendered.getByLabelText("Password", { exact: true });

                // Act
                await locator.fill(value);
                await userEvent.tab();

                // Assert
                await expect.element(rendered.getByText(message)).toBeVisible();
                expect(rendered.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(0);
            });
        }

        it("does not show an error on an untouched field even while a sibling field shows one", async () => {
            // Arrange
            const rendered = await renderSignUpForm();

            // Act
            await rendered.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await userEvent.tab();

            // Assert
            await expect.element(rendered.getByText("Enter a valid email address.")).toBeVisible();
            await expect
                .element(rendered.getByRole("textbox", { name: "Name" }))
                .not.toHaveAttribute("aria-invalid", "true");
            await expect
                .element(rendered.getByLabelText("Password", { exact: true }))
                .not.toHaveAttribute("aria-invalid", "true");
        });

        it("submits the typed values as real form data, with no name key at all when Name is left empty", async () => {
            /*
             * A real native `submit` listener on the form element, not a mocked action — reads the
             * FormData the browser actually assembled, proving the fields' `name`s wire correctly.
             */
            // Arrange
            const rendered = await renderSignUpForm();
            const submitted: { formData: FormData | null } = { formData: null };
            rendered.container.querySelector("form")?.addEventListener("submit", (event) => {
                submitted.formData = new FormData(event.target as HTMLFormElement);
            });
            await rendered.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await rendered.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");
            // Name is deliberately left empty — the field being empty must not block the request.

            // Act
            await rendered.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => submitted.formData !== null).toBe(true);
            expect(formDataToObject(submitted.formData)).toEqual({
                email: "new@example.com",
                password: "CorrectPassword1!",
            });
        });

        it("submits the typed values as real form data, including the name, on a valid submit", async () => {
            // Arrange
            const rendered = await renderSignUpForm();
            const submitted: { formData: FormData | null } = { formData: null };
            rendered.container.querySelector("form")?.addEventListener("submit", (event) => {
                submitted.formData = new FormData(event.target as HTMLFormElement);
            });
            await rendered.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await rendered.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await rendered.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");

            // Act
            await rendered.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => submitted.formData !== null).toBe(true);
            expect(formDataToObject(submitted.formData)).toEqual({
                email: "new@example.com",
                displayName: "Jamie Rivera",
                password: "CorrectPassword1!",
            });
        });

        it("renders the password field masked by default, reveals it via the toggle, and updates the toggle's accessible name", async () => {
            // Arrange
            const rendered = await renderSignUpForm();
            const passwordField = rendered.getByLabelText("Password", { exact: true });

            // Assert (initial masked state)
            await expect.element(passwordField).toHaveAttribute("type", "password");

            // Act
            await rendered.getByRole("button", { name: "Show password" }).click();

            // Assert
            await expect.element(passwordField).toHaveAttribute("type", "text");
            await expect.element(rendered.getByRole("button", { name: "Hide password" })).toBeVisible();
        });
    },
});
