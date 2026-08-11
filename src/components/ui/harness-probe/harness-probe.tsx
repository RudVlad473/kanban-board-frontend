// Throwaway smoke component (D-24) proving the Vitest Browser Mode / Storybook / Playwright
// harness works end to end before Button, the first real primitive, is built. Deleted by plan
// 01-06 once Button carries its own test, story and visual baseline.
type HarnessProbeProps = {
    label: string;
    isDisabled?: boolean;
    onActivate: () => void;
};

export const HarnessProbe = ({ label, isDisabled = false, onActivate }: HarnessProbeProps) => {
    return (
        <button
            type="button"
            disabled={isDisabled}
            onClick={onActivate}
            className="rounded-md bg-bg-primary text-text-on-primary"
        >
            {label}
        </button>
    );
};
