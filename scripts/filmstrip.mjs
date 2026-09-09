#!/usr/bin/env node
/*
 * Capture an interaction as a contact sheet plus a per-frame change series, for reviewing motion.
 * Rationale, the two metrics, and the artifact policy: docs/adr/tech/0037.
 *
 *   node scripts/filmstrip.mjs --url <url> --name <slug> --trigger '<js>' [options]
 */
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.join(repoRoot, ".motion");

/** Older run directories are deleted on every run: the artifact budget is enforced, not documented. */
const RETAINED_RUNS = 5;

/** A pixel counts as changed when any channel moves this far — above sub-pixel antialiasing noise. */
const CHANNEL_THRESHOLD = 8;

/** Verdict thresholds. Derivations and the margin each one leaves: docs/adr/tech/0037 §5. */
export const THRESHOLDS = { outsideWash: 0.3, moved: 0.5, controlWash: 0.05 };

/** Pre-trigger sampling window. Its length is reported so a control reading can be scaled. */
const CONTROL_WINDOW_MS = 250;

export class UsageError extends Error {}

const parseArgs = (argv) => {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        if (!argv[i].startsWith("--")) continue;
        const key = argv[i].slice(2);
        const next = argv[i + 1];
        args[key] = next === undefined || next.startsWith("--") ? true : next;
    }
    return args;
};

/*
 * `--name` becomes a recursive `force: true` delete target, so it is restricted to one path
 * segment. Before this check `--name ../src` destroyed the source tree before the browser even
 * launched — the delete runs first, so an invalid URL did not save you.
 */
export const parseName = (value) => {
    if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) || value.includes("..")) {
        throw new UsageError(
            `--name must be one path segment of [A-Za-z0-9._-], starting alphanumeric — got "${String(value)}"`,
        );
    }
    return value;
};

/*
 * Rejects a rect that `getImageData` would silently pad rather than refuse. Padding never changes
 * between frames, so an overhanging rect dilutes both `inside` metrics in exact proportion to the
 * overhang: the same page reported `inside moved 100%` at 1440x900 and `0.00%` at 800x600.
 */
export const parseRect = ({ value, viewport }) => {
    const parts = String(value).split(",").map(Number);
    const [x, y, w, h] = parts;

    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        throw new UsageError(`--region wants four finite numbers x,y,w,h — got "${String(value)}"`);
    }
    if (w <= 0 || h <= 0) {
        throw new UsageError(`--region needs a positive width and height — got ${String(w)}x${String(h)}`);
    }
    if (x < 0 || y < 0 || x + w > viewport.width || y + h > viewport.height) {
        throw new UsageError(
            `--region ${String(x)},${String(y)},${String(w)},${String(h)} falls outside the ${String(viewport.width)}x${String(viewport.height)} viewport`,
        );
    }
    return { x, y, w, h };
};

/*
 * `Number("900ms")` is NaN and `waitForTimeout(NaN)` does not throw — Node coerces it to 1ms and
 * warns on stderr above an otherwise successful-looking report, so the wait silently vanished.
 */
export const parseDuration = ({ value, fallback, flag }) => {
    if (value === undefined) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0)
        throw new UsageError(`--${flag} wants a number of milliseconds — got "${String(value)}"`);
    return n;
};

export const parseViewport = (value) => {
    const [width, height] = String(value).split("x").map(Number);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
        throw new UsageError(`--viewport wants WxH in whole pixels — got "${String(value)}"`);
    }
    return { width, height };
};

export const parseCols = (value) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1)
        throw new UsageError(`--cols wants a whole number of at least 1 — got "${String(value)}"`);
    return n;
};

const USAGE = `
node scripts/filmstrip.mjs --url <url> --name <slug> [options]

  --url       page to open (required). A non-2xx response is refused, not measured.
  --name      run slug; one path segment, its directory is replaced on re-run (required)
  --trigger   JS evaluated in the page to start the interaction
  --setup     JS evaluated before capture begins, to reach the starting state
  --region    x,y,w,h — the area you EXPECT to change; reports inside vs outside it separately.
              Must fall inside the viewport. The sheet is never cropped to it — seeing what was
              not under test is the point.
  --viewport  WxH (default 1440x900)
  --settle    ms to wait after --setup before capturing (default 700)
  --capture   ms to keep capturing after --trigger (default 1200)
  --cols      frames per sheet row (default 5)
  --clean     delete .motion entirely and exit
`;

/*
 * Decode, diff and tile inside a second browser page: no PNG library resolves from this repo's
 * node_modules, and the page under test must not do image work mid-interaction.
 */
