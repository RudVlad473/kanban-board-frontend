- C-004 Theme sync mechanism — class-based dark mode toggled via a small
  inline script/cookie read before hydration (the standard Next.js +
  Tailwind FOUC-avoidance pattern), synced to `PUT /users/me/theme` on
  change.
- C-005 Form handling & validation — React Hook Form + Zod schema
  validation, matching the OpenAPI contract's own field constraints
  (e.g. task title `minLength`/`maxLength`) at the client boundary.
- C-009 Ephemeral client UI state — React's built-in `useState`/Context;
  no dedicated state-management library for this narrow, local-only
  slice (sidebar collapsed, drag-in-progress).
- C-010 Client-side error/observability reporting — Sentry's free tier,
  the de facto solo-developer default for a Next.js frontend with no
  backend team dashboard to lean on.
- C-012 CI pipeline tooling — GitHub Actions, running the full test
  pyramid (static, unit, component, a11y, visual, E2E) on every push.
- C-013 Package manager — pnpm, for disk-efficient installs and fast CI
  runs; no project-specific reason to deviate from the modern default.
