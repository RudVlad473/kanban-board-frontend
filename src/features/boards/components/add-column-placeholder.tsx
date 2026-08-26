type Props = {
    onOpen: () => void;
};

/**
 * PDF p3's ghost column — a real `<button>` rather than a decorated surface, so it is reachable by
 * keyboard on its own terms. Deliberately takes `onOpen` as a prop instead of owning the modal,
 * which is what lets its behavioural test drive it with a real function (docs/adr/tech/0020).
 */
export const AddColumnPlaceholder = ({ onOpen }: Props) => (
    /*
     * The gradient is layered directly on `--color-bg-app` and nothing else — its two stops were
     * sampled pre-composited against that canvas, so any surface underneath would shift them.
     */
    <button
        type="button"
        onClick={onOpen}
        className="flex w-70 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(180deg,var(--color-bg-column-add-from)_0%,var(--color-bg-column-add-to)_100%)] font-heading-xl text-heading-xl [font-weight:var(--font-weight-heading-xl)] text-text-muted outline-none hover:text-bg-primary focus-visible:text-bg-primary focus-visible:ring-2 focus-visible:ring-ring-focus"
    >
        + New Column
    </button>
);
