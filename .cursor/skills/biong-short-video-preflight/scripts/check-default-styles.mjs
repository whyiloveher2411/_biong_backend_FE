#!/usr/bin/env node
/**
 * Preflight: Be Vietnam Pro + transparent beat roots (hf-seek model).
 *
 * Usage: node check-default-styles.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-default-styles.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function collectCompositionHtml() {
  const beatFiles = [];
  const compDir = path.join(root, "compositions");
  if (!fs.existsSync(compDir)) return { beatFiles };

  for (const name of fs.readdirSync(compDir)) {
    if (!name.endsWith(".html")) continue;
    const content = read(path.join("compositions", name));
    if (/^beat_\d+\.html$/i.test(name)) {
      beatFiles.push({ name, content });
    }
  }
  return { beatFiles };
}

if (!exists("index.html")) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const indexHtml = read("index.html");
const { beatFiles } = collectCompositionHtml();

const hasBeVietnam =
  /Be Vietnam Pro/i.test(indexHtml) ||
  beatFiles.some((b) => /Be Vietnam Pro/i.test(b.content)) ||
  exists("assets/fonts/BeVietnamPro-Bold.woff2") ||
  exists("assets/fonts/BeVietnamPro-Regular.woff2");

if (!hasBeVietnam) {
  errors.push(
    "thiếu Be Vietnam Pro — copy assets/fonts/ + @font-face trong beat hoặc index.html",
  );
}

for (const { name, content } of beatFiles) {
  if (/hook-title-plate|plate-rust|\.border-3d/i.test(content)) {
    errors.push(`${name}: cấm legacy hook-title/border-3d — dùng visual_style + visual_description`);
  }
  if (/gsap\.timeline/i.test(content)) {
    errors.push(`${name}: cấm gsap.timeline beat — dùng hf-seek render()`);
  }
  const transparent =
    /background\s*:\s*transparent\s*!important/i.test(content) ||
    /#root[^}]*background\s*:\s*transparent/i.test(content);
  if (!transparent && /#root[^}]*background\s*:\s*#[0-9a-f]{3,8}/i.test(content)) {
    errors.push(`${name}: #root opaque — background: transparent !important`);
  }
}

if (!beatFiles.length) {
  errors.push("thiếu compositions/beat_*.html");
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== DEFAULT STYLES FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: typography-be-vietnam-pro.md + hf-prompt-beat-contract.md");
  process.exit(1);
}

console.log("check-default-styles: OK");
process.exit(0);
