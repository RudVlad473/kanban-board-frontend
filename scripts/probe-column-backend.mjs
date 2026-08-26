#!/usr/bin/env node
/*
 * Writes real rows to the deployed nonprod backend via throwaway accounts. Never wire this into
 * `pnpm test`, `pnpm test:all` or CI (T-03-13) — run it manually, by hand, when needed.
 */

const baseUrl = process.env.EXTERNAL_API_BASE_URL;

if (!baseUrl) {
    console.error(
        "probe-column-backend: EXTERNAL_API_BASE_URL is not set. Set it in your shell environment " +
            "(or run `vercel env pull --yes .env.local` and source it) before running this script.",
    );
    process.exit(1);
}

/*
 * The backend caps an account at two concurrent sessions, answering a third sign-in with the same
 * 401 a wrong password produces — this helper throws on a repeat sign-in instead of letting that
 * surface as a cryptic 401 later (see .planning/phases/02-board-management/02-BACKEND-FACTS.md).
 */
const signInCounts = new Map();

const signIn = async ({ email, password }) => {
    if (signInCounts.has(email)) {
        throw new Error(
            `signIn: ${email} was already signed in once this run — re-authenticating burns the ` +
                "backend's 2-concurrent-session cap and is never legitimate for this probe.",
        );
    }

    const response = await fetch(`${baseUrl}/signin`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (response.status !== 200) {
        const body = await response.text();
        throw new Error(`signIn: expected 200 from POST /signin for ${email}, got ${String(response.status)}: ${body}`);
    }

    const cookie = extractSessionCookie(response);
    if (!cookie) {
        throw new Error(`signIn: no JSESSIONID Set-Cookie found in response for ${email}`);
    }

    signInCounts.set(email, (signInCounts.get(email) ?? 0) + 1);

    return cookie;
};

/*
 * Mirrors src/lib/server/cookies/upstream-cookie.ts's extract() — this script talks to the
 * backend directly, not through the app, so it needs its own copy of the same parsing logic.
 */
const extractSessionCookie = (response) => {
    const setCookiePairs = response.headers.getSetCookie();

    for (const pair of setCookiePairs) {
        const [nameValue] = pair.split(";");
        const separatorIndex = nameValue.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const name = nameValue.slice(0, separatorIndex).trim();
        if (name === "JSESSIONID") {
            return `JSESSIONID=${nameValue.slice(separatorIndex + 1).trim()}`;
        }
    }

    return null;
};

/* --- account creation --------------------------------------------------------------------- */

const randomEmail = (label) => `probe-${label}-${crypto.randomUUID()}@example.com`;

/*
 * Satisfies the backend's password rule (8-64 chars, upper/lower/digit/special) per
 * e2e/fixtures.ts's FIXTURE_PASSWORD.
 */
const PASSWORD = "ProbeFixturePwd1!";
const DISPLAY_NAME = "Probe Column Fixture";

/*
 * Doubles as the reachability preflight (03-RESEARCH.md § Recommended plan sequencing): a 500
 * naming the JDBC pool means the nonprod DATABASE is down, which must halt loudly with exit 2
 * rather than be read as a defect in this phase's code.
 */
const signUpThrowawayAccount = async (label) => {
    const email = randomEmail(label);

    let response;

    /* A connect/DNS/TLS failure is the same class of halt as a dead database — never a code defect. */
    try {
        response = await fetch(`${baseUrl}/signup`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password: PASSWORD, displayName: DISPLAY_NAME }),
        });
    } catch (error) {
        console.error(
            "probe-column-backend: nonprod backend is UNREACHABLE at the transport layer — halting; " +
                "this is not a code defect",
        );
        console.error(`  POST /signup -> ${String(error.cause?.code ?? error.message)}`);
        process.exit(2);
    }

    if (response.status === 500) {
        const body = await response.text();

        if (/JDBC|HikariPool|Connection is not available/i.test(body)) {
            console.error(
                "probe-column-backend: nonprod DATABASE is down (app layer up) — halting; this is not a code defect",
            );
            console.error(`  POST /signup -> status 500, body: ${body}`);
            process.exit(2);
        }

        throw new Error(`signUpThrowawayAccount(${label}): unexpected 500 from POST /signup: ${body}`);
    }

    if (response.status !== 201) {
        const body = await response.text();
        throw new Error(
            `signUpThrowawayAccount(${label}): expected 201 from POST /signup, got ${String(response.status)}: ${body}`,
        );
    }

    const body = await response.json();

    return { id: body.id, email, password: PASSWORD };
};

/* --- fetch helpers ------------------------------------------------------------------------- */

