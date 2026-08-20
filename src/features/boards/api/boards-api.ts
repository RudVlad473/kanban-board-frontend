import type { Board } from "@/features/boards/types";

/*
 * This module must never import anything from `src/lib/server/` — that is the boundary that keeps
 * `externalApi`'s `server-only` guard from reaching a client bundle through an indirect import
 * chain (02-RESEARCH.md Pitfall 4, T-02-36). Every call here is a same-origin `fetch` against this
 * app's own Route Handler, never a direct call to the external API.
 */

/** The single declaration of this domain's TanStack Query keys — no hook restates a key literal. */
export const boardQueryKeys = { all: ["boards"] } as const;

const list = async (): Promise<Board[]> => {
    const response = await fetch("/api/boards");

    if (!response.ok) {
        throw new Error("Failed to load boards");
    }

    return response.json() as Promise<Board[]>;
};

/** Factory-namespaced client wrapper over `app/api/boards/**` — one member per operation. */
export const boardsApi = { list };
