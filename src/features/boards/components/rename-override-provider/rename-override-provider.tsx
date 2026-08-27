"use client";

import { useMemo, useState, type PropsWithChildren } from "react";

import { RenameOverrideContext, type RenameOverride } from "@/features/boards/hooks/use-rename-board";

type Props = PropsWithChildren<{
    /** Storybook-only staging for an in-flight rename — no real caller passes this. */
    defaultOverride?: RenameOverride | null;
}>;

/**
 * Holds D-15's optimistic rename above both Suspense boundaries in the dashboard layout, so the
 * sidebar row and the header's board title change in the same instant rather than the header
 * waiting a beat for the refreshed server render. Deliberately holds nothing else.
 */
export const RenameOverrideProvider = ({ defaultOverride = null, children }: Props) => {
    const [override, setOverride] = useState<RenameOverride | null>(defaultOverride);
    const store = useMemo(() => ({ override, setOverride }), [override]);

    return <RenameOverrideContext value={store}>{children}</RenameOverrideContext>;
};
