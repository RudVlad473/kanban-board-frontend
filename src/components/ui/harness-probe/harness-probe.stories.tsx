import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HarnessProbe } from "./harness-probe";

// Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
// (click/keyboard/disabled) live exclusively in harness-probe.test.tsx.
const meta: Meta<typeof HarnessProbe> = {
  component: HarnessProbe,
  args: {
    label: "Probe",
    onActivate: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof HarnessProbe>;

export const Default: Story = {};

// Hover is staged via class application on a wrapping decorator, never a real pointer
// interaction (D-25 keeps stories visual-only). Uses a ring rather than swapping in
// color-bg-primary-hover directly: that token paired with white text fails axe-core's
// color-contrast check (2.22:1 against the required 4.5:1) — a real finding surfaced by this
// harness's first run, flagged in the plan summary for the token itself to be revisited before
// Button's real Hovered story reuses it.
export const Hovered: Story = {
  decorators: [
    (Story) => (
      <div className="[&>button]:ring-2 [&>button]:ring-bg-primary [&>button]:ring-offset-2">
        <Story />
      </div>
    ),
  ],
};

// Focus is staged the same way — a visible outline applied via class application, not a real
// `.focus()` call or a play function.
export const Focused: Story = {
  decorators: [
    (Story) => (
      <div className="[&>button]:outline-2 [&>button]:outline-offset-2 [&>button]:outline-bg-primary">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
