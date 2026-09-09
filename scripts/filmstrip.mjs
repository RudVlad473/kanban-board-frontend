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

const parseRect = (value) => {
    const [x, y, w, h] = String(value).split(",").map(Number);
    if ([x, y, w, h].some((n) => !Number.isFinite(n))) throw new Error(`--region wants x,y,w,h — got "${value}"`);
    return { x, y, w, h };
};

const USAGE = `
node scripts/filmstrip.mjs --url <url> --name <slug> [options]

  --url       page to open (required)
  --name      run slug; its directory is replaced on re-run (required)
  --trigger   JS evaluated in the page to start the interaction
  --setup     JS evaluated before capture begins, to reach the starting state
  --region    x,y,w,h — the area you EXPECT to change; reports inside vs outside it separately.
              The sheet is never cropped to it — seeing what was not under test is the point.
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
const DECODER_SOURCE = `
window.__strip = { frames: [], baseline: null };

window.__addFrame = async ({ b64, t, region }) => {
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
        if (!before) return { moved: 0, wash: 0 };
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
            if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) > ${CHANNEL_THRESHOLD}) n += 1;
            sum += Math.abs(dr * 0.2126 + dg * 0.7152 + db * 0.0722);
            counted += 1;
        }
        return counted === 0 ? { moved: 0, wash: 0 } : { moved: (100 * n) / counted, wash: sum / counted };
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

window.__tile = async ({ cols, region, scale, from, t0 }) => {
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
        cx.fillStyle = f.outside && f.outside.wash > 0.3 ? "#ff6b6b" : f.viewport.moved > 0.5 ? "#ffd166" : "#7a7a7a";
        const tag = f.outside === null ? "" : \`  out \${f.outside.wash.toFixed(2)}\`;
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

const main = async () => {
    const args = parseArgs(process.argv.slice(2));

    if (args.clean === true) {
        await rm(OUTPUT_ROOT, { recursive: true, force: true });
        console.log("filmstrip: removed .motion");
        return;
    }
    if (typeof args.url !== "string" || typeof args.name !== "string") {
        console.error(USAGE);
        process.exitCode = 2;
        return;
    }

    const region = typeof args.region === "string" ? parseRect(args.region) : null;
    const [width, height] = String(args.viewport ?? "1440x900")
        .split("x")
        .map(Number);
    const settle = Number(args.settle ?? 700);
    const capture = Number(args.capture ?? 1200);
    const cols = Number(args.cols ?? 5);

    const runDir = path.join(OUTPUT_ROOT, args.name);
    await rm(runDir, { recursive: true, force: true });
    await mkdir(runDir, { recursive: true });

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height } });
    const decoder = await browser.newPage();
    await decoder.addScriptTag({ content: DECODER_SOURCE });

    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(args.url, { waitUntil: "load" });
    if (typeof args.setup === "string") await page.evaluate(args.setup);
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

    // Pre-trigger window: the negative control. A settled page must read flat here.
    await page.waitForTimeout(250);
    const controlCount = pending.length;

    if (typeof args.trigger === "string") await page.evaluate(args.trigger);
    await page.waitForTimeout(capture);
    await client.send("Page.stopScreencast");

    const control = [];
    const series = [];
    for (const [i, frame] of pending.entries()) {
        const measured = await decoder.evaluate(
            ([b64, t, r]) => window.__addFrame({ b64, t, region: r }),
            [frame.data, frame.t, region],
        );
        if (i < controlCount) control.push(measured);
        else series.push(measured);
    }

    const triggerT = series[0]?.t ?? 0;
    for (const s of series) s.t -= triggerT;

    const sheetScale = Math.min(1, 2000 / (cols * width));
    const sheetB64 = await decoder.evaluate(
        ([c, r, s, f, t]) => window.__tile({ cols: c, region: r, scale: s, from: f, t0: t }),
        [cols, region, sheetScale, controlCount, triggerT],
    );

    await browser.close();

    const controlNoise = control.length > 1 ? Math.max(...control.slice(1).map((c) => c.viewport.wash)) : 0;
    const peak = series.reduce((a, b) => (b.viewport.moved > a.viewport.moved ? b : a), series[0]);
    const moving = series.filter((s) => s.viewport.moved > 0.5 || s.viewport.wash > 0.3);
    const span = moving.length > 1 ? moving.at(-1).t - moving[0].t : 0;
    const outsidePeak = region ? series.reduce((a, b) => (b.outside.wash > a.outside.wash ? b : a), series[0]) : null;

    const sheetPath = path.join(runDir, "strip.png");
    if (sheetB64) await writeFile(sheetPath, Buffer.from(sheetB64, "base64"));
    await writeFile(
        path.join(runDir, "series.json"),
        JSON.stringify({ url: args.url, region, controlNoise, span, series, pageErrors }, null, 2) + "\n",
    );

    const pruned = await pruneOldRuns(args.name);

    console.log(`filmstrip: ${String(series.length)} frames over ${String(span)}ms of movement`);
    console.log(
        `  viewport       moved ${peak.viewport.moved.toFixed(2)}%  wash ${peak.viewport.wash.toFixed(2)} @ +${String(peak.t)}ms`,
    );
    if (outsidePeak) {
        const inPeak = series.reduce((a, b) => (b.inside.moved > a.inside.moved ? b : a), series[0]);
        console.log(`  inside region  moved ${inPeak.inside.moved.toFixed(2)}%  wash ${inPeak.inside.wash.toFixed(2)}`);
        console.log(
            outsidePeak.outside.wash > 0.3
                ? `  OUTSIDE MOVED  wash ${outsidePeak.outside.wash.toFixed(2)} @ +${String(outsidePeak.t)}ms — something is animating that nothing asked to`
                : `  outside still  wash ${outsidePeak.outside.wash.toFixed(2)} — nothing moved that should not have`,
        );
    }
    console.log(
        controlNoise > 0.3
            ? `  CONTROL DIRTY  settled page already washing ${controlNoise.toFixed(2)} — treat every number above as suspect`
            : `  control clean  settled page flat at ${controlNoise.toFixed(2)}`,
    );
    if (pageErrors.length > 0) console.log(`  page errors    ${String(pageErrors.length)}: ${pageErrors[0]}`);
    if (pruned.length > 0) console.log(`  pruned         ${pruned.join(", ")}`);
    console.log(`  sheet          ${sheetPath}`);
};

await main();
