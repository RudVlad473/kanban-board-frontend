#!/usr/bin/env node
/*
 * Assembles this app's own BFF surface (app/api/**\/route.ts) into an OpenAPI 3.1 document,
 * mirroring docs/api/kanban-board-openapi.json's role for the external contract. Sign-up and
 * sign-in moved off Route Handlers and onto server functions in plan 01-33, so this document now
 * only describes `/api/auth/signout` — the one BFF route still standing (plan 01-34 migrates it
 * in turn, at which point this whole generator is removed, per this plan's own decision record).
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const document = {
    openapi: "3.1.0",
    info: { title: "Kanban Board BFF", version: "v0" },
    paths: {
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
