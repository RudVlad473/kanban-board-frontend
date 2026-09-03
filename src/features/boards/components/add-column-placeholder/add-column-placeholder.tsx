import type { Ref } from "react";

type Props = {
    onOpen: () => void;
    /** The scroll target — the ghost column always trails the newest column, so it stands in for it. */
    ref?: Ref<HTMLButtonElement>;
};

/**
 * PDF p3's ghost column — a real `<button>` rather than a decorated surface, so it is reachable by
 * keyboard on its own terms. Deliberately takes `onOpen` as a prop instead of owning the modal,
 * which is what lets its behavioural test drive it with a real function (docs/adr/tech/0020).
 */
export const AddColumnPlaceholder = ({ onOpen, ref }: Props) => {
    return (
        /*
         * The gradient is layered directly on `--color-bg-app` and nothing else — its two stops were
         * sampled pre-composited against that canvas, so any surface underneath would shift them.
         */
        <button
            ref={ref}
            type="button"
            onClick={onOpen}
            className="flex w-70 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(180deg,var(--color-bg-column-add-from)_0%,var(--color-bg-column-add-to)_100%)] font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-muted outline-none hover:text-bg-primary focus-visible:text-bg-primary focus-visible:ring-2 focus-visible:ring-ring-focus"
        >
            + New Column
        </button>
    );
};
