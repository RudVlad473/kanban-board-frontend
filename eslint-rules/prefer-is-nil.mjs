/**
 * Report a raw `null`/`undefined` comparison in favour of es-toolkit's `isNil`.
 *
 * An ERROR since 2026-09-05: the 222 sites that kept it at `warn` were migrated in one pass, so
 * there is nothing left to grandfather. Where `null` and `undefined` are genuinely different,
 * keep the raw comparison behind a one-line `eslint-disable-next-line` saying which and why.
 */
const isNullLiteral = (node) => node.type === "Literal" && node.raw === "null";

const isUndefinedIdentifier = (node) => node.type === "Identifier" && node.name === "undefined";

const NULLISH_OPERATORS = new Set(["===", "!==", "==", "!="]);

export const preferIsNil = {
    meta: {
        type: "suggestion",
        docs: { description: "Prefer es-toolkit's isNil over a raw null/undefined comparison." },
        schema: [],
        messages: {
            preferIsNil:
                "Prefer `isNil(value)` from es-toolkit over `{{ operator }} {{ operand }}`. It collapses both nullish cases into one check. Where `null` and `undefined` are meaningfully different here, keep the raw comparison and say so in a one-line comment.",
        },
    },

    create: (context) => ({
        BinaryExpression: (node) => {
            if (!NULLISH_OPERATORS.has(node.operator)) {
                return;
            }

            const operand = [node.left, node.right].find((side) => isNullLiteral(side) || isUndefinedIdentifier(side));

            if (operand !== undefined) {
                context.report({
                    node,
                    messageId: "preferIsNil",
                    data: { operator: node.operator, operand: isNullLiteral(operand) ? "null" : "undefined" },
                });
            }
        },
    }),
};

export const localRulesPlugin = { rules: { "prefer-is-nil": preferIsNil } };
