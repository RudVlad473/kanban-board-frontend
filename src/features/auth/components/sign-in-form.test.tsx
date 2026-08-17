import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { QueryProvider } from "@/lib/query-client";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { SignInForm } from "./sign-in-form";

/*
 * Same rationale as sign-up-form.test.tsx: a dedicated, test-local worker (not
 * src/lib/mocks/browser.ts's shared singleton, whose handlers pull in node:fs/os/crypto through
 * src/lib/mocks/store.ts — Node builtins a real browser page can't load).
 */
const worker = setupWorker();

/*
 * Same rationale as sign-up-form.test.tsx: `useSignIn` calls `next/navigation`'s `useRouter`,
 * which needs a real Next.js App Router context this plain Vitest Browser Mode page doesn't have.
 */
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const SIGN_IN_PATH = "/api/auth/signin";
const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

const renderSignInForm = () =>
    render(
        <QueryProvider>
            <SignInForm />
        </QueryProvider>,
    );

beforeAll(async () => {
    await worker.start({ onUnhandledRequest: "bypass" });
});
afterEach(() => {
    worker.resetHandlers();
});
afterAll(() => {
    worker.stop();
});

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-in form has no viewport-conditional behavior of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "SignInForm",
    body: () => {
        it("renders two labelled fields and the primary submit control, each reachable by its accessible name", async () => {
            // Arrange
            const screen = await renderSignInForm();

            // Assert
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toBeVisible();
            await expect.element(screen.getByLabelText("Password", { exact: true })).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
        });

        it("shows the required-field message on both fields when submitted empty, and calls no endpoint", async () => {
            // Arrange
            let signInMatchCount = 0;
            worker.use(
                http.post(SIGN_IN_PATH, () => {
                    signInMatchCount += 1;
                    return HttpResponse.json({ ok: true });
                }),
            );
            const screen = await renderSignInForm();

            // Act
            await screen.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.poll(() => screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(2);
            expect(signInMatchCount).toBe(0);
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

        it("calls the sign-in mutation exactly once with valid credentials", async () => {
            // Arrange
            const requestBodies: unknown[] = [];
            worker.use(
                http.post(SIGN_IN_PATH, async ({ request }) => {
                    requestBodies.push(await request.json());
                    return HttpResponse.json({ ok: true });
                }),
            );
            const screen = await renderSignInForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await screen.getByLabelText("Password", { exact: true }).fill("correct-horse-battery-staple");

            // Act
            await screen.getByRole("button", { name: "Sign In" }).click();

            // Assert
            await expect.poll(() => requestBodies.length).toBe(1);
            expect(requestBodies[0]).toEqual({
                email: "demo@kanban-board.dev",
                password: "correct-horse-battery-staple",
            });
        });

        it("disables the submit control and shows a loading state while in flight", async () => {
            // Arrange
            let resolveResponse: () => void = () => undefined;
            const responseGate = new Promise<void>((resolve) => {
                resolveResponse = resolve;
            });
            worker.use(
                http.post(SIGN_IN_PATH, async () => {
                    await responseGate;
                    return HttpResponse.json({ ok: true });
                }),
            );
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
             * Act + Assert — the field refuses a typed character while pending: its value after
             * typing equals its value before typing, proving the readOnly submitted value cannot
             * diverge from what the in-flight request already carries.
             */
            (emailField.element() as HTMLInputElement).focus();
            await userEvent.keyboard("z");
            expect((emailField.element() as HTMLInputElement).value).toBe(emailValue);

            // Act
            resolveResponse();

            // Assert
            await expect.element(submitButton).not.toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "false");
            await expect.element(emailField).toHaveAttribute("aria-busy", "false");

            // Act + Assert — editable again once the request settles.
            await userEvent.keyboard("z");
            expect((emailField.element() as HTMLInputElement).value).toBe(`${emailValue}z`);
        });

        it("renders the generic invalid-credentials message, clears the password, and keeps the email after a rejected sign-in", async () => {
            // Arrange
            worker.use(
                http.post(SIGN_IN_PATH, () =>
                    HttpResponse.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 }),
                ),
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

        it("renders the identical failure message whether the email is unknown or the password is wrong", async () => {
            // Arrange — an unknown email.
            worker.use(
                http.post(SIGN_IN_PATH, () =>
                    HttpResponse.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 }),
                ),
            );
            const unknownEmailScreen = await renderSignInForm();
            await unknownEmailScreen.getByRole("textbox", { name: "Email" }).fill("nobody@example.com");
            await unknownEmailScreen.getByLabelText("Password", { exact: true }).fill("whatever-password");
            await unknownEmailScreen.getByRole("button", { name: "Sign In" }).click();
            await expect.element(unknownEmailScreen.getByRole("alert")).toBeVisible();
            const unknownEmailMessage = unknownEmailScreen.getByRole("alert").element().textContent;
            /*
             * vitest-browser-react's queries resolve against the whole page, not the render's own
             * container — the first render must be unmounted before the second mounts, or both
             * forms' fields collide as duplicate matches for the same accessible name.
             */
            await unknownEmailScreen.unmount();

            /*
             * Arrange — a wrong password for a real account (byte-identical mock response, per
             * plan 01-11's own BFF-level guarantee; this test proves the UI renders it unchanged).
             */
            const wrongPasswordScreen = await renderSignInForm();
            await wrongPasswordScreen.getByRole("textbox", { name: "Email" }).fill("demo@kanban-board.dev");
            await wrongPasswordScreen.getByLabelText("Password", { exact: true }).fill("not-the-right-password");
            await wrongPasswordScreen.getByRole("button", { name: "Sign In" }).click();
            await expect.element(wrongPasswordScreen.getByRole("alert")).toBeVisible();
            const wrongPasswordMessage = wrongPasswordScreen.getByRole("alert").element().textContent;

            // Assert
            expect(wrongPasswordMessage).toBe(unknownEmailMessage);
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
    },
});
