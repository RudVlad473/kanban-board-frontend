import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Modal } from "./modal";
import { Button } from "../button/button";

// Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions (focus
// trap, Escape, focus restoration, backdrop dismissal) live exclusively in modal.test.tsx. Per
// D-25, the open state comes from `defaultOpen`, never a play function.
const meta: Meta<typeof Modal.Root> = {
    component: Modal.Root,
    args: {
        defaultOpen: true,
    },
    render: (args) => (
        <Modal.Root {...args}>
            <Modal.Trigger render={<Button>Open modal</Button>} />
            <Modal.Content>
                <Modal.Title>Delete this board?</Modal.Title>
            </Modal.Content>
        </Modal.Root>
    ),
};

export default meta;

type Story = StoryObj<typeof Modal.Root>;

export const Open: Story = {};

export const WithDescription: Story = {
    render: (args) => (
        <Modal.Root {...args}>
            <Modal.Trigger render={<Button>Open modal</Button>} />
            <Modal.Content>
                <Modal.Title>Delete this board?</Modal.Title>
                <Modal.Description>
                    This action cannot be undone. All columns and tasks inside it will be permanently deleted.
                </Modal.Description>
            </Modal.Content>
        </Modal.Root>
    ),
};

export const WithFooterActions: Story = {
    render: (args) => (
        <Modal.Root {...args}>
            <Modal.Trigger render={<Button>Open modal</Button>} />
            <Modal.Content>
                <Modal.Title>Rename board</Modal.Title>
                <Modal.Footer>
                    <Button variant="secondary">Cancel</Button>
                    <Button variant="primary">Save Changes</Button>
                </Modal.Footer>
            </Modal.Content>
        </Modal.Root>
    ),
};

export const LongContent: Story = {
    render: (args) => (
        <Modal.Root {...args}>
            <Modal.Trigger render={<Button>Open modal</Button>} />
            <Modal.Content>
                <Modal.Title>Task activity</Modal.Title>
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 12 }, (_, index) => {
                        const position = String(index + 1);
                        return (
                            <p key={position} className="font-body-l text-body-l text-text-primary">
                                {`Activity entry ${position} — a scrolling body proves the panel's own overflow-y-auto rather than growing past the viewport.`}
                            </p>
                        );
                    })}
                </div>
                <Modal.Footer>
                    <Button variant="secondary">Close</Button>
                </Modal.Footer>
            </Modal.Content>
        </Modal.Root>
    ),
};

export const Closed: Story = {
    args: {
        defaultOpen: false,
    },
};

// ADR tech/0010: mobile-viewport coverage. Modal is the primitive most likely to actually need
// mobile-specific treatment (see modal.tsx's `p-4 md:p-6`) — the panel's `w-[min(90vw,28rem)]`
// width already scales down correctly at 375px, but the padding didn't until this pass. Three
// mobile stories rather than the usual two per component: Open (baseline silhouette at the
// narrowest supported width), WithFooterActions (two side-by-side buttons are the layout most
// likely to feel cramped once padding eats into an already-narrow panel), and LongContent (the
// scroll/silhouette fix from c31a704 needs to keep holding at mobile width too, not just desktop).
export const MobileOpen: Story = {
    globals: { viewport: "mobile" },
};

export const MobileWithFooterActions: Story = {
    render: WithFooterActions.render,
    globals: { viewport: "mobile" },
};

export const MobileLongContent: Story = {
    render: LongContent.render,
    globals: { viewport: "mobile" },
};
