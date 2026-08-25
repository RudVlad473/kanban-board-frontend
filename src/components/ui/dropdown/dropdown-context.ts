import { createContext } from "react";

/*
 * `hasError`/`isLoading` live on Root but must style Trigger — a sibling compound sub-component
 * the consumer instantiates as Root's child, not a prop Root can pass directly. Threaded via
 * context rather than cloning/inspecting Root's children.
 */
export const DropdownContext = createContext<{ hasError: boolean; isLoading: boolean }>({
    hasError: false,
    isLoading: false,
});
