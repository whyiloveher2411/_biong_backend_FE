#!/usr/bin/env node
/**
 * Vá lỗi hyperframes lint --strict trước render import_html.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildAmbientLayerHtml } from "../../../../scripts/lib/build-ambient-layer.mjs";
import {
  beatIdFromFilename,
  extractBeatVideoSlots,
  injectBeatStockVideoTransparency,
  patchBeatFontsForRender,
  patchBeatCssForRender,
  patchBeatDeterminismForRender,
  patchBeatDynamicImageSrcForRender,
  patchBeatVideosForRender,
  wireBeatStockVideosToIndex,
} from "./lib/import-html-beat-render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readTotalVideoSec(projectDir) {
  const beatMapPath = path.join(projectDir, "assets/beat-map.json");
  if (fs.existsSync(beatMapPath)) {
    try {
      const beatMap = JSON.parse(fs.readFileSync(beatMapPath, "utf8"));
      const total = Number(beatMap.totalVideoSec || 0);
      if (total > 0) return total;
    } catch {
      /* ignore */
    }
  }

  const indexPath = path.join(projectDir, "index.html");
  if (fs.existsSync(indexPath)) {
    const match = fs.readFileSync(indexPath, "utf8").match(/data-duration="([0-9.]+)"/);
    if (match) {
      const total = Number(match[1]);
      if (total > 0) return total;
    }
  }

  return 0;
}

function recoverSlotsFromContextSnapshot(projectDir) {
  const ctxPath = path.join(projectDir, "assets/get-context-snapshot.json");
  if (!fs.existsSync(ctxPath)) return [];
  try {
    const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
    const beatHtmlMap = ctx?.import_html?.beat_html;
    if (!beatHtmlMap || typeof beatHtmlMap !== "object") return [];
    const slots = [];
    for (const [beatId, entry] of Object.entries(beatHtmlMap)) {
      const html = String(entry?.html || "");
      if (!html) continue;
      slots.push(...extractBeatVideoSlots(html, beatId));
    }
    return slots;
  } catch {
    return [];
  }
}

function localizeStockSlotSrc(projectDir, src) {
  const mapPath = path.join(projectDir, "assets/image-url-map.json");
  if (!fs.existsSync(mapPath)) return src;
  try {
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    return map[src] || src;
  } catch {
    return src;
  }
}

function main() {
  const projectDir = path.resolve(process.argv[2] || "");
  if (!projectDir) {
    console.error("usage: node patch-import-html-render-lint.mjs <project-dir>");
    process.exit(1);
  }

  const totalVideoSec = readTotalVideoSec(projectDir);
  if (!(totalVideoSec > 0)) {
    console.error("Không đọc được totalVideoSec");
    process.exit(1);
  }

  const ambientPath = path.join(projectDir, "compositions/ambient-layer.html");
  fs.writeFileSync(ambientPath, buildAmbientLayerHtml(totalVideoSec));
  console.log(`[patch-render-lint] ambient-layer.html (${totalVideoSec}s)`);

  const compDir = path.join(projectDir, "compositions");
  let stockSlots = [];
  for (const name of fs.readdirSync(compDir)) {
    const beatId = beatIdFromFilename(name);
    if (!beatId) continue;
    const html = fs.readFileSync(path.join(compDir, name), "utf8");
    stockSlots.push(...extractBeatVideoSlots(html, beatId));
  }
  if (stockSlots.length === 0) {
    stockSlots = recoverSlotsFromContextSnapshot(projectDir);
    if (stockSlots.length > 0) {
      console.log(`[patch-render-lint] recovered ${stockSlots.length} stock video slot(s) from snapshot`);
    }
  }

  if (stockSlots.length > 0) {
    stockSlots = stockSlots.map((slot) => ({
      ...slot,
      src: localizeStockSlotSrc(projectDir, slot.src),
    }));
    const wireResult = wireBeatStockVideosToIndex(projectDir, stockSlots);
    console.log(
      `[patch-render-lint] wired ${wireResult.wired} stock video clip(s) to index.html`,
    );
  }

  let fontPatched = 0;
  let videoPatched = 0;
  let transparencyPatched = 0;
  let cssPatched = 0;
  let determinismPatched = 0;
  let imageSrcPatched = 0;
  for (const name of fs.readdirSync(compDir)) {
    if (!beatIdFromFilename(name)) continue;
    const file = path.join(compDir, name);
    const html = fs.readFileSync(file, "utf8");
    let next = html;
    const applied = [];

    const fontResult = patchBeatFontsForRender(next);
    if (fontResult.changed) {
      next = fontResult.html;
      applied.push(...fontResult.patches);
      fontPatched += 1;
    }

    const cssResult = patchBeatCssForRender(next);
    if (cssResult.changed) {
      next = cssResult.html;
      applied.push(...cssResult.patches);
      cssPatched += 1;
    }

    const determinismResult = patchBeatDeterminismForRender(next);
    if (determinismResult.changed) {
      next = determinismResult.html;
      applied.push(...determinismResult.patches);
      determinismPatched += 1;
    }

    const imageSrcResult = patchBeatDynamicImageSrcForRender(next);
    if (imageSrcResult.changed) {
      next = imageSrcResult.html;
      applied.push(...imageSrcResult.patches);
      imageSrcPatched += 1;
    }

    const videoResult = patchBeatVideosForRender(next, projectDir);
    if (videoResult.changed) {
      next = videoResult.html;
      applied.push(...videoResult.patches);
      videoPatched += 1;
    } else if (/hf-beat-video-replaced|hf-beat-bg/i.test(next)) {
      const transparent = injectBeatStockVideoTransparency(next);
      if (transparent !== next) {
        next = transparent;
        applied.push("transparent stage for stock video");
        transparencyPatched += 1;
      }
    }

    if (next !== html) {
      fs.writeFileSync(file, next, "utf8");
      console.log(`[patch-render-lint] ${name}: ${applied.join(", ")}`);
    }
  }

  console.log(
    `[patch-render-lint] OK — fonts ${fontPatched} beat(s), css ${cssPatched} beat(s), determinism ${determinismPatched} beat(s), image-src ${imageSrcPatched} beat(s), video ${videoPatched} beat(s), transparency ${transparencyPatched} beat(s)`,
  );
}

main();
