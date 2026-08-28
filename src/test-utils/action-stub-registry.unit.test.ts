import { beforeEach, describe, expect, it } from "vitest";

import {
    actionStub,
    assertNoUnqueuedActionCalls,
    registerActionStub,
    resetAllActionStubs,
} from "./action-stub-registry";

/**
 * The signature shape of a real Server Action, declared locally on purpose: a module under
 * `src/features/<domain>/actions/` cannot be imported in any test environment at all, which is the
 * reason this recorder exists (docs/adr/tech/0020's Server Action carve-out).
 */
type CreateColumnCall = { boardId: string; name: string };

type CreateColumnResult =
    | { status: "SUCCESS"; column: { id: string; name: string; position: number; version: number } }
    | { status: "DUPLICATE" }
    | { status: "ERROR" };

type CreateColumnAction = (input: CreateColumnCall) => Promise<CreateColumnResult>;

const MODULE_KEY = "src/features/boards/actions/create-column-action.ts";

const EXPORT_NAME = "createColumnAction";

/*
 * The cast stands in for what `tsc` sees at a real call site: the REAL action module's own types,
 * because the transform that swaps the implementation is invisible to the typechecker.
 */
const registerCreateColumnStub = (): CreateColumnAction =>
    registerActionStub({ moduleKey: MODULE_KEY, exportName: EXPORT_NAME }) as unknown as CreateColumnAction;

const SUCCESS: CreateColumnResult = {
    status: "SUCCESS",
    column: { id: "column-1", name: "Backlog", position: 0, version: 0 },
};

describe("action-stub-registry", () => {
    beforeEach(() => {
        resetAllActionStubs();
        // Drains anything a previous case recorded, so an unqueued call never leaks between tests.
        try {
            assertNoUnqueuedActionCalls();
        } catch {
            // Intentionally swallowed: draining is the point, not the message.
        }
    });

    describe("registerActionStub", () => {
        it("records the first argument of every call in order", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            const stub = actionStub(createColumnAction);
            stub.queue(SUCCESS);
            stub.queue({ status: "DUPLICATE" });

            // Act
            await createColumnAction({ boardId: "board-1", name: "Backlog" });
            await createColumnAction({ boardId: "board-1", name: "Doing" });

            // Assert
            expect(stub.calls).toEqual([
                { boardId: "board-1", name: "Backlog" },
                { boardId: "board-1", name: "Doing" },
            ]);
        });

        it("resolves queued outcomes first-in-first-out", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            const stub = actionStub(createColumnAction);
            stub.queue({ status: "DUPLICATE" });
            stub.queue(SUCCESS);

            // Act
            const first = await createColumnAction({ boardId: "board-1", name: "Backlog" });
            const second = await createColumnAction({ boardId: "board-1", name: "Doing" });

            // Assert
            expect(first).toEqual({ status: "DUPLICATE" });
            expect(second).toEqual(SUCCESS);
        });

        it("resolves rather than rejecting when the queue is empty", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();

            // Act
            const call = createColumnAction({ boardId: "board-1", name: "Backlog" });

            // Assert
            await expect(call).resolves.toBeUndefined();
        });
    });

    describe("hold and settle", () => {
        it("leaves a held call unresolved until settle fires", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            const stub = actionStub(createColumnAction);
            stub.queue(SUCCESS);
            stub.hold();

            // Act
            let settled = false;
            const call = createColumnAction({ boardId: "board-1", name: "Backlog" }).then((result) => {
                settled = true;
                return result;
            });
            await Promise.resolve();

            // Assert
            expect(settled).toBe(false);
            stub.settle();
            await expect(call).resolves.toEqual(SUCCESS);
        });

        it("holds only the next call, so the call after it resolves immediately", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            const stub = actionStub(createColumnAction);
            stub.queue(SUCCESS);
            stub.queue({ status: "ERROR" });
            stub.hold();

            // Act
            const held = createColumnAction({ boardId: "board-1", name: "Backlog" });
            const immediate = await createColumnAction({ boardId: "board-1", name: "Doing" });

            // Assert
            expect(immediate).toEqual({ status: "ERROR" });
            stub.settle();
            await expect(held).resolves.toEqual(SUCCESS);
        });
    });

    describe("assertNoUnqueuedActionCalls", () => {
        it("throws naming the module key, the export name, and how to queue an outcome", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();

            // Act
            await createColumnAction({ boardId: "board-1", name: "Backlog" });

            // Assert
            let message = "";
            try {
                assertNoUnqueuedActionCalls();
            } catch (error) {
                message = error instanceof Error ? error.message : String(error);
            }

            expect(message).toContain(MODULE_KEY);
            expect(message).toContain(EXPORT_NAME);
            expect(message).toContain("queue");
        });

        it("clears its list, so one unqueued call does not fail the next test too", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            await createColumnAction({ boardId: "board-1", name: "Backlog" });
            expect(() => {
                assertNoUnqueuedActionCalls();
            }).toThrow();

            // Act & Assert
            expect(() => {
                assertNoUnqueuedActionCalls();
            }).not.toThrow();
        });

        it("does not throw when every call had a queued outcome", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            actionStub(createColumnAction).queue(SUCCESS);

            // Act
            await createColumnAction({ boardId: "board-1", name: "Backlog" });

            // Assert
            expect(() => {
                assertNoUnqueuedActionCalls();
            }).not.toThrow();
        });
    });

    describe("resetAllActionStubs", () => {
        it("clears the call log, the queue and the hold flag of every registered stub", async () => {
            // Arrange
            const first = registerCreateColumnStub();
            const second = registerCreateColumnStub();
            actionStub(first).queue(SUCCESS);
            actionStub(second).queue(SUCCESS);
            actionStub(first).hold();
            await second({ boardId: "board-1", name: "Backlog" });

            // Act
            resetAllActionStubs();
            actionStub(first).queue({ status: "ERROR" });
            const afterReset = await first({ boardId: "board-1", name: "Doing" });

            // Assert — a cleared hold resolves immediately, and a cleared queue drops the old outcome.
            expect(afterReset).toEqual({ status: "ERROR" });
            expect(actionStub(second).calls).toEqual([]);
        });

        it("leaves the unqueued-call report intact, so a global afterEach can reset then assert", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            await createColumnAction({ boardId: "board-1", name: "Backlog" });

            // Act
            resetAllActionStubs();

            // Assert
            expect(() => {
                assertNoUnqueuedActionCalls();
            }).toThrow(MODULE_KEY);
        });
    });

    describe("actionStub", () => {
        it("throws a diagnosable error for a function that was never registered", () => {
            // Arrange
            const notAStub = (): Promise<void> => Promise.resolve();

            // Act & Assert
            expect(() => actionStub(notAStub)).toThrow(/not a registered Server Action stub/);
        });

        it("infers queue and calls from the real action's signature", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            const stub = actionStub(createColumnAction);

            /*
             * The type-level half of this plan's gate: a payload missing the discriminant is a `tsc`
             * failure, which `@ts-expect-error` asserts by failing if the error ever disappears.
             */
            // @ts-expect-error -- `queue` accepts only this action's own awaited return type.
            stub.queue({ column: { id: "column-1", name: "Backlog", position: 0, version: 0 } });
            stub.queue(SUCCESS);

            // Act
            await createColumnAction({ boardId: "board-1", name: "Backlog" });

            // Assert — `calls` is typed as the action's first parameter, checked by this assignment.
            const calls: CreateColumnCall[] = stub.calls;
            expect(calls).toEqual([{ boardId: "board-1", name: "Backlog" }]);
        });
    });
});
