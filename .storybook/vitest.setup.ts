/*
 * Storybook 10.3+'s @storybook/addon-vitest applies this project's preview annotations
 * (decorators, parameters, globalTypes from .storybook/preview.ts) to every story test
 * automatically — the manual project-annotation wiring pattern from pre-10.3 docs is neither
 * needed nor safe to write here: the addon's own runtime detects the call by name in this file
 * and disables its automatic provisioning to avoid a double-registration conflict, which then
 * leaves every story without a render function. Left present (and wired as this project's
 * setupFiles) as the place future custom Vitest setup for the `storybook` project would go.
 */
export {};
