import "server-only";

import type { Theme } from "@/lib/core/theme/theme";

// RED stub — Task 1 fills in the real bodies (see 02-03-PLAN.md).
export const themeCookie = {
    read: (): Promise<Theme | null> => {
        throw new Error("not implemented");
    },
    write: (_theme: Theme): Promise<void> => {
        throw new Error("not implemented");
    },
    clear: (): Promise<void> => {
        throw new Error("not implemented");
    },
};
