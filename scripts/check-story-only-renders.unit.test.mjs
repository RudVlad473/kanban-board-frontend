import { describe, expect, it } from "vitest";

import {
    classifyViolations,
    findStoryOnlyRenderViolations,
    MIGRATION_EXEMPTIONS,
} from "./check-story-only-renders.mjs";

const relativePath = "src/features/boards/components/add-board-modal/add-board-modal.test.tsx";

describe("findStoryOnlyRenderViolations", () => {
    it("flags a component imported from a sibling module and used as a JSX element", () => {
        // Arrange
        const source = [
            'import { render } from "vitest-browser-react";',
            "",
            'import { AddBoardModal } from "./add-board-modal";',
            "",
            'it("renders", async () => {',
            "    await render(<AddBoardModal isOpen />);",
            "});",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([{ line: 6, name: "AddBoardModal" }]);
    });

    it("reports none for a file importing only from a .stories module and rendering composed stories", () => {
        // Arrange
        const source = [
            'import { composeStories } from "@storybook/react";',
            'import { render } from "vitest-browser-react";',
            "",
            'import * as stories from "./add-board-modal.stories";',
            "",
            "const { Default } = composeStories(stories);",
            "",
            'it("renders", async () => {',
            "    await render(<Default />);",
            "});",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });

    it("reports none when the component is imported for its type only and never rendered", () => {
        // Arrange
        const source = [
            'import type { ComponentProps } from "react";',
            "",
            'import type { AddBoardModal } from "./add-board-modal";',
            "",
            "type Args = ComponentProps<typeof AddBoardModal>;",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });

    it("reports none for an inline type-only named specifier alongside no value import", () => {
        // Arrange
        const source = [
            'import { type AddBoardSubmitValues } from "./add-board-modal";',
            "",
            'const values: AddBoardSubmitValues = { name: "Launch", columns: [] };',
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });

    it("reports none for aliased and package imports, which are not relative sibling specifiers", () => {
        // Arrange
        const source = [
            'import { describeForEachDevice } from "@/test-utils/describe-for-each-device";',
            'import { Button } from "@/components/ui/button/button";',
            "",
            'it("renders", async () => {',
            "    await render(<Button />);",
            "});",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });

    it("flags the sibling component even when it is rendered inside a host component the test declares", () => {
        // Arrange
        const source = [
            'import { useState } from "react";',
            "",
            'import { AddBoardModal } from "./add-board-modal";',
            "",
            "const FailingHost = () => {",
            "    const [isOpen, setIsOpen] = useState(true);",
            "    return <AddBoardModal isOpen={isOpen} onOpenChange={setIsOpen} />;",
            "};",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([{ line: 7, name: "AddBoardModal" }]);
    });

    it("flags a compound sub-element, resolving <Modal.Root> back to its imported root identifier", () => {
        // Arrange
        const source = [
            'import { Modal } from "./modal";',
            "",
            'it("renders", async () => {',
            "    await render(",
            "        <Modal.Root>",
            "            <Modal.Content>Body</Modal.Content>",
            "        </Modal.Root>,",
            "    );",
            "});",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath: "src/components/ui/modal.test.tsx" });

        // Assert
        expect(violations).toEqual([
            { line: 5, name: "Modal" },
            { line: 6, name: "Modal" },
        ]);
    });

    it("reports none for an app/ route error boundary, exempt per docs/adr/tech/0025's carve-out", () => {
        // Arrange
        const source = [
            'import { render } from "vitest-browser-react";',
            "",
            'import DashboardError from "./error";',
            "",
            'it("renders", async () => {',
            "    await render(<DashboardError error={new Error('boom')} reset={() => undefined} />);",
            "});",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({
            source,
            relativePath: "app/(dashboard)/error.test.tsx",
        });

        // Assert
        expect(violations).toEqual([]);
    });

    it("still flags a non-wrapper route test under app/, which the carve-out does not reach", () => {
        // Arrange
        const source = [
            'import { render } from "vitest-browser-react";',
            "",
            'import BoardsPage from "./page";',
            "",
            'it("renders", async () => {',
            "    await render(<BoardsPage />);",
            "});",
        ].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({
            source,
            relativePath: "app/(dashboard)/boards/page.test.tsx",
        });

        // Assert
        expect(violations).toEqual([{ line: 6, name: "BoardsPage" }]);
    });

    it("reports none for a default import from a .stories module", () => {
        // Arrange
        const source = ['import meta from "./add-board-modal.stories";', "", "export default meta;"].join("\n");

        // Act
        const violations = findStoryOnlyRenderViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });
});

const exemptPath = "src/components/ui/dropdown/dropdown.test.tsx";
const exemptions = new Map([[exemptPath, 2]]);
const violationAt = ({ file, line }) => ({ relativePath: file, line, name: "Dropdown" });

describe("classifyViolations", () => {
    it("blocks a violation in a file the exemption ledger does not list, alongside one it does", () => {
        // Arrange
        const unlisted = violationAt({ file: relativePath, line: 6 });
        const violations = [
            unlisted,
            violationAt({ file: exemptPath, line: 6 }),
            violationAt({ file: exemptPath, line: 9 }),
        ];

        // Act
        const { blocking, tracked, regressions, stale } = classifyViolations({ violations, exemptions });

        // Assert
        expect(blocking).toEqual([unlisted]);
        expect(tracked).toEqual([{ relativePath: exemptPath, count: 2, ceiling: 2 }]);
        expect([regressions, stale]).toEqual([[], []]);
    });

    it("tracks without blocking a listed file sitting exactly at its ceiling", () => {
        // Arrange
        const violations = [violationAt({ file: exemptPath, line: 6 }), violationAt({ file: exemptPath, line: 9 })];

        // Act
        const { blocking, tracked, regressions, stale } = classifyViolations({ violations, exemptions });

        // Assert
        expect(blocking).toEqual([]);
        expect(tracked).toEqual([{ relativePath: exemptPath, count: 2, ceiling: 2 }]);
        expect([regressions, stale]).toEqual([[], []]);
    });

    it("tracks without blocking a listed file that has improved below its ceiling", () => {
        // Arrange
        const violations = [violationAt({ file: exemptPath, line: 6 })];

        // Act
        const { blocking, tracked, regressions } = classifyViolations({ violations, exemptions });

        // Assert
        expect(blocking).toEqual([]);
        expect(tracked).toEqual([{ relativePath: exemptPath, count: 1, ceiling: 2 }]);
        expect(regressions).toEqual([]);
    });

    it("blocks a listed file that added direct renders above its ceiling", () => {
        // Arrange
        const violations = [
            violationAt({ file: exemptPath, line: 6 }),
            violationAt({ file: exemptPath, line: 9 }),
            violationAt({ file: exemptPath, line: 12 }),
        ];

        // Act
        const { blocking, tracked, regressions } = classifyViolations({ violations, exemptions });

        // Assert
        expect(regressions).toEqual([{ relativePath: exemptPath, count: 3, ceiling: 2 }]);
        expect([blocking, tracked]).toEqual([[], []]);
    });

    it("blocks a listed file whose migration is finished, so the dead entry cannot linger", () => {
        // Act
        const { blocking, tracked, stale } = classifyViolations({ violations: [], exemptions });

        // Assert
        expect(stale).toEqual([{ relativePath: exemptPath, count: 0, ceiling: 2 }]);
        expect([blocking, tracked]).toEqual([[], []]);
    });

    it("ships a non-empty ledger, so the carve-out is never an invisible no-op", () => {
        // Assert
        expect(MIGRATION_EXEMPTIONS.size).toBeGreaterThan(0);
        expect([...MIGRATION_EXEMPTIONS.values()].every((ceiling) => ceiling > 0)).toBe(true);
    });
});
