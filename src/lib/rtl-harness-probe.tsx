/*
 * Throwaway smoke component proving the RTL/jsdom "unit" Vitest project actually works end to
 * end (render, user-event, jest-dom matchers, disabled-state suppression) — same role
 * harness-probe.tsx played for the "browser" project in plan 01-05, retired once plan 01-06
 * proved it. Delete this file and its test once a real logic/hook test exists to prove the
 * harness instead.
 */
type Props = {
    isDisabled?: boolean;
    onClick: () => void;
};

export const RtlHarnessProbe = ({ isDisabled, onClick }: Props) => (
    <button type="button" disabled={isDisabled} onClick={onClick}>
        Probe
    </button>
);
