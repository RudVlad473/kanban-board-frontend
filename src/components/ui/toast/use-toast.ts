// Covered by: `src/components/ui/toast/toast.test.tsx`
import { Toast as BaseToast } from "@base-ui/react/toast";

/*
 * D-04/D-09/D-15: raise a toast via `useToast().add(...)` from anywhere in the tree — no portal,
 * timer or ARIA-live wiring of its own; reads `Toast.Provider`'s per-render-tree store, avoiding
 * the module-scope-manager cross-SSR-request leak `query-client.tsx` documents (see 02-07-SUMMARY.md).
 */
export const useToast = BaseToast.useToastManager;
