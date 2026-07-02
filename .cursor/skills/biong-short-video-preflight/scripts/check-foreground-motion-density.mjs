#!/usr/bin/env node
/**
 * Preflight: foreground continuous motion — no dead zones >1s on content elements.
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

/** Foreground element class patterns (whitelist) */
const FG_ELEMENT_PATTERNS = [
  /class="[^"]*hook-title/i,
  /class="[^"]*beat-progress/i,
  /class="[^"]*hero/i,
  /class="[^"]*kw\b/i,
  /class="[^"]*ui-card/i,
  /class="[^"]*premium-card/i,
  /class="[^"]*support-card/i,
  /class="[^"]*source-badge/i,
  /class="[^"]*context-chip/i,
  /class="[^"]*deco-icon/i,
  /class="[^"]*particle/i,
  /class="[^"]*glow-ring/i,
  /class="[^"]*company-chip/i,
  /class="[^"]*quote-box/i,
  /class="[^"]*mockup/i,
  /class="[^"]*stat-val/i,
  /class="[^"]*badge/i,
  /class="[^"]*vs-card/i,
  /class="[^"]*flow-node/i,
  /class="[^"]*bento/i,
  /class="[^"]*word\b/i,
  /class="[^"]*accent-line/i,
  /data-registry-block/i,
];

const MIN_ELEMENTS = 5;

function countDistinctElements(html) {
  const classes = new Set();
  const classRe = /class="([^"]+)"/g;
  let m;
  while ((m = classRe.exec(html)) !== null) {
    for (const c of m[1].split(/\s+/)) {
      if (
        /hook-title|hero|kw|ui-card|premium-card|support|source-badge|context-chip|deco-icon|particle|glow-ring|company-chip|quote-box|mockup|stat-val|badge|vs-card|flow-node|card-title|accent-line/i.test(
          c,
        )
      ) {
        classes.add(c);
      }
    }
  }
  return classes.size;
}

function hasForegroundLoop(content) {
  // Must have repeat: -1 or yoyo:true with repeat on foreground selectors
  const hasRepeat = /repeat\s*:\s*-1/i.test(content);
  const hasYoyoLoop =
    /yoyo\s*:\s*true/i.test(content) && /repeat\s*:\s*[1-9]\d*/i.test(content);
  if (!hasRepeat && !hasYoyoLoop) return false;

  // Exclude pure bg-layer only loops — need foreground selectors
  const fgSelectors = [
    ".hook-title-plate",
    ".hook-title-box",
    ".hook-title-frame",
    ".hero",
    ".kw",
    ".ui-card",
    ".premium-card",
    ".deco-icon",
    ".particle",
    ".glow-ring",
    ".company-chip",
    ".quote-box",
    ".mockup",
    ".stat-val",
    ".badge",
    ".vs-card",
    ".flow-node",
    ".word",
    ".accent-line",
    ".support",
    ".card",
    ".counter",
  ];
  const tweenBlocks = content.match(/tl\.(fromTo|to|from)\([^)]+\)/gs) ?? [];
  for (const block of tweenBlocks) {
    if (/bg-layer|grain-layer|stock-bg|ambient/i.test(block) && !fgSelectors.some((s) => block.includes(s))) {
      continue;
    }
    if ((/repeat\s*:\s*-1/i.test(block) || (/yoyo\s*:\s*true/i.test(block) && /repeat/i.test(block))) &&
        fgSelectors.some((s) => block.includes(s))) {
      return true;
    }
  }
  // Fallback: any repeat:-1 not only on bg-layer
  if (hasRepeat) {
    const nonBgRepeat = tweenBlocks.some(
      (b) =>
        /repeat\s*:\s*-1/i.test(b) &&
        !/^tl\.(fromTo|to|from)\(\s*["']\.(bg-layer|grain-layer|stock-bg)/i.test(b),
    );
    if (nonBgRepeat) return true;
  }
  return hasRepeat || hasYoyoLoop;
}

function countTweens(content) {
  return (content.match(/tl\.(from|fromTo|to)\(/g) ?? []).length;
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
    errors.push(`${name}: còn header-badge hoặc #N/9 — dùng beat-progress-bar trong index.html`);
  }
  if (/<span class="section-label"|class="section-label">/i.test(content)) {
    warnings.push(`${name}: còn section-label trong HTML — khuyến nghị bỏ (dùng progress bar)`);
  }
  const elementCount = countDistinctElements(content);
  if (elementCount < MIN_ELEMENTS) {
    errors.push(
      `${name}: insufficient_elements — cần ≥${MIN_ELEMENTS} distinct element classes, thấy ${elementCount}`,
    );
  }
  if (!hasForegroundLoop(content)) {
    errors.push(
      `${name}: no_foreground_loop — cần ≥1 GSAP loop (repeat:-1 hoặc yoyo) trên foreground element`,
    );
  }
  const tweens = countTweens(content);
  if (tweens < 5) {
    warnings.push(`${name}: chỉ ${tweens} tweens — khuyến nghị ≥5 cho dense motion`);
  }
  const hasStagger = /stagger\s*:/i.test(content);
  if (!hasStagger) {
    errors.push(`${name}: thiếu stagger — cần stagger group cho dense beats`);
  }
}

if (exists("index.html")) {
  const indexHtml = read("index.html");
  if (!/beat-progress-host/i.test(indexHtml) || !/beat-progress-fill/i.test(indexHtml)) {
    errors.push("index.html: thiếu beat-progress-host / beat-progress-fill");
  }
}

// Shot-plan continuous_motion_layers check
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
  const minEl = shot.minimum_elements ?? 0;
  if (minEl > 0 && minEl < MIN_ELEMENTS) {
    errors.push(`${id}: minimum_elements=${minEl} — cần ≥${MIN_ELEMENTS}`);
  }
  const deco = shot.decorative_elements ?? [];
  const support = shot.supporting_graphics ?? [];
  const enrich = shot.visual_enrichment ?? [];
  if (deco.length === 0 && support.length === 0 && enrich.length < 2) {
    warnings.push(
      `${id}: thiếu decorative_elements/supporting_graphics — khuyến nghị ≥2 enrichment`,
    );
  }
  if (!shot.continuous_motion_layers?.length) {
    warnings.push(`${id}: thiếu continuous_motion_layers trong shot-plan`);
  }
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== FOREGROUND MOTION DENSITY FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error(
    "\nĐọc: foreground-continuous-motion.md + visual-layout-archetypes.md",
  );
  process.exit(1);
}

console.log("check-foreground-motion-density: OK");
process.exit(0);
