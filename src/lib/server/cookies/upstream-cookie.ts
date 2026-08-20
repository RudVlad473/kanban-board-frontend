import "server-only";

// RED stub — Task 2 fills in the real bodies (see 02-03-PLAN.md).
export const upstreamCookie = {
    extract: (_response: Response): string | null => {
        throw new Error("not implemented");
    },
    toHeader: (_jsessionId: string): string => {
        throw new Error("not implemented");
    },
};
