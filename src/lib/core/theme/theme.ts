/**
 * The single runtime declaration of the two theme values (PC-01, ADR tech/0012's enum-like
 * pattern). Pure `lib/core/` module, importable from both server and client code, so both sides
 * import the same `THEME`/`Theme`/`isTheme` instead of each declaring their own copy.
 */
export const THEME = { LIGHT: "LIGHT", DARK: "DARK" } as const;

export type Theme = (typeof THEME)[keyof typeof THEME];

export const isTheme = (value: string | undefined): value is Theme => value === THEME.LIGHT || value === THEME.DARK;
