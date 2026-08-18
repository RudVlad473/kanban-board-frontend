import { randomUUID } from "node:crypto";

import { resolveDisplayName } from "@/lib/display-name";

/**
 * Contract-derived theme enum (docs/api/kanban-board-openapi.json's `UserResponseDTO.theme`),
 * declared per this project's enum-like-constant convention (ADR tech/0012) since it's a
 * standalone value shared at runtime by this store, the mock handlers, and their tests.
 */
export const THEME = { LIGHT: "LIGHT", DARK: "DARK" } as const;
export type Theme = (typeof THEME)[keyof typeof THEME];

export type UserRecord = {
    id: string;
    email: string;
    displayName: string;
    password: string;
    theme: Theme;
};

/*
 * One deterministic demo account, seeded at module load, so a sign-in and a theme read/update
 * are always demonstrable on any instance — including a freshly cold-started serverless one that
 * never ran a real signup (see the plan's flagged assumption on Vercel cold starts).
 */
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_USER_EMAIL = "demo@kanban-board.dev";
export const DEMO_USER_DISPLAY_NAME = "Demo User";
export const DEMO_USER_PASSWORD = "DemoPassword123!";

const withDemoAccountSeeded = (initialUsers: UserRecord[]): UserRecord[] => {
    if (initialUsers.some((user) => user.id === DEMO_USER_ID)) {
        return initialUsers;
    }

    return [
        ...initialUsers,
        {
            id: DEMO_USER_ID,
            email: DEMO_USER_EMAIL,
            displayName: DEMO_USER_DISPLAY_NAME,
            password: DEMO_USER_PASSWORD,
            theme: THEME.LIGHT,
        },
    ];
};

const users = new Map<string, UserRecord>(withDemoAccountSeeded([]).map((user) => [user.id, user]));

/*
 * Explicit, on-demand reset back to exactly the seeded demo account — no disk I/O involved. A
 * sign-up made during `next dev` is forgotten on the next hot reload; that is an accepted,
 * explicit tradeoff (GC-09), not an oversight. Callers (tests, future tooling) that want a clean
 * slate without restarting the process call this instead.
 */
export const resetMockStore = (): void => {
    users.clear();
    for (const user of withDemoAccountSeeded([])) {
        users.set(user.id, user);
    }
};

export const findUserByEmail = (email: string): UserRecord | undefined =>
    [...users.values()].find((user) => user.email === email);

export const findUserById = (id: string): UserRecord | undefined => users.get(id);

export const createUser = (input: { displayName?: string; email: string; password: string }): UserRecord => {
    /*
     * The real backend permits an absent name (GC-02) — the mock mirrors that tolerance, storing
     * the same resolved fallback the BFF's session payload would carry rather than an empty string.
     */
    const user: UserRecord = {
        id: randomUUID(),
        email: input.email,
        displayName: resolveDisplayName(input),
        password: input.password,
        theme: THEME.LIGHT,
    };

    users.set(user.id, user);

    return user;
};

export const updateUserTheme = ({ id, theme }: { id: string; theme: Theme }): UserRecord | undefined => {
    const user = users.get(id);

    if (!user) {
        return undefined;
    }

    const updatedUser: UserRecord = { ...user, theme };
    users.set(id, updatedUser);

    return updatedUser;
};
