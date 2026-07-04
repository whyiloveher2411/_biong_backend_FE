#!/usr/bin/env node
/**
 * Preflight: t-based foreground motion density (hf-seek beats).
 *
 * Usage: node check-foreground-motion-density.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-foreground-motion-density.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const MIN_ELEMENTS = 3;

function countTimingElements(content) {
  const idMatches = content.match(/\bid="[^"]+"/gi) ?? [];
  const unique = new Set(
    idMatches.map((m) => m.replace(/id="/i, "").replace(/"$/, "")),
  );
  unique.delete("root");
  unique.delete("stage");
  return unique.size;
}

function hasTBasedMotion(content) {
  return (
    /function\s+render\s*\(/i.test(content) &&
    (/show_at_local_sec|TIMINGS|maskReveal|wordStagger|easeOut/i.test(content) ||
      /\.style\.(opacity|transform|clipPath)/i.test(content))
  );
}

if (!exists("compositions")) {
  console.error("FAIL: missing compositions/");
  process.exit(1);
}

const beatFiles = fs
  .readdirSync(path.join(root, "compositions"))
  .filter((n) => /^beat_\d+\.html$/i.test(n))
  .sort();

if (!beatFiles.length) {
  errors.push("không có compositions/beat_N.html");
}

for (const name of beatFiles) {
  const content = read(path.join("compositions", name));
  if (/<span class="header-badge"|class="header-badge">#\d/i.test(content)) {
    errors.push(`${name}: còn header-badge — dùng beat-progress-bar trong index.html`);
  }
  const elementCount = countTimingElements(content);
  if (elementCount < MIN_ELEMENTS) {
    errors.push(
      `${name}: cần ≥${MIN_ELEMENTS} distinct element ids keyed in render(), thấy ${elementCount}`,
    );
  }
  if (!hasTBasedMotion(content)) {
    errors.push(
      `${name}: thiếu t-based motion — render() phải drive opacity/transform/clip theo t`,
    );
  }
  if (/tl\.(from|fromTo|to)\(/i.test(content)) {
    errors.push(`${name}: cấm GSAP tl.* — dùng hf-seek render()`);
  }
}

if (exists("index.html")) {
  const indexHtml = read("index.html");
  if (!/beat-progress-host/i.test(indexHtml) || !/beat-progress-fill/i.test(indexHtml)) {
    errors.push("index.html: thiếu beat-progress-host / beat-progress-fill");
  }
}

let shotPlan = [];
if (exists("assets/visual-shot-plan.json")) {
  try {
    const raw = JSON.parse(read("assets/visual-shot-plan.json"));
    shotPlan = Array.isArray(raw) ? raw : raw.visual_shot_plan ?? [];
  } catch {
    warnings.push("assets/visual-shot-plan.json parse error");
  }
}

for (const shot of shotPlan) {
  const id = shot.beat_id ?? "beat";
  const enrich = shot.visual_enrichment ?? [];
  if (enrich.length < 1) {
    warnings.push(`${id}: khuyến nghị ≥1 visual_enrichment`);
  }
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== FOREGROUND MOTION DENSITY FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: hf-prompt-beat-contract.md + hf-prompt-art-direction.md");
  process.exit(1);
}

console.log("check-foreground-motion-density: OK");
process.exit(0);
