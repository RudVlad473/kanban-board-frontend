// Prettier writes first, then ESLint's --fix runs on the already-formatted text so the two
// never fight over the same lines (import/order is auto-fixable and would otherwise conflict
// with Prettier's own line-wrapping).
const config = {
  "*.{ts,tsx,mjs,cjs,js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css,yml,yaml}": ["prettier --write"],
};

export default config;
