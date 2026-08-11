// Registers @testing-library/jest-dom's matchers (toBeDisabled, toHaveAccessibleName, etc.)
// once for every jsdom "unit" project test file. Mirrors vitest.setup.ts's role for the
// "browser" project — kept as a separate file since the "unit" project has no CSS/globals.css
// dependency to load (jsdom doesn't paint layout, so there is nothing for it to consume).
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL's automatic afterEach-cleanup only self-registers when it detects a global `afterEach`
// (e.g. Jest, or Vitest with test.globals: true). This project imports `afterEach` explicitly
// per test file instead (matching the "browser" project's style), so nothing calls it —
// unmounted DOM from a prior test leaks into the next one unless registered here explicitly.
afterEach(cleanup);
