#!/usr/bin/env node
/**
 * Preflight: typography scale + spacing on beat compositions.
 *
 * Usage: node check-typography-spacing.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-typography-spacing.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

const MIN_BODY_PX = 28;
const MIN_GAP_PX = 20;
const CARD_CLASS_RE = /\.(flow-node|insight-card|chip|ui-card)\b/g;

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

function isExemptFontContext(content, matchIndex) {
  const before = content.slice(Math.max(0, matchIndex - 120), matchIndex);
  return (
    /\.brand-watermark|\.caption-|watermark|©\s*Spacedev/i.test(before) ||
    /font-size:\s*\d+px[^}]*brand/i.test(before)
  );
}

function checkFontSizes(name, content) {
  const re = /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const px = parseFloat(m[1]);
    if (px < MIN_BODY_PX && !isExemptFontContext(content, m.index)) {
      errors.push(
        `${name}: font-size ${px}px < ${MIN_BODY_PX}px — support/UI text phải ≥28px (layout-9x16-zones.md)`,
      );
    }
  }
}

function checkHorizontalCrowding(name, content) {
  const fourInRow =
    /<div[^>]*class="[^"]*flow-row[^"]*"[^>]*>[\s\S]*?(<div[^>]*class="[^"]*flow-node[^"]*"[^>]*>[\s\S]*?){4,}/i.test(
      content,
    ) ||
    ((content.match(/class="[^"]*flow-node[^"]*"/gi) ?? []).length >= 4 &&
      /flex-direction\s*:\s*row/i.test(content));

  if (fourInRow) {
    errors.push(
      `${name}: ≥4 flow-node ngang — dùng bento 2×2 hoặc vertical cascade (visual-layout-archetypes.md)`,
    );
  }
}

function checkGap(name, content) {
  if (!/\.(ui-card|insight-card|flow-node|chip|bento-grid)/i.test(content)) return;

  const gapMatches = [...content.matchAll(/gap\s*:\s*(\d+(?:\.\d+)?)px/gi)];
  const hasMultiCard =
    (content.match(CARD_CLASS_RE) ?? []).length >= 2 ||
    (content.match(/class="[^"]*card[^"]*"/gi) ?? []).length >= 2;

  if (!hasMultiCard) return;

  if (gapMatches.length === 0) {
    warnings.push(`${name}: nhiều card nhưng thiếu gap — khuyến nghị gap ≥24px`);
    return;
  }

  for (const m of gapMatches) {
    const gap = parseFloat(m[1]);
    if (gap < MIN_GAP_PX) {
      errors.push(`${name}: gap ${gap}px < ${MIN_GAP_PX}px — cards quá sát nhau`);
    }
  }
}

function checkGlassOrUiCard(name, content) {
  const hasSupport =
    /\.support-block|\.bento-grid|\.flow-card|\.insight-grid|class="[^"]*ui-card/i.test(content);
  if (!hasSupport) return;

  const hasGlass =
    /backdrop-filter\s*:\s*blur/i.test(content) ||
    /class="[^"]*ui-card/i.test(content) ||
    (/border-radius\s*:\s*(1[6-9]|[2-9]\d)px/i.test(content) &&
      /box-shadow\s*:/i.test(content));

  if (!hasGlass) {
    errors.push(
      `${name}: support block thiếu glass/ui-card — cần .ui-card hoặc backdrop-filter + border-radius ≥16px (canvas-contract-3-layer.md)`,
    );
  }
}

function checkScreenSplit(name, content) {
  const clusterRow =
    /\.content-cluster[^}]*flex-direction\s*:\s*row/i.test(content) ||
    /class="[^"]*content-cluster[^"]*"[^>]*style="[^"]*flex-direction\s*:\s*row/i.test(content);

  const heroSupportRow =
    /hero-block[\s\S]{0,400}support-block/i.test(content) &&
    (/\.content-cluster\s*\{[^}]*flex-direction\s*:\s*row/i.test(content) ||
      /\.scene-root\s*\{[^}]*flex-direction\s*:\s*row/i.test(content));

  const halfWidthColumns =
    /\.hero-block[^}]*(?:width|flex)\s*:\s*(?:4[0-9]|5[0-5])%/i.test(content) &&
    /\.support-block[^}]*(?:width|flex)\s*:\s*(?:4[0-9]|5[0-5])%/i.test(content);

  if (clusterRow || heroSupportRow || halfWidthColumns) {
    errors.push(
      `${name}: screen split trái/phải (headline | cards) — dùng stack_center: headline căn giữa trên, vs_row cards bên dưới (layout-9x16-zones.md)`,
    );
  }
}

function checkContentCluster(name, content) {
  if (!/content-cluster/i.test(content)) {
    errors.push(`${name}: thiếu .content-cluster — layout-9x16-zones.md`);
  }
}

const beatFiles = listBeatFiles();
if (!beatFiles.length) {
  errors.push("không tìm thấy compositions/beat_*.html");
}

for (const { name, content } of beatFiles) {
  checkFontSizes(name, content);
  checkHorizontalCrowding(name, content);
  checkGap(name, content);
  checkGlassOrUiCard(name, content);
  checkScreenSplit(name, content);
  checkContentCluster(name, content);
}

if (warnings.length) {
  for (const w of warnings) console.warn(`WARN: ${w}`);
}

if (errors.length) {
  for (const e of errors) console.error(`FAIL: ${e}`);
  process.exit(1);
}

console.log(`check-typography-spacing: pass (${beatFiles.length} beat files)`);
process.exit(0);
