"use client";

import {
    KeyboardCode,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type Activators,
    type KeyboardSensorOptions,
    type KeyboardSensorProps,
    type SensorInstance,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { isKeyboardEvent, subtract, type Coordinates } from "@dnd-kit/utilities";

import { isColumnDestinationVisible } from "@/features/boards/model";

/** The only two steps this narrowing applies to — the row is horizontal, so up and down never move. */
const HORIZONTAL_STEP_CODES = new Set<string>([KeyboardCode.Right, KeyboardCode.Left]);

/**
 * The one step this sensor takes over from the library: the destination and the coordinates the move
 * would use, resolved only when that destination is ALREADY inside the row's visible box.
 */
const resolveVisibleDestinationMove = ({
    event,
    props,
}: {
    event: Event;
    props: KeyboardSensorProps;
}): { currentCoordinates: Coordinates; newCoordinates: Coordinates } | null => {
    if (!isKeyboardEvent(event) || !HORIZONTAL_STEP_CODES.has(event.code)) {
        return null;
    }

    const { collisionRect, scrollableAncestors } = props.context.current;
    const scrollRow = scrollableAncestors.at(0);
    if (collisionRect === null || scrollRow === undefined) {
        return null;
    }

    const currentCoordinates = { x: collisionRect.left, y: collisionRect.top };
    const newCoordinates = sortableKeyboardCoordinates(event, {
        active: props.active,
        context: props.context.current,
        currentCoordinates,
    });

    if (!newCoordinates) {
        return null;
    }

    /* `clientWidth`, not the bounding rect's — the box the user can see excludes any scrollbar gutter. */
    const rowRect = scrollRow.getBoundingClientRect();
    const isVisible = isColumnDestinationVisible({
        destination: { left: newCoordinates.x, right: newCoordinates.x + collisionRect.width },
        visibleBox: { left: rowRect.left, right: rowRect.left + scrollRow.clientWidth },
    });

    return isVisible ? { currentCoordinates, newCoordinates } : null;
};

/** The two pieces of `KeyboardSensor` state this narrowing needs, which its `.d.ts` marks private. */
type KeyboardSensorInternals = {
    props: KeyboardSensorProps;
    referenceCoordinates: Coordinates | undefined;
    handleKeyDown(event: Event): void;
};

type KeyboardSensorConstructor = {
    new (props: KeyboardSensorProps): SensorInstance & KeyboardSensorInternals;
    activators: Activators<KeyboardSensorOptions>;
};

/*
 * Reached structurally rather than by re-implementing the sensor: every branch this class does not
 * narrow still runs the library's own shipped code (see 03-14-SUMMARY.md).
 */
const BaseKeyboardSensor = KeyboardSensor as unknown as KeyboardSensorConstructor;

/**
 * `KeyboardSensor`, minus one scroll. The library scrolls whenever the destination lies past the
 * container's midpoint, so on a wide column row an arrow step threw a visible neighbour off screen;
 * a destination outside the box still falls through to the library, keeping past-the-fold reachable.
 */
class ColumnKeyboardSensor extends BaseKeyboardSensor {
    handleKeyDown(event: Event): void {
        const move = resolveVisibleDestinationMove({ event, props: this.props });

        if (move === null) {
            super.handleKeyDown(event);

            return;
        }

        /* The library's own move, verbatim: reference coordinates first, then the translate from them. */
        event.preventDefault();
        this.referenceCoordinates ??= move.currentCoordinates;
        this.props.onMove(subtract(move.newCoordinates, this.referenceCoordinates));
    }
}

/**
 * COLUMN-03's three drag sensors. Mouse and touch rather than the combined pointer one: that keeps
 * real touch support while staying reachable by automation, and it sidesteps the pointer sensor's
 * complete absence of an interactive-element guard (03-RESEARCH Pitfall 5, T-03-32).
 */
export const useColumnDragSensors = () =>
    useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        /* No lift-key override: D-06 keeps the library's defaults, so both space and enter lift. */
        useSensor(ColumnKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
