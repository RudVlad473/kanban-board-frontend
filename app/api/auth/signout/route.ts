import "server-only";

import { session } from "@/lib/session";

/*
 * No upstream call — the contract has no sign-out operation; clearing the local session cookie
 * is the entire operation.
 */
export const POST = async (): Promise<Response> => {
    await session.destroy();

    return Response.json({ ok: true }, { status: 200 });
};
