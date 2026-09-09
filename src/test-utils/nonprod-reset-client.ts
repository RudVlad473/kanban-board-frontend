import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";

export const RESET_TOKEN_HEADER = "X-Reset-Token";

/**
 * `probeResetCapability`'s four outcomes (T-KYV-01: the token never appears in these messages).
 * Corrects D-D -- see 260829-kyv-SUMMARY.md "Deviations" for why an empty list can't discriminate
 * token validity and for the empirical status-code mapping this sentinel-id probe relies on.
 */
export const RESET_PROBE_OUTCOME = {
    CAPABLE: "CAPABLE",
    TOKEN_INVALID: "TOKEN_INVALID",
    STALE_CONTRACT: "STALE_CONTRACT",
    ENDPOINT_MISSING: "ENDPOINT_MISSING",
} as const;

export type ResetProbeOutcome = (typeof RESET_PROBE_OUTCOME)[keyof typeof RESET_PROBE_OUTCOME];

export type ResetProbeResult = { outcome: ResetProbeOutcome; message: string };

const resetUrl = (baseUrl: string): string => `${baseUrl}${EXTERNAL_PATH.ADMIN_RESET}`;

/** A syntactically valid but never-real id -- passes `@NotEmpty`, never matches a row. */
const PROBE_SENTINEL_USER_ID = "00000000-0000-0000-0000-000000000000";

export const probeResetCapability = async ({
    baseUrl,
    token,
}: {
    baseUrl: string;
    token: string;
}): Promise<ResetProbeResult> => {
    const response = await fetch(resetUrl(baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", [RESET_TOKEN_HEADER]: token },
        body: JSON.stringify({ userIds: [PROBE_SENTINEL_USER_ID] }),
    });

    if (response.status === 404) {
        return { outcome: RESET_PROBE_OUTCOME.CAPABLE, message: "" };
    }

    if (response.status === 403) {
        return {
            outcome: RESET_PROBE_OUTCOME.TOKEN_INVALID,
            message: "the configured reset token is wrong or missing",
        };
    }

    if (response.status === 401 || response.status === 405) {
        return {
            outcome: RESET_PROBE_OUTCOME.ENDPOINT_MISSING,
            message: "no reset endpoint exists at this URL, or the nonprod profile is inactive",
        };
    }

    if (response.ok) {
        return {
            outcome: RESET_PROBE_OUTCOME.STALE_CONTRACT,
            message:
                "the backend accepted a nonexistent user id without a 404, which the new targeted-delete " +
                "route never would -- this backend still serves the old single-route contract and has " +
                "therefore just performed a full wipe. It must be redeployed before the suite can run.",
        };
    }

    throw new Error(`Unexpected reset-capability probe status ${String(response.status)} from ${resetUrl(baseUrl)}`);
};

/** Deletes exactly the listed users. Callers must check `response.ok` themselves. */
export const deleteSeededUsers = ({
    baseUrl,
    token,
    userIds,
}: {
    baseUrl: string;
    token: string;
    userIds: string[];
}): Promise<Response> =>
    fetch(resetUrl(baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", [RESET_TOKEN_HEADER]: token },
        body: JSON.stringify({ userIds }),
    });

/** The manual, token-gated nuclear option (T-KYV-03) -- nothing automated may call this. */
export const fullReset = ({ baseUrl, token }: { baseUrl: string; token: string }): Promise<Response> =>
    fetch(`${resetUrl(baseUrl)}?fullReset=true`, {
        method: "POST",
        headers: { [RESET_TOKEN_HEADER]: token },
    });
