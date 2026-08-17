import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { QueryProvider } from "@/lib/query-client";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { SignUpForm } from "./sign-up-form";

/*
 * A dedicated, test-local worker — not `src/lib/mocks/browser.ts`'s shared singleton — because
 * that module's handlers (`src/lib/mocks/handlers.ts`) pull in `src/lib/mocks/store.ts`, which
 * imports `node:fs`/`node:os`/`node:crypto` for its on-disk persistence mirror. Those Node builtins
 * cannot be bundled into a real browser page (confirmed: Vite externalizes them and the import
 * throws at test-file load). This form never talks to the external contract anyway — only to this
 * app's own same-origin `/api/auth/...` BFF routes — so a worker with no base handlers, populated
 * per test via `.use()`, is both sufficient and avoids the Node-only dependency entirely.
 */
const worker = setupWorker();

/*
 * `useSignUp` calls `next/navigation`'s `useRouter`, which requires a real Next.js App Router
 * context that doesn't exist in this plain Vitest Browser Mode page — mocked to a pair of no-op
 * spies so the component under test can render and submit without crashing. Navigation itself is
 * outside this file's ten behaviours (route guard/App Router integration is plan 01-13's concern).
 */
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const SIGN_UP_PATH = "/api/auth/signup";
const REQUIRED_FIELD_MESSAGE = "Can't be empty";

const renderSignUpForm = () =>
    render(
        <QueryProvider>
            <SignUpForm />
        </QueryProvider>,
    );

