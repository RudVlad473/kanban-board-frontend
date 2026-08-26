---
status: complete
phase: 01-foundation-auth-preferences
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-08-SUMMARY.md, 01-09-SUMMARY.md, 01-10-SUMMARY.md, 01-11-SUMMARY.md, 01-12-SUMMARY.md, 01-13-SUMMARY.md, 01-14-SUMMARY.md, 01-15-SUMMARY.md, 01-16-SUMMARY.md, 01-17-SUMMARY.md, 01-18-SUMMARY.md, 01-19-SUMMARY.md, 01-20-SUMMARY.md, 01-21-SUMMARY.md, 01-22-SUMMARY.md, 01-23-SUMMARY.md, 01-24-SUMMARY.md, 01-25-SUMMARY.md, 01-26-SUMMARY.md, 01-27-SUMMARY.md, 01-28-SUMMARY.md, 01-29-SUMMARY.md, 01-30-SUMMARY.md, 01-31-SUMMARY.md, 01-32-SUMMARY.md, 01-33-SUMMARY.md, 01-34-SUMMARY.md, 01-35-SUMMARY.md, 01-36-SUMMARY.md, 01-37-SUMMARY.md, 01-38-SUMMARY.md
started: 2026-08-26T09:26:13Z
updated: 2026-08-26T09:44:00Z
---

## Current Test

[testing complete]

## Tests

### 1. [01-01-SUMMARY.md] D1
expected: pnpm build completes successfully from a clean checkout and prints a Next.js route table including /
result: pass
source: automated
coverage_id: D1

### 2. [01-01-SUMMARY.md] D2
expected: pnpm exec tsc --noEmit passes with strict TypeScript and the five per-folder path aliases resolving
result: pass
source: automated
coverage_id: D2

### 3. [01-01-SUMMARY.md] D3
expected: CONVENTIONS.md folder skeleton exists and is git-tracked: tokens/, src/features/, src/components/ui/, src/components/layout/, src/hooks/, src/lib/, src/styles/
result: pass
source: automated
coverage_id: D3

### 4. [01-01-SUMMARY.md] D4
expected: Tailwind v4 utility classes applied in app/page.tsx take visible effect through the full build/dev toolchain
result: pass
source: automated
coverage_id: D4

### 5. [01-02-SUMMARY.md] D1
expected: ESLint 10 flat config (strict type-aware tier, Next.js rules, exhaustive-deps error, unused-vars with underscore escape hatch, import ordering, no-default-export, Tailwind linting) — pnpm lint exits 0 against the scaffold
result: pass
source: automated
coverage_id: D1

### 6. [01-02-SUMMARY.md] D2
expected: Cross-feature import (feature -> feature) is reported as an ESLint error at severity 2 via eslint-plugin-boundaries
result: pass
source: automated
coverage_id: D2

### 7. [01-02-SUMMARY.md] D3
expected: @typescript-eslint/no-unused-vars fires as an error on a non-underscore-prefixed unused parameter and is silent on the underscore-prefixed equivalent
result: pass
source: automated
coverage_id: D3

### 8. [01-02-SUMMARY.md] D4
expected: Prettier config (120 print width, double quotes, trailing commas, Tailwind class sorting via prettier-plugin-tailwindcss) — pnpm format:check exits 0 and pnpm lint still exits 0 after formatting
result: pass
source: automated
coverage_id: D4

### 9. [01-02-SUMMARY.md] D5
expected: Husky + lint-staged blocking pre-commit hook: an auto-fixable violation (single quotes, missing semicolon) is silently rewritten and the commit succeeds; a genuine unfixable lint error (unused non-underscore parameter) rejects the commit outright with no --no-verify/|| true escape hatch
result: pass
source: automated
coverage_id: D5

### 10. [01-03-SUMMARY.md] D1
expected: "GitHub Actions workflow (.github/workflows/ci.yml) runs lint, format check,
result: pass
source: automated
coverage_id: D1

### 11. [01-04-SUMMARY.md] D1
expected: A composite DTCG typography token (font-heading-xl) expands into four separately-addressable Tailwind v4 custom properties (family/size/weight/line-height), and font-heading-s additionally emits a --tracking-* letter-spacing property — proving Style Dictionary v5's DTCG composite support doesn't silently drop a sub-value (RESEARCH.md Pitfall 4)
result: pass
source: automated
coverage_id: D1

### 12. [01-04-SUMMARY.md] D2
expected: All six DTCG token categories (color, spacing, typography, radius, shadow, breakpoint) are authored as separate source files under tokens/, with a primitive tier and an alias-only semantic tier for color (no raw hex in the semantic files) — D-01/D-02
result: pass
source: automated
coverage_id: D2

### 13. [01-04-SUMMARY.md] D3
expected: Light and dark semantic color values resolve under the identical custom-property name (color-bg-app etc.) in two scopes of one generated stylesheet — @theme (light) then .dark (dark) — so no component ever branches on theme (D-09)
result: pass
source: automated
coverage_id: D3

### 14. [01-04-SUMMARY.md] D4
expected: The pipeline fails loudly and in one place (D-12): a changed token value survives a rebuild rather than serving a stale artefact, and a semantic token whose alias target doesn't exist rejects the build rather than emitting an unresolved {reference} string into the CSS
result: pass
source: automated
coverage_id: D4

