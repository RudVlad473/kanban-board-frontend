/*
 * Prettier writes first, then ESLint's --fix runs on the already-formatted text so the two
 * never fight over the same lines (import/order is auto-fixable and would otherwise conflict
 * with Prettier's own line-wrapping).
 */
const config = {
    /*
     * `comments:check` takes no paths, so `() =>` opts out of the filename argument. It is here
     * because it is a CI gate that short-circuits `visual` and `e2e`, and it failed three CI runs
     * in one session on comments this hook had already let through.
     */
    "*.{ts,tsx,mjs,cjs,js,jsx}": ["prettier --write", "eslint --fix", () => "pnpm comments:check"],
    "*.{json,md,css,yml,yaml}": ["prettier --write"],
};

export default config;
