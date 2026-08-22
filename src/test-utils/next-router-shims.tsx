/*
 * D-19 framework/environment shim bodies (docs/adr/tech/0020) shared by this module's two
 * remaining consumers. Does NOT itself register a Vitest module mock — that registration is
 * hoisted per file, so each consuming test file keeps its own call and disable directive.
 */
import type { ReactNode } from "react";

export const createNextNavigationShim = ({ pathname, refresh }: { pathname: string; refresh: () => void }) => ({
    usePathname: () => pathname,
    useRouter: () => ({ refresh }),
});

export const createNextLinkShim = () => ({
    __esModule: true,
    default: ({ href, className, children }: { href: string; className?: string; children?: ReactNode }) => (
        // eslint-disable-next-line no-restricted-syntax -- this IS the next/link stand-in itself (see file doc comment above), not a component opting out of it
        <a href={href} className={className}>
            {children}
        </a>
    ),
});
