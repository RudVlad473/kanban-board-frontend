import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Modal } from "./modal";
import { Button } from "../button/button";

/*
 * Visual-only CSF3 — no play function anywhere in this file. Behavioural assertions (focus
 * trap, Escape, focus restoration, backdrop dismissal) live exclusively in modal.test.tsx. Per
 * D-25, the open state comes from `defaultOpen`, never a play function.
 */
const meta: Meta<typeof Modal.Root> = {
    component: Modal.Root,
    args: {
        defaultOpen: true,
    },
    render: (args) => {
        return (
            <Modal.Root {...args}>
                <Modal.Trigger render={<Button>Open modal</Button>} />

                <Modal.Content>
                    <Modal.Title>Delete this board?</Modal.Title>
                </Modal.Content>
            </Modal.Root>
        );
    },
};

export default meta;

type Story = StoryObj<typeof Modal.Root>;

export const Open: Story = {};

export const WithDescription: Story = {
    render: (args) => {
        return (
            <Modal.Root {...args}>
                <Modal.Trigger render={<Button>Open modal</Button>} />

                <Modal.Content>
                    <Modal.Title>Delete this board?</Modal.Title>

                    <Modal.Description>
                        This action cannot be undone. All columns and tasks inside it will be permanently deleted.
                    </Modal.Description>
                </Modal.Content>
            </Modal.Root>
        );
    },
};

export const WithFooterActions: Story = {
    render: (args) => {
        return (
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
        );
    },
};

export const LongContent: Story = {
    render: (args) => {
        return (
            <Modal.Root {...args}>
                <Modal.Trigger render={<Button>Open modal</Button>} />

                <Modal.Content>
                    <Modal.Title>Task activity</Modal.Title>

                    <div className="flex flex-col gap-4">
                        {/* 20 entries, not 12: at 1440x900 twelve fit inside the panel's max height,
                            so the story named for scrolling did not actually scroll there. */}
                        {Array.from({ length: 20 }, (_, index) => {
                            const position = String(index + 1);
                            return (
                                <p key={position} className="font-body-l text-body-l text-text-primary">
                                    {`Activity entry ${position} — a scrolling body proves the panel's own overflow-y-auto rather than growing past the viewport.`}
                                </p>
                            );
                        })}
                    </div>

                    <Modal.Footer>
                        <Button variant="secondary">Done</Button>
                    </Modal.Footer>
                </Modal.Content>
            </Modal.Root>
        );
    },
};

export const Closed: Story = {
    args: {
        defaultOpen: false,
    },
};

/*
 * Stages the isLoading-guards-dismissal composition's appearance (Modal.Root doc, plan 01-25);
 * the dismissal-blocking behaviour itself is proven behaviourally in modal.test.tsx, not here.
 */
export const Submitting: Story = {
    render: (args) => {
        return (
            <Modal.Root {...args}>
                <Modal.Trigger render={<Button>Open modal</Button>} />

                <Modal.Content>
                    <Modal.Title>Delete board</Modal.Title>

                    <Modal.Description>This action cannot be undone.</Modal.Description>

                    <Modal.Footer>
                        <Button variant="secondary" isDisabled={true}>
                            Cancel
                        </Button>

                        <Button variant="destructive" isLoading={true}>
                            Delete
                        </Button>
                    </Modal.Footer>
                </Modal.Content>
            </Modal.Root>
        );
    },
};
