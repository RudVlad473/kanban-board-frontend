"use client";

import { EllipsisVertical, X } from "lucide-react";
import { useState } from "react";

import { Dropdown } from "@/components/ui/dropdown/dropdown";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Menu } from "@/components/ui/menu/menu";
import { Modal } from "@/components/ui/modal/modal";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal/edit-task-modal";
import { SubtaskChecklistRow } from "@/features/tasks/components/subtask-checklist-row/subtask-checklist-row";
import { useMoveTask } from "@/features/tasks/hooks/use-move-task";
import { useToggleSubtask } from "@/features/tasks/hooks/use-toggle-subtask";
import { useUpdateTask } from "@/features/tasks/hooks/use-update-task";
import { toSubtaskDetailCaption, type NamedTaskColumn } from "@/features/tasks/model";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";

type Props = {
    boardId: string;
    task: TaskFull;
    /** Board order — the Current Status control lists these verbatim (mirrors AddTaskModal's Status). */
    columns: NamedTaskColumn[];
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    /** Opens the delete confirmation from the kebab — bubbled, since `board-view.tsx` owns it (04-20). */
    onDeleteTask: (task: TaskFull) => void;
};

/**
 * TASK-02's detail view: a pure read off the board, the kebab opening TASK-03's edit flow (owned
 * directly, the same single-caller reasoning `useToggleSubtask` follows) and TASK-05's delete flow
 * (bubbled to `board-view.tsx`), D-10's Current Status control, and SUBTASK-02's toggle.
 */
export const TaskDetailModal = ({ boardId, task, columns, onClose, onDeleteTask }: Props) => {
    const { moveTask, isPending: isMoving } = useMoveTask({ boardId });
    const { subtasks, toggleSubtask, isSubtaskPending } = useToggleSubtask({ boardId, taskId: task.id, columns });
    const { updateTask, isPending: isSaving } = useUpdateTask({ boardId });
    const [isEditing, setIsEditing] = useState(false);
    const currentColumnId = columns.find((column) => column.tasks.some((entry) => entry.id === task.id))?.id;
    /*
     * Without this, Base UI's `Select.Value` shows the raw id until the popup has opened once —
     * passing `items` is what lets it resolve the label up front (Base UI docs).
     */
    const columnLabelsById = Object.fromEntries(columns.map((column) => [column.id, column.name]));

    const handleColumnChange = (nextColumnId: string | null): void => {
        const destination = columns.find((column) => column.id === nextColumnId);
        if (destination === undefined || destination.id === currentColumnId) {
            return;
        }

        moveTask({ taskId: task.id, targetColumnId: destination.id, targetIndex: destination.tasks.length });
    };

    const handleOpenChange = (nextIsOpen: boolean): void => {
        if (nextIsOpen) {
            return;
        }

        onClose();
    };

    /*
     * S-01: the edit modal closes on submit rather than holding a spinner (matching the shipped
     * rename-modal decision), so this returns to the DETAIL view rather than fully closing — the
     * user was mid-inspection, and the title it now shows is the one the save just applied.
     */
    if (isEditing) {
        return (
            <EditTaskModal
                task={task}
                boardId={boardId}
                columns={columns}
                isPending={isSaving}
                onClose={() => {
                    setIsEditing(false);
                }}
                onSubmit={(values) => {
                    updateTask({ taskId: task.id, title: values.title, description: values.description || undefined });
                    setIsEditing(false);
                }}
            />
        );
    }

    return (
        <Modal.Root isOpen={true} onOpenChange={handleOpenChange}>
            <Modal.Content>
                {/* pr-11 clears the pinned close control below, so the kebab sits to its left. */}
                <div className="flex items-start justify-between gap-4 pr-11">
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
                                    setIsEditing(true);
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
                {task.description !== undefined ? (
                    <p className="mt-6 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                        {task.description}
                    </p>
                ) : null}

                <div className="mt-6">
                    {subtasks.length === 0 ? (
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
                                {toSubtaskDetailCaption(subtasks)}
                            </p>

                            <ul className="mt-4 flex flex-col gap-2">
                                {subtasks.map((subtask) => {
                                    return (
                                        <li key={subtask.id}>
                                            <SubtaskChecklistRow
                                                subtask={subtask}
                                                onToggle={toggleSubtask}
                                                isPending={isSubtaskPending(subtask.id)}
                                            />
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>

                <div className="mt-6 flex flex-col gap-2">
                    <p className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                        Current Status
                    </p>

                    <Dropdown.Root
                        value={currentColumnId}
                        onValueChange={handleColumnChange}
                        items={columnLabelsById}
                        isLoading={isMoving}
                    >
                        <Dropdown.Trigger />

                        <Dropdown.Content>
                            {columns.map((column) => {
                                return (
                                    <Dropdown.Item key={column.id} value={column.id}>
                                        {column.name}
                                    </Dropdown.Item>
                                );
                            })}
                        </Dropdown.Content>
                    </Dropdown.Root>
                </div>

                <Modal.Close
                    render={
                        <IconButton
                            type="button"
                            label="Close"
                            icon={<X />}
                            className="absolute top-1 right-1 md:top-2 md:right-2"
                        />
                    }
                />
            </Modal.Content>
        </Modal.Root>
    );
};
