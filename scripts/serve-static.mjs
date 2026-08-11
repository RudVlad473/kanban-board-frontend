// Minimal static file server for the Playwright visual-regression webServer entry (Task 3, plan
// 01-05). Serves only the built storybook-static directory over plain HTTP — no framework, no
// new dependency, just node:http/node:fs — since the visual spec must read exclusively from the
// pre-built static Storybook, never a running application (CONVENTIONS.md's visual-regression
// scope).
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

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

const server = createServer((req, res) => {
  void (async () => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    let filePath = path.join(root, decodeURIComponent(requestUrl.pathname));

    try {
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

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${String(port)}`);
});
