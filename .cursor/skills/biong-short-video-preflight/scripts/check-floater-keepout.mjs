#!/usr/bin/env node
/**
 * Preflight: floater stickers must not overlap text cluster (lane rules).
 *
 * Usage: node check-floater-keepout.mjs <project-dir>
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-floater-keepout.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const indexPath = path.join(root, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
const errors = [];

const CLUSTER_LEFT = 70;
const LEFT_GUTTER_MAX_W = 56;

const floaters =
  html.match(/<img\b[^>]*class="[^"]*floater-sticker[^"]*"[^>]*>/gi) ?? [];

if (floaters.length === 0) {
  console.log("check-floater-keepout: OK (no floaters)");
  process.exit(0);
}

for (const tag of floaters) {
  const id = tag.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] ?? "floater";
  const style = tag.match(/\bstyle\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  const hasLane =
    /floater-lane-right|floater-lane-top-right/i.test(tag) ||
    /data-floater-lane\s*=\s*["'](right|top-right)["']/i.test(tag);

  const leftPx = style.match(/\bleft:\s*(\d+(?:\.\d+)?)px/i)?.[1];
  const widthPx = style.match(/\bwidth:\s*(\d+(?:\.\d+)?)px/i)?.[1];
  const zIdx = style.match(/\bz-index:\s*(\d+)/i)?.[1];

  if (!hasLane) {
    errors.push(
      `${id}: thiếu floater-lane-right / floater-lane-top-right hoặc data-floater-lane — đọc floater-text-keepout.md`,
    );
  }

  if (leftPx !== undefined) {
    const left = parseFloat(leftPx);
    const w = widthPx ? parseFloat(widthPx) : 140;
    if (left < CLUSTER_LEFT && w > LEFT_GUTTER_MAX_W) {
      errors.push(
        `${id}: left:${left}px + width:${w}px đè content-cluster (text) — chuyển sang floater-lane-right`,
      );
    }
    if (left + w > 1080 - 16 && !/right:\s*\d+/i.test(style)) {
      errors.push(`${id}: floater tràn mép phải canvas`);
    }
  }

  if (zIdx && parseInt(zIdx, 10) > 200) {
    errors.push(
      `${id}: z-index ${zIdx} > 200 — floater phải z 80–150, dưới beat host (240+)`,
    );
  }
}

if (errors.length) {
  console.error("\n=== FLOATER KEEP-OUT FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: floater-text-keepout.md + giphy-accent-format.md");
  process.exit(1);
}

console.log(`check-floater-keepout: OK (${floaters.length} floaters)`);
process.exit(0);
