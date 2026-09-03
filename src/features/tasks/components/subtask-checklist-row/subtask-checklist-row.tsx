"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { Check } from "lucide-react";

import { checkboxVariants } from "@/components/ui/checkbox/checkbox-variants";
import type { Subtask } from "@/lib/core/api-contract/task-schemas";
import { cn } from "@/lib/core/styling/cn";

type Props = {
    subtask: Subtask;
    onToggle: (subtaskId: string) => void;
    isPending: boolean;
};

/**
 * TASK-02's checklist row. Reproduces `checkbox.tsx`'s own Field/peer wiring at the ROW's own
 * dimensions instead of reusing that primitive — its `Field.Root` is too tight for C-04's metrics.
 * Calls no hook: SUBTASK-02's toggle mutation is a later plan (04-17).
 */
export const SubtaskChecklistRow = ({ subtask, onToggle, isPending }: Props) => {
    return (
        <Field.Root
            disabled={isPending}
            className="flex min-h-10 items-start gap-4 rounded-sm bg-bg-app px-4 py-2 hover:bg-bg-primary/25"
        >
            <BaseCheckbox.Root
                checked={subtask.isCompleted}
                aria-busy={isPending}
                onCheckedChange={() => {
                    onToggle(subtask.id);
                }}
                /* `mt-1` sits the 16px box on the centre of the 15px first line the label's own padding places. */
                className={cn(checkboxVariants({ size: "sm", isBusy: isPending }), "mt-1 shrink-0")}
            >
                <BaseCheckbox.Indicator className="flex items-center justify-center">
                    <Check strokeWidth={3} />
                </BaseCheckbox.Indicator>
            </BaseCheckbox.Root>

            <Field.Label
                className={cn(
                    /*
                     * Padding, not `self-center`: centring only bites while the row has slack, so a
                     * wrapped title spent it and carried its first line 4.5px above the checkbox.
                     * Reserving that 4.5px pins the first line whether the title wraps or not.
                     */
                    "py-[4.5px] font-body-m text-body-m text-text-primary",
                    /*
                     * checkbox.tsx's own 04-UI-SPEC treatment, reproduced verbatim: 55% of primary
                     * (the lowest whole percent clearing WCAG AA), never the mock-sampled 50%.
                     */
                    "peer-data-[checked]:text-text-primary/55 peer-data-[checked]:line-through",
                )}
            >
                {subtask.title}
            </Field.Label>
        </Field.Root>
    );
};
