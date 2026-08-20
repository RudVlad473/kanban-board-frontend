#!/usr/bin/env node
/*
 * Writes real rows to the deployed nonprod backend via throwaway accounts. Never wire this into
 * `pnpm test`, `pnpm test:all` or CI (T-02-24) — run it manually, by hand, when needed.
 */

const baseUrl = process.env.EXTERNAL_API_BASE_URL;

if (!baseUrl) {
    console.error(
        "probe-board-backend: EXTERNAL_API_BASE_URL is not set. Set it in your shell environment " +
            "(or run `vercel env pull --yes .env.local` and source it) before running this script.",
    );
    process.exit(1);
}

/*
 * The backend caps an account at two concurrent sessions and answers a third sign-in with the
 * same 401 a wrong password produces (e2e/fixtures.ts:34-40). Route every sign-in through this
 * helper, which throws on a repeat sign-in for the same email instead of letting a stray retry
 * surface as a cryptic 401 three probe blocks later.
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
const DISPLAY_NAME = "Probe Backend Fixture";

const createAccount = async (label) => {
    const email = randomEmail(label);

    const response = await fetch(`${baseUrl}/signup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: PASSWORD, displayName: DISPLAY_NAME }),
    });

    if (response.status !== 201) {
        const body = await response.text();
        throw new Error(
            `createAccount(${label}): expected 201 from POST /signup, got ${String(response.status)}: ${body}`,
        );
    }

    const body = await response.json();

    return { id: body.id, email, password: PASSWORD };
};

/* --- fetch helper -------------------------------------------------------------------------- */

const authedFetch = ({ path, cookie, init = {} }) =>
    fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { ...init.headers, cookie },
    });

const printBlock = ({ label, question }) => {
    console.log(`\n## ${label}`);
    console.log(question);
};

/*
 * MAIN
 */

