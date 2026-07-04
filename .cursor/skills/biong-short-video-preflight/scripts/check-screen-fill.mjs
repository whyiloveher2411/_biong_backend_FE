#!/usr/bin/env node
/**
 * Preflight: screen fill — #stage / hero elements (hf-seek beats).
 *
 * Usage: node check-screen-fill.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-screen-fill.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

const MIN_STAGE_ELEMENTS = 2;

const ELEMENT_PATTERNS = [
  /id="stage"/i,
  /class="[^"]*\bhero/i,
  /class="[^"]*\bbeat\b/i,
  /class="[^"]*\bline/i,
  /class="[^"]*\bmask/i,
  /class="[^"]*\bstat/i,
  /class="[^"]*\bcredit/i,
  /<canvas/i,
  /<svg/i,
];

function listBeatFiles() {
  const dir = path.join(root, "compositions");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^beat_\d+\.html$/i.test(f))
    .map((name) => ({
      name,
      content: fs.readFileSync(path.join(dir, name), "utf8"),
    }));
}

function countVisualElements(content) {
  return ELEMENT_PATTERNS.filter((re) => re.test(content)).length;
}

const beatFiles = listBeatFiles();
if (!beatFiles.length) {
  errors.push("thiếu compositions/beat_*.html");
} else {
  for (const { name, content } of beatFiles) {
    if (!/id="stage"|class="stage"/i.test(content) && !/1080px/i.test(content)) {
      warnings.push(`${name}: khuyến nghị #stage 1080×1920 layout`);
    }

    const elementCount = countVisualElements(content);
    if (elementCount < MIN_STAGE_ELEMENTS) {
      errors.push(
        `${name}: ít hơn ${MIN_STAGE_ELEMENTS} visual element patterns — screen fill thấp`,
      );
    }

    if (!/function\s+render\s*\(/i.test(content)) {
      errors.push(`${name}: thiếu render() — hf-seek beat contract`);
    }
  }
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== SCREEN FILL FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: hf-prompt-beat-contract.md");
  process.exit(1);
}

console.log(`check-screen-fill: OK (${beatFiles.length} beats)`);
process.exit(0);
