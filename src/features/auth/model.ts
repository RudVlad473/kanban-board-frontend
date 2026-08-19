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
 * The single fallback used everywhere a display name is needed and none was supplied (GC-02) —
 * every Route Handler that assembles a session payload reads this instead of inventing its own
 * default. Returns the trimmed name when one is present and non-empty; otherwise the part of the
 * email before the first "@" when that is non-empty; otherwise the literal `"User"`.
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
