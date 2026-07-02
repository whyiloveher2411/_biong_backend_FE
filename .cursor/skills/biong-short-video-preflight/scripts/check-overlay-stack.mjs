#!/usr/bin/env node
/**
 * Preflight: caption karaoke + Spacedev watermark + z-index overlay stack.
 *
 * Usage: node check-overlay-stack.mjs <project-dir>
 * Exit 0 = pass, 1 = fail (errors on stderr).
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-overlay-stack.mjs <project-dir>");
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

function extractZIndex(html, classHint) {
  const re = new RegExp(
    `class="[^"]*${classHint}[^"]*"[^>]*style="[^"]*z-index\\s*:\\s*(\\d+)`,
    "i",
  );
  const m = html.match(re);
  if (m) return parseInt(m[1], 10);

  const re2 = new RegExp(
    `class="[^"]*${classHint}[^"]*"[^>]*>[\\s\\S]{0,200}?z-index\\s*:\\s*(\\d+)`,
    "i",
  );
  const m2 = html.match(re2);
  if (m2) return parseInt(m2[1], 10);

  const blockRe = new RegExp(
    `(class="[^"]*${classHint}[^"]*"[^>]*style="[^"]*")`,
    "i",
  );
  if (blockRe.test(html)) {
    const slice = html.match(
      new RegExp(`class="[^"]*${classHint}[^"]*"[^>]*`, "i"),
    )?.[0];
    if (slice && !/z-index/i.test(slice)) return null;
  }
  return null;
}

function hasTransparentBackground(html) {
  return (
    /background\s*:\s*transparent/i.test(html) ||
    /background\s*:\s*none/i.test(html)
  );
}

function hasOpaqueBodyBackground(html) {
  const bodyBg = html.match(/body\s*\{[^}]*background\s*:\s*([^;}\s!]+)/i);
  if (!bodyBg) return false;
  const val = bodyBg[1].toLowerCase();
  if (val === "transparent" || val === "none") return false;
  return true;
}

function collectZIndexValues(html) {
  const values = new Set();
  const re = /z-index\s*:\s*(\d+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    values.add(parseInt(m[1], 10));
  }
  return [...values];
}

function countDepthBands(zValues) {
  const bands = [
    [0, 10],
    [80, 150],
    [200, 450],
    [450, 800],
  ];
  let hit = 0;
  for (const [lo, hi] of bands) {
    if (zValues.some((z) => z >= lo && z <= hi)) hit++;
  }
  return hit;
}

// --- Required files ---
const requiredFiles = [
  "index.html",
  "assets/audio-script.txt",
  "assets/caption-words.json",
  "compositions/captions.html",
  "compositions/brand-watermark.html",
  "assets/images/spacedev-logo.png",
];

for (const f of requiredFiles) {
  if (!exists(f)) {
    errors.push(`Thiếu file bắt buộc: ${f}`);
  }
}

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}

const indexHtml = read("index.html");
const captionsHtml = read("compositions/captions.html");
const watermarkHtml = read("compositions/brand-watermark.html");

// --- Caption host in index.html ---
const hasCaptionHost =
  /data-composition-src\s*=\s*["'][^"']*captions\.html["']/i.test(indexHtml) ||
  /hf-overlay-caption/i.test(indexHtml);

if (!hasCaptionHost) {
  errors.push(
    "index.html: thiếu clip host caption (data-composition-src=\"compositions/captions.html\" hoặc class hf-overlay-caption)",
  );
}

const hasWatermarkHost =
  /data-composition-src\s*=\s*["'][^"']*brand-watermark\.html["']/i.test(
    indexHtml,
  ) || /hf-overlay-brand/i.test(indexHtml);

if (!hasWatermarkHost) {
  errors.push(
    "index.html: thiếu clip host watermark (data-composition-src=\"compositions/brand-watermark.html\" hoặc class hf-overlay-brand)",
  );
}

// --- z-index on hosts ---
const captionZ = extractZIndex(indexHtml, "hf-overlay-caption");
if (captionZ === null) {
  const alt = indexHtml.match(
    /captions\.html["'][^>]*style="[^"]*z-index\s*:\s*(\d+)/i,
  );
  if (alt) {
    if (parseInt(alt[1], 10) < 9000) {
      errors.push(
        `Caption host z-index=${alt[1]} — bắt buộc ≥9000 (track-index KHÔNG thay z-index)`,
      );
    }
  } else {
    errors.push(
      "index.html: caption host thiếu style z-index:9000 (hoặc class hf-overlay-caption với z-index inline)",
    );
  }
} else if (captionZ < 9000) {
  errors.push(`Caption host z-index=${captionZ} — bắt buộc ≥9000`);
}

const watermarkZ = extractZIndex(indexHtml, "hf-overlay-brand");
if (watermarkZ === null) {
  const alt = indexHtml.match(
    /brand-watermark\.html["'][^>]*style="[^"]*z-index\s*:\s*(\d+)/i,
  );
  if (alt) {
    if (parseInt(alt[1], 10) < 9500) {
      errors.push(
        `Watermark host z-index=${alt[1]} — bắt buộc ≥9500`,
      );
    }
  } else {
    errors.push(
      "index.html: watermark host thiếu style z-index:9500 (hoặc class hf-overlay-brand)",
    );
  }
} else if (watermarkZ < 9500) {
  errors.push(`Watermark host z-index=${watermarkZ} — bắt buộc ≥9500`);
}

// --- Full duration clips ---
if (hasCaptionHost && !/data-duration\s*=\s*["'][^"']+["']/i.test(indexHtml)) {
  warnings.push("index.html: kiểm tra data-duration trên caption host");
}

if (hasWatermarkHost) {
  const wmBlock = indexHtml.match(
    /brand-watermark\.html["'][^>]*data-duration\s*=\s*["']([^"']+)["']/i,
  );
  if (!wmBlock) {
    errors.push(
      "Watermark host thiếu data-duration — phải = totalVideoSec (suốt video)",
    );
  }
}

// --- Beat progress bar (global overlay z8990, between content and caption) ---
const hasBeatProgress =
  /beat-progress-host/i.test(indexHtml) || /beat-progress-fill/i.test(indexHtml);
const progressZ = extractZIndex(indexHtml, "beat-progress-host");
if (!hasBeatProgress) {
  errors.push(
    "index.html: thiếu beat-progress-host — thanh progress global z8990 (đọc beat-progress-bar.md)",
  );
} else if (progressZ !== null && progressZ !== 8990) {
  errors.push(
    `beat-progress-host z-index=${progressZ} — bắt buộc 8990`,
  );
}

if (hasBeatProgress) {
  const trackOpaque = indexHtml.match(
    /beat-progress-track[^>]*style="[^"]*background\s*:\s*(?!transparent)[^";]+/i,
  );
  if (trackOpaque && !/background\s*:\s*transparent/i.test(trackOpaque[0])) {
    errors.push(
      "beat-progress-track phải background:transparent — chỉ hiện fill đã chạy (beat-progress-bar.md)",
    );
  }
  const hostHeight = indexHtml.match(/beat-progress-host[^>]*height\s*:\s*(\d+)px/i);
  if (hostHeight && parseInt(hostHeight[1], 10) > 6) {
    warnings.push(
      `beat-progress-host height=${hostHeight[1]}px — khuyến nghị 4px`,
    );
  }
}

const beatMoveCount = (indexHtml.match(/class="[^"]*sfx-beat-move/gi) ?? []).length;
if (beatMoveCount < 1) {
  errors.push(
    "index.html: thiếu sfx_beat_move clips — chạy wire-beat-transition-sfx.mjs (beat-transition-sfx.md)",
  );
}

// --- DOM order: watermark after caption ---
const captionIdx = indexHtml.search(/captions\.html|hf-overlay-caption/i);
const watermarkIdx = indexHtml.search(/brand-watermark\.html|hf-overlay-brand/i);
const progressIdx = indexHtml.search(/beat-progress-host/i);
if (hasBeatProgress && captionIdx >= 0 && progressIdx >= 0 && progressIdx > captionIdx) {
  errors.push(
    "DOM order: beat-progress-host phải đứng TRƯỚC caption host trong index.html",
  );
}
if (captionIdx >= 0 && watermarkIdx >= 0 && watermarkIdx < captionIdx) {
  errors.push(
    "DOM order: watermark host phải đứng SAU caption host trong index.html",
  );
}

// --- Beat z-index vs caption ---
const allZ = collectZIndexValues(indexHtml);
const overlayZ = new Set([8990]); // beat-progress global overlay
const contentZ = allZ.filter((z) => z < 9000 && !overlayZ.has(z));
const tooHigh = contentZ.filter((z) => z > 850);
if (tooHigh.length) {
  errors.push(
    `Content z-index > 850 (${tooHigh.join(", ")}) — max ~800 trước caption 9000`,
  );
}

const depthBands = countDepthBands(contentZ);
if (depthBands < 2) {
  errors.push(
    `Z-depth phẳng: chỉ ${depthBands} band trong stack 0–10 / 80–150 / 200–450 / 450–800 — cần ≥2 (đọc overlay-layer-stack.md)`,
  );
}

const hasAmbientHost =
  /ambient-layer\.html/i.test(indexHtml) || /hf-ambient-layer/i.test(indexHtml);
if (!hasAmbientHost) {
  errors.push(
    "index.html: thiếu ambient layer host (compositions/ambient-layer.html hoặc class hf-ambient-layer)",
  );
}

const beatHighZ = indexHtml.matchAll(
  /class="[^"]*scene[^"]*"[^>]*style="[^"]*z-index\s*:\s*(\d+)/gi,
);
for (const m of beatHighZ) {
  const z = parseInt(m[1], 10);
  if (z > 850) {
    errors.push(`Beat scene z-index=${z} > 850 — sẽ conflict caption stack`);
  }
}

// --- Sub-composition backgrounds ---
if (hasOpaqueBodyBackground(captionsHtml)) {
  errors.push(
    "compositions/captions.html: body có nền opaque — phải background: transparent",
  );
} else if (!hasTransparentBackground(captionsHtml)) {
  warnings.push(
    "compositions/captions.html: nên khai báo background: transparent trên html/body",
  );
}

if (hasOpaqueBodyBackground(watermarkHtml)) {
  errors.push(
    "compositions/brand-watermark.html: body có nền opaque — phải background: transparent",
  );
} else if (!hasTransparentBackground(watermarkHtml)) {
  warnings.push(
    "compositions/brand-watermark.html: nên khai báo background: transparent",
  );
}

// --- Logo path in watermark ---
if (!/spacedev-logo\.png/i.test(watermarkHtml)) {
  errors.push(
    "brand-watermark.html: thiếu tham chiếu spacedev-logo.png",
  );
}

// --- Watermark position: brand-wrap top-left, NOT #root ---
if (!/class\s*=\s*["'][^"']*brand-wrap/i.test(watermarkHtml)) {
  errors.push(
    "brand-watermark.html: thiếu .brand-wrap — logo phải nằm trong child .brand-wrap, không style #root",
  );
}

const rootBlock = watermarkHtml.match(/#root\s*\{[^}]+\}/i)?.[0] ?? "";
if (/right\s*:|bottom\s*:|left\s*:|top\s*:/i.test(rootBlock)) {
  errors.push(
    "brand-watermark.html: CẤM đặt left/top/right/bottom trên #root — HyperFrames coi #root là full canvas; dùng .brand-wrap { left:28px; top:28px }",
  );
}

const brandWrapBlock =
  watermarkHtml.match(/\.brand-wrap\s*\{[^}]+\}/i)?.[0] ?? "";
if (!/left\s*:\s*2[0-9]px/i.test(brandWrapBlock)) {
  errors.push(
    "brand-watermark.html: .brand-wrap thiếu left:28px (góc trên trái)",
  );
}
if (!/top\s*:\s*2[0-9]px/i.test(brandWrapBlock)) {
  errors.push(
    "brand-watermark.html: .brand-wrap thiếu top:28px (góc trên trái)",
  );
}

if (!/#root\s*\{[^}]*width\s*:\s*1080px/i.test(watermarkHtml)) {
  warnings.push(
    "brand-watermark.html: #root nên width:1080px; height:1920px (full canvas)",
  );
}

// --- Caption registry / timeline ---
if (
  !/window\.__timelines/i.test(captionsHtml) &&
  !/caption-pill-karaoke|caption-kinetic/i.test(captionsHtml)
) {
  warnings.push(
    "captions.html: chưa thấy window.__timelines hoặc registry caption block — kiểm tra wire GSAP",
  );
}

// --- Be Vietnam Pro font ---
const htmlBundle = indexHtml + captionsHtml + watermarkHtml;
if (/fonts\.googleapis\.com/i.test(htmlBundle)) {
  errors.push("Cấm fonts.googleapis.com — dùng Be Vietnam Pro local @font-face");
}
if (!/Be Vietnam Pro/i.test(htmlBundle)) {
  warnings.push(
    "Chưa thấy font-family Be Vietnam Pro — đọc typography-be-vietnam-pro.md",
  );
}
if (!exists("assets/fonts/BeVietnamPro-Regular.ttf")) {
  warnings.push(
    "Thiếu assets/fonts/BeVietnamPro-Regular.ttf — copy từ skill assets/fonts/",
  );
}

// --- Report ---
warnings.forEach((w) => console.warn(`⚠ ${w}`));

if (errors.length) {
  console.error("\n=== PREFLIGHT FAIL — sửa trước khi render final ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error(
    "\nĐọc: .cursor/skills/biong-short-video-hyperframes/references/overlay-layer-stack.md",
  );
  process.exit(1);
}

console.log("✓ Preflight pass: caption + watermark + overlay stack OK");
process.exit(0);
