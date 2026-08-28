import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { AddBoardModal } from "./add-board-modal";

/*
 * Visual-only CSF3 (D-25), `appDirectory` matching `sign-up-form.stories.tsx`. Both handlers are
 * `fn()` spies so a test asserts by reading these args, never by spreading props onto a composed
 * story (docs/adr/tech/0025).
 */
const meta: Meta<typeof AddBoardModal> = {
    component: AddBoardModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        isOpen: true,
        isPending: false,
        onOpenChange: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof AddBoardModal>;

export const Default: Story = {};

export const Filled: Story = { args: { defaultValues: { name: "Platform Launch" } } };

export const Submitting: Story = { args: { defaultValues: { name: "Platform Launch" }, isPending: true } };

export const NameError: Story = { args: { forceNameError: "Can't be empty" } };

export const CreateFailed: Story = {
    args: { defaultValues: { name: "Platform Launch" }, errorMessage: "Couldn't create board. Try again." },
};

/** D-01a: the form's own default — one empty row, no staging needed beyond naming the state. */
export const OneEmptyRow: Story = {};

export const ManyColumns: Story = {
    args: {
        defaultValues: { name: "Platform Launch" },
        defaultColumns: ["Todo", "Doing", "In Review", "Blocked", "Done"],
    },
};

/** D-02a keeps zero rows valid, so a form with every row removed is a real state to render. */
export const NoColumns: Story = { args: { defaultValues: { name: "Platform Launch" }, defaultColumns: [] } };

export const ColumnNameError: Story = {
    args: { defaultColumns: ["To"], forceColumnError: "Column name must be between 3 and 32 characters." },
};

/** D-02a's own state: a row left blank now reports the required-field copy instead of being dropped. */
export const ColumnRequiredError: Story = {
    args: { defaultValues: { name: "Platform Launch" }, defaultColumns: [""], forceColumnError: "Can't be empty" },
};

/*
 * UI-SPEC's long-text row: an overlong board name stays inside the field rather than widening the
 * modal panel — the field's own `truncate` treatment, demonstrated at the real panel width.
 */
export const LongValues: Story = {
    args: { defaultValues: { name: `Board ${"a".repeat(120)}` }, defaultColumns: ["A".repeat(32)] },
};

/** An untouched form with every row already removed — the only state where the name is the sole required field. */
export const BlankNameNoColumnRows: Story = { args: { defaultColumns: [] } };

/** One valid row waiting on a board name, so naming the board is all that stands between it and a submit. */
export const BlankNameOneNamedColumn: Story = { args: { defaultColumns: ["Todo"] } };

/*
 * The under-length row as the user would actually produce it — no force prop, so the message comes
 * from real validation rather than from staging (distinct from `ColumnNameError`, which stages it).
 */
export const ShortColumnRow: Story = { args: { defaultColumns: ["To"] } };

/** D-02a's blocking case: a row left blank beside a filled one, neither of them staged as an error. */
export const BlankRowBesideFilledRow: Story = { args: { defaultColumns: ["Todo", ""] } };

/*
 * Holds the open/error state the modal itself does not own, so the failed-submit path is staged by
 * the story file rather than by a host component declared in the test (docs/adr/tech/0025).
 */
const FailingSubmitHost = (props: ComponentProps<typeof AddBoardModal>) => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    return (
        <AddBoardModal
            {...props}
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            errorMessage={errorMessage}
            onSubmit={(values) => {
                props.onSubmit(values);
                setErrorMessage("Couldn't create board. Try again.");
            }}
        />
    );
};

/** D-05: the submit handler reports failure, so the modal stays open with everything typed intact. */
export const SubmitFails: Story = {
    args: { defaultColumns: ["Todo"] },
    render: (args) => {
        return <FailingSubmitHost {...args} />;
    },
};
