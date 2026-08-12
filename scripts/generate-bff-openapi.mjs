#!/usr/bin/env node
/*
 * Assembles this app's own BFF surface (app/api/**\/route.ts) into an OpenAPI 3.1 document,
 * mirroring docs/api/kanban-board-openapi.json's role for the external contract. Request bodies
 * are derived from the same Zod schemas the Route Handlers validate against (z.toJSONSchema(),
 * built into Zod 4 — no extra dependency) so the two can never drift apart; response shapes are
 * hand-written here since they're plain object literals in the Route Handlers, not Zod-validated.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { signInSchema, signUpSchema } from "../src/lib/validation/auth-schemas.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "docs/api/bff-openapi.json");

const okResponse = {
    description: "Success",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: { ok: { type: "boolean", const: true } },
                required: ["ok"],
            },
        },
    },
};

const messageResponse = (description) => ({
    description,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: { message: { type: "string" } },
                required: ["message"],
            },
        },
    },
});

const fieldErrorsResponse = {
    description: "Field-level validation failure",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: { errors: { type: "object", additionalProperties: { type: "string" } } },
                required: ["errors"],
            },
        },
    },
};

const requestBody = (schema) => ({
    required: true,
    content: { "application/json": { schema: z.toJSONSchema(schema) } },
});

const document = {
    openapi: "3.1.0",
    info: { title: "Kanban Board BFF", version: "v0" },
    paths: {
        "/api/auth/signup": {
            post: {
                operationId: "signUp",
                requestBody: requestBody(signUpSchema),
                responses: { 200: okResponse, 400: fieldErrorsResponse, 409: messageResponse("Sign-up failed") },
            },
        },
        "/api/auth/signin": {
            post: {
                operationId: "signIn",
                requestBody: requestBody(signInSchema),
                responses: {
                    200: okResponse,
                    400: fieldErrorsResponse,
                    401: messageResponse("Invalid credentials"),
                },
            },
        },
        "/api/auth/signout": {
            post: {
                operationId: "signOut",
                responses: { 200: okResponse },
            },
        },
    },
};

await writeFile(outputPath, JSON.stringify(document, null, 2) + "\n", "utf8");
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
