#!/usr/bin/env node
/*
 * Writes real rows to the deployed nonprod backend via throwaway accounts. Never wire this into
 * `pnpm test`, `pnpm test:all` or CI (T-04-13) — run it manually, by hand, when needed.
 */

const baseUrl = process.env.EXTERNAL_API_BASE_URL;

if (!baseUrl) {
    console.error(
        "probe-task-backend: EXTERNAL_API_BASE_URL is not set. Set it in your shell environment " +
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
const DISPLAY_NAME = "Probe Task Fixture";

/*
 * Doubles as the reachability preflight (04-RESEARCH.md § Environment Availability): a 500 naming
 * the JDBC pool means the nonprod DATABASE is down, which must halt loudly with exit 2 rather than
 * be read as a defect in this phase's code.
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
            "probe-task-backend: nonprod backend is UNREACHABLE at the transport layer — halting; " +
                "this is not a code defect",
        );
        console.error(`  POST /signup -> ${String(error.cause?.code ?? error.message)}`);
        process.exit(2);
    }

    if (response.status === 500) {
        const body = await response.text();

        if (/JDBC|HikariPool|Connection is not available/i.test(body)) {
            console.error(
                "probe-task-backend: nonprod DATABASE is down (app layer up) — halting; this is not a code defect",
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
        return { status: response.status, text, json: text !== "" ? JSON.parse(text) : null };
    } catch {
        return { status: response.status, text, json: null };
    }
};

const printBlock = ({ label, question }) => {
    console.log(`\n## ${label}`);
    console.log(question);
};

const printResult = ({ label, result }) => {
    console.log(`  ${label} -> status ${String(result.status)}, body: ${result.text}`);

    if (result.json?.code) {
        console.log(`    problem-detail code: ${String(result.json.code)}`);
    }
};

const isOk = (result) => result.status >= 200 && result.status < 300;

/* A successful write echoes the new version; a refused one leaves the caller's copy still valid. */
const nextVersion = ({ result, fallback }) => (isOk(result) ? (result.json?.version ?? fallback) : fallback);

/* --- backend operations -------------------------------------------------------------------- */

const createBoard = async ({ cookie, userId, name }) => {
    const result = await authedFetch({
        path: `/boards?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "POST", body: { name } }),
    }).then(readResponse);

    if (!isOk(result)) {
        throw new Error(`createBoard: expected 200/201, got ${String(result.status)}: ${result.text}`);
    }

    return result.json;
};

const deleteBoard = ({ cookie, userId, boardId }) =>
    authedFetch({ path: `/boards/${boardId}?userId=${userId}`, cookie, init: { method: "DELETE" } }).then(readResponse);

const createColumn = ({ cookie, userId, boardId, name }) =>
    authedFetch({
        path: `/boards/${boardId}/columns?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "POST", body: { name } }),
    }).then(readResponse);

const readBoardFull = ({ cookie, userId, boardId }) =>
    authedFetch({ path: `/boards/${boardId}/full?userId=${userId}`, cookie }).then(readResponse);

/* SaveTaskRequestDTO is POSTed to the column detail path, not to /tasks — T1 exists to confirm it. */
const createTask = ({ cookie, userId, boardId, columnId, body }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "POST", body }),
    }).then(readResponse);

const updateTask = ({ cookie, userId, boardId, columnId, taskId, body }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}/tasks/${taskId}?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "PUT", body }),
    }).then(readResponse);

const deleteTask = ({ cookie, userId, boardId, columnId, taskId }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}/tasks/${taskId}?userId=${userId}`,
        cookie,
        init: { method: "DELETE" },
    }).then(readResponse);

const moveTask = ({ cookie, userId, taskId, body }) =>
    authedFetch({
        path: `/tasks/${taskId}/move?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "PATCH", body }),
    }).then(readResponse);

const createSubtask = ({ cookie, userId, boardId, columnId, taskId, body }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}/tasks/${taskId}/subtasks?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "POST", body }),
    }).then(readResponse);

const updateSubtask = ({ cookie, userId, boardId, columnId, taskId, subtaskId, body }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}/tasks/${taskId}/subtasks/${subtaskId}?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "PUT", body }),
    }).then(readResponse);

const deleteSubtask = ({ cookie, userId, boardId, columnId, taskId, subtaskId }) =>
    authedFetch({
        path: `/boards/${boardId}/columns/${columnId}/tasks/${taskId}/subtasks/${subtaskId}?userId=${userId}`,
        cookie,
        init: { method: "DELETE" },
    }).then(readResponse);

/* --- snapshot helpers ------------------------------------------------------------------------ */

