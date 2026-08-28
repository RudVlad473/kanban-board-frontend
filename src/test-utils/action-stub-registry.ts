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

const notImplemented = (): never => {
    throw new Error("action-stub-registry: not implemented yet (RED gate)");
};

export const registerActionStub = ({
    moduleKey,
    exportName,
}: {
    moduleKey: string;
    exportName: string;
}): AnyServerAction => {
    void moduleKey;
    void exportName;

    return notImplemented();
};

export const actionStub = <A extends AnyServerAction>(action: A): Stub<A> => {
    void action;

    return notImplemented();
};

export const resetAllActionStubs = (): void => {
    notImplemented();
};

export const assertNoUnqueuedActionCalls = (): void => {
    notImplemented();
};
