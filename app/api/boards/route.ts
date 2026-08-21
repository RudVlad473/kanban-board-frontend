import { NextResponse } from "next/server";

import { isBoardArray } from "@/features/boards/types";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/*
 * The BFF Route Handler this phase's tracer proves end to end (02-RESEARCH.md Pattern 1,
 * updateThemeAction's precedent). `userId` is read exclusively from `verifySession()`'s own
 * record — never from anything the request itself carries — even though the OpenAPI contract
 * declares `userId` a client-suppliable query parameter (T-02-32, this plan's single most
 * important control).
 */
export const GET = async () => {
    const record = await verifySession();
    if (!record) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const { data, error } = await externalApi.GET(EXTERNAL_PATH.BOARDS, {
        params: { query: { userId: record.id } },
    });

    /*
     * The contract declares no error schema for this operation (02-BACKEND-FACTS.md P3/A3) — widen
     * through `unknown` rather than trust the generated type, mirroring `updateThemeAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        return NextResponse.json({ message: "Failed to load boards" }, { status: 502 });
    }

    /*
     * `BoardResponseDTO` declares no `required` array, so every field of `data` is optional at the
     * type level regardless of what the backend actually sent — validate before trusting it rather
     * than forwarding an unverified payload the client would render as-is.
     */
    if (!isBoardArray(data)) {
        return NextResponse.json({ message: "Failed to load boards" }, { status: 502 });
    }

    return NextResponse.json(data);
};
