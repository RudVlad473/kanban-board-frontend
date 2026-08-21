import "server-only";

import { cookies } from "next/headers";

import { createBaseCookieOptions, type CookieName } from "@/lib/core/cookies/cookie-registry";

/**
 * The per-client cookie attributes a caller states explicitly — the same third-argument shape
 * `next/headers`'s `cookies().set()` accepts, extracted without importing its unexported
 * `ResponseCookie` type directly (D-10).
 */
type CookieOptions = NonNullable<Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2]>;

export type CookieWriteOverrides = Partial<CookieOptions>;

export type CookieClientConfig<TValue> = {
    name: CookieName;
    decode: (raw: string | undefined) => TValue | null;
    encode: (value: TValue) => string;
    options: CookieOptions;
};

export type CookieClient<TValue> = {
    read: () => Promise<TValue | null>;
    write: (value: TValue, overrides?: CookieWriteOverrides) => Promise<void>;
    clear: () => Promise<void>;
};

/**
 * Builds a typed cookie client over `next/headers`'s `cookies()` — the single implementation
 * `themeCookie` and the session service both consume (D-10). `write`'s option merge is computed
 * fresh on every call, so no caller's `overrides` can mutate another call's configuration.
 */
export const createCookieClient = <TValue>({
    name,
    decode,
    encode,
    options,
}: CookieClientConfig<TValue>): CookieClient<TValue> => ({
    read: async () => {
        const store = await cookies();
        return decode(store.get(name)?.value);
    },
    // eslint-disable-next-line no-restricted-syntax -- mirrors next/headers' cookies().set(name, value, options) value+options shape this client wraps (ADR tech/0016 exemption, same precedent as the test jars' set())
    write: async (value, overrides) => {
        const store = await cookies();
        store.set(name, encode(value), { ...createBaseCookieOptions(), ...options, ...overrides });
    },
    clear: async () => {
        const store = await cookies();
        store.delete(name);
    },
});
