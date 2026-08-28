/*
 * RED gate skeleton for plan 04-03 Task 2 — shape only, so the unit test's imports resolve and its
 * assertions fail on behaviour rather than on a missing module.
 */
export const ACTION_STUB_REGISTRY_SPECIFIER = "/src/test-utils/action-stub-registry.ts";

export const serverActionStubPlugin = ({ rootDir }) => {
    void rootDir;

    return {
        name: "server-action-stub",
        enforce: "pre",
        transform: () => null,
    };
};
