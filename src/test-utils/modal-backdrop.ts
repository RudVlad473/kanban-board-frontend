/*
 * Base UI's backdrop carries no role of its own, so it is found by attribute and separated from
 * the dialog it sits behind.
 */
export const getBackdropElement = (): HTMLElement => {
    const backdrop = Array.from(document.querySelectorAll<HTMLElement>("[data-open]")).find(
        (element) => element.getAttribute("role") !== "dialog",
    );
    if (!backdrop) {
        throw new Error("Modal backdrop element not found — is the dialog open?");
    }

    return backdrop;
};