const main = async () => {
    // Account A is signed in once and reused for P1-P6.
    const accountA = await createAccount("a");
    const cookieA = await signIn({ email: accountA.email, password: accountA.password });

    /* --- P1 (A1 / Open Question 1: ordering) ------------------------------------------------ */
    printBlock({
        label: "P1",
        question: "Ordering: does GET /boards return creation order, reverse, alphabetical, or none?",
    });

    const boardNames = ["Probe Alpha", "Probe Bravo", "Probe Charlie"];
    const createdBoards = [];

    for (const name of boardNames) {
        const response = await authedFetch({
            path: `/boards?userId=${accountA.id}`,
            cookie: cookieA,
            init: {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name }),
            },
        });
        const body = await response.json();
        console.log(`  created board "${name}" -> status ${String(response.status)}, body: ${JSON.stringify(body)}`);
        createdBoards.push(body);
    }

    const listResponse = await authedFetch({ path: `/boards?userId=${accountA.id}`, cookie: cookieA });
    const listBody = await listResponse.json();
    const returnedNames = listBody.map((b) => b.name);
    console.log(
        `  GET /boards -> status ${String(listResponse.status)}, names in order: ${JSON.stringify(returnedNames)}`,
    );

    const creationOrderNames = boardNames.filter((n) => returnedNames.includes(n));
    const observedOrder = returnedNames.filter((n) => boardNames.includes(n));
    let orderVerdict;
    if (JSON.stringify(observedOrder) === JSON.stringify(creationOrderNames)) {
        orderVerdict = "creation order";
    } else if (JSON.stringify(observedOrder) === JSON.stringify([...creationOrderNames].reverse())) {
        orderVerdict = "reverse-creation order";
    } else if (JSON.stringify(observedOrder) === JSON.stringify([...creationOrderNames].sort())) {
        orderVerdict = "alphabetical";
    } else {
        orderVerdict = "none of those (arbitrary/unspecified order)";
    }
    console.log(`  VERDICT: ${orderVerdict}`);

    /* --- P2 (A2: id format) ------------------------------------------------------------------ */
    printBlock({
        label: "P2",
        question: "Id format: verbatim ids, string-sort vs creation order, and shape (UUIDv4 / ULID/UUIDv7 / numeric)?",
    });

    for (const board of createdBoards) {
        console.log(`  ${board.name}: id = ${board.id}`);
    }
    const ids = createdBoards.map((b) => b.id);
    const sortedIds = [...ids].sort();
    const idsSortInCreationOrder = JSON.stringify(sortedIds) === JSON.stringify(ids);
    console.log(`  sorting the three ids as strings reproduces creation order: ${String(idsSortInCreationOrder)}`);

    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const numericPattern = /^\d+$/;
    let shapeVerdict;
    if (ids.every((id) => uuidV4Pattern.test(id))) {
        shapeVerdict = "UUIDv4";
    } else if (ids.every((id) => uuidV7Pattern.test(id))) {
        shapeVerdict = "UUIDv7 (ULID-like, chronologically sortable)";
    } else if (ids.every((id) => numericPattern.test(id))) {
        shapeVerdict = "numeric string";
    } else {
        shapeVerdict = "unrecognized shape (not UUIDv4/UUIDv7/numeric)";
    }
    console.log(`  VERDICT: ${shapeVerdict}`);

    /* --- P3 (A3 / Open Question 2: error shape) --------------------------------------------- */
    printBlock({ label: "P3", question: "PUT /boards/{id} with a stale version -> status code and raw body?" });

    const firstBoard = createdBoards[0];
    const staleVersion = (firstBoard.version ?? 0) - 1;
    const staleUpdateResponse = await authedFetch({
        path: `/boards/${firstBoard.id}?userId=${accountA.id}`,
        cookie: cookieA,
        init: {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Probe Alpha Renamed", version: staleVersion }),
        },
    });
    const staleUpdateBody = await staleUpdateResponse.text();
    console.log(`  status: ${String(staleUpdateResponse.status)}`);
    console.log(`  body: ${staleUpdateBody}`);

    /* --- P4 (name validation) ---------------------------------------------------------------- */
    printBlock({
        label: "P4",
        question: "POST /boards with an empty name, then a 1000-char name -> status + raw body?",
    });

    const emptyNameResponse = await authedFetch({
        path: `/boards?userId=${accountA.id}`,
        cookie: cookieA,
        init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "" }),
        },
    });
    const emptyNameBody = await emptyNameResponse.text();
    console.log(`  empty name -> status: ${String(emptyNameResponse.status)}, body: ${emptyNameBody}`);

    const longName = "x".repeat(1000);
    const longNameResponse = await authedFetch({
        path: `/boards?userId=${accountA.id}`,
        cookie: cookieA,
        init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: longName }),
        },
    });
    const longNameBody = await longNameResponse.text();
    console.log(`  1000-char name -> status: ${String(longNameResponse.status)}, body: ${longNameBody}`);

    /* --- P5 (column ordering) ----------------------------------------------------------------- */
    printBlock({
        label: "P5",
        question: "POST 3 columns in sequence, then GET /boards/{id}/full -> position per call order?",
    });

    const columnNames = ["Todo", "Doing", "Done"];
    for (const name of columnNames) {
        const columnResponse = await authedFetch({
            path: `/boards/${firstBoard.id}/columns?userId=${accountA.id}`,
            cookie: cookieA,
            init: {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name }),
            },
        });
        const columnBody = await columnResponse.json();
        console.log(
            `  created column "${name}" -> status ${String(columnResponse.status)}, body: ${JSON.stringify(columnBody)}`,
        );
    }

    const fullResponse = await authedFetch({
        path: `/boards/${firstBoard.id}/full?userId=${accountA.id}`,
        cookie: cookieA,
    });
    const fullBody = await fullResponse.json();
    const columnPositions = (fullBody.columns ?? []).map((c) => ({ name: c.name, position: c.position }));
    console.log(
        `  GET /boards/{id}/full -> status ${String(fullResponse.status)}, columns: ${JSON.stringify(columnPositions)}`,
    );
    const ascending = columnPositions.every((c, i) => i === 0 || c.position > columnPositions[i - 1].position);
    console.log(`  VERDICT: sequential creation produces ascending position: ${String(ascending)}`);

    /* --- P6 (column name validation) ---------------------------------------------------------- */
    printBlock({ label: "P6", question: "POST column with a 2-char name and a 33-char name -> status + raw body?" });

    const shortColumnResponse = await authedFetch({
        path: `/boards/${firstBoard.id}/columns?userId=${accountA.id}`,
        cookie: cookieA,
        init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "ab" }),
        },
    });
    const shortColumnBody = await shortColumnResponse.text();
    console.log(`  2-char name -> status: ${String(shortColumnResponse.status)}, body: ${shortColumnBody}`);

    const longColumnName = "x".repeat(33);
    const longColumnResponse = await authedFetch({
        path: `/boards/${firstBoard.id}/columns?userId=${accountA.id}`,
        cookie: cookieA,
        init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: longColumnName }),
        },
    });
    const longColumnBody = await longColumnResponse.text();
    console.log(`  33-char name -> status: ${String(longColumnResponse.status)}, body: ${longColumnBody}`);

    /* --- P7 (ACCESS CONTROL, ASVS V4) ----------------------------------------------------------- */
    printBlock({ label: "P7", question: "Can account B read/delete account A's board via a client-chosen userId?" });

    const accountB = await createAccount("b");
    const cookieB = await signIn({ email: accountB.email, password: accountB.password });

    const bReadAsB = await authedFetch({
        path: `/boards/${firstBoard.id}/full?userId=${accountB.id}`,
        cookie: cookieB,
    });
    const bReadAsBBody = await bReadAsB.text();
    console.log(`  B reads A's board with userId=B -> status: ${String(bReadAsB.status)}, body: ${bReadAsBBody}`);

    const bReadAsA = await authedFetch({
        path: `/boards/${firstBoard.id}/full?userId=${accountA.id}`,
        cookie: cookieB,
    });
    const bReadAsABody = await bReadAsA.text();
    console.log(`  B reads A's board with userId=A -> status: ${String(bReadAsA.status)}, body: ${bReadAsABody}`);

    const bDeleteAsA = await authedFetch({
        path: `/boards/${firstBoard.id}?userId=${accountA.id}`,
        cookie: cookieB,
        init: { method: "DELETE" },
    });
    const bDeleteAsABody = await bDeleteAsA.text();
    if (bDeleteAsA.status >= 200 && bDeleteAsA.status < 300) {
        console.log(
            `  !!! CRITICAL FINDING !!! B DELETED A's board using userId=A -> status: ${String(bDeleteAsA.status)}, ` +
                `body: ${bDeleteAsABody}. The backend does NOT enforce board ownership server-side.`,
        );
    } else {
        console.log(
            `  B attempts DELETE on A's board with userId=A -> status: ${String(bDeleteAsA.status)}, body: ${bDeleteAsABody}`,
        );
    }

    // Final line: exactly 2 for a clean run (one sign-in per account across all seven blocks).
    console.log(`\nSESSIONS: ${String(signInCounts.size)}`);
};

await main();