const authedFetch = ({ path, cookie, init = {} }) =>
    fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { ...init.headers, cookie },
    });

const jsonInit = ({ method, body }) => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
});

/* Returns the raw text alongside the parsed body so a probe can print exactly what came back. */
const readResponse = async (response) => {
    const text = await response.text();

    try {
        return { status: response.status, text, json: text === "" ? null : JSON.parse(text) };
    } catch {
        return { status: response.status, text, json: null };
    }
};

const printBlock = ({ label, question }) => {
    console.log(`\n## ${label}`);
    console.log(question);
};

/* --- backend operations -------------------------------------------------------------------- */

const createBoard = async ({ cookie, userId, name }) => {
    const response = await authedFetch({
        path: `/boards?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "POST", body: { name } }),
    });

    const result = await readResponse(response);
    if (result.status !== 201 && result.status !== 200) {
        throw new Error(`createBoard: expected 200/201, got ${String(result.status)}: ${result.text}`);
    }

    return result.json;
};

const createColumn = ({ cookie, userId, boardId, name }) =>
    authedFetch({
        path: `/boards/${boardId}/columns?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "POST", body: { name } }),
    }).then(readResponse);

const renameColumn = ({ cookie, userId, boardId, columnId, name, version }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "PUT", body: { name, version } }),
    }).then(readResponse);

const reorderColumn = ({ cookie, userId, boardId, columnId, version, targetPosition }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}/reorder?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "PATCH", body: { version, targetPosition } }),
    }).then(readResponse);

