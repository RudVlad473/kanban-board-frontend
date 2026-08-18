import type { ReactNode } from "react";
import { render, type RenderResult } from "vitest-browser-react";

import { QueryProvider } from "@/lib/query-client";

/**
 * Mounts `element` inside this app's provider tree (`QueryProvider` today; the future global
 * store provider belongs here too, once one exists — see GC-05) and returns whatever
 * `vitest-browser-react`'s `render` returns unchanged, so existing query and unmount usage at call
 * sites is unaffected.
 *
 * This file may only be imported by browser-project tests (Vitest's `browser` project, real
 * Chromium via `vitest-browser-react`) — it pulls in the browser render library, which cannot be
 * imported into the `unit`/`node`/`storybook` projects.
 *
 * @example
 * const screen = await renderWithProviders(<SignInForm />);
 * await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
 */
export const renderWithProviders = (element: ReactNode): Promise<RenderResult> =>
    render(<QueryProvider>{element}</QueryProvider>);