export const DECODER_SOURCE = `
window.__strip = { frames: [], baseline: null };

window.__addFrame = async ({ b64, t, region, threshold }) => {
    const blob = await (await fetch("data:image/png;base64," + b64)).blob();
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);

    const read = (r) => ctx.getImageData(r.x, r.y, r.w, r.h).data;
    const full = { x: 0, y: 0, w: bmp.width, h: bmp.height };
    const pixels = { viewport: read(full), region: region ? read(region) : null };

    /* "moved" is thresholded and sees structure; "wash" is unthresholded and sees a global tint.
       Dropping either lets a whole class of regression pass green — docs/adr/tech/0037 §2. */
    const stats = (now, before, width, exclude) => {
        let n = 0;
        let sum = 0;
        let counted = 0;
        for (let i = 0; i < now.length; i += 4) {
            if (exclude) {
                const p = i / 4;
                const x = p % width;
                const y = (p - x) / width;
                if (x >= exclude.x && x < exclude.x + exclude.w && y >= exclude.y && y < exclude.y + exclude.h) {
                    continue;
                }
            }
            const dr = now[i] - before[i];
            const dg = now[i + 1] - before[i + 1];
            const db = now[i + 2] - before[i + 2];
            if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) > threshold) n += 1;
            sum += Math.abs(dr * 0.2126 + dg * 0.7152 + db * 0.0722);
            counted += 1;
        }
        /* measured:false, never a zero. A rect covering the whole viewport leaves nothing outside
           it, and "wash 0.00 — nothing moved" is indistinguishable from a real clean result. */
        return counted === 0
            ? { moved: 0, wash: 0, measured: false }
            : { moved: (100 * n) / counted, wash: sum / counted, measured: true };
    };

    /* The first captured frame is the baseline, settled by construction: capture starts after
       --settle and before --trigger. Deriving it later diffed the control frames against null. */
    if (window.__strip.baseline === null) window.__strip.baseline = pixels;

    const base = window.__strip.baseline;
    const frame = {
        t,
        bmp,
        viewport: stats(pixels.viewport, base.viewport, bmp.width, null),
        inside: region ? stats(pixels.region, base.region, region.w, null) : null,
        outside: region ? stats(pixels.viewport, base.viewport, bmp.width, region) : null,
    };
    window.__strip.frames.push(frame);
    return { t, viewport: frame.viewport, inside: frame.inside, outside: frame.outside };
};

window.__tile = async ({ cols, region, scale, from, t0, outsideLimit, movedLimit }) => {
    const frames = window.__strip.frames.slice(from);
    if (frames.length === 0) return null;

    /* Never cropped to --region: the sheet is the one place showing what was not under test. */
    const src = { x: 0, y: 0, w: frames[0].bmp.width, h: frames[0].bmp.height };
    const cw = Math.round(src.w * scale);
    const ch = Math.round(src.h * scale);
    const bar = 22;
    const rows = Math.ceil(frames.length / cols);

    const sheet = new OffscreenCanvas(cols * cw, rows * (ch + bar));
    const cx = sheet.getContext("2d");
    cx.fillStyle = "#111";
    cx.fillRect(0, 0, sheet.width, sheet.height);
    cx.font = "12px monospace";
    cx.textBaseline = "middle";

    frames.forEach((f, i) => {
        const x = (i % cols) * cw;
        const y = Math.floor(i / cols) * (ch + bar);
        cx.drawImage(f.bmp, src.x, src.y, src.w, src.h, x, y + bar, cw, ch);
        const alarming = f.outside && f.outside.measured && f.outside.wash > outsideLimit;
        cx.fillStyle = alarming ? "#ff6b6b" : f.viewport.moved > movedLimit ? "#ffd166" : "#7a7a7a";
        const tag = f.outside && f.outside.measured ? \`  out \${f.outside.wash.toFixed(2)}\` : "";
        cx.fillText(
            \`+\${f.t - t0}ms  mv \${f.viewport.moved.toFixed(1)}%  wash \${f.viewport.wash.toFixed(2)}\${tag}\`,
            x + 6,
            y + bar / 2,
        );
        if (region) {
            cx.strokeStyle = "#4ecdc4";
            cx.strokeRect(x + region.x * scale, y + bar + region.y * scale, region.w * scale, region.h * scale);
        }
        cx.strokeStyle = "#333";
        cx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch + bar - 1);
    });

    const blob = await sheet.convertToBlob({ type: "image/png" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (const b of buf) s += String.fromCharCode(b);
    return btoa(s);
};
`;

const pruneOldRuns = async (keepName) => {
    const entries = await readdir(OUTPUT_ROOT, { withFileTypes: true }).catch(() => []);
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (dirs.length <= RETAINED_RUNS) return [];

    const withTime = await Promise.all(
        dirs.map(async (name) => ({ name, mtime: (await stat(path.join(OUTPUT_ROOT, name))).mtimeMs })),
    );
    const doomed = withTime
        .sort((a, b) => b.mtime - a.mtime)
        .slice(RETAINED_RUNS)
        .filter((d) => d.name !== keepName);

    for (const d of doomed) await rm(path.join(OUTPUT_ROOT, d.name), { recursive: true, force: true });
    return doomed.map((d) => d.name);
};

