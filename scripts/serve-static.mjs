/*
 * Minimal static file server for the Playwright visual-regression webServer entry (Task 3, plan
 * 01-05). Serves only the built storybook-static directory over plain HTTP — no framework, no
 * new dependency, just node:http/node:fs — since the visual spec must read exclusively from the
 * pre-built static Storybook, never a running application (CONVENTIONS.md's visual-regression
 * scope).
 */
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , rootArg = "storybook-static", portArg = "6007"] = process.argv;
const root = path.resolve(rootArg);
const port = Number(portArg);

const MIME_TYPES = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".map": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
};

/*
 * Resolves a request pathname against `root` and refuses anything that escapes it — `../`, an
 * encoded `..`, an absolute path, or a sibling directory whose name merely starts with root's
 * name. `path.resolve(root, "." + pathname)` treats a leading `/` as relative to root instead of
 * discarding root outright, and the containment check compares against `root + path.sep` (not a
 * bare string prefix) so `<root>-other/secret.txt` is correctly refused. Returns `null` on any
 * failure, including a malformed percent-escape that makes `decodeURIComponent` throw.
 */
export const resolveWithinRoot = ({ root: servedRoot, pathname }) => {
    let decodedPathname;

    try {
        decodedPathname = decodeURIComponent(pathname);
    } catch {
        return null;
    }

    const resolvedRoot = path.resolve(servedRoot);
    const candidate = path.resolve(resolvedRoot, "." + decodedPathname);

    if (candidate === resolvedRoot || candidate.startsWith(resolvedRoot + path.sep)) {
        return candidate;
    }

    return null;
};

const server = createServer((req, res) => {
    void (async () => {
        const requestUrl = new URL(req.url ?? "/", "http://localhost");
        let filePath = resolveWithinRoot({ root, pathname: requestUrl.pathname });

        try {
            if (filePath === null) {
                throw new Error("Path escapes served root");
            }

            const stats = await stat(filePath);

            if (stats.isDirectory()) {
                filePath = path.join(filePath, "index.html");
            }

            const data = await readFile(filePath);
            const contentType = MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream";

            res.writeHead(200, { "Content-Type": contentType });
            res.end(data);
        } catch {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found");
        }
    })();
});

/*
 * Only start listening when this module is executed directly (`node scripts/serve-static.mjs`),
 * not when it's imported for its `resolveWithinRoot` export by the unit test.
 */
const isMainModule = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
    server.listen(port, () => {
        console.log(`Serving ${root} at http://localhost:${String(port)}`);
    });
}
