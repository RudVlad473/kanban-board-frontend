/** Flattens a submitted `FormData` into a plain object for `toEqual` assertions, dropping empty-string values. */
export const flattenFormData = (formData: FormData | null): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [key, value] of formData?.entries() ?? []) {
        if (typeof value === "string" && value !== "") {
            result[key] = value;
        }
    }
    return result;
};
