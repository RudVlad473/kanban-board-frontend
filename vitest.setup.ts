/*
 * Registers @testing-library/jest-dom's matchers (toBeDisabled, toHaveAccessibleName, etc.)
 * once for every Vitest Browser Mode test file (D-26).
 */
import "@testing-library/jest-dom/vitest";

/*
 * Loads the generated Tailwind v4 @theme stylesheet into every Browser Mode test page, mirroring
 * .storybook/preview.ts's own `import "../src/styles/globals.css"` (D-24's harness pattern).
 * Without this, `getComputedStyle()` assertions against semantic-token-driven classes (variant/
 * size backgrounds, className-merge behaviour — plan 01-06 Task 2) see unstyled browser defaults
 * instead of the real rendered values, since no CSS is otherwise loaded into the browser test page.
 */
import "./src/styles/globals.css";