/*
 * Zero repaints is the HEALTHY reading, not a missing measurement: the compositor emits a frame
 * only on visual change. Reporting it as an averaged `0.00` was the bug — docs/adr/tech/0037 §3.
 */
const summariseControl = (control) => {
    const repaints = Math.max(0, control.length - 1);
    if (repaints === 0) return { repaints, wash: null, dirty: false };

    const wash = Math.max(...control.slice(1).map((c) => c.viewport.wash));
    return { repaints, wash, dirty: wash > THRESHOLDS.controlWash };
};

const describeControl = ({ repaints, wash, dirty }) =>
    repaints === 0
        ? `  control clean  no repaints in the ${String(CONTROL_WINDOW_MS)}ms before the trigger`
        : dirty
          ? `  CONTROL DIRTY  ${String(repaints)} repaint(s) before the trigger, washing ${wash.toFixed(2)} — treat every number below as suspect`
          : `  control clean  ${String(repaints)} repaint(s) washing ${wash.toFixed(2)}, under ${String(THRESHOLDS.controlWash)}`;

const run = async (args) => {
    const name = parseName(args.name);
    if (typeof args.url !== "string") throw new UsageError("--url is required");

    const viewport = parseViewport(args.viewport ?? "1440x900");
    const region = typeof args.region === "string" ? parseRect({ value: args.region, viewport }) : null;
    const settle = parseDuration({ value: args.settle, fallback: 700, flag: "settle" });
    const capture = parseDuration({ value: args.capture, fallback: 1200, flag: "capture" });
    const cols = parseCols(args.cols ?? 5);

    const runDir = path.join(OUTPUT_ROOT, name);
    await rm(runDir, { recursive: true, force: true });

    const browser = await chromium.launch();
    let payload;

    try {
        const page = await browser.newPage({ viewport });
        const decoder = await browser.newPage();

        /*
         * The decoder is a string, so nothing type-checks it and `addScriptTag` RESOLVES on a
         * script that fails to parse — reported only as a pageerror. Without these two checks a
         * syntax error surfaced as "window.__addFrame is not a function" many lines later.
         */
        const decoderErrors = [];
        decoder.on("pageerror", (e) => decoderErrors.push(e.message));
        await decoder.addScriptTag({ content: DECODER_SOURCE });
        const decoderReady = await decoder.evaluate(
            () => typeof window.__addFrame === "function" && typeof window.__tile === "function",
        );
        if (!decoderReady) {
            throw new Error(
                `the decoder script failed to load: ${decoderErrors.join("; ") || "no pageerror reported"}`,
            );
        }

        const pageErrors = [];
        page.on("pageerror", (e) => pageErrors.push(e.message));

        /*
         * A 404 resolves like any other navigation, so the server's error document was measured
         * and reported as a normal run at exit 0 — evidence about a page nobody opened.
         */
        const response = await page.goto(args.url, { waitUntil: "load" });
        if (response && !response.ok()) {
            throw new UsageError(`--url returned HTTP ${String(response.status())}: ${args.url}`);
        }

        if (typeof args.setup === "string") {
            await page.evaluate(args.setup).catch((e) => {
                throw new UsageError(`--setup threw in the page: ${e.message}`);
            });
        }
        await page.waitForTimeout(settle);

        const client = await page.context().newCDPSession(page);
        const pending = [];
        let origin = 0;
        client.on("Page.screencastFrame", ({ data, sessionId, metadata }) => {
            if (origin === 0) origin = metadata.timestamp;
            pending.push({ t: Math.round((metadata.timestamp - origin) * 1000), data });
            void client.send("Page.screencastFrameAck", { sessionId });
        });
        await client.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });

        await page.waitForTimeout(CONTROL_WINDOW_MS);
        const controlCount = pending.length;

        if (typeof args.trigger === "string") {
            await page.evaluate(args.trigger).catch((e) => {
                throw new UsageError(`--trigger threw in the page: ${e.message}`);
            });
        }
        await page.waitForTimeout(capture);
        await client.send("Page.stopScreencast");

        const control = [];
        const series = [];
        for (const [i, frame] of pending.entries()) {
            const measured = await decoder.evaluate(
                ([b64, t, r, threshold]) => window.__addFrame({ b64, t, region: r, threshold }),
                [frame.data, frame.t, region, CHANNEL_THRESHOLD],
            );
            if (i < controlCount) control.push(measured);
            else series.push(measured);
        }

        const triggerT = series[0]?.t ?? 0;
        for (const s of series) s.t -= triggerT;

        const sheetScale = Math.min(1, 2000 / (cols * viewport.width));
        const sheetB64 =
            series.length > 0
                ? await decoder.evaluate(
                      ([c, r, s, f, t, ow, ml]) =>
                          window.__tile({
                              cols: c,
                              region: r,
                              scale: s,
                              from: f,
                              t0: t,
                              outsideLimit: ow,
                              movedLimit: ml,
                          }),
                      [cols, region, sheetScale, controlCount, triggerT, THRESHOLDS.outsideWash, THRESHOLDS.moved],
                  )
                : null;

        payload = { control: summariseControl(control), series, sheetB64, pageErrors };
    } finally {
        await browser.close();
    }

    await mkdir(runDir, { recursive: true });
    const sheetPath = path.join(runDir, "strip.png");
    if (payload.sheetB64) await writeFile(sheetPath, Buffer.from(payload.sheetB64, "base64"));
    await writeFile(
        path.join(runDir, "series.json"),
        JSON.stringify(
            { url: args.url, region, control: payload.control, series: payload.series, pageErrors: payload.pageErrors },
            null,
            2,
        ) + "\n",
    );

    return { ...payload, sheetPath, region, name };
};

