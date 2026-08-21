import type { ReactNode } from "react";
import { render, type RenderResult } from "vitest-browser-react";

import { QueryProvider } from "@/lib/client/query-client";

/**
 * Mounts `element` inside this app's provider tree (`QueryProvider` today; a future global store
 * provider belongs here too, see 01-21-SUMMARY.md) and returns `render`'s result unchanged. Only
 * importable from `browser`-project tests — it pulls in `vitest-browser-react`'s Chromium render.
 */
export const renderWithProviders = (element: ReactNode): Promise<RenderResult> =>
    render(<QueryProvider>{element}</QueryProvider>);