const deleteColumn = ({ cookie, userId, boardId, columnId }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}?userId=${userId}`,
        cookie,
        init: { method: "DELETE" },
    }).then(readResponse);

/* SaveTaskRequestDTO is POSTed to the column detail path, not to /tasks (kanban-board-openapi.json). */
const createTask = ({ cookie, userId, boardId, columnId, title }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "POST", body: { title } }),
    }).then(readResponse);

const readBoardFull = ({ cookie, userId, boardId }) =>
    authedFetch({ path: `/boards/${boardId}/full?userId=${userId}`, cookie }).then(readResponse);

const columnSnapshot = (full) =>
    (full.json?.columns ?? []).map((column) => ({
        id: column.id,
        name: column.name,
        position: column.position,
        version: column.version,
        tasks: (column.tasks ?? []).map((task) => task.title),
    }));

const printColumns = ({ label, snapshot }) => {
    console.log(`  ${label}:`);
    for (const column of snapshot) {
        console.log(
            `    ${String(column.name)} id=${String(column.id)} position=${String(column.position)} ` +
                `version=${String(column.version)} tasks=${JSON.stringify(column.tasks)}`,
        );
    }
};

/* --- probes ---------------------------------------------------------------------------------- */

const probeR1 = async ({ cookie, userId, boardId, before }) => {
    printBlock({
        label: "R1",
        question:
            "targetPosition semantics: move index 0 (Alpha) with targetPosition: 2 — final index or insert-before?",
    });

    const alpha = before.find((column) => column.name === "Alpha");
    console.log(`  PATCH /boards/{boardId}/columns/${String(alpha.id)}/reorder`);
    console.log(`  body: ${JSON.stringify({ version: alpha.version, targetPosition: 2 })}`);

    const reorder = await reorderColumn({
        cookie,
        userId,
        boardId,
        columnId: alpha.id,
        version: alpha.version,
        targetPosition: 2,
    });
    console.log(`  -> status ${String(reorder.status)}, body: ${reorder.text}`);

    const full = await readBoardFull({ cookie, userId, boardId });
    const after = columnSnapshot(full);
    const order = after.map((column) => column.name);
    console.log(`  GET /boards/{boardId}/full -> status ${String(full.status)}, name order: ${JSON.stringify(order)}`);

    const initials = order.map((name) => name.slice(0, 1)).join(",");
    console.log(`  initials: ${initials}   (B,C,A,D => final index | B,A,C,D => insert-before)`);

    return { after, requestBody: { version: alpha.version, targetPosition: 2 }, alphaId: alpha.id };
};

const probeR2 = async ({ cookie, userId, boardId, before, after }) => {
    printBlock({
        label: "R2",
        question: "Did the reorder bump the version of columns that merely SHIFTED position?",
    });

    printColumns({ label: "before R1", snapshot: before });
    printColumns({ label: "after R1", snapshot: after });

    for (const beforeColumn of before) {
        const afterColumn = after.find((column) => column.id === beforeColumn.id);
        if (!afterColumn) {
            console.log(`    ${String(beforeColumn.name)}: absent after reorder`);
            continue;
        }
        const moved = beforeColumn.position !== afterColumn.position;
        const bumped = beforeColumn.version !== afterColumn.version;
        console.log(
            `    ${String(beforeColumn.name)}: position ${String(beforeColumn.position)} -> ${String(afterColumn.position)}, ` +
                `version ${String(beforeColumn.version)} -> ${String(afterColumn.version)} (shifted=${String(moved)}, versionBumped=${String(bumped)})`,
        );
    }

    /* The backstop question: does a rename issued with a pre-reorder version still succeed? */
    const charlieBefore = before.find((column) => column.name === "Charlie");
    const rename = await renameColumn({
        cookie,
        userId,
        boardId,
        columnId: charlieBefore.id,
        name: "Charlie Renamed",
        version: charlieBefore.version,
    });
    console.log(
        `  PUT rename of shifted column "Charlie" with its PRE-reorder version ${String(charlieBefore.version)} ` +
            `-> status ${String(rename.status)}, body: ${rename.text}`,
    );
};

const probeR3 = async ({ cookie, userId, boardId, alphaId, requestBody }) => {
    printBlock({ label: "R3", question: "Replay the same reorder PATCH with the now-stale version — status + code?" });

    console.log(`  body (replayed verbatim): ${JSON.stringify(requestBody)}`);
    const replay = await reorderColumn({
        cookie,
        userId,
        boardId,
        columnId: alphaId,
        version: requestBody.version,
        targetPosition: requestBody.targetPosition,
    });
    console.log(`  -> status ${String(replay.status)}, body: ${replay.text}`);
    console.log(`  problem-detail code: ${String(replay.json?.code ?? "(none)")}`);
};

const probeR4 = async ({ cookie, userId, boardId, alphaId }) => {
    printBlock({
        label: "R4",
        question:
            "Out-of-range targetPosition (99) and a no-op targetPosition (current position) — refused, clamped, or version-burning?",
    });

    const beforeFull = await readBoardFull({ cookie, userId, boardId });
    const beforeColumns = columnSnapshot(beforeFull);
    const alphaBefore = beforeColumns.find((column) => column.id === alphaId);
    console.log(`  Alpha before: position=${String(alphaBefore.position)}, version=${String(alphaBefore.version)}`);

    const outOfRange = await reorderColumn({
        cookie,
        userId,
        boardId,
        columnId: alphaId,
        version: alphaBefore.version,
        targetPosition: 99,
    });
    console.log(`  targetPosition: 99 -> status ${String(outOfRange.status)}, body: ${outOfRange.text}`);
    console.log(`  problem-detail code: ${String(outOfRange.json?.code ?? "(none)")}`);

    const afterOutOfRange = columnSnapshot(await readBoardFull({ cookie, userId, boardId }));
    const alphaAfterOutOfRange = afterOutOfRange.find((column) => column.id === alphaId);
    console.log(
        `  Alpha after 99: position=${String(alphaAfterOutOfRange?.position)}, version=${String(alphaAfterOutOfRange?.version)}, ` +
            `order: ${JSON.stringify(afterOutOfRange.map((column) => column.name))}`,
    );

    const noOp = await reorderColumn({
        cookie,
        userId,
        boardId,
        columnId: alphaId,
        version: alphaAfterOutOfRange.version,
        targetPosition: alphaAfterOutOfRange.position,
    });
    console.log(
        `  targetPosition: ${String(alphaAfterOutOfRange.position)} (its own current position) -> status ${String(noOp.status)}, body: ${noOp.text}`,
    );
    console.log(`  problem-detail code: ${String(noOp.json?.code ?? "(none)")}`);

    const afterNoOp = columnSnapshot(await readBoardFull({ cookie, userId, boardId }));
    const alphaAfterNoOp = afterNoOp.find((column) => column.id === alphaId);
    console.log(
        `  Alpha after no-op: position=${String(alphaAfterNoOp?.position)}, version=${String(alphaAfterNoOp?.version)}`,
    );
};

const probeR5 = async ({ cookie, userId, boardId }) => {
    printBlock({ label: "R5", question: "POST a column whose name duplicates one already on the board — refused?" });

    const duplicate = await createColumn({ cookie, userId, boardId, name: "Alpha" });
    console.log(`  POST /boards/{boardId}/columns body: {"name":"Alpha"}`);
    console.log(`  -> status ${String(duplicate.status)}, body: ${duplicate.text}`);
    console.log(`  problem-detail code: ${String(duplicate.json?.code ?? "(none)")}`);

    const full = await readBoardFull({ cookie, userId, boardId });
    printColumns({ label: "board after the duplicate attempt", snapshot: columnSnapshot(full) });
};

const probeR6 = async ({ cookie, userId, boardId }) => {
    printBlock({
        label: "R6",
        question:
            "Cascade delete and position renumbering: delete a column holding a task, then delete a middle column.",
    });

    const beforeColumns = columnSnapshot(await readBoardFull({ cookie, userId, boardId }));
    const bravo = beforeColumns.find((column) => column.name === "Bravo");

    const task = await createTask({ cookie, userId, boardId, columnId: bravo.id, title: "Probe Task One" });
    console.log(`  POST task into "Bravo" -> status ${String(task.status)}, body: ${task.text}`);

    const withTask = columnSnapshot(await readBoardFull({ cookie, userId, boardId }));
    printColumns({ label: "before any delete", snapshot: withTask });

    const deleteBravo = await deleteColumn({ cookie, userId, boardId, columnId: bravo.id });
    console.log(
        `  DELETE "Bravo" (${String(bravo.id)}) -> status ${String(deleteBravo.status)}, body: ${deleteBravo.text}`,
    );

    const afterFirstDelete = columnSnapshot(await readBoardFull({ cookie, userId, boardId }));
    printColumns({ label: "after deleting Bravo", snapshot: afterFirstDelete });
    const bravoGone = !afterFirstDelete.some((column) => column.id === bravo.id);
    const taskGone = !afterFirstDelete.some((column) => column.tasks.includes("Probe Task One"));
    console.log(`  Bravo absent: ${String(bravoGone)}; its task absent: ${String(taskGone)}`);
    console.log(`  positions now: ${JSON.stringify(afterFirstDelete.map((column) => column.position))}`);

    const middle = afterFirstDelete[Math.floor(afterFirstDelete.length / 2)];
    const deleteMiddle = await deleteColumn({ cookie, userId, boardId, columnId: middle.id });
    console.log(
        `  DELETE middle column "${String(middle.name)}" at position ${String(middle.position)} -> status ${String(deleteMiddle.status)}, body: ${deleteMiddle.text}`,
    );

    const afterMiddleDelete = columnSnapshot(await readBoardFull({ cookie, userId, boardId }));
    printColumns({ label: "after deleting a middle column", snapshot: afterMiddleDelete });
    console.log(`  positions now: ${JSON.stringify(afterMiddleDelete.map((column) => column.position))}`);

    return { deletedColumnId: bravo.id };
};

const probeR7 = async ({ cookie, userId, boardId, deletedColumnId }) => {
    printBlock({ label: "R7", question: "DELETE an already-deleted column id — status + problem-detail code?" });

    const secondDelete = await deleteColumn({ cookie, userId, boardId, columnId: deletedColumnId });
    console.log(
        `  DELETE ${String(deletedColumnId)} (already deleted) -> status ${String(secondDelete.status)}, body: ${secondDelete.text}`,
    );
    console.log(`  problem-detail code: ${String(secondDelete.json?.code ?? "(none)")}`);

    const full = await readBoardFull({ cookie, userId, boardId });
    printColumns({ label: "board after the second delete", snapshot: columnSnapshot(full) });
};

/*
 * MAIN
 */

const main = async () => {
    const account = await signUpThrowawayAccount("column");
    let boardId = "(not created)";

    try {
        const cookie = await signIn({ email: account.email, password: account.password });
        const userId = account.id;

        const board = await createBoard({ cookie, userId, name: "Probe Columns" });
        boardId = board.id;

        // Sequential, never parallel — 02-BACKEND-FACTS.md P5 makes creation order the source of position.
        for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
            const created = await createColumn({ cookie, userId, boardId, name });
            console.log(`created column "${name}" -> status ${String(created.status)}, body: ${created.text}`);
        }

        const before = columnSnapshot(await readBoardFull({ cookie, userId, boardId }));

        const r1 = await probeR1({ cookie, userId, boardId, before });
        await probeR2({ cookie, userId, boardId, before, after: r1.after });
        await probeR3({ cookie, userId, boardId, alphaId: r1.alphaId, requestBody: r1.requestBody });
        await probeR4({ cookie, userId, boardId, alphaId: r1.alphaId });
        await probeR5({ cookie, userId, boardId });
        const r6 = await probeR6({ cookie, userId, boardId });
        await probeR7({ cookie, userId, boardId, deletedColumnId: r6.deletedColumnId });
    } finally {
        console.log(`\nTRACEABILITY: throwaway account ${account.email}, board ${String(boardId)}`);
        console.log(`SESSIONS: ${String(signInCounts.size)}`);
    }
};

await main();
