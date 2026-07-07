#!/usr/bin/env node
/**
 * Hoist stock <video> từ beat HTML lên index.html (HyperFrames media_in_subcomposition).
 *
 * Usage: node wire-beat-stock-videos.mjs <project-dir>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  beatIdFromFilename,
  extractBeatVideoSlots,
  wireBeatStockVideosToIndex,
} from "./lib/import-html-beat-render.mjs";

const projectDir = path.resolve(process.argv[2] || "");
if (!projectDir) {
  console.error("usage: node wire-beat-stock-videos.mjs <project-dir>");
  process.exit(1);
}

function readManifest(projectDir) {
  const manifestPath = path.join(projectDir, "assets/beat-stock-videos.json");
  if (!fs.existsSync(manifestPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return [];
  }
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

function collectSlots(projectDir) {
  const compDir = path.join(projectDir, "compositions");
  const slots = [];
  const manifest = readManifest(projectDir);
  const manifestByBeat = new Map(manifest.map((m) => [m.beatId, m]));

  for (const name of fs.readdirSync(compDir).sort()) {
    const beatId = beatIdFromFilename(name);
    if (!beatId) continue;
    const html = fs.readFileSync(path.join(compDir, name), "utf8");
    const fromTags = extractBeatVideoSlots(html, beatId);
    if (fromTags.length > 0) {
      slots.push(...fromTags);
      continue;
    }

    if (!/hf-beat-video-replaced|hf-beat-bg/i.test(html)) continue;
    const saved = manifestByBeat.get(beatId);
    if (saved?.src) {
      slots.push({
        beatId,
        src: saved.src,
        className: "bg-video",
        opacity: saved.opacity ?? 0.15,
        muted: true,
        loop: true,
      });
    }
  }

  return slots;
}

const slots = collectSlots(projectDir);
if (slots.length === 0) {
  console.log("[wire-beat-stock-videos] không có stock video — bỏ qua");
  process.exit(0);
}

const result = wireBeatStockVideosToIndex(projectDir, slots);
console.log(
  `[wire-beat-stock-videos] wired ${result.wired} clip(s), skipped ${result.skipped}`,
);
