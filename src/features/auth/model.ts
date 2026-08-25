type ResolveDisplayNameInput = {
    displayName?: string;
    email: string;
};

/*
 * The last-resort literal — used only when neither a supplied name nor the email's local part
 * (the part before "@") is usable. `resolveDisplayName` never returns an empty string.
 */
const FALLBACK_DISPLAY_NAME = "User";

/**
 * The single fallback used wherever a display name is needed and none was supplied (GC-02) —
 * trimmed name, else the email's local part, else the literal `"User"` (see 01-19-SUMMARY.md).
 */
export const resolveDisplayName = ({ displayName, email }: ResolveDisplayNameInput): string => {
    const trimmedName = displayName?.trim();

    if (trimmedName) {
        return trimmedName;
    }

    const [localPart] = email.split("@");

    if (localPart) {
        return localPart;
    }

    return FALLBACK_DISPLAY_NAME;
};

/**
 * Narrow `FormData.get()`'s `string | File | null` to `""` on anything but a string — every auth
 * field is text, so a non-string value should surface, not silently stringify.
 */
export const readFormField = ({ formData, key }: { formData: FormData; key: string }): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
};