const boardSnapshot = (full) =>
    (full.json?.columns ?? []).map((column) => ({
        id: column.id,
        name: column.name,
        position: column.position,
        version: column.version,
        tasks: (column.tasks ?? []).map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            position: task.position,
            version: task.version,
            subtasks: (task.subtasks ?? []).map((subtask) => ({
                id: subtask.id,
                title: subtask.title,
                isCompleted: subtask.isCompleted,
                version: subtask.version,
            })),
        })),
    }));

const snapshotOf = async (context) => boardSnapshot(await readBoardFull(context));

const findColumnById = ({ snapshot, columnId }) => snapshot.find((column) => column.id === columnId);

const allTasks = (snapshot) => snapshot.flatMap((column) => column.tasks);

const findTaskByTitle = ({ snapshot, title }) => allTasks(snapshot).find((task) => task.title === title);

const findTaskById = ({ snapshot, taskId }) => allTasks(snapshot).find((task) => task.id === taskId);

const byPosition = (tasks) => [...tasks].sort((left, right) => left.position - right.position);

/*
 * Prints response order beside position-sorted order — 04-RESEARCH Pitfall 15 says the read carries
 * no ordering guarantee, so the two are recorded separately rather than assumed equal.
 */
const printTasks = ({ label, column }) => {
    if (!column) {
        console.log(`  ${label}: (column not found)`);
        return;
    }

    const raw = column.tasks.map((task) => task.title);
    const sorted = byPosition(column.tasks).map((task) => `${String(task.title)}@${String(task.position)}`);
    console.log(`  ${label} "${String(column.name)}": raw=${JSON.stringify(raw)} byPosition=${JSON.stringify(sorted)}`);
};

const seedTasks = async ({ cookie, userId, boardId, columnId, titles }) => {
    // Sequential, never parallel — creation order is what gives each task its position.
    for (const title of titles) {
        const created = await createTask({ cookie, userId, boardId, columnId, body: { title } });

        if (!isOk(created)) {
            throw new Error(`seedTasks: creating "${title}" failed with ${String(created.status)}: ${created.text}`);
        }
    }
};

/* --- probes ---------------------------------------------------------------------------------- */

const probeT1 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T1",
        question:
            "POST /boards/{boardId}/columns/{columnId} with {title}: does it create a task, and what is in the body?",
    });

    const columnId = columns["T1 Column"];
    console.log(`  POST /boards/{boardId}/columns/${String(columnId)}  body: {"title":"T1 Created Task"}`);

    const created = await createTask({ cookie, userId, boardId, columnId, body: { title: "T1 Created Task" } });
    printResult({ label: "create", result: created });

    const keys = created.json === null ? [] : Object.keys(created.json);
    console.log(`  response keys: ${JSON.stringify(keys)}`);
    console.log(
        `  echoes position: ${String(keys.includes("position"))}; carries subtasks: ${String(keys.includes("subtasks"))}; ` +
            `carries columnId: ${String(keys.includes("columnId"))}`,
    );

    const snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "after create", column: findColumnById({ snapshot, columnId }) });
    console.log(`  read-back from /full: ${JSON.stringify(findTaskById({ snapshot, taskId: created.json?.id }))}`);

    return { taskId: created.json?.id };
};

