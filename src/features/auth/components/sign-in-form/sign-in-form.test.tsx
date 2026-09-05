import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { isNil } from "es-toolkit";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signInAction } from "@/features/auth/actions/sign-in-action";
import { PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { flattenFormData } from "@/test-utils/flatten-form-data";
import { createNextLinkShim } from "@/test-utils/next-router-shims";

import * as signInStories from "./sign-in-form.stories";

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode
vi.mock("next/link", () => createNextLinkShim());

const { Empty, Filled, WithFieldErrors, WithServerError, Submitting, PasswordRevealed } = composeStories(signInStories);

const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

/*
 * Deep tests render the composed `Empty` story too, not a bare `<SignInForm />` — this
 * mounts through the real `AuthCard` decorator plus the global `QueryProvider`/theme decorators
 * (docs/adr/tech/0025), closer to production usage than a hand-wrapped tree.
 */
const renderSignInForm = () => render(<Empty />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-in form has no viewport-conditional behavior of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "SignInForm",
    body: () => {
        // Shallow: copy, staged validation/error/pending states — asserted through composed stories.
        it("renders two labelled fields, the primary submit control, and the cross-link to Sign Up, each reachable by name", async () => {
            // Act
            await render(<Empty />);

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
            expect(screen.getByLabelText("Password", { exact: true })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Create Account" })).toBeInTheDocument();
        });

        it("carries React's own function-action fallback on the form element, so it works before hydration", async () => {
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
            expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("correct-horse-battery-staple");
        });

        it("renders the required-field message on both fields when staged with field errors", async () => {
            // Act
            await render(<WithFieldErrors />);

            // Assert
            expect(screen.getAllByText(REQUIRED_FIELD_MESSAGE)).toHaveLength(2);
        });

        it("renders the anti-enumeration failure message at form level when staged with a server error", async () => {
            /*
             * sign-in.ts collapses every real cause into this message (T-02.1-29, proven in
             * e2e/auth.e2e.spec.ts's AUTH-04 test) — this only proves the form renders `state.message`.
             */
            // Act
            await render(<WithServerError />);

            // Assert
            expect(screen.getByRole("alert")).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
        });

        it("disables the submit control and both fields, and refuses typed input, while staged as submitting", async () => {
            // Act
            await render(<Submitting />);
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
            await render(<PasswordRevealed />);

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
            // No implicit success default — this submit's outcome is queued at the call site.
            actionStub(signInAction).queue(AUTH_ACTION_IDLE);
            const submitted: { formData: FormData | null } = { formData: null };
            rendered.container.querySelector("form")?.addEventListener("submit", (event) => {
                submitted.formData = new FormData(event.target as HTMLFormElement);
            });
            await rendered.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await rendered.getByLabelText("Password", { exact: true }).fill("correct-horse-battery-staple");

            // Act
            await rendered.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.poll(() => !isNil(submitted.formData)).toBe(true);
            expect(flattenFormData(submitted.formData)).toEqual({
                email: "demo@kanban-board.dev",
                password: "correct-horse-battery-staple",
            });
        });

        /*
         * The client schema gates the Server Action, so a submit the schema refuses costs no
         * request and loses no typing — the two halves of the same defect.
         */
        it("sends nothing and keeps the typed password when submitted with an invalid email", async () => {
            // Arrange
            const rendered = await renderSignInForm();
            await rendered.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await rendered.getByLabelText("Password", { exact: true }).fill("correct-horse-battery-staple");

            // Act
            await rendered.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.element(rendered.getByText("Enter a valid email address.")).toBeVisible();
            expect(actionStub(signInAction).calls.length).toBe(0);
            await expect
                .element(rendered.getByLabelText("Password", { exact: true }))
                .toHaveValue("correct-horse-battery-staple");
        });

        /*
         * The gate dispatches by hand rather than through the form's `action`, so the transition
         * `action` supplied for free has to be supplied here — without it `isPending` never flips.
         */
        it("marks the submit control busy while a valid submit is still in flight", async () => {
            // Arrange
            const rendered = await renderSignInForm();
            const stub = actionStub(signInAction);
            stub.queue(AUTH_ACTION_IDLE);
            stub.hold();
            await rendered.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await rendered.getByLabelText("Password", { exact: true }).fill("correct-horse-battery-staple");

            // Act
            await rendered.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect
                .element(rendered.getByRole("button", { name: "Sign In" }))
                .toHaveAttribute("aria-busy", "true");

            // Cleanup — releases the held call so the suite does not leave one pending.
            stub.settle();
        });

        // `mode: "onTouched"` never validates a field the user never focused; a submit must.
        it("sends nothing and reports both untouched fields when an empty form is submitted", async () => {
            // Arrange
            const rendered = await renderSignInForm();

            // Act
            await rendered.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.poll(() => rendered.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(2);
            expect(actionStub(signInAction).calls.length).toBe(0);
        });

        /*
         * A client error means this submit never reached the server, so a refusal still on screen
         * describes an older one. Both at once is what put two messages on the sign-in card.
         */
        it("drops the server's refusal once a client-side field error appears", async () => {
            // Arrange — a real refused submit, not the story's staged `forceServerError`.
            const rendered = await renderSignInForm();
            actionStub(signInAction).queue({
                status: RESULT_STATUS.ERROR,
                code: PROBLEM_CODE.BAD_CREDENTIALS,
                message: INVALID_CREDENTIALS_MESSAGE,
            });
            await rendered.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await rendered.getByLabelText("Password", { exact: true }).fill("wrong-password");
            await rendered.getByRole("button", { name: "Sign In" }).click();
            await expect.element(rendered.getByRole("alert")).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);

            // Act — a client-side error, which blocks any further submit.
            await rendered.getByRole("textbox", { name: "Email" }).fill("not-an-email");
            await userEvent.tab();

            // Assert
            await expect.element(rendered.getByText("Enter a valid email address.")).toBeVisible();
            expect(rendered.getByRole("alert").elements().length).toBe(0);
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
