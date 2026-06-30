#!/usr/bin/env node
/**
 * Preflight: stock <video> trong index.html phải full-bleed 1080×1920 (object-fit: cover).
 *
 * Usage: node check-stock-full-bleed.mjs <project-dir>
 */
import fs from "fs";
import path from "path";

const projectDir = path.resolve(process.argv[2] || "");
if (!projectDir) {
  console.error("usage: node check-stock-full-bleed.mjs <project-dir>");
  process.exit(1);
}

const indexPath = path.join(projectDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
const errors = [];

const stockVideos = html.match(/<video\b[^>]*class="[^"]*stock-bg[^"]*"[^>]*>/gi) ?? [];
if (stockVideos.length === 0) {
  errors.push("index.html: không có <video class=\"stock-bg\"> — stock nền chưa wire");
}

const hasCssRule =
  /\.stock-bg\s*\{[^}]*object-fit\s*:\s*cover/i.test(html) &&
  (/\.stock-bg[^}]*width\s*:\s*(100%|1080px)/i.test(html) ||
    /\.stock-bg[^}]*height\s*:\s*(100%|1920px)/i.test(html));

if (stockVideos.length && !hasCssRule) {
  errors.push(
    "index.html: thiếu CSS .stock-bg { width+height 100% hoặc 1080×1920; object-fit: cover }",
  );
}

for (const tag of stockVideos) {
  const inline = tag.match(/\bstyle\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  const hasCover = /object-fit\s*:\s*cover/i.test(inline) || hasCssRule;
  const hasSize =
    /width\s*:\s*(100%|1080px)/i.test(inline) &&
    /height\s*:\s*(100%|1920px)/i.test(inline);
  if (!hasCover) {
    errors.push("stock-bg video: thiếu object-fit: cover");
  }
  if (!hasSize && !hasCssRule) {
    errors.push("stock-bg video: thiếu width/height full canvas — video landscape sẽ chỉ phủ nửa trên");
  }
  if (!/\bsrc\s*=/i.test(tag)) {
    errors.push("stock-bg video: thiếu src");
  }
}

if (errors.length) {
  console.error("\n=== STOCK FULL-BLEED FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error(
    "\nFix: node .cursor/skills/biong-short-video-preflight/scripts/patch-stock-full-bleed.mjs <project-dir>",
  );
  process.exit(1);
}

console.log(`check-stock-full-bleed: OK (${stockVideos.length} stock clips)`);
process.exit(0);
