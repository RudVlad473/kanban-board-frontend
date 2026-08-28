import { beforeEach, describe, expect, it } from "vitest";

import type { Column } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

import {
    actionStub,
    assertNoUnqueuedActionCalls,
    registerActionStub,
    resetAllActionStubs,
} from "./action-stub-registry";

/**
 * `createColumnAction`'s signature, restated locally rather than imported: a module under
 * `src/features/<domain>/actions/` cannot be imported in any test environment at all, which is the
 * reason this recorder exists (docs/adr/tech/0020's Server Action carve-out).
 */
type CreateColumnCall = { boardId: string; name: string };

/*
 * Mirrors `create-column-action.ts`'s exported union member for member, off the same `RESULT_STATUS`
 * and `Column` the real module uses — so the type gate below tracks the real contract rather than a
 * simplification that could drift from it silently.
 */
type CreateColumnResult =
    | { status: typeof RESULT_STATUS.SUCCESS; column: Column }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.DUPLICATE }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

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
    status: RESULT_STATUS.SUCCESS,
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
            stub.queue({ status: RESULT_STATUS.DUPLICATE });

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
            stub.queue({ status: RESULT_STATUS.DUPLICATE });
            stub.queue(SUCCESS);

            // Act
            const first = await createColumnAction({ boardId: "board-1", name: "Backlog" });
            const second = await createColumnAction({ boardId: "board-1", name: "Doing" });

            // Assert
            expect(first).toEqual({ status: RESULT_STATUS.DUPLICATE });
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
            stub.queue({ status: RESULT_STATUS.ERROR });
            stub.hold();

            // Act
            const held = createColumnAction({ boardId: "board-1", name: "Backlog" });
            const immediate = await createColumnAction({ boardId: "board-1", name: "Doing" });

            // Assert
            expect(immediate).toEqual({ status: RESULT_STATUS.ERROR });
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
            actionStub(first).queue({ status: RESULT_STATUS.ERROR });
            const afterReset = await first({ boardId: "board-1", name: "Doing" });

            // Assert — a cleared hold resolves immediately, and a cleared queue drops the old outcome.
            expect(afterReset).toEqual({ status: RESULT_STATUS.ERROR });
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

        it("types calls as the action's own first parameter", async () => {
            // Arrange
            const createColumnAction = registerCreateColumnStub();
            const stub = actionStub(createColumnAction);
            stub.queue(SUCCESS);

            // Act
            await createColumnAction({ boardId: "board-1", name: "Backlog" });

            // Assert — the annotation is the assertion; `tsc` rejects it if `calls` is `unknown[]`.
            const calls: CreateColumnCall[] = stub.calls;
            expect(calls).toEqual([{ boardId: "board-1", name: "Backlog" }]);
        });

        it("rejects a queued payload that is not the action's own awaited return type", () => {
            /*
             * A `tsc`-checked gate, not a runtime one: each `@ts-expect-error` fails the typecheck if
             * the error it marks ever disappears, so a widened `queue` breaks the build.
             */
            const stub = actionStub(registerCreateColumnStub());

            // @ts-expect-error -- missing the `status` discriminant entirely.
            stub.queue({ column: { id: "column-1", name: "Backlog", position: 0, version: 0 } });

            // @ts-expect-error -- the SUCCESS branch carries a `column`; this one omits it.
            stub.queue({ status: RESULT_STATUS.SUCCESS });

            // @ts-expect-error -- `IDLE` is a RESULT_STATUS member this action never returns.
            stub.queue({ status: RESULT_STATUS.IDLE });

            // Assert — nothing was called, so the queue is the only observable effect.
            expect(stub.calls).toEqual([]);
        });
    });
});
