import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const STORE_MIRROR_FILE_PATH = join(tmpdir(), "kanban-board-mock-store.json");

type PersistedShape = { users: UserRecord[] };

/*
 * Mirrors the in-memory map to a JSON file under the OS temp directory so it survives hot
 * reloads within a running instance (Pitfall-adjacent: `next dev`'s module reload would otherwise
 * re-run this module's seed logic and silently forget every signed-up account). A missing or
 * unreadable file is treated as an empty store, not an error — the normal state on first boot.
 */
const readPersistedUsers = (): UserRecord[] => {
    try {
        const raw = readFileSync(STORE_MIRROR_FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw) as PersistedShape;
        return Array.isArray(parsed.users) ? parsed.users : [];
    } catch {
        return [];
    }
};

const persistUsers = (currentUsers: Map<string, UserRecord>) => {
    try {
        const payload: PersistedShape = { users: [...currentUsers.values()] };
        writeFileSync(STORE_MIRROR_FILE_PATH, JSON.stringify(payload), "utf-8");
    } catch {
        /*
         * Best-effort mirror only — a write failure here (e.g. a read-only temp directory) must
         * not crash the mock handler that triggered it; the in-memory map is still authoritative
         * for the life of this instance.
         */
    }
};

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

const users = new Map<string, UserRecord>(withDemoAccountSeeded(readPersistedUsers()).map((user) => [user.id, user]));
persistUsers(users);

export const findUserByEmail = (email: string): UserRecord | undefined =>
    [...users.values()].find((user) => user.email === email);

export const findUserById = (id: string): UserRecord | undefined => users.get(id);

export const createUser = (input: { displayName: string; email: string; password: string }): UserRecord => {
    const user: UserRecord = {
        id: randomUUID(),
        email: input.email,
        displayName: input.displayName,
        password: input.password,
        theme: THEME.LIGHT,
    };

    users.set(user.id, user);
    persistUsers(users);

    return user;
};

export const updateUserTheme = (id: string, theme: Theme): UserRecord | undefined => {
    const user = users.get(id);

    if (!user) {
        return undefined;
    }

    const updatedUser: UserRecord = { ...user, theme };
    users.set(id, updatedUser);
    persistUsers(users);

    return updatedUser;
};
