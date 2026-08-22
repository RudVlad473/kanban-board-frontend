import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { formDataToObject } from "@/test-utils/form-data-to-object";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { SignInForm } from "./sign-in-form";
import * as signInStories from "./sign-in-form.stories";

const { Empty, Filled, WithFieldErrors, WithServerError, Submitting, PasswordRevealed } = composeStories(signInStories);

const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

const renderSignInForm = () => renderWithProviders(<SignInForm />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-in form has no viewport-conditional behavior of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "SignInForm",
    body: () => {
        /*
         * composeStories' `.run()` and vitest-browser-react's `render()` (via renderWithProviders)
         * don't clean up after each other — wipe the page body between tests so the two mechanisms
         * never collide (the same DOM-leak fix plan 02.1-07 applied to the UI primitives).
         */
        afterEach(() => {
            document.body.innerHTML = "";
        });

        // Shallow: copy, staged validation/error/pending states — asserted through composed stories (D-08).
        it("renders two labelled fields, the primary submit control, and the cross-link to Sign Up, each reachable by name", async () => {
            // Act
            await Empty.run();

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
            expect(screen.getByLabelText("Password", { exact: true })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Create Account" })).toBeInTheDocument();
        });

        it("submits through the form element's own action, not a submit handler, so it works before hydration", async () => {
            // Act
            await Empty.run();

            /*
             * Assert — React renders a function-based `action` as a distinctive no-JS fallback,
             * never a real URL — the property that makes the form work before hydration.
             */
            const form = document.querySelector("form");
            expect(form?.getAttribute("action")).toContain("A React form was unexpectedly submitted");
        });

        it("renders the staged field values from the Filled story", async () => {
            // Act
            await Filled.run();

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("user@example.com");
            expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("correct-horse-battery-staple");
        });

        it("renders the required-field message on both fields when staged with field errors", async () => {
            // Act
            await WithFieldErrors.run();

            // Assert
            expect(screen.getAllByText(REQUIRED_FIELD_MESSAGE)).toHaveLength(2);
        });

        it("renders the anti-enumeration failure message at form level when staged with a server error", async () => {
            /*
             * sign-in.ts collapses every real cause into this message (T-02.1-29, proven in
             * sign-in.integration.test.ts) — this only proves the form renders `state.message`.
             */
            // Act
            await WithServerError.run();

            // Assert
            expect(screen.getByRole("alert")).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
        });

        it("disables the submit control and both fields, and refuses typed input, while staged as submitting", async () => {
            // Act
            await Submitting.run();
            const submitButton = screen.getByRole("button", { name: "Sign In" });
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
            await PasswordRevealed.run();

            // Assert
            expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text");
            expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
        });

        // Deep: real typing/blur/click interaction and real submitted form data — direct renders.
        it("shows the email-format message on blur for an invalid email, and no other field", async () => {
            // Arrange
            const rendered = await renderSignInForm();

            // Act
            await rendered.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await userEvent.tab();

            // Assert
            await expect.element(rendered.getByText("Enter a valid email address.")).toBeVisible();
            expect(rendered.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(0);
        });

        it("submits the typed email and password as real form data on a valid submit", async () => {
            /*
             * A real native `submit` listener on the form element, not a mocked action — reads the
             * FormData the browser actually assembled, proving the fields' `name`s wire correctly.
             */
            // Arrange
            const rendered = await renderSignInForm();
            const submitted: { formData: FormData | null } = { formData: null };
            rendered.container.querySelector("form")?.addEventListener("submit", (event) => {
                submitted.formData = new FormData(event.target as HTMLFormElement);
            });
            await rendered.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await rendered.getByLabelText("Password", { exact: true }).fill("correct-horse-battery-staple");

            // Act
            await rendered.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.poll(() => submitted.formData !== null).toBe(true);
            expect(formDataToObject(submitted.formData)).toEqual({
                email: "demo@kanban-board.dev",
                password: "correct-horse-battery-staple",
            });
        });

        it("renders the password field masked by default, reveals it via the toggle, and updates the toggle's accessible name", async () => {
            // Arrange
            const rendered = await renderSignInForm();
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
