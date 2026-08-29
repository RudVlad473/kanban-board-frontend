import type { Page } from "@playwright/test";
import { decodeJwt } from "jose";

import { COOKIE } from "../src/lib/core/cookies/cookie-registry";
import { recordSeededUserId, SEED_SCOPE } from "../src/test-utils/seeded-user-registry";

/**
 * Registers a UI sign-up's backend user id for teardown, read from the session cookie's own JWT
 * payload -- unverified, since the value only names test data for deletion and this avoids a
 * second sign-in against the backend's two-concurrent-session cap.
 */
export const registerSignedUpUser = async (page: Page): Promise<string> => {
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name === COOKIE.SESSION);

    if (!sessionCookie) {
        throw new Error(`registerSignedUpUser: no "${COOKIE.SESSION}" cookie found after sign-up`);
    }

    const payload = decodeJwt(sessionCookie.value);

    if (typeof payload.id !== "string" || payload.id.length === 0) {
        throw new Error(`registerSignedUpUser: session cookie payload carries no string "id"`);
    }

    recordSeededUserId({ scope: SEED_SCOPE.PLAYWRIGHT, id: payload.id });
    return payload.id;
};
