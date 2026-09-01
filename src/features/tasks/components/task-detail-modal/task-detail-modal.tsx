"use client";

import { EllipsisVertical } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Menu } from "@/components/ui/menu/menu";
import { Modal } from "@/components/ui/modal/modal";
import { SubtaskChecklistRow } from "@/features/tasks/components/subtask-checklist-row/subtask-checklist-row";
import { toSubtaskDetailCaption } from "@/features/tasks/model";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";

type Props = {
    task: TaskFull;
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    /** Toggles one subtask's completion — SUBTASK-02's mutation is a later plan (04-17). */
    onToggleSubtask: (subtaskId: string) => void;
    /** The one subtask currently mid-toggle, so its row alone reflects D-08's in-flight lock. */
    pendingSubtaskId?: string | null;
    /** Opens the edit flow from the kebab — TASK-03's mutation is a later plan (04-18). */
    onEditTask: (task: TaskFull) => void;
    /** Opens the delete-confirmation flow from the kebab — TASK-05's mutation is a later plan (04-20). */
    onDeleteTask: (task: TaskFull) => void;
};

/**
 * TASK-02's detail view — a pure read off the already-parsed board, plus the kebab that opens
 * TASK-03/TASK-05's flows and the checklist SUBTASK-02 wires. Reuses the shipped `Modal.Content`
 * clamp unchanged (S-09: no visible close control; Esc/backdrop dismiss, focus returns to the card).
 */
export const TaskDetailModal = ({
    task,
    onClose,
    onToggleSubtask,
    pendingSubtaskId = null,
    onEditTask,
    onDeleteTask,
}: Props) => {
    const handleOpenChange = (nextIsOpen: boolean): void => {
        if (nextIsOpen) {
            return;
        }

        onClose();
    };

    return (
        <Modal.Root isOpen={true} onOpenChange={handleOpenChange}>
            <Modal.Content>
                <div className="flex items-start justify-between gap-4">
                    {/* pr-6 reserves the kebab's own footprint so a long title never runs under it. */}
                    <Modal.Title className="min-w-0 flex-1 pr-6 break-words">{task.title}</Modal.Title>

                    <Menu.Root>
                        <Menu.Trigger
                            render={
                                <IconButton
                                    variant="ghost"
                                    size="md"
                                    label={`Task actions for ${task.title}`}
                                    icon={<EllipsisVertical />}
                                />
                            }
                        />

                        {/*
                         * Dismissed states: no loading (a local popover over loaded data), no error
                         * (opening cannot fail), no overflow (a fixed two-item list).
                         */}
                        <Menu.Content>
                            <Menu.Item
                                onClick={() => {
                                    onEditTask(task);
                                }}
                            >
                                Edit Task
                            </Menu.Item>

                            <Menu.Item
                                isDestructive={true}
                                onClick={() => {
                                    onDeleteTask(task);
                                }}
                            >
                                Delete Task
                            </Menu.Item>
                        </Menu.Content>
                    </Menu.Root>
                </div>

                {/* UI-SPEC empty/detail-view: no block at all when there is none — no placeholder line. */}
                {task.description === undefined ? null : (
                    <p className="mt-6 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                        {task.description}
                    </p>
                )}

                <div className="mt-6">
                    {task.subtasks.length === 0 ? (
                        <div className="flex flex-col gap-1">
                            {/* UI-SPEC empty/detail-view: the caption is SUPPRESSED, not "(0 of 0)". */}
                            <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                                No subtasks yet.
                            </p>

                            <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                                Use Edit Task to add one.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                                {toSubtaskDetailCaption(task.subtasks)}
                            </p>

                            <ul className="mt-4 flex flex-col gap-2">
                                {task.subtasks.map((subtask) => {
                                    return (
                                        <li key={subtask.id}>
                                            <SubtaskChecklistRow
                                                subtask={subtask}
                                                onToggle={onToggleSubtask}
                                                isPending={subtask.id === pendingSubtaskId}
                                            />
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>
            </Modal.Content>
        </Modal.Root>
    );
};