/*
 * Same rationale as app/api/auth/routes.test.ts's MSW usage, mirrored for the browser worker
 * (plan 01-10's `src/lib/mocks/browser.ts`) — this Route Handler doesn't exist in a plain Vitest
 * Browser Mode page, so every test that needs a response registers its own handler via
 * `worker.use()`, reset after each test.
 */
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
 * sign-up form has no viewport-conditional behavior of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "SignUpForm",
    body: () => {
        it("renders three labelled fields and the primary submit control, each reachable by its accessible name", async () => {
            // Arrange
            const screen = await renderSignUpForm();

            // Assert
            await expect.element(screen.getByRole("textbox", { name: "Email" })).toBeVisible();
            await expect.element(screen.getByLabelText("Name")).toBeVisible();
            await expect.element(screen.getByLabelText("Password", { exact: true })).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Create Account" })).toBeVisible();
        });

        it("marks the Name field optional through its accessible description, not its label", async () => {
            // Arrange
            const screen = await renderSignUpForm();

            // Assert
            await expect.element(screen.getByLabelText("Name")).toHaveAccessibleDescription("Optional");
            await expect.element(screen.getByLabelText("Name")).toHaveAccessibleName("Name");
        });

        it("shows the required-field message on exactly two empty fields when submitted (Name is optional), and calls no endpoint", async () => {
            // Arrange
            let signUpMatchCount = 0;
            worker.use(
                http.post(SIGN_UP_PATH, () => {
                    signUpMatchCount += 1;
                    return HttpResponse.json({ ok: true });
                }),
            );
            const screen = await renderSignUpForm();

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(2);
            expect(signUpMatchCount).toBe(0);
        });

        it("shows the required-field message on a single empty field and none on the other two", async () => {
            // Arrange
            const screen = await renderSignUpForm();
            await screen.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");
            // Email is deliberately left empty.

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => screen.getByText(REQUIRED_FIELD_MESSAGE).elements().length).toBe(1);
            await expect
                .element(screen.getByRole("textbox", { name: "Email" }))
                .toHaveAttribute("aria-invalid", "true");
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

        it("calls the sign-up mutation exactly once, with no name key at all, when the Name field is left empty", async () => {
            // Arrange
            const requestBodies: unknown[] = [];
            worker.use(
                http.post(SIGN_UP_PATH, async ({ request }) => {
                    requestBodies.push(await request.json());
                    return HttpResponse.json({ ok: true });
                }),
            );
            const screen = await renderSignUpForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");
            // Name is deliberately left empty — the field being empty must not block the request.

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => requestBodies.length).toBe(1);
            /*
             * `toEqual` (not `toMatchObject`) so an accidental `displayName: ""` would fail this too —
             * the key must be entirely absent, not merely falsy.
             */
            expect(requestBodies[0]).toEqual({
                email: "new@example.com",
                password: "CorrectPassword1!",
            });
        });

        it("calls the sign-up mutation exactly once with the entered values, including the name, on a valid submit", async () => {
            // Arrange
            const requestBodies: unknown[] = [];
            worker.use(
                http.post(SIGN_UP_PATH, async ({ request }) => {
                    requestBodies.push(await request.json());
                    return HttpResponse.json({ ok: true });
                }),
            );
            const screen = await renderSignUpForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await screen.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.poll(() => requestBodies.length).toBe(1);
            expect(requestBodies[0]).toEqual({
                email: "new@example.com",
                displayName: "Jamie Rivera",
                password: "CorrectPassword1!",
            });
        });

        it("disables the submit control and shows a loading state while in flight, freezes all three fields and the password toggle, then returns everything to normal", async () => {
            // Arrange — a manually-resolved gate holds the response open until the assertion runs.
            let resolveResponse: () => void = () => undefined;
            const responseGate = new Promise<void>((resolve) => {
                resolveResponse = resolve;
            });
            worker.use(
                http.post(SIGN_UP_PATH, async () => {
                    await responseGate;
                    return HttpResponse.json({ ok: true });
                }),
            );
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
             * Act + Assert — all three fields refuse a typed character while pending: each value
             * after typing equals its value before typing.
             */
            (emailField.element() as HTMLInputElement).focus();
            await userEvent.keyboard("z");
            expect((emailField.element() as HTMLInputElement).value).toBe(emailValue);
            (nameField.element() as HTMLInputElement).focus();
            await userEvent.keyboard("z");
            expect((nameField.element() as HTMLInputElement).value).toBe(nameValue);
            (passwordField.element() as HTMLInputElement).focus();
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

            // Act — let the response resolve.
            resolveResponse();

            // Assert — back to normal.
            await expect.element(submitButton).not.toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "false");
            await expect.element(emailField).toHaveAttribute("aria-busy", "false");
            await expect.element(nameField).toHaveAttribute("aria-busy", "false");
            await expect.element(passwordField).toHaveAttribute("aria-busy", "false");

            // Act + Assert — editable again once the request settles.
            await userEvent.keyboard("z");
            expect((passwordField.element() as HTMLInputElement).value).toBe(`${passwordValue}z`);
        });

        it("recovers every control to editable/pressable again once a pending submission fails", async () => {
            /*
             * Arrange — a form that stays frozen after an error is the failure mode this test rules
             * out; the success path alone would not catch it.
             */
            let rejectResponse: () => void = () => undefined;
            const responseGate = new Promise<void>((_resolve, reject) => {
                rejectResponse = () => {
                    reject(new Error("simulated failure"));
                };
            });
            worker.use(
                http.post(SIGN_UP_PATH, async () => {
                    try {
                        await responseGate;
                    } catch {
                        return HttpResponse.json({ message: "Something went wrong." }, { status: 500 });
                    }
                    return HttpResponse.json({ ok: true });
                }),
            );
            const screen = await renderSignUpForm();
            await screen.getByRole("textbox", { name: "Email" }).fill("new@example.com");
            await screen.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");
            const submitButton = screen.getByRole("button", { name: "Create Account" });

            // Act
            await submitButton.click();
            await expect.element(submitButton).toBeDisabled();
            rejectResponse();

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
            const failureMessage =
                "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";
            worker.use(http.post(SIGN_UP_PATH, () => HttpResponse.json({ message: failureMessage }, { status: 409 })));
            const screen = await renderSignUpForm();
            const emailValue = "existing@example.com";
            await screen.getByRole("textbox", { name: "Email" }).fill(emailValue);
            await screen.getByRole("textbox", { name: "Name" }).fill("Jamie Rivera");
            await screen.getByLabelText("Password", { exact: true }).fill("CorrectPassword1!");

            // Act
            await screen.getByRole("button", { name: "Create Account" }).click();

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent(failureMessage);
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
    },
});
