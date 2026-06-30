#!/usr/bin/env node
/**
 * Preflight: cấm gradient_only — stock video phải phủ timeline.
 *
 * Usage: node check-dynamic-background.mjs <project-dir>
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-dynamic-background.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

let totalVideoSec = 60;
if (exists("assets/beat-map.json")) {
  try {
    const bm = JSON.parse(read("assets/beat-map.json"));
    if (bm.totalVideoSec > 0) totalVideoSec = bm.totalVideoSec;
  } catch {
    /* skip */
  }
}

if (exists("assets/visual-shot-plan.json")) {
  try {
    const raw = JSON.parse(read("assets/visual-shot-plan.json"));
    const plan = Array.isArray(raw) ? raw : raw.visual_shot_plan ?? [];
    for (const shot of plan) {
      const id = shot.beat_id ?? shot.id ?? "?";
      const bgType = shot.bg_media?.type ?? "";
      if (/gradient_only/i.test(bgType)) {
        errors.push(
          `${id}: bg_media gradient_only bị cấm — dùng stock_video (dynamic-bg-mandatory.md)`,
        );
      }
      if (bgType && !/stock_video|stock_image/i.test(bgType)) {
        errors.push(
          `${id}: bg_media.type="${bgType}" không hợp lệ — chỉ stock_video | stock_image`,
        );
      }
    }
  } catch {
    errors.push("assets/visual-shot-plan.json parse error");
  }
}

if (!exists("index.html")) {
  errors.push("missing index.html");
} else {
  const html = read("index.html");
  const stockBlocks =
    html.match(/<video\b[\s\S]*?class="[^"]*stock-bg[^"]*"[\s\S]*?\/?>/gi) ?? [];
  const stockTags = stockBlocks.length
    ? stockBlocks
    : html.match(/<video\b[^>]*class="[^"]*stock-bg[^"]*"[^>]*>/gi) ?? [];

  if (stockTags.length === 0) {
    errors.push(
      "index.html: không có stock-bg video — cấm nền tĩnh gradient-only",
    );
  }

  const intervals = [];
  for (const tag of stockTags) {
    const start = parseFloat(
      tag.match(/data-start\s*=\s*["']([^"']+)["']/i)?.[1] ?? "0",
    );
    const dur = parseFloat(
      tag.match(/data-duration\s*=\s*["']([^"']+)["']/i)?.[1] ?? "0",
    );
    if (dur > 0) intervals.push([start, start + dur]);
  }

  if (intervals.length > 0) {
    intervals.sort((a, b) => a[0] - b[0]);
    let covered = 0;
    let cursor = 0;
    for (const [s, e] of intervals) {
      if (s > cursor + 2) {
        errors.push(
          `stock-bg gap ${cursor.toFixed(1)}s–${s.toFixed(1)}s — cần video phủ liên tục`,
        );
        break;
      }
      cursor = Math.max(cursor, e);
    }
    if (cursor + 2 < totalVideoSec) {
      errors.push(
        `stock-bg chỉ phủ đến ${cursor.toFixed(1)}s / ${totalVideoSec}s — thêm clip`,
      );
    }
  }

  const onlyMesh =
    /\.mesh-gradient|linear-gradient\s*\(/i.test(html) &&
    stockTags.length === 0;
  if (onlyMesh) {
    errors.push("index.html: chỉ mesh/gradient CSS — bắt buộc stock-bg <video>");
  }
}

if (errors.length) {
  console.error("\n=== DYNAMIC BACKGROUND FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: dynamic-bg-mandatory.md + media-mcp-activation.md");
  process.exit(1);
}

console.log("check-dynamic-background: OK");
process.exit(0);
