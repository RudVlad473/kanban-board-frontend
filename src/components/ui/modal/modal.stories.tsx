import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Modal } from "./modal";
import { Button } from "../button/button";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions (focus
 * trap, Escape, focus restoration, backdrop dismissal) live exclusively in modal.test.tsx. Per
 * D-25, the open state comes from `defaultOpen`, never a play function.
 */
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

/*
 * Demonstrates the isLoading-guards-dismissal composition documented on Modal.Root (plan 01-25):
 * a Modal.Footer Button driving an in-flight action renders isLoading, per GC-01's existing
 * Button convention. Visual-only per D-25 — this story stages the loading Button's appearance; it
 * does not itself demonstrate the dismissal-blocking behavior, which is proven behaviorally in
 * modal.test.tsx.
 */
export const Submitting: Story = {
    render: (args) => (
        <Modal.Root {...args}>
            <Modal.Trigger render={<Button>Open modal</Button>} />

            <Modal.Content>
                <Modal.Title>Delete board</Modal.Title>

                <Modal.Description>This action cannot be undone.</Modal.Description>

                <Modal.Footer>
                    <Button variant="secondary" isDisabled>
                        Cancel
                    </Button>

                    <Button variant="destructive" isLoading>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal.Content>
        </Modal.Root>
    ),
};
