"use client";

import { isNil } from "es-toolkit";
import { X } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/icon-button/icon-button";
import { TextField } from "@/components/ui/text-field/text-field";
import { SUBTASK_ROW_REQUIRED_FIELD_MESSAGE } from "@/features/tasks/model";

type Props = {
    /** The row's last-committed title — `""` for a draft row that has never committed. */
    title: string;
    /** Set by the caller, never inferred — a live row renames, a draft row creates. */
    isDraft: boolean;
    /** The row's own accessible label, e.g. "Subtask 2" — hidden visually, kept for a11y. */
    rowLabel: string;
    isPending: boolean;
    /** Resolves to whether the commit succeeded, so a failed rename can restore its value and refocus. */
    onCommit: (title: string) => Promise<boolean>;
    onRemove: () => void;
    /** Storybook-only staging — renders the required-field error state without a real blur. */
    forceErrorMessage?: string;
};

// comment-length-exempt: records why the field remounts on a failed commit instead of using a ref or an effect — a settled design decision a future reader would otherwise "fix" by reaching for one (docs/adr/tech/0023)
/**
 * The inline row: the row IS the text field, committing on blur or Enter when its value changed
 * and is non-empty. Calls no hook — commit/remove/pending all come from the caller (`EditTaskModal`),
 * matching every sibling row/modal's presentational-by-prop rule. `retryToken` remounts the field
 * with `autoFocus` after a failed commit, so the row can refocus itself with no ref and no effect.
 */
export const SubtaskEditorRow = ({
    title,
    isDraft,
    rowLabel,
    isPending,
    onCommit,
    onRemove,
    forceErrorMessage,
}: Props) => {
    const [value, setValue] = useState(title);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [retryToken, setRetryToken] = useState(0);
    const shownErrorMessage = forceErrorMessage ?? errorMessage;

    const handleBlur = async (): Promise<void> => {
        const trimmed = value.trim();

        if (trimmed === title.trim()) {
            return;
        }

        if (trimmed === "") {
            setErrorMessage(SUBTASK_ROW_REQUIRED_FIELD_MESSAGE);
            return;
        }

        setErrorMessage(undefined);
        const didCommit = await onCommit(trimmed);

        if (!didCommit) {
            setValue(title);
            setRetryToken((current) => current + 1);
        }
    };

    const removeLabel = value.trim() === "" ? `Remove ${rowLabel}` : `Remove subtask '${value}'`;

    return (
        <div className="flex items-center gap-2">
            <TextField
                key={retryToken}
                label={rowLabel}
                isLabelHidden={true}
                type="text"
                placeholder={isDraft ? "e.g. Make coffee" : undefined}
                autoFocus={retryToken > 0}
                isDisabled={isPending}
                value={value}
                hasError={Boolean(shownErrorMessage)}
                errorMessage={shownErrorMessage}
                onChange={(event) => {
                    setValue(event.target.value);
                    if (!isNil(errorMessage)) {
                        setErrorMessage(undefined);
                    }
                }}
                onBlur={() => {
                    void handleBlur();
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                    }
                }}
            />

            <IconButton
                type="button"
                variant="ghost"
                label={removeLabel}
                icon={<X />}
                isLoading={isPending}
                onClick={onRemove}
            />
        </div>
    );
};
