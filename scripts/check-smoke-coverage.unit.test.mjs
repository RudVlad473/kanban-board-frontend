import { describe, expect, it } from "vitest";

import { findCompletedRequirements, findCoveredRequirements, findUncovered } from "./check-smoke-coverage.mjs";

describe("findCompletedRequirements", () => {
    it("counts a ticked requirement and ignores one still in flight", () => {
        // Arrange
        const source = [
            "- [x] **BOARD-01**: User can view a sidebar list",
            "- [ ] **TASK-01**: User can create a task",
        ].join("\n");

        // Act, Assert — an unticked box must not gate: the feature may not exist yet.
        expect(findCompletedRequirements(source)).toEqual(["BOARD-01"]);
    });
});

describe("findCoveredRequirements", () => {
    it("reads the id a step title leads with", () => {
        // Arrange, Act, Assert
        expect([...findCoveredRequirements('await test.step("BOARD-02 — create a board", fn);')]).toEqual(["BOARD-02"]);
    });

    it("expands a combined title into every id it claims", () => {
        /*
         * Arrange, Act, Assert
         * One uninterrupted interaction genuinely proves add, rename and delete; splitting it into
         * three steps would reseed between them, which is the isolation this spec exists to remove.
         */
        expect([...findCoveredRequirements('await test.step("SUBTASK-01/03/04 — add, rename, delete", fn);')]).toEqual([
            "SUBTASK-01",
            "SUBTASK-03",
            "SUBTASK-04",
        ]);
    });

    it("ignores a step title carrying no requirement id", () => {
        // Arrange, Act, Assert
        expect([...findCoveredRequirements('await test.step("sign in first", fn);')]).toEqual([]);
    });
});

describe("findUncovered", () => {
    it("names a completed requirement with no step", () => {
        // Arrange
        const requirementsSource = ["- [x] **BOARD-01**: list", "- [x] **BOARD-05**: delete"].join("\n");
        const smokeSource = 'await test.step("BOARD-01 — the board is listed", fn);';

        // Act, Assert
        expect(findUncovered({ requirementsSource, smokeSource })).toEqual(["BOARD-05"]);
    });

    it("passes when every completed requirement is claimed by some step", () => {
        // Arrange
        const requirementsSource = "- [x] **SUBTASK-03**: edit a subtask title";
        const smokeSource = 'await test.step("SUBTASK-01/03/04 — add, rename, delete", fn);';

        // Act, Assert
        expect(findUncovered({ requirementsSource, smokeSource })).toEqual([]);
    });
});
