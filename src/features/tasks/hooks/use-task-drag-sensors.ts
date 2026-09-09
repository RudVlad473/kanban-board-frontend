"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/*
 * D-15 forbids importing `use-column-drag-sensors.ts` from here. Not needed anyway: that hook's
 * keyboard narrowing already falls straight through to the plain library handler for a TASK
 * (04-RESEARCH Pitfall 8), so this hook's own plain `KeyboardSensor` is the same behaviour.
 */

/**
 * The tasks feature's own three drag sensors, mirroring `useColumnDragSensors`'s mouse/touch
 * shape and reasoning (03-14-SUMMARY.md). No narrowing subclass: a task step is never measured
 * against the column row. No lift-key override, so both space and enter lift.
 */
export const useTaskDragSensors = () =>
    useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