const report = ({ control, series, sheetB64, sheetPath, pageErrors, region }) => {
    if (series.length === 0) {
        console.log("filmstrip: 0 frames after --trigger — nothing repainted, so there is no motion to review.");
        console.log("  The interaction did not run, or it ran and produced no visual change.");
        console.log(describeControl(control));
        if (pageErrors.length > 0) console.log(`  page errors    ${String(pageErrors.length)}: ${pageErrors[0]}`);
        return 1;
    }

    /*
     * Each metric gets its OWN peak frame; one frame's pair understates the other by construction
     * and printed `wash 0.00` over a real 7.00 — docs/adr/tech/0037 §2.
     */
    const peakOf = (pick) => series.reduce((a, b) => (pick(b) > pick(a) ? b : a), series[0]);
    const peakMoved = peakOf((f) => f.viewport.moved);
    const peakWash = peakOf((f) => f.viewport.wash);
    const moving = series.filter(
        (s) => s.viewport.moved > THRESHOLDS.moved || s.viewport.wash > THRESHOLDS.outsideWash,
    );
    const span = moving.length > 1 ? moving.at(-1).t - moving[0].t : 0;

    console.log(`filmstrip: ${String(series.length)} frames over ${String(span)}ms of movement`);
    console.log(
        `  viewport       moved ${peakMoved.viewport.moved.toFixed(2)}% @ +${String(peakMoved.t)}ms   wash ${peakWash.viewport.wash.toFixed(2)} @ +${String(peakWash.t)}ms`,
    );

    if (region) {
        const inMoved = peakOf((f) => f.inside.moved);
        const inWash = peakOf((f) => f.inside.wash);
        const outPeak = peakOf((f) => f.outside.wash);
        console.log(
            `  inside region  moved ${inMoved.inside.moved.toFixed(2)}%  wash ${inWash.inside.wash.toFixed(2)}`,
        );
        console.log(
            !outPeak.outside.measured
                ? "  outside        not measurable — --region covers the whole viewport, so nothing lies outside it"
                : outPeak.outside.wash > THRESHOLDS.outsideWash
                  ? `  OUTSIDE MOVED  wash ${outPeak.outside.wash.toFixed(2)} @ +${String(outPeak.t)}ms — something is animating that nothing asked to`
                  : `  outside still  wash ${outPeak.outside.wash.toFixed(2)} — nothing moved that should not have`,
        );
    }

    console.log(describeControl(control));
    if (pageErrors.length > 0) console.log(`  page errors    ${String(pageErrors.length)}: ${pageErrors[0]}`);
    console.log(sheetB64 ? `  sheet          ${sheetPath}` : "  sheet          (none — no frames to tile)");
    return 0;
};

const main = async () => {
    const args = parseArgs(process.argv.slice(2));

    if (args.clean === true) {
        await rm(OUTPUT_ROOT, { recursive: true, force: true });
        console.log("filmstrip: removed .motion");
        return 0;
    }

    let result;
    try {
        result = await run(args);
    } finally {
        /*
         * In `finally`, so a crashed run still pays its retention debt. Pruning only on the happy
         * path let husks from failed runs occupy slots and evict real sheets.
         */
        const pruned = await pruneOldRuns(typeof args.name === "string" ? args.name : null);
        if (pruned.length > 0) console.log(`  pruned         ${pruned.join(", ")}`);
    }

    return report(result);
};

main()
    .then((code) => {
        process.exitCode = code;
    })
    .catch((error) => {
        if (error instanceof UsageError) {
            console.error(`filmstrip: ${error.message}`);
            console.error(USAGE);
        } else {
            console.error(`filmstrip: ${error.message}`);
        }
        process.exitCode = 2;
    });
