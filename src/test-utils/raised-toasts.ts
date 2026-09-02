import { screen, within } from "@testing-library/react";

/*
 * Scoped to the notifications region, since a modal is a `dialog` too — an unscoped role query
 * would report the modal and make "no toast was raised" pass for the wrong reason.
 */
export const getRaisedToasts = (): HTMLElement[] => {
    const region = screen.queryByRole("region", { name: "Notifications" });

    return region === null ? [] : within(region).queryAllByRole("dialog");
};

export const getRaisedToastTexts = (): (string | null)[] => getRaisedToasts().map((toast) => toast.textContent);

export const getRaisedToastCount = (): number => getRaisedToasts().length;
