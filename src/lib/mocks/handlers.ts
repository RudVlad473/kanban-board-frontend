import { http, HttpResponse } from "msw";

import { createUser, findUserByEmail, findUserById, THEME, updateUserTheme, type Theme } from "@/lib/mocks/store";

/*
 * ADR tech/0006: no hardcoded API URL. These handlers match against the same env-var-derived
 * origin the typed client (`server-client.ts`) dials, read directly here rather than through that
 * module — `server-client.ts` starts with `import "server-only"`, which is safe in this Node mock
 * server but would break `browser.ts`'s Storybook/browser-mode use of these same handlers.
 */
const readExternalApiBaseUrl = () => {
    const baseUrl = process.env.EXTERNAL_API_BASE_URL;

    if (!baseUrl) {
        throw new Error(
            "EXTERNAL_API_BASE_URL is not set. Configure it per environment (see .env.example) — " +
                "the external API base URL is never hardcoded (ADR tech/0006).",
        );
    }

    return baseUrl;
};

const baseUrl = readExternalApiBaseUrl();

/*
 * Wrong password and unknown email must be indistinguishable (T-01-08) — the exact same status
 * and body for both, so the UI cannot leak which addresses have accounts.
 */
const INVALID_CREDENTIALS_RESPONSE = { message: "Invalid email or password." };

const toUserResponseBody = (user: { id: string; email: string; displayName: string; theme: Theme }) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    theme: user.theme,
});

export const handlers = [
    // POST /signup — Task 1 decision: returns the bare user id string.
    http.post(`${baseUrl}/signup`, async ({ request }) => {
        const body = (await request.json()) as { displayName: string; email: string; password: string };

        if (findUserByEmail(body.email)) {
            return HttpResponse.json({ message: "An account with this email already exists." }, { status: 409 });
        }

        const user = createUser(body);

        return HttpResponse.text(user.id);
    }),

    // POST /signin — Task 1 decision: returns the full UserResponseDTO.
    http.post(`${baseUrl}/signin`, async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string };
        const user = findUserByEmail(body.email);

        if (user?.password !== body.password) {
            return HttpResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
        }

        return HttpResponse.json(toUserResponseBody(user));
    }),

    http.get(`${baseUrl}/users/me/theme`, ({ request }) => {
        const userId = new URL(request.url).searchParams.get("userId");
        const user = userId ? findUserById(userId) : undefined;

        if (!user) {
            return HttpResponse.json({ message: "User not found." }, { status: 404 });
        }

        return HttpResponse.json(toUserResponseBody(user));
    }),

    http.put(`${baseUrl}/users/me/theme`, async ({ request }) => {
        const userId = new URL(request.url).searchParams.get("userId");
        const body = (await request.json()) as { theme: string };

        if (body.theme !== THEME.LIGHT && body.theme !== THEME.DARK) {
            return HttpResponse.json({ message: "theme must be LIGHT or DARK." }, { status: 400 });
        }
        const theme: Theme = body.theme;

        const user = userId ? updateUserTheme({ id: userId, theme }) : undefined;

        if (!user) {
            return HttpResponse.json({ message: "User not found." }, { status: 404 });
        }

        return HttpResponse.json(toUserResponseBody(user));
    }),
];
