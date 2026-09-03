/**
 * The runtime half of `scripts/vite-plugin-server-action-stub.mjs`: one generic programmable
 * recorder per Server Action export, replacing the queue/hold/settle/reset skeleton that was
 * copy-pasted across twelve `*-action-storybook-stub.ts` modules (04-CONTEXT.md D-01).
 */
type AnyServerAction = (...args: never[]) => Promise<unknown>;

/**
 * A stub's control surface, with `queue` and `calls` inferred from the REAL action's signature —
 * the compile-time narrowing the hand-written helpers gave up, restored without declaring anything
 * per action (`tsc` typechecks the real module and never sees the transform).
 */
export type Stub<A extends AnyServerAction> = {
    readonly calls: Parameters<A>[0][];
    queue: (outcome: Awaited<ReturnType<A>>) => void;
    hold: () => void;
    settle: () => void;
};

type StubControls = {
    readonly moduleKey: string;
    readonly exportName: string;
    readonly calls: unknown[];
    queue: (outcome: unknown) => void;
    hold: () => void;
    settle: () => void;
    reset: () => void;
};

/*
 * Symbol-keyed so the control surface rides on the stub function itself: `actionStub` is then a
 * lookup off the imported binding, and no test file ever spells a module-key string.
 */
const ACTION_STUB_CONTROLS = Symbol("action-stub-controls");

type RegisteredStub = ((...args: unknown[]) => Promise<unknown>) & {
    [ACTION_STUB_CONTROLS]: StubControls;
};

const registeredStubs = new Set<RegisteredStub>();

/*
 * Decisions ─────────────────────────────────────────────────────────────────────────────────────
 * comment-length-exempt: records why the stated mechanism is deliberately not the one implemented — a settled decision a future reader would otherwise reopen (docs/adr/tech/0023)
 * D-03 asks an unqueued call to THROW, naming the module key and export name. It records and
 * reports instead, and the report is raised from the global `afterEach` rather than the call site.
 * Reason: every hook in this repo wraps `mutateAsync` in `.catch(() => ({ status: ERROR }))` (see
 * `use-rename-column.ts`), so a throw is swallowed into a generic failure toast and surfaces as a
 * downstream assertion naming nothing — exactly the confusion D-03 exists to prevent. Recording the
 * call and asserting on it later delivers the purpose through a route the catch cannot swallow.
 * What would make this wrong: a hook that awaits an action WITHOUT a catch. Then a throw would
 * reach the test directly and the call-site mechanism would become the better one.
 * ───────────────────────────────────────────────────────────────────────────────────────────────
 */
const unqueuedCalls: string[] = [];

/**
 * Called only from the module `serverActionStubPlugin` emits, which is JavaScript — so the loose
 * return type costs nothing: at a real call site `tsc` reads the REAL action module's types and
 * never sees this function at all.
 */
export const registerActionStub = ({
    moduleKey,
    exportName,
}: {
    moduleKey: string;
    exportName: string;
}): AnyServerAction => {
    const calls: unknown[] = [];
    const queued: unknown[] = [];
    let shouldHold = false;
    let settleHeldCall: (() => void) | null = null;

    const controls: StubControls = {
        moduleKey,
        exportName,
        calls,
        queue: (outcome) => {
            queued.push(outcome);
        },
        // Leaves the next call unresolved, so a test can observe the in-flight window an optimistic apply opens.
        hold: () => {
            shouldHold = true;
        },
        settle: () => {
            settleHeldCall?.();
            settleHeldCall = null;
        },
        reset: () => {
            calls.length = 0;
            queued.length = 0;
            shouldHold = false;
            settleHeldCall = null;
        },
    };

    const stub = (...args: unknown[]): Promise<unknown> => {
        calls.push(args[0]);

        if (queued.length === 0) {
            unqueuedCalls.push(`${moduleKey}#${exportName}`);
        }

        // No unqueued success default — D-02 removed it, and every outcome is queued at the call site.
        const outcome = queued.shift();

        if (!shouldHold) {
            return Promise.resolve(outcome);
        }

        shouldHold = false;

        return new Promise((resolve) => {
            settleHeldCall = () => {
                resolve(outcome);
            };
        });
    };

    const registered = stub as RegisteredStub;
    registered[ACTION_STUB_CONTROLS] = controls;
    registeredStubs.add(registered);

    return registered;
};

export const actionStub = <A extends AnyServerAction>(action: A): Stub<A> => {
    const controls = (action as unknown as Partial<RegisteredStub>)[ACTION_STUB_CONTROLS];

    if (!controls) {
        throw new Error(
            "actionStub() received a function that is not a registered Server Action stub. Pass the " +
                "imported Server Action binding itself, and check that this test project runs with " +
                "`serverActionStubPlugin` (scripts/vite-plugin-server-action-stub.mjs) enabled.",
        );
    }

    return controls as unknown as Stub<A>;
};

/** Clears every registered stub's call log, queue and hold flag; leaves the unqueued-call report alone. */
export const resetAllActionStubs = (): void => {
    for (const stub of registeredStubs) {
        stub[ACTION_STUB_CONTROLS].reset();
    }
};

export const assertNoUnqueuedActionCalls = (): void => {
    if (unqueuedCalls.length === 0) {
        return;
    }

    const reported = [...new Set(unqueuedCalls)];
    // Cleared before throwing, so one forgotten queue does not cascade into every later test.
    unqueuedCalls.length = 0;

    const lines = [
        "A Server Action stub was called with no queued outcome:",
        ...reported.map((entry) => `  - ${entry}`),
        "Queue one before the call, e.g. `actionStub(theAction).queue({ status: RESULT_STATUS.SUCCESS })`.",
        "There is no implicit success default (04-CONTEXT.md D-02).",
    ];

    throw new Error(lines.join("\n"));
};
