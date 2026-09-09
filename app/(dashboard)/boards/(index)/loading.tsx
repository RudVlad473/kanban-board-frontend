// Covered by: `e2e/boards-switch.e2e.spec.ts`
import { BoardViewSkeleton } from "@/features/boards/components/board-view-skeleton/board-view-skeleton";

/*
 * Reuses the board skeleton rather than authoring a second one: this route either redirects into a
 * board detail route or renders `BoardsEmptyState`, and the column shape is a better first paint
 * than a blank frame for either, so a bespoke skeleton for a redirect is not worth building.
 */

// comment-length-exempt: decision record — states the measured defect this route group fixes, dated so the claim is falsifiable
/*
 * Lives inside a `(index)` route group, not directly under `boards/`, because of a Next behaviour
 * that is easy to miss from the JSX alone: `loading.js` wraps not only its own `page.js` but every
 * NESTED segment below it too, so a fallback authored for `/boards` also covered `/boards/[boardId]`
 * before this move — rendering INSIDE the dashboard layout's `<main>` beside the board it was never
 * meant to cover. Two `flex-1` children then split the height 50/50: the board's scroll container
 * measured at 324px against a 647px baseline, and the horizontal scrollbar pinned to its bottom edge
 * jumped with it (measured 2026-09-06). A route group scopes the fallback back to this one route
 * without moving the URL (`/boards` is still `/boards`) — Next's own documented mechanism for this,
 * not a hand-rolled pathname guard.
 */
const BoardsLoading = () => {
    return <BoardViewSkeleton />;
};

export default BoardsLoading;
