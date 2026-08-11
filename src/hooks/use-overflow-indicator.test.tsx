import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { useOverflowIndicator } from "./use-overflow-indicator";

/*
 * The status readout renders as a sibling of the observed element, not inside it — a `<span>`
 * inside the observed subtree would itself be a DOM mutation the internal `MutationObserver`
 * reacts to, muddying what this test is actually proving.
 */
const OverflowProbe = ({ text, width }: { text: string; width: number }) => {
    const { ref, isOverflowing } = useOverflowIndicator<HTMLDivElement>();
    return (
        <div>
            <div ref={ref} data-testid="probe" style={{ width, overflow: "hidden", whiteSpace: "nowrap" }}>
                {text}
            </div>
            <span data-testid="status">{isOverflowing ? "overflowing" : "fits"}</span>
        </div>
    );
};

describe("useOverflowIndicator", () => {
    it("reports no overflow when content fits inside the element's box", async () => {
        // Arrange
        const screen = await render(<OverflowProbe text="short" width={200} />);

        // Assert
        await expect.element(screen.getByTestId("status")).toHaveTextContent("fits");
    });

    it("reports overflow when content exceeds the element's box", async () => {
        // Arrange
        const screen = await render(<OverflowProbe text={"x".repeat(300)} width={100} />);

        // Assert
        await expect.element(screen.getByTestId("status")).toHaveTextContent("overflowing");
    });

    it("re-evaluates when the element resizes from overflowing to fitting", async () => {
        // Arrange — mount overflowing, then grow the box past the content's width.
        const screen = await render(<OverflowProbe text={"x".repeat(300)} width={100} />);
        await expect.element(screen.getByTestId("status")).toHaveTextContent("overflowing");

        // Act
        const probe = screen.getByTestId("probe").element() as HTMLElement;
        probe.style.width = "4000px";

        // Assert
        await expect.element(screen.getByTestId("status")).toHaveTextContent("fits");
    });

    it("re-evaluates when the observed element's text content changes via a re-render", async () => {
        // Arrange
        const Rerenderable = ({ long }: { long: boolean }) => (
            <OverflowProbe text={long ? "x".repeat(300) : "short"} width={100} />
        );
        const screen = await render(<Rerenderable long={false} />);
        await expect.element(screen.getByTestId("status")).toHaveTextContent("fits");

        // Act
        await screen.rerender(<Rerenderable long={true} />);

        // Assert
        await expect.element(screen.getByTestId("status")).toHaveTextContent("overflowing");
    });
});