const probeT2 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T2",
        question:
            "Do task/subtask PUT and DELETE accept the ancestor segments the contract omits — and what does a literal placeholder segment do?",
    });

    const columnId = columns["T2 Column"];
    const base = { cookie, userId, boardId, columnId };

    const renameTarget = await createTask({ ...base, body: { title: "T2 Rename Target" } });
    const deleteFullTarget = await createTask({ ...base, body: { title: "T2 Delete Full Path" } });
    const deletePlaceholderTarget = await createTask({ ...base, body: { title: "T2 Delete Placeholder" } });

    const taskId = renameTarget.json?.id;
    let version = renameTarget.json?.version;

    console.log("  --- task PUT ---");
    console.log("  PUT /boards/{boardId}/columns/{columnId}/tasks/{taskId} with every ancestor spelled out");
    const fullAncestors = await updateTask({
        ...base,
        taskId,
        body: { title: "T2 Renamed Via Full Path", version },
    });
    printResult({ label: "full ancestors", result: fullAncestors });
    version = nextVersion({ result: fullAncestors, fallback: version });

    console.log("  PUT /boards/%7BboardId%7D/columns/%7BcolumnId%7D/tasks/{taskId}  (what openapi-fetch emits)");
    const placeholderAncestors = await authedFetch({
        path: `/boards/%7BboardId%7D/columns/%7BcolumnId%7D/tasks/${taskId}?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "PUT", body: { title: "T2 Renamed Via Placeholder", version } }),
    }).then(readResponse);
    printResult({ label: "placeholder ancestors", result: placeholderAncestors });
    version = nextVersion({ result: placeholderAncestors, fallback: version });

    console.log("  PUT /boards/no-such-board/columns/no-such-column/tasks/{taskId}  (wrong but well-formed)");
    const wrongAncestors = await authedFetch({
        path: `/boards/no-such-board/columns/no-such-column/tasks/${taskId}?userId=${userId}`,
        cookie,
        init: jsonInit({ method: "PUT", body: { title: "T2 Renamed Via Wrong Path", version } }),
    }).then(readResponse);
    printResult({ label: "wrong ancestors", result: wrongAncestors });
    version = nextVersion({ result: wrongAncestors, fallback: version });

    console.log("  --- subtask PUT ---");
    const subtaskOne = await createSubtask({ ...base, taskId, body: { title: "T2 Subtask One" } });
    printResult({ label: "create subtask (full ancestors)", result: subtaskOne });
    const subtaskId = subtaskOne.json?.id;
    let subtaskVersion = subtaskOne.json?.version;

    const subtaskFull = await updateSubtask({
        ...base,
        taskId,
        subtaskId,
        body: { title: "T2 Sub Full", isCompleted: false, version: subtaskVersion },
    });
    printResult({ label: "subtask PUT, full ancestors", result: subtaskFull });
    subtaskVersion = nextVersion({ result: subtaskFull, fallback: subtaskVersion });

    /*
     * Titles here stay short on purpose: a long one fails the update-side length bound (T8) and
     * would confound the path question this block exists to answer.
     */
    const subtaskPlaceholder = await authedFetch({
        path:
            `/boards/%7BboardId%7D/columns/%7BcolumnId%7D/tasks/%7BtaskId%7D/subtasks/${subtaskId}` +
            `?userId=${userId}`,
        cookie,
        init: jsonInit({
            method: "PUT",
            body: { title: "T2 Sub Placeholder", isCompleted: false, version: subtaskVersion },
        }),
    }).then(readResponse);
    printResult({ label: "subtask PUT, placeholder ancestors", result: subtaskPlaceholder });
    subtaskVersion = nextVersion({ result: subtaskPlaceholder, fallback: subtaskVersion });

    console.log("  --- subtask DELETE (placeholder ancestors) ---");
    const subtaskTwo = await createSubtask({ ...base, taskId, body: { title: "T2 Subtask Two" } });
    const subtaskDeletePlaceholder = await authedFetch({
        path:
            `/boards/%7BboardId%7D/columns/%7BcolumnId%7D/tasks/%7BtaskId%7D/subtasks/${String(subtaskTwo.json?.id)}` +
            `?userId=${userId}`,
        cookie,
        init: { method: "DELETE" },
    }).then(readResponse);
    printResult({ label: "subtask DELETE, placeholder ancestors", result: subtaskDeletePlaceholder });

    console.log("  --- task DELETE ---");
    const deleteFull = await deleteTask({ ...base, taskId: deleteFullTarget.json?.id });
    printResult({ label: "task DELETE, full ancestors", result: deleteFull });

    const deletePlaceholder = await authedFetch({
        path:
            `/boards/%7BboardId%7D/columns/%7BcolumnId%7D/tasks/${String(deletePlaceholderTarget.json?.id)}` +
            `?userId=${userId}`,
        cookie,
        init: { method: "DELETE" },
    }).then(readResponse);
    printResult({ label: "task DELETE, placeholder ancestors", result: deletePlaceholder });

    const snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "after T2", column: findColumnById({ snapshot, columnId }) });
    console.log(`  surviving task: ${JSON.stringify(findTaskById({ snapshot, taskId }))}`);

    return { taskId, subtaskId };
};

const probeT3 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T3",
        question:
            "PATCH /tasks/{taskId}/move targetPosition: final 0-based index or insert-before? And append, out-of-range, omitted?",
    });

    const sourceId = columns["T3 Source"];
    const destId = columns["T3 Dest"];

    await seedTasks({
        cookie,
        userId,
        boardId,
        columnId: sourceId,
        titles: ["T3 S0", "T3 S1", "T3 S2", "T3 S3", "T3 S4"],
    });
    await seedTasks({ cookie, userId, boardId, columnId: destId, titles: ["T3 D0", "T3 D1", "T3 D2"] });

    let snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "seeded source", column: findColumnById({ snapshot, columnId: sourceId }) });
    printTasks({ label: "seeded dest", column: findColumnById({ snapshot, columnId: destId }) });

    console.log("\n  T3a — SAME-column move, the only case where the two semantics differ:");
    const s0 = findTaskByTitle({ snapshot, title: "T3 S0" });
    console.log(`  move "T3 S0" (position 0) targetColumnId=its own column, targetPosition: 2`);
    const sameColumn = await moveTask({
        cookie,
        userId,
        taskId: s0.id,
        body: { targetColumnId: sourceId, version: s0.version, targetPosition: 2 },
    });
    printResult({ label: "same-column move", result: sameColumn });

    snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "after T3a", column: findColumnById({ snapshot, columnId: sourceId }) });
    console.log("  S1,S2,S0,S3,S4 => final index | S1,S0,S2,S3,S4 => insert-before");

    console.log("\n  T3b — CROSS-column move to targetPosition 1:");
    const s1 = findTaskByTitle({ snapshot, title: "T3 S1" });
    const crossColumn = await moveTask({
        cookie,
        userId,
        taskId: s1.id,
        body: { targetColumnId: destId, version: s1.version, targetPosition: 1 },
    });
    printResult({ label: "cross-column move", result: crossColumn });

    snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "after T3b dest", column: findColumnById({ snapshot, columnId: destId }) });
    printTasks({ label: "after T3b source", column: findColumnById({ snapshot, columnId: sourceId }) });

    console.log("\n  T3c — APPEND: targetPosition equal to the destination's current task count:");
    const destCount = findColumnById({ snapshot, columnId: destId }).tasks.length;
    const s2 = findTaskByTitle({ snapshot, title: "T3 S2" });
    console.log(
        `  destination currently holds ${String(destCount)} tasks; sending targetPosition: ${String(destCount)}`,
    );
    const append = await moveTask({
        cookie,
        userId,
        taskId: s2.id,
        body: { targetColumnId: destId, version: s2.version, targetPosition: destCount },
    });
    printResult({ label: "append move", result: append });

    snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "after T3c dest", column: findColumnById({ snapshot, columnId: destId }) });

    console.log("\n  T3d — OUT OF RANGE: targetPosition 99:");
    const s3 = findTaskByTitle({ snapshot, title: "T3 S3" });
    const outOfRange = await moveTask({
        cookie,
        userId,
        taskId: s3.id,
        body: { targetColumnId: destId, version: s3.version, targetPosition: 99 },
    });
    printResult({ label: "targetPosition 99", result: outOfRange });

    snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "after T3d dest", column: findColumnById({ snapshot, columnId: destId }) });
    console.log(`  "T3 S3" now: ${JSON.stringify(findTaskById({ snapshot, taskId: s3.id }))}`);

    console.log("\n  T3e — OMITTED: no targetPosition field at all:");
    const s4 = findTaskByTitle({ snapshot, title: "T3 S4" });
    const omitted = await moveTask({
        cookie,
        userId,
        taskId: s4.id,
        body: { targetColumnId: destId, version: s4.version },
    });
    printResult({ label: "targetPosition omitted", result: omitted });

    snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "after T3e dest", column: findColumnById({ snapshot, columnId: destId }) });
    console.log(`  "T3 S4" now: ${JSON.stringify(findTaskById({ snapshot, taskId: s4.id }))}`);
};

const probeT4 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T4",
        question: "A task PUT, a subtask PUT and a move, each with a deliberately stale version — status and code?",
    });

    const columnId = columns["T4 Column"];
    const moveDestId = columns["T4 Move Dest"];
    const base = { cookie, userId, boardId, columnId };

    const task = await createTask({ ...base, body: { title: "T4 Task" } });
    const taskId = task.json?.id;
    const staleTaskVersion = task.json?.version;

    console.log("  --- task PUT ---");
    const firstPut = await updateTask({
        ...base,
        taskId,
        body: { title: "T4 Task Bumped", version: staleTaskVersion },
    });
    printResult({ label: `first PUT with version ${String(staleTaskVersion)}`, result: firstPut });

    const stalePut = await updateTask({
        ...base,
        taskId,
        body: { title: "T4 Task Stale Write", version: staleTaskVersion },
    });
    printResult({ label: `replayed PUT with the now-stale version ${String(staleTaskVersion)}`, result: stalePut });

    console.log("  --- subtask PUT ---");
    const subtask = await createSubtask({ ...base, taskId, body: { title: "T4 Subtask" } });
    const subtaskId = subtask.json?.id;
    const staleSubtaskVersion = subtask.json?.version;

    const firstSubtaskPut = await updateSubtask({
        ...base,
        taskId,
        subtaskId,
        body: { title: "T4 Subtask Bumped", isCompleted: true, version: staleSubtaskVersion },
    });
    printResult({ label: `first subtask PUT with version ${String(staleSubtaskVersion)}`, result: firstSubtaskPut });

    const staleSubtaskPut = await updateSubtask({
        ...base,
        taskId,
        subtaskId,
        body: { title: "T4 Subtask Stale Write", isCompleted: false, version: staleSubtaskVersion },
    });
    printResult({ label: "replayed subtask PUT with the now-stale version", result: staleSubtaskPut });

    console.log("  --- move ---");
    const beforeMove = await snapshotOf({ cookie, userId, boardId });
    const moveVersion = findTaskById({ snapshot: beforeMove, taskId })?.version;

    const firstMove = await moveTask({
        cookie,
        userId,
        taskId,
        body: { targetColumnId: moveDestId, version: moveVersion, targetPosition: 0 },
    });
    printResult({ label: `first move with version ${String(moveVersion)}`, result: firstMove });

    const staleMove = await moveTask({
        cookie,
        userId,
        taskId,
        body: { targetColumnId: columnId, version: moveVersion, targetPosition: 0 },
    });
    printResult({ label: "replayed move with the now-stale version", result: staleMove });
};

const probeT5 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T5",
        question: "After a move, do tasks that merely SHIFTED position keep a usable version?",
    });

    const columnId = columns["T5 Column"];
    await seedTasks({ cookie, userId, boardId, columnId, titles: ["T5 A", "T5 B", "T5 C", "T5 D"] });

    const before = await snapshotOf({ cookie, userId, boardId });
    const beforeColumn = findColumnById({ snapshot: before, columnId });
    printTasks({ label: "before move", column: beforeColumn });

    const moved = findTaskByTitle({ snapshot: before, title: "T5 A" });
    const move = await moveTask({
        cookie,
        userId,
        taskId: moved.id,
        body: { targetColumnId: columnId, version: moved.version, targetPosition: 2 },
    });
    printResult({ label: '"T5 A" (position 0) -> targetPosition 2', result: move });

    const after = await snapshotOf({ cookie, userId, boardId });
    const afterColumn = findColumnById({ snapshot: after, columnId });
    printTasks({ label: "after move", column: afterColumn });

    for (const beforeTask of byPosition(beforeColumn.tasks)) {
        const afterTask = afterColumn.tasks.find((task) => task.id === beforeTask.id);

        if (!afterTask) {
            console.log(`    ${String(beforeTask.title)}: absent after the move`);
            continue;
        }

        const shifted = beforeTask.position !== afterTask.position;
        const bumped = beforeTask.version !== afterTask.version;
        console.log(
            `    ${String(beforeTask.title)}: position ${String(beforeTask.position)} -> ${String(afterTask.position)}, ` +
                `version ${String(beforeTask.version)} -> ${String(afterTask.version)} ` +
                `(isMovedTask=${String(beforeTask.id === moved.id)}, positionChanged=${String(shifted)}, versionBumped=${String(bumped)})`,
        );
    }

    /* The backstop question: does a write against a merely-shifted task still take its PRE-move version? */
    const shiftedTask = byPosition(beforeColumn.tasks).find(
        (task) =>
            task.id !== moved.id && afterColumn.tasks.find((other) => other.id === task.id)?.position !== task.position,
    );

    if (!shiftedTask) {
        console.log("    no task merely shifted — the backstop PUT was not attempted");
        return;
    }

    const staleShiftedPut = await updateTask({
        cookie,
        userId,
        boardId,
        columnId,
        taskId: shiftedTask.id,
        body: { title: `${String(shiftedTask.title)} Renamed`, version: shiftedTask.version },
    });
    printResult({
        label: `PUT against shifted "${String(shiftedTask.title)}" carrying its PRE-move version ${String(shiftedTask.version)}`,
        result: staleShiftedPut,
    });
};

const probeT6 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T6",
        question: "Does deleting a task remove its subtasks server-side, and what does a second DELETE return?",
    });

    const columnId = columns["T6 Column"];
    const base = { cookie, userId, boardId, columnId };

    const task = await createTask({ ...base, body: { title: "T6 Task With Subtasks" } });
    const taskId = task.json?.id;

    const subtaskOne = await createSubtask({ ...base, taskId, body: { title: "T6 Subtask One" } });
    const subtaskTwo = await createSubtask({ ...base, taskId, body: { title: "T6 Subtask Two" } });
    printResult({ label: "create subtask one", result: subtaskOne });
    printResult({ label: "create subtask two", result: subtaskTwo });

    const before = await snapshotOf({ cookie, userId, boardId });
    console.log(`  task before delete: ${JSON.stringify(findTaskById({ snapshot: before, taskId }))}`);

    const deleted = await deleteTask({ ...base, taskId });
    printResult({ label: "DELETE the task", result: deleted });

    const after = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "column after delete", column: findColumnById({ snapshot: after, columnId }) });
    console.log(`  task absent from /full: ${String(findTaskById({ snapshot: after, taskId }) === undefined)}`);

    /* /full nests subtasks under their task, so a gone task hides them — probe the subtask id directly. */
    const orphanWrite = await updateSubtask({
        ...base,
        taskId,
        subtaskId: subtaskOne.json?.id,
        body: { title: "T6 Orphan Write", isCompleted: true, version: subtaskOne.json?.version },
    });
    printResult({ label: "PUT against the deleted task's subtask", result: orphanWrite });

    const orphanDelete = await deleteSubtask({ ...base, taskId, subtaskId: subtaskTwo.json?.id });
    printResult({ label: "DELETE the deleted task's other subtask", result: orphanDelete });

    const secondDelete = await deleteTask({ ...base, taskId });
    printResult({ label: "second DELETE of the same task id", result: secondDelete });
};

const probeT7 = async ({ cookie, userId, boardId, columns, cleanup }) => {
    printBlock({
        label: "T7",
        question:
            "Is a move to a column on a DIFFERENT board, or on ANOTHER ACCOUNT's board, refused? PATCH /tasks/{taskId}/move carries no board scoping.",
    });

    const columnId = columns["T7 Column"];
    const base = { cookie, userId, boardId, columnId };
    await seedTasks({
        cookie,
        userId,
        boardId,
        columnId,
        titles: ["T7 Cross Board", "T7 Cross Account One", "T7 Cross Account Two"],
    });

    console.log("  --- same account, DIFFERENT board ---");
    const secondBoard = await createBoard({ cookie, userId, name: "Probe Tasks Second Board" });
    cleanup.boards.push({ cookie, userId, boardId: secondBoard.id, label: "second board (account A)" });
    const secondColumn = await createColumn({ cookie, userId, boardId: secondBoard.id, name: "Other Board Column" });
    const secondColumnId = secondColumn.json?.id;

    let snapshot = await snapshotOf({ cookie, userId, boardId });
    const crossBoardTask = findTaskByTitle({ snapshot, title: "T7 Cross Board" });
    const crossBoard = await moveTask({
        cookie,
        userId,
        taskId: crossBoardTask.id,
        body: { targetColumnId: secondColumnId, version: crossBoardTask.version, targetPosition: 0 },
    });
    printResult({ label: "move to a column on the account's OTHER board", result: crossBoard });

    const secondBoardSnapshot = boardSnapshot(await readBoardFull({ cookie, userId, boardId: secondBoard.id }));
    printTasks({
        label: "other board after the move",
        column: findColumnById({ snapshot: secondBoardSnapshot, columnId: secondColumnId }),
    });
    snapshot = await snapshotOf({ cookie, userId, boardId });
    console.log(
        `  still on the original board: ${String(findTaskById({ snapshot, taskId: crossBoardTask.id }) !== undefined)}`,
    );

    console.log("  --- SECOND ACCOUNT's board ---");
    const accountB = await signUpThrowawayAccount("task-b");
    const cookieB = await signIn({ email: accountB.email, password: accountB.password });
    const boardB = await createBoard({ cookie: cookieB, userId: accountB.id, name: "Probe Tasks Account B" });
    cleanup.boards.push({ cookie: cookieB, userId: accountB.id, boardId: boardB.id, label: "board (account B)" });
    const columnB = await createColumn({
        cookie: cookieB,
        userId: accountB.id,
        boardId: boardB.id,
        name: "Account B Column",
    });
    const columnBId = columnB.json?.id;
    console.log(`  account B board ${String(boardB.id)}, column ${String(columnBId)}`);

    const attackerOne = findTaskByTitle({ snapshot, title: "T7 Cross Account One" });
    const asOwnUser = await moveTask({
        cookie,
        userId,
        taskId: attackerOne.id,
        body: { targetColumnId: columnBId, version: attackerOne.version, targetPosition: 0 },
    });

    if (isOk(asOwnUser)) {
        console.log(
            "  !!! CRITICAL FINDING !!! account A moved its own task into account B's column using A's own session " +
                `and userId -> status ${String(asOwnUser.status)}, body: ${asOwnUser.text}`,
        );
    } else {
        printResult({ label: "A moves A's task into B's column (A's cookie, userId=A)", result: asOwnUser });
    }

    const attackerTwo = findTaskByTitle({ snapshot, title: "T7 Cross Account Two" });
    const asVictimUser = await moveTask({
        cookie,
        userId: accountB.id,
        taskId: attackerTwo.id,
        body: { targetColumnId: columnBId, version: attackerTwo.version, targetPosition: 0 },
    });

    if (isOk(asVictimUser)) {
        console.log(
            "  !!! CRITICAL FINDING !!! account A moved its own task into account B's column by claiming " +
                `userId=B in the query -> status ${String(asVictimUser.status)}, body: ${asVictimUser.text}`,
        );
    } else {
        printResult({ label: "A moves A's task into B's column (A's cookie, userId=B)", result: asVictimUser });
    }

    const boardBSnapshot = boardSnapshot(
        await readBoardFull({ cookie: cookieB, userId: accountB.id, boardId: boardB.id }),
    );
    printTasks({
        label: "account B's column, read as B",
        column: findColumnById({ snapshot: boardBSnapshot, columnId: columnBId }),
    });

    snapshot = await snapshotOf({ cookie, userId, boardId });
    printTasks({ label: "A's T7 column after both attempts", column: findColumnById({ snapshot, columnId }) });

    return { base, accountB };
};

const probeT8 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T8",
        question:
            "Does the backend enforce the 3-32 title bound on UPDATE as well as create? UpdateTaskRequestDTO declares no bounds.",
    });

    const columnId = columns["T8 Column"];
    const base = { cookie, userId, boardId, columnId };
    const longTitle = "x".repeat(33);

    console.log("  --- create side (SaveTaskRequestDTO declares minLength 3, maxLength 32) ---");
    const shortCreate = await createTask({ ...base, body: { title: "ab" } });
    printResult({ label: "POST 2-char title", result: shortCreate });
    const longCreate = await createTask({ ...base, body: { title: longTitle } });
    printResult({ label: "POST 33-char title", result: longCreate });

    console.log("  --- update side (UpdateTaskRequestDTO declares no bounds) ---");
    const task = await createTask({ ...base, body: { title: "T8 Task" } });
    const taskId = task.json?.id;
    let version = task.json?.version;

    const shortPut = await updateTask({ ...base, taskId, body: { title: "ab", version } });
    printResult({ label: "PUT 2-char title", result: shortPut });
    version = nextVersion({ result: shortPut, fallback: version });

    const longPut = await updateTask({ ...base, taskId, body: { title: longTitle, version } });
    printResult({ label: "PUT 33-char title", result: longPut });
    version = nextVersion({ result: longPut, fallback: version });

    /*
     * 2 and 33 both come back "cannot be empty", so the in-bounds ends decide whether it is a 3-32
     * bound with misleading copy or something else entirely.
     */
    const minPut = await updateTask({ ...base, taskId, body: { title: "abc", version } });
    printResult({ label: "PUT 3-char title (lower bound)", result: minPut });
    version = nextVersion({ result: minPut, fallback: version });

    const maxPut = await updateTask({ ...base, taskId, body: { title: "y".repeat(32), version } });
    printResult({ label: "PUT 32-char title (upper bound)", result: maxPut });
    version = nextVersion({ result: maxPut, fallback: version });

    console.log("  --- subtask update side (UpdateSubtaskRequestDTO also declares no bounds) ---");
    const subtask = await createSubtask({ ...base, taskId, body: { title: "T8 Subtask" } });
    let subtaskVersion = subtask.json?.version;

    const subtaskMax = await updateSubtask({
        ...base,
        taskId,
        subtaskId: subtask.json?.id,
        body: { title: "z".repeat(32), isCompleted: false, version: subtaskVersion },
    });
    printResult({ label: "subtask PUT 32-char title", result: subtaskMax });
    subtaskVersion = nextVersion({ result: subtaskMax, fallback: subtaskVersion });

    const subtaskOver = await updateSubtask({
        ...base,
        taskId,
        subtaskId: subtask.json?.id,
        body: { title: "z".repeat(33), isCompleted: false, version: subtaskVersion },
    });
    printResult({ label: "subtask PUT 33-char title", result: subtaskOver });
    subtaskVersion = nextVersion({ result: subtaskOver, fallback: subtaskVersion });

    const subtaskEmpty = await updateSubtask({
        ...base,
        taskId,
        subtaskId: subtask.json?.id,
        body: { title: "", isCompleted: false, version: subtaskVersion },
    });
    printResult({ label: 'subtask PUT empty title ""', result: subtaskEmpty });

    const snapshot = await snapshotOf({ cookie, userId, boardId });
    console.log(`  task after the PUTs: ${JSON.stringify(findTaskById({ snapshot, taskId }))}`);
    printTasks({ label: "after T8", column: findColumnById({ snapshot, columnId }) });
};

const probeT9 = async ({ cookie, userId, boardId, columns }) => {
    printBlock({
        label: "T9",
        question: 'description: "" vs the field omitted — accepted on create, and what does the read-back echo?',
    });

    const columnId = columns["T1 Column"];
    const base = { cookie, userId, boardId, columnId };

    const empty = await createTask({ ...base, body: { title: "T9 Empty Description", description: "" } });
    printResult({ label: 'POST with description: ""', result: empty });
    console.log(`  create echoed description: ${JSON.stringify(empty.json?.description)}`);

    const omitted = await createTask({ ...base, body: { title: "T9 Omitted Description" } });
    printResult({ label: "POST with description omitted", result: omitted });
    console.log(`  create echoed description: ${JSON.stringify(omitted.json?.description)}`);

    const filled = await createTask({ ...base, body: { title: "T9 Filled Description", description: "a real one" } });
    printResult({ label: 'POST with description: "a real one"', result: filled });

    /*
     * The Edit Task form must be able to CLEAR a description, so the update side is the half that
     * decides what a cleared textarea sends.
     */
    console.log("  --- update side: how does an Edit Task form clear a description? ---");
    const taskId = filled.json?.id;
    let version = filled.json?.version;

    /*
     * The changed-value case runs FIRST as the control: without it, "null left it alone" cannot be
     * told apart from "description is ignored on update entirely".
     */
    const putChanged = await updateTask({
        ...base,
        taskId,
        body: { title: "T9 Filled", description: "a changed one", version },
    });
    printResult({ label: 'PUT with description: "a changed one" (control)', result: putChanged });
    version = nextVersion({ result: putChanged, fallback: version });

    const putEmpty = await updateTask({ ...base, taskId, body: { title: "T9 Filled", description: "", version } });
    printResult({ label: 'PUT with description: ""', result: putEmpty });
    version = nextVersion({ result: putEmpty, fallback: version });

    const putNull = await updateTask({ ...base, taskId, body: { title: "T9 Null", description: null, version } });
    printResult({ label: "PUT with description: null", result: putNull });
    version = nextVersion({ result: putNull, fallback: version });

    const putOmitted = await updateTask({ ...base, taskId, body: { title: "T9 Omitted", version } });
    printResult({ label: "PUT with description omitted", result: putOmitted });
    version = nextVersion({ result: putOmitted, fallback: version });

    const putBlank = await updateTask({ ...base, taskId, body: { title: "T9 Blank", description: " ", version } });
    printResult({ label: 'PUT with description: " " (single space)', result: putBlank });
    version = nextVersion({ result: putBlank, fallback: version });

    /* Reads the raw /full body, not the snapshot — the snapshot would invent an absent key. */
    const full = await readBoardFull({ cookie, userId, boardId });
    const rawColumn = (full.json?.columns ?? []).find((column) => column.id === columnId);

    for (const task of rawColumn?.tasks ?? []) {
        if (!String(task.title).startsWith("T9")) {
            continue;
        }

        console.log(
            `  /full "${String(task.title)}": description key present=${String(Object.hasOwn(task, "description"))}, ` +
                `value=${JSON.stringify(task.description)}`,
        );
    }
};

/* --- runner ----------------------------------------------------------------------------------- */

/* One failed section must not cost the other eight — this run writes to a shared nonprod backend. */
const runProbe = async ({ label, run }) => {
    try {
        return await run();
    } catch (error) {
        console.log(`\n!! ${label} threw and was skipped: ${String(error.message)}`);
        return null;
    }
};

const COLUMN_NAMES = [
    "T1 Column",
    "T2 Column",
    "T3 Source",
    "T3 Dest",
    "T4 Column",
    "T4 Move Dest",
    "T5 Column",
    "T6 Column",
    "T7 Column",
    "T8 Column",
];

/*
 * MAIN
 */

const main = async () => {
    const account = await signUpThrowawayAccount("task-a");
    const cleanup = { boards: [] };
    let boardId = "(not created)";

    try {
        const cookie = await signIn({ email: account.email, password: account.password });
        const userId = account.id;

        const board = await createBoard({ cookie, userId, name: "Probe Tasks" });
        boardId = board.id;
        cleanup.boards.push({ cookie, userId, boardId, label: "main board (account A)" });

        const columns = {};
        for (const name of COLUMN_NAMES) {
            const created = await createColumn({ cookie, userId, boardId, name });
            columns[name] = created.json?.id;
            console.log(`created column "${name}" -> status ${String(created.status)}, id ${String(created.json?.id)}`);
        }

        const context = { cookie, userId, boardId, columns, cleanup };

        await runProbe({ label: "T1", run: () => probeT1(context) });
        await runProbe({ label: "T2", run: () => probeT2(context) });
        await runProbe({ label: "T3", run: () => probeT3(context) });
        await runProbe({ label: "T4", run: () => probeT4(context) });
        await runProbe({ label: "T5", run: () => probeT5(context) });
        await runProbe({ label: "T6", run: () => probeT6(context) });
        await runProbe({ label: "T7", run: () => probeT7(context) });
        await runProbe({ label: "T8", run: () => probeT8(context) });
        await runProbe({ label: "T9", run: () => probeT9(context) });
    } finally {
        console.log("\n## CLEANUP");

        for (const entry of cleanup.boards) {
            const deleted = await deleteBoard(entry);
            console.log(
                `  DELETE ${String(entry.label)} ${String(entry.boardId)} -> status ${String(deleted.status)}, body: ${deleted.text}`,
            );
        }

        console.log(
            "  accounts are NOT deleted — the backend exposes no delete-account endpoint " +
                "(02-BACKEND-FACTS.md); they are permanent nonprod records holding no state any plan depends on",
        );
        console.log(`\nTRACEABILITY: throwaway account ${account.email}, board ${String(boardId)}`);
        console.log(`SESSIONS: ${String(signInCounts.size)}`);
    }
};

await main();