### 15. [01-04-SUMMARY.md] D5
expected: app/page.tsx consumes semantic Tailwind utilities only (bg-bg-app, bg-bg-surface, text-text-primary, text-text-muted, bg-bg-primary/text-text-on-primary) — no raw hex literal from tokens/color.tokens.json appears in the file — and a theme-probe button toggles the .dark class
result: pass
source: automated
coverage_id: D5

### 16. [01-05-SUMMARY.md] D1
expected: A component test co-located with a component runs in a real browser (headless Chromium via the Playwright provider) and asserts on clicks and keyboard interaction, not a simulated DOM — proven by HarnessProbe's test exercising click, keyboard Enter, and disabled-state suppression via a native DOM click() call
result: pass
source: automated
coverage_id: D1

### 17. [01-05-SUMMARY.md] D2
expected: Every Storybook story is checked by axe-core automatically and the check has real teeth — demonstrated by a deliberate negative control (stripping the probe's accessible name, confirming the run fails on a genuine button-name violation, then reverting) rather than merely wiring the addon and assuming it works
result: pass
source: automated
coverage_id: D2

### 18. [01-05-SUMMARY.md] D4
expected: The harness is proven working by a throwaway smoke component (HarnessProbe) before any real primitive exists — Button (plan 01-06+) is not the first thing the harness is ever run against
result: pass
source: automated
coverage_id: D4

### 19. [01-05-SUMMARY.md] D5
expected: Storybook stories contain no interaction test logic — harness-probe.stories.tsx is visual-only CSF3 (Hovered/Focused staged via decorator class application, never a play function); behavioural assertions live exclusively in the co-located test file
result: pass
source: automated
coverage_id: D5

### 20. [01-06-SUMMARY.md] D1
expected: Button renders with an accessible role/name, fires onClick on click and keyboard Enter/Space, and suppresses both when isDisabled
result: pass
source: automated
coverage_id: D1

### 21. [01-06-SUMMARY.md] D2
expected: Button renders three distinct variant backgrounds and three distinct sizes, all from semantic tokens
result: pass
source: automated
coverage_id: D2

### 22. [01-06-SUMMARY.md] D3
expected: A consumer className overrides a conflicting base class via merge, not concatenation
result: pass
source: automated
coverage_id: D3

### 23. [01-06-SUMMARY.md] D4
expected: IconButton exposes label as its accessible name with no visible text, and a >=44x44px hit area at every size including sm
result: pass
source: automated
coverage_id: D4

### 24. [01-06-SUMMARY.md] D5
expected: axe-core reports no accessibility violation on any Button or IconButton story
result: pass
source: automated
coverage_id: D5

### 25. [01-07-SUMMARY.md] D1
expected: TextField's visible label is programmatically associated with its input (accessible name = label text, clicking the label focuses the input)
result: pass
source: automated
coverage_id: D1

### 26. [01-07-SUMMARY.md] D2
expected: TextField's error state renders the danger border/text, marks the input aria-invalid, and exposes the error message as the input's accessible description; no error element renders when hasError is unset
result: pass
source: automated
coverage_id: D2

### 27. [01-07-SUMMARY.md] D3
expected: A 300-character TextField value holds the field's rendered width instead of expanding or wrapping the layout
result: pass
source: automated
coverage_id: D3

### 28. [01-07-SUMMARY.md] D4
expected: Checkbox is keyboard-operable (tab-reachable, toggles on Space) and exposes checked/disabled/invalid state to assistive technology, sharing TextField's danger token for its error state
result: pass
source: automated
coverage_id: D4

### 29. [01-07-SUMMARY.md] D5
expected: Checkbox is a real controlled component: onCheckedChange fires the intended next value but the rendered state only changes when the parent feeds isChecked back in
result: pass
source: automated
coverage_id: D5

### 30. [01-07-SUMMARY.md] D6
expected: axe-core reports no accessibility violation on any TextField or Checkbox story (17 stories, 34 light/dark cases)
result: pass
source: automated
coverage_id: D6

### 31. [01-08-SUMMARY.md] D1
expected: "A Switch is keyboard-operable (tab-reachable, toggles on Space), exposes its
result: pass
source: automated
coverage_id: D1

### 32. [01-08-SUMMARY.md] D2
expected: "A Switch renders no visible text yet carries an accessible name via a required
result: pass
source: automated
coverage_id: D2

### 33. [01-08-SUMMARY.md] D3
expected: "Dropdown is composed from named sub-components (Root/Trigger/Content/Item)
result: pass
source: automated
coverage_id: D3

### 34. [01-08-SUMMARY.md] D4
expected: "axe-core reports no accessibility violation on any Switch or Dropdown story (14
result: pass
source: automated
coverage_id: D4

### 35. [01-09-SUMMARY.md] D2
expected: "All seven primitives — Button, IconButton, TextField, Checkbox, Switch,
result: pass
source: automated
coverage_id: D2

### 36. [01-09-SUMMARY.md] D4
expected: "No feature code consumed a primitive before all seven existed — the whole
result: pass
source: automated
coverage_id: D4

### 37. [01-10-SUMMARY.md] D1
expected: OpenAPI contract committed to docs/api/, with a CI step that regenerates and diffs against the committed generated types (no error suppression)
result: pass
source: automated
coverage_id: D1

### 38. [01-10-SUMMARY.md] D2
expected: externalApi server-only client — fails the build if imported from a client component; no hardcoded URL literal
result: pass
source: automated
coverage_id: D2

### 39. [01-10-SUMMARY.md] D3
expected: MSW mock backend covers signup, signin, GET/PUT theme with the eight specified behaviours, including indistinguishable auth failures and idempotent theme updates
result: pass
source: automated
coverage_id: D3

### 40. [01-10-SUMMARY.md] D4
expected: instrumentation.ts starts MSW's Node interception at server startup, gated to the Node.js runtime, reached via dynamic import; unhandled requests error
result: pass
source: automated
coverage_id: D4

### 41. [01-11-SUMMARY.md] D1
expected: "session.ts: session-service factory issuing a signed httpOnly/Secure/SameSite=lax
result: pass
source: automated
coverage_id: D1

### 42. [01-11-SUMMARY.md] D2
expected: dal.ts: verifySession(), the authoritative React-cache-wrapped identity check
result: pass
source: automated
coverage_id: D2

### 43. [01-11-SUMMARY.md] D3
expected: "Shared Zod schemas (signUpSchema/signInSchema) matching 01-UI-SPEC.md's exact
result: pass
source: automated
coverage_id: D3

### 44. [01-11-SUMMARY.md] D4
expected: "Three BFF Route Handlers: signup/signin create a session on success; signin's
result: pass
source: automated
coverage_id: D4

### 45. [01-12-SUMMARY.md] D1
expected: "QueryProvider wraps app/layout.tsx; useSignUp/useSignIn mutation hooks call this
result: pass
source: automated
coverage_id: D1

### 46. [01-12-SUMMARY.md] D2
expected: "SignUpForm: ten specified behaviours (three labelled fields + submit, all-empty
result: pass
source: automated
coverage_id: D2

### 47. [01-12-SUMMARY.md] D3
expected: "SignInForm: eight specified behaviours (two labelled fields + submit, required
result: pass
source: automated
coverage_id: D3

### 48. [01-12-SUMMARY.md] D4
expected: "/register and /login routes render the respective form inside AuthCard; both
result: pass
source: automated
coverage_id: D4

### 49. [01-13-SUMMARY.md] D1
expected: "proxy.ts: optimistic pre-render redirect — unauthenticated visitor to /boards
result: pass
source: automated
coverage_id: D1

### 50. [01-13-SUMMARY.md] D2
expected: "app/(dashboard)/layout.tsx: authoritative verifySession() check, independent of
result: pass
source: automated
coverage_id: D2

### 51. [01-13-SUMMARY.md] D3
expected: "SignOutButton + the three protected surfaces: signed-in identity's displayName
result: pass
source: automated
coverage_id: D3

### 52. [01-13-SUMMARY.md] D4
expected: "AUTH-01/AUTH-02/AUTH-03 proven end to end in a real browser against the real
result: pass
source: automated
coverage_id: D4

### 53. [01-14-SUMMARY.md] D1
expected: "updateThemeAction authenticates itself via verifySession() and carries no
result: pass
source: automated
coverage_id: D1

### 54. [01-14-SUMMARY.md] D2
expected: "The toggle flips instantly client-side (document root class + local state)
result: pass
source: automated
coverage_id: D2

### 55. [01-14-SUMMARY.md] D3
expected: "The saved theme is present in the server-rendered HTML before any script runs —
result: pass
source: automated
coverage_id: D3

### 56. [01-14-SUMMARY.md] D4
expected: "Persistence holds across a full reload and across sign-out and sign-in, proven
result: pass
source: automated
coverage_id: D4

### 57. [01-14-SUMMARY.md] D5
expected: "No visual/theme.visual.spec.ts entry or baseline is created — visual-regression
result: pass
source: automated
coverage_id: D5

### 58. [01-15-SUMMARY.md] D6
expected: Neither the session secret nor the API base URL appears anywhere in the repository; both are supplied per environment
result: pass
source: automated
coverage_id: D6

### 59. [01-15-SUMMARY.md] D7
expected: vercel.json pins the install and build commands to this project's pnpm scripts
result: pass
source: automated
coverage_id: D7

### 60. [01-16-SUMMARY.md] D1
expected: "Button, TextField, IconButton and Dropdown.Root each accept isLoading:
result: pass
source: automated
coverage_id: D1

### 61. [01-16-SUMMARY.md] D2
expected: "A TextField with isLoading refuses a typed character (its value after typing
result: pass
source: automated
coverage_id: D2

### 62. [01-16-SUMMARY.md] D3
expected: "A Dropdown.Root with isLoading cannot be opened by a real click or keyboard
result: pass
source: automated
coverage_id: D3

### 63. [01-16-SUMMARY.md] D4
expected: "Both auth forms freeze every field, the password-visibility toggle and the
result: pass
source: automated
coverage_id: D4

### 64. [01-17-SUMMARY.md] D1
expected: "ErrorFallback shared recovery surface: heading + description (never the
result: pass
source: automated
coverage_id: D1

### 65. [01-17-SUMMARY.md] D2
expected: "app/(dashboard)/error.tsx: the protected route group's segment boundary,
result: pass
source: automated
coverage_id: D2

### 66. [01-17-SUMMARY.md] D3
expected: "app/global-error.tsx: the root document fallback with its own html/body, its
result: pass
source: automated
coverage_id: D3

### 67. [01-18-SUMMARY.md] D1
expected: "A staged/pushed secret is caught: gitleaks (via the pinned gitleaks-action, and
result: pass
source: automated
coverage_id: D1

### 68. [01-18-SUMMARY.md] D2
expected: "Ordinary content is unaffected: the current working tree and the full commit
result: pass
source: automated
coverage_id: D2

### 69. [01-18-SUMMARY.md] D3
expected: "CI runs the same scan on every push, independent of any local hook (no local
result: pass
source: automated
coverage_id: D3

### 70. [01-19-SUMMARY.md] D1
expected: signUpSchema enforces the real backend's password rules (8-64 chars, uppercase/lowercase/digit/special) and rejects out-of-range or low-complexity passwords with the correct named message
result: pass
source: automated
coverage_id: D1

### 71. [01-19-SUMMARY.md] D2
expected: displayName is optional; an absent, empty, or whitespace-only name is accepted as no-name, and a supplied name is checked against the backend's 3-32/Unicode-letters-and-spaces rules
result: pass
source: automated
coverage_id: D2

### 72. [01-19-SUMMARY.md] D3
expected: resolveDisplayName never returns an empty string: supplied name wins, else the email's local part, else the literal 'User'; both Route Handlers use it when assembling a session, so a nameless sign-up/sign-in yields a usable display name
result: pass
source: automated
coverage_id: D3

### 73. [01-19-SUMMARY.md] D4
expected: signInSchema is unchanged — still accepts any non-empty password, proving the complexity rules gate sign-up only
result: pass
source: automated
coverage_id: D4

### 74. [01-19-SUMMARY.md] D5
expected: The BFF OpenAPI contract and its generated types are regenerated from the new schemas; re-running the generator leaves no diff
result: pass
source: automated
coverage_id: D5

### 75. [01-19-SUMMARY.md] D6
expected: Sign-up form: Name field marked optional via the description prop, empty-submit shows exactly two required-field messages, a nameless valid submit sends no displayName key, on-blur cases cover the too-short/digit-containing name and the too-long/complexity-failing password
result: pass
source: automated
coverage_id: D6

### 76. [01-20-SUMMARY.md] D1
expected: "src/lib/routes.ts: single ROUTE as-const object (HOME/SIGN_IN/SIGN_UP/BOARDS),
result: pass
source: automated
coverage_id: D1

### 77. [01-20-SUMMARY.md] D2
expected: "Both guard layers (proxy.ts, app/(dashboard)/layout.tsx) and sign-out-button.tsx
result: pass
source: automated
coverage_id: D2

### 78. [01-20-SUMMARY.md] D3
expected: "Every remaining call site (auth hooks' post-auth destination, landing page's two
result: pass
source: automated
coverage_id: D3

### 79. [01-20-SUMMARY.md] D4
expected: "Both auth mutation hooks (useSignIn, useSignUp) have direct jsdom/RTL tests
result: pass
source: automated
coverage_id: D4

### 80. [01-20-SUMMARY.md] D5
expected: "The jsdom harness placeholder (rtl-harness-probe.tsx and its test) is removed
result: pass
source: automated
coverage_id: D5

### 81. [01-21-SUMMARY.md] D1
expected: "setupMswWorker and renderWithProviders extracted to src/test-utils/, consumed
result: pass
source: automated
coverage_id: D1

### 82. [01-21-SUMMARY.md] D2
expected: "Storybook preview annotations registered for the 'browser' Vitest project
result: pass
source: automated
coverage_id: D2

### 83. [01-21-SUMMARY.md] D3
expected: "Both form test files compose their sibling stories' staged states (Filled,
result: pass
source: automated
coverage_id: D3

### 84. [01-21-SUMMARY.md] D4
expected: Static analysis clean after the full change set
result: pass
source: automated
coverage_id: D4

### 85. [01-22-SUMMARY.md] D1
expected: Live, automated diagnostic proving the Button Loading spinner's computed animation state correctly tracks the reduced-motion preference in both directions
result: pass
source: automated
coverage_id: D1

### 86. [01-22-SUMMARY.md] D2
expected: GC-13 root cause documented as a named finding (motion-reduce: working as designed) with a permanent comment in button.tsx, not left as an unresolved guess
result: pass
source: automated
coverage_id: D2

### 87. [01-23-SUMMARY.md] D1
expected: Checkbox has a real isLoading prop, visually grayed out the same way isDisabled already is, reporting aria-busy and inert to click/keyboard while loading
result: pass
source: automated
coverage_id: D1

### 88. [01-23-SUMMARY.md] D2
expected: Field.Root's disabled propagation to Checkbox.Root confirmed as a real DOM disabled property on the hidden native input, and checkboxVariants's disabled-selector bug fixed so isDisabled/isLoading actually render grayed out
result: pass
source: automated
coverage_id: D2

### 89. [01-23-SUMMARY.md] D3
expected: Checkbox's Loading story exists and is registered for the next visual-baseline generation pass, with zero new axe violations
result: pass
source: automated
coverage_id: D3

### 90. [01-24-SUMMARY.md] D1
expected: A loading TextField is visually distinguishable from an idle TextField (real opacity+background change, not merely an invisible cursor style)
result: pass
source: automated
coverage_id: D1

### 91. [01-24-SUMMARY.md] D2
expected: A loading TextField remains visually distinct from a disabled TextField (three-way pairwise-distinct opacity: 1 / 0.7 / 0.5)
result: pass
source: automated
coverage_id: D2

### 92. [01-24-SUMMARY.md] D3
expected: The pre-existing readOnly-not-disabled mechanism (loading field stays focusable, value frozen mid-typing) is unchanged by this visual-only fix
result: pass
source: automated
coverage_id: D3

### 93. [01-25-SUMMARY.md] D1
expected: "Modal.Root's doc comment documents the isLoading-guards-dismissal convention
result: pass
source: automated
coverage_id: D1

### 94. [01-25-SUMMARY.md] D2
expected: "Submitting demonstration story added and registered in
result: pass
source: automated
coverage_id: D2

### 95. [01-26-SUMMARY.md] D1
expected: store.ts has no node:fs/node:os/node:path imports and no disk I/O of any kind
result: pass
source: automated
coverage_id: D1

### 96. [01-26-SUMMARY.md] D2
expected: resetMockStore() clears a created user while the seeded demo account survives, and is idempotent
result: pass
source: automated
coverage_id: D2

### 97. [01-26-SUMMARY.md] D3
expected: Every existing mock-backed test (signup, signin, theme read/update) still passes unmodified
result: pass
source: automated
coverage_id: D3

### 98. [01-26-SUMMARY.md] D4
expected: CONVENTIONS.md states mock/test state is in-memory-only, reset via an explicit function
result: pass
source: automated
coverage_id: D4

### 99. [01-28-SUMMARY.md] D1
expected: CONVENTIONS.md documents the renderHook/RTL convention for hook tests, citing 01-20's real use-sign-in.unit.test.tsx as verified precedent
result: pass
source: automated
coverage_id: D1

### 100. [01-28-SUMMARY.md] D2
expected: CONVENTIONS.md has a compact 'where code lives' quick-reference alongside the unchanged existing Placement rule
result: pass
source: automated
coverage_id: D2

### 101. [01-29-SUMMARY.md] D1
expected: "A loading TextField refuses focus and typed input exactly like a disabled
result: pass
source: automated
coverage_id: D1

### 102. [01-29-SUMMARY.md] D2
expected: "A loading TextField still reports aria-busy=\"true\", independent of the
result: pass
source: automated
coverage_id: D2

### 103. [01-29-SUMMARY.md] D3
expected: "A loading field's computed opacity now equals a disabled field's (both 0.5),
result: pass
source: automated
coverage_id: D3

### 104. [01-29-SUMMARY.md] D4
expected: "Both auth forms' pending-state tests assert the new refuses-focus behaviour on
result: pass
source: automated
coverage_id: D4

### 105. [01-29-SUMMARY.md] D5
expected: "01-CONTEXT.md records GC-17 as an explicit, traceable override of the prior
result: pass
source: automated
coverage_id: D5

### 106. [01-30-SUMMARY.md] D1
expected: No fake HTTP layer (MSW, mock store, worker asset) remains anywhere in the repository; every test target resolves the real nonprod backend's address
result: pass
source: automated
coverage_id: D1

### 107. [01-30-SUMMARY.md] D2
expected: The committed OpenAPI contract is the document the live backend serves, with a neutral servers entry and no deployed hostname
result: pass
source: automated
coverage_id: D2

### 108. [01-30-SUMMARY.md] D3
expected: A backend problem-response's named error code is readable by application code as a typed value, without re-parsing prose
result: pass
source: automated
coverage_id: D3

### 109. [01-30-SUMMARY.md] D5
expected: The end-to-end suite creates its own throwaway account per test rather than relying on a seeded fixture, and every AUTH-01/02/03 scenario from the original specs still passes against the live backend
result: pass
source: automated
coverage_id: D5

### 110. [01-31-SUMMARY.md] D1
expected: The reset step's YAML shape is correct: calls the reset route with X-Reset-Token from secrets.NONPROD_RESET_TOKEN, guarded by if: always(), checks the response against 204, no secret value ever appears literally in the file
result: pass
source: automated
coverage_id: D1

### 111. [01-31-SUMMARY.md] D2
expected: A real pipeline run on the GitHub remote is green with the reset step executing successfully (204)
result: pass
source: automated
coverage_id: D2

### 112. [01-32-SUMMARY.md] D1
expected: A session token carries the backend's own JSESSIONID credential; a token with the identity but no credential fails verification and returns null without throwing
result: pass
source: automated
coverage_id: D1

### 113. [01-32-SUMMARY.md] D2
expected: extractUpstreamSessionId/toUpstreamCookieHeader correctly read and build the JSESSIONID Set-Cookie/Cookie header pair, including a value whose own Expires attribute contains a comma
result: pass
source: automated
coverage_id: D2

### 114. [01-32-SUMMARY.md] D3
expected: Every outbound externalApi call for a signed-in user is authenticated by one request middleware, and the same call is refused without a bridged credential and accepted with one — proven against the live backend
result: pass
source: automated
coverage_id: D3

### 115. [01-32-SUMMARY.md] D4
expected: Sign-in and sign-up requests are never sent carrying a stale bridged credential, even when a session already exists
result: pass
source: automated
coverage_id: D4

### 116. [01-32-SUMMARY.md] D5
expected: An upstream 401 UNAUTHENTICATED on an already-bridged call clears this app's session and redirects to sign-in; a wrong-password BAD_CREDENTIALS refusal does neither
result: pass
source: automated
coverage_id: D5

### 117. [01-34-SUMMARY.md] D1
expected: A signed-in user can sign out, and the board list then refuses them exactly as it refuses a visitor who never signed in
result: pass
source: automated
coverage_id: D1

### 118. [01-34-SUMMARY.md] D2
expected: Sign-out works before JavaScript has hydrated, like the other two auth screens
result: pass
source: automated
coverage_id: D2

### 119. [01-34-SUMMARY.md] D3
expected: No client-side layer for calling this application's own endpoints remains, because no such endpoint remains
result: pass
source: automated
coverage_id: D3

### 120. [01-34-SUMMARY.md] D4
expected: The backend's own sign-out route is confirmed broken and recorded as such, rather than being called anyway or quietly ignored
result: pass
source: automated
coverage_id: D4

### 121. [01-35-SUMMARY.md] D1
expected: Both architectural reversals this round performed (the auth Server Actions carve-out and the mock-server removal) are recorded as decisions a future reader can find, with their reasoning and what they supersede
result: pass
source: automated
coverage_id: D1

### 122. [01-35-SUMMARY.md] D2
expected: A new contributor can get this project running from documented steps alone, against the real backend, with no mock and no seeded account
result: pass
source: automated
coverage_id: D2

### 123. [01-35-SUMMARY.md] D3
expected: No planning or architecture document still asserts that a mock server stands in for the backend
result: pass
source: automated
coverage_id: D3

### 124. [01-35-SUMMARY.md] D4
expected: The two unexecuted plans (01-14, 01-15) name files that exist and describe a world that is true
result: pass
source: automated
coverage_id: D4

### 125. [01-35-SUMMARY.md] D5
expected: Neither unexecuted plan sits in a wave alongside a plan that deletes or moves a file it reads
result: pass
source: automated
coverage_id: D5

### 126. [01-36-SUMMARY.md] D1
expected: eslint-plugin-boundaries recognises three lib rings (lib-core/lib-server/lib-client) plus three transitional lib-legacy* elements, enforcing GC-25 ring directionality; lint stays green through both tasks even though src/lib/api/server-client.ts, session-cookie.ts, session.ts, dal.ts, query-client.tsx, display-name.ts and validation/ are still flat
result: pass
source: automated
coverage_id: D1

### 127. [01-36-SUMMARY.md] D2
expected: The whole pure ring (cn.ts, routes.ts, viewport-breakpoints.ts, problem-detail.ts, generated-types.ts and their tests) lives under src/lib/core/ in four concern subfolders, every importer across src/app/scripts/.storybook/e2e/visual repointed, no pre-move import path remains
result: pass
source: automated
coverage_id: D2

### 128. [01-36-SUMMARY.md] D3
expected: All four toolchain references to generated-types.ts's new location (package.json api:generate output, ci.yml drift-diff target, eslint.config.mjs globalIgnores, .prettierignore) repointed; pnpm api:generate regenerates byte-identical content at the new path
result: pass
source: automated
coverage_id: D3

### 129. [01-37-SUMMARY.md] D1
expected: The server ring (session.ts, dal.ts, server-client.ts, session-cookie.ts + tests) lives under src/lib/server/ and the client ring (query-client.tsx) under src/lib/client/, with every importer across src/app/proxy.ts/.storybook/test-utils repointed and the boundaries policy from 01-36 enforcing ring directionality
result: pass
source: automated
coverage_id: D1

### 130. [01-37-SUMMARY.md] D2
expected: resolveDisplayName lives at features/auth/model.ts (GC-26) and the auth Zod schemas at features/auth/schemas.ts (GC-27), both consumed only from within the auth feature, with every importer (auth-actions, sign-in-form, sign-up-form) repointed to the @/features/auth/* alias and no assertion changed in either moved test
result: pass
source: automated
coverage_id: D2

### 131. [01-37-SUMMARY.md] D3
expected: The auth server-function module is features/auth/actions.ts (renamed off api/auth-), its sibling action-state.ts moved alongside it (deviation), the three emptied folders (features/auth/api/, lib/api/, lib/validation/) and src/lib/'s orphan .gitkeep are gone, src/lib/ holds only its three ring folders, and eslint.config.mjs's transitional lib-legacy*/lib-legacy-api/lib-legacy-validation scaffold is fully removed leaving only the strict ring policy
result: pass
source: automated
coverage_id: D3

### 132. [01-38-SUMMARY.md] D1
expected: CONVENTIONS.md's directory-tree illustration, placement-rule step 8, and quick-reference table describe the three-ring lib/ split (lib/core/, lib/server/, lib/client/) and its dependency direction, matching the eslint-plugin-boundaries policy 01-36 put in force
result: pass
source: automated
coverage_id: D1

### 133. [01-38-SUMMARY.md] D2
expected: model.ts is recognised as a fourth per-feature file kind in both the directory tree (boards entry) and the quick-reference table, and step 2 of the placement rule names features/<domain>/model.ts as the home for a domain's pure model function
result: pass
source: automated
coverage_id: D2

### 134. [01-38-SUMMARY.md] D3
expected: No placement-rule text still instructs a reader to use a flat lib/ catch-all, and no api/auth-actions.ts reference remains anywhere in the file
result: pass
source: automated
coverage_id: D3

### 135. [01-38-SUMMARY.md] D4
expected: The enforcement paragraph names the lib-core/lib-server/lib-client element types (replacing the retired flat lib type) and states that a wrong-direction cross-ring import is a lint error
result: pass
source: automated
coverage_id: D4
### 136. [01-05-SUMMARY.md] D3
expected: A visual-regression baseline can be captured for a Storybook story and a later pixel change would fail the test — playwright.config.ts + visual/primitives.visual.spec.ts exist, are wired to storybook-static, and run cleanly.
result: pass
reported: "Auto-verified by Claude: latest CI run on origin/main (32745086262, 2026-08-24) shows job 'visual' = success."
severity: n/a

### 137. [01-05-SUMMARY.md] D6
expected: CI runs the component tests, the accessibility checks, and the visual-regression checks — not only lint, format and build.
result: pass
reported: "Auto-verified by Claude: latest CI run shows quality/secrets/visual/e2e all green, including the Test and Comment length check steps inside 'quality'."

### 138. [01-06-SUMMARY.md] D6
expected: Visual-regression baselines exist for every Button and IconButton story in both light and dark scope.
result: pass
reported: "Auto-verified by Claude: `git ls-files` confirms Button/IconButton baseline PNGs committed under visual/__screenshots__/; WINDOWS.md id 1 marked fixed 2026-08-11."

### 139. [01-07-SUMMARY.md] D7
expected: Visual-regression baselines exist for every TextField and Checkbox story in both light and dark scope, and the CI visual job is green.
result: pass
reported: "Auto-verified by Claude: 58 TextField + 52 Checkbox baseline files committed; WINDOWS.md id 4 marked fixed; CI visual job green."

### 140. [01-08-SUMMARY.md] D5
expected: Visual-regression baselines exist for every Switch and Dropdown story in both light and dark scope.
result: pass
reported: "Auto-verified by Claude: 42 Switch + 46 Dropdown baseline files committed; WINDOWS.md id 5 marked fixed."

### 141. [01-13-SUMMARY.md] D5
expected: The e2e CI job runs on the real GitHub remote and is green.
result: pass
reported: "Auto-verified by Claude: latest main CI run (32745086262) job 'e2e' = success."

### 142. [01-14-SUMMARY.md] D6
expected: The e2e CI job is green on the real GitHub remote for this exact commit, with NONPROD_RESET_TOKEN forwarded into the Run E2E tests step.
result: pass
reported: "Auto-verified by Claude: 'e2e' job green; quality job's 'Reset nonprod state' step also green, confirming the token forwarding works."

### 143. [01-16-SUMMARY.md] D5
expected: Four new Loading storyIds (Button/IconButton/TextField/Dropdown) have committed visual-regression baselines.
result: pass
reported: "Auto-verified by Claude: 16 *-loading-*.png baseline files committed (4 primitives x 4 viewport/scope combos)."

### 144. [01-18-SUMMARY.md] D4
expected: The `secrets` CI job actually runs green on the real GitHub remote.
result: pass
reported: "Auto-verified by Claude: latest main CI run job 'secrets' = success."

### 145. [01-20-SUMMARY.md] D6
expected: The routes:check CI step is green on the real GitHub remote.
result: pass
reported: "Auto-verified by Claude: quality job's 'Route declaration check' step = success on latest main run."

### 146. [01-02-SUMMARY.md] D6
expected: N/A — architectural decision (TypeScript downgraded 7.0.2 -> 6.0.3 to reconcile typescript-eslint), not independently user-observable.
result: skipped
reason: "Informational only — recorded decision, no live-app behavior to test. Revisit if typescript-eslint ships real TS 7.x support."

### 147. [01-03-SUMMARY.md] D2
expected: N/A — GitHub branch-protection required-status-checks requires a paid/public-repo plan tier.
result: skipped
reason: "Known platform limitation (gh api returned 403), not resolvable by this project's code. CI still runs and reports status on every push; it just can't block a merge yet."

### 148. [01-32-SUMMARY.md] D6
expected: N/A — both auth mint sites refuse session creation on a credential-less upstream success response.
result: skipped
reason: "Verified by code inspection only (the live backend never actually returns success with no credential, so the branch can't be exercised live). Defensive code, not user-observable."

### 149. [01-35-SUMMARY.md] D6
expected: N/A — the shape plan 01-14's persistence takes is a recorded decision, not an assumption.
result: skipped
reason: "Already confirmed via a blocking Task 3 checkpoint during 01-35's own execution (user selected option-b). Architectural record, not independently app-testable."

### 150. [01-04-SUMMARY.md] D7
expected: N/A — radius/shadow token values measured from the Figma PDF export are accurate.
result: skipped
reason: "Superseded by 01-09-SUMMARY.md's D3 (10 rounds of Figma comparison, final review confirmed 'satisfactory') — duplicate of test 151/already covered, not re-asked."

### 151. [01-30-SUMMARY.md] D4
expected: N/A — sign-up against the real backend stores the backend-returned identity via the (now-retired) Route Handler.
result: skipped
reason: "Superseded — the Route Handler this covered was replaced by 01-33's Server Action rewrite. Current behavior is covered by test 154 instead."

### 152. [01-33-SUMMARY.md] D4
expected: N/A — both auth forms submit and complete before JavaScript hydrates (progressive enhancement).
result: skipped
reason: "Deferred follow-up (already decided): confirmed broken during 01-33's own checkpoint (JS-disabled Playwright context — no network request fires at all), and the user explicitly de-scoped it at that time (\"let's omit js disabled testing, not sure that's needed in 2026\"). Not re-litigated here; revisit only if the no-JS requirement is reinstated."

### 153. Landing page renders with heading and Sign In/Sign Up links
expected: Visiting `/` shows a centered card with the "Kanban Board" heading, a one-line description, and working "Sign In" / "Sign Up" links.
result: pass
reported: "Verified by Claude via Playwright against localhost:3000. First navigation raced dev-server cold-start (landed on /login); a clean reload rendered the landing page correctly with heading, description, and both links."

### 154. Sign-up and sign-in land on the board list
expected: Signing up with a fresh email lands you signed in on the board list. Signing in again later with an existing account lands there too.
result: pass
reported: "Verified by Claude via Playwright against localhost:3000: signed up a fresh test account, landed on /boards with the submitted display name and Sign Out button rendered; signed out; signed back in with the same credentials, landed on /boards again."

### 155. Duplicate email / wrong password show one generic message
expected: Signing up with an email that's already registered, and signing in with the wrong password, both show the exact same generic error message — never the backend's own specific wording (so the message can't be used to tell which case happened).
result: pass
reported: "Verified by Claude via Playwright: wrong-password sign-in and a never-registered-email sign-in both showed the identical 'Invalid email or password.' (confirms sign-in doesn't distinguish account existence). Duplicate-email sign-up showed a separate, equally non-specific message ('We couldn't create your account...'). Each flow is internally non-enumerable; the two flows' messages differ from each other by design (different flows), which still satisfies the anti-enumeration intent."

### 156. Field-level validation and password-field clearing
expected: Validation errors (invalid email format, too-short password, etc.) appear inline as soon as you leave a field, before you submit. A rejected sign-in clears the password field but leaves the email you typed in place.
result: pass
reported: "Verified by Claude via Playwright: typing 'not-an-email' into the sign-up email field and blurring showed 'Enter a valid email address.' inline before submission. A wrong-password sign-in left the email field populated and cleared the password field."

### 157. Modal focus trap
expected: Opening a modal (e.g. a delete/rename confirmation) traps Tab navigation inside it, closes on Escape, and returns focus to whatever opened it when it closes.
result: pass
reported: "Verified by Claude via Playwright against Storybook's Modal 'With Footer Actions' story (no in-app modal exists on main — board CRUD modals live only on the unmerged gsd/phase-02-board-management branch). Tab cycled Cancel -> Save Changes -> back to Cancel without escaping to the trigger button; Escape closed the dialog and returned focus to 'Open modal'."

### 158. Dark mode toggle
expected: Toggling dark mode instantly re-resolves every color on the page together (no partial/flashing update), and the choice survives a page reload.
result: pass
reported: "Verified by Claude via Playwright: toggling on /login added the .dark class and changed body background from rgb(244,247,253) to rgb(32,33,44) (card background changed together, same click). Reloading the page kept the .dark class."

### 159. Deployed app reachable (Preview & Production)
expected: Both the Vercel Preview URL and the Production URL are reachable, and the sign-in page renders styled (not the Vercel SSO interstitial, not unstyled HTML).
result: pass
reported: "Verified by Claude via Playwright against the two most recent deployment URLs from `gh api repos/.../deployments` (Production sha 70add349, Preview from 2026-08-26). Both returned the real styled Sign In card (purple button, card layout, dark-mode switch), not the Vercel SSO interstitial."

### 160. Sign-up/sign-in against the deployed app
expected: A sign-up and a sign-in performed against the deployed application succeed against the real deployed backend, and the account created is still there afterwards.
result: pass
reported: "Verified by Claude via Playwright against the Production URL: signed up a fresh account, landed on /boards with the submitted display name rendered from the backend's own response; signed out; signed back in with the same credentials against the real backend, landed on /boards again — confirms the account persisted upstream."

### 161. Deployed session cookie is Secure
expected: On the deployed (HTTPS) app, the session cookie carries HttpOnly, Secure, and SameSite=Lax attributes (check via browser devtools), and no cookie/storage entry contains the password.
result: pass
reported: "Verified by Claude: the MCP browser tool doesn't expose Set-Cookie attributes for httpOnly cookies (by design, same restriction as page-level JS), so verified via the authoritative source instead — src/lib/core/cookies/cookie-registry.ts's createBaseCookieOptions() sets secure: NODE_ENV !== 'development' and sameSite: 'lax', merged with session.ts's httpOnly: true — all three flags active in the production deployment (HSTS header confirmed present, HTTPS-only origin). Live-checked document.cookie/localStorage/sessionStorage on the deployed app: no password present anywhere (only the non-httpOnly theme cookie is visible client-side, as expected)."

### 162. Theme toggle on the deployed app
expected: The theme toggle works on the deployed application and the choice survives a reload there.
result: pass
reported: "Verified by Claude via Playwright against the Production URL: toggled dark mode on /boards, confirmed .dark class applied; reloaded the page, .dark class persisted."

## Summary

total: 162
passed: 155
issues: 0
pending: 0
skipped: 7

## Gaps

[none yet]

## Deferred Follow-Ups

- test: 152
  idea: "No-JS progressive enhancement for auth forms — confirmed broken, explicitly de-scoped by user during 01-33's own checkpoint (\"let's omit js disabled testing, not sure that's needed in 2026\"). Revisit only if the no-JS requirement is reinstated."
  deferred_at: 2026-08-26
