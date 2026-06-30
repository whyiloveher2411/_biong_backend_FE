#!/usr/bin/env node
/**
 * Preflight: registry visual density — shot-plan, no scaffold placeholders.
 *
 * Usage: node check-visual-density.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-visual-density.mjs <project-dir>");
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

const REGISTRY_BLOCK_NAMES = [
  "data-chart",
  "flowchart",
  "stat-motion",
  "apple-money-count",
  "kinetic-type",
  "apple-money-count",
  "logo-outro",
  "domain-warp-dissolve",
  "whip-pan",
  "sdf-iris",
  "ig",
  "tiktok",
  "yt",
  "caption-kinetic-slam",
  "grain-overlay",
  "shimmer-sweep",
];

const CAPTION_ONLY = /^caption-/;
const SCAFFOLD_EXCLUDE = new Set([
  "ambient-layer",
  "brand-watermark",
  "captions",
]);

/** Placeholder scaffold — cấm ship render */
const PLACEHOLDER_PATTERNS = [
  />\s*Beat\s+\d+\s*</i,
  /ui-card[^>]*>\s*Beat\s+\d+/i,
  /class="[^"]*debug-beat/i,
];

/** Beat sub-composition che stock — opaque full-bleed */
const OPAQUE_BEAT_BG =
  /#root[^}]*background\s*:\s*#(?:0[Bb]0[Ff]1[Aa]|151[Bb]2[Bb])|html,\s*body[^}]*background\s*:\s*#(?:0[Bb]0[Ff]1[Aa])/;

if (!exists("index.html")) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const indexHtml = read("index.html");
let compHtml = "";
const beatFiles = [];
if (exists("compositions")) {
  for (const name of fs.readdirSync(path.join(root, "compositions"))) {
    if (name.endsWith(".html")) {
      const content = read(path.join("compositions", name));
      compHtml += content;
      if (/^beat_\d+\.html$/i.test(name)) {
        beatFiles.push({ name, content });
      }
    }
  }
}
const bundle = indexHtml + compHtml;

const installedCompositions = [];
for (const name of fs.readdirSync(path.join(root, "compositions"))) {
  if (!name.endsWith(".html")) continue;
  installedCompositions.push(name.replace(/\.html$/, ""));
}

const hasRegistryBlock = REGISTRY_BLOCK_NAMES.some(
  (b) =>
    bundle.includes(b) ||
    installedCompositions.includes(b) ||
    fs.existsSync(path.join(root, "compositions", `${b}.html`)),
);

if (!hasRegistryBlock) {
  errors.push(
    "thiếu ≥1 registry block thật (data-chart, stat-motion, flowchart, caption-kinetic-slam…) — chạy npx hyperframes add theo visual_shot_plan",
  );
}

for (const { name, content } of beatFiles) {
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(content)) {
      errors.push(
        `${name}: placeholder scaffold (Beat N) — customize theo visual_shot_plan; chạy gen-beats-from-shot-plan.mjs`,
      );
      break;
    }
  }
  if (
    OPAQUE_BEAT_BG.test(content) &&
    !/background\s*:\s*transparent\s*!important/i.test(content)
  ) {
    errors.push(
      `${name}: nền opaque che stock — html/body/#root phải background: transparent !important`,
    );
  }
  const tweenCount = (content.match(/tl\.(from|fromTo|to)\(/g) ?? []).length;
  if (tweenCount < 3) {
    errors.push(
      `${name}: GSAP thiếu motion (cần ≥3 tween entrance/stagger) — đọc gsap-beat-checklist.md`,
    );
  }
}

let shotPlan = [];
if (exists("assets/visual-shot-plan.json")) {
  try {
    const raw = JSON.parse(read("assets/visual-shot-plan.json"));
    shotPlan = Array.isArray(raw) ? raw : raw.visual_shot_plan ?? [];
  } catch {
    errors.push("assets/visual-shot-plan.json parse error");
  }
}
if (exists("assets/agent-metadata.json")) {
  try {
    const meta = JSON.parse(read("assets/agent-metadata.json"));
    const fromMeta =
      meta.visual_shot_plan ?? meta.audio_script_metadata?.visual_shot_plan ?? [];
    if (Array.isArray(fromMeta) && fromMeta.length && !shotPlan.length) {
      shotPlan = fromMeta;
    }
  } catch {
    warnings.push("assets/agent-metadata.json parse error");
  }
}
if (exists("assets/get-context-snapshot.json")) {
  try {
    const snap = JSON.parse(read("assets/get-context-snapshot.json"));
    const fromCtx =
      snap?.audio_script_metadata?.visual_shot_plan ??
      snap?.agent_video_json?.audio_script_metadata?.visual_shot_plan;
    if (Array.isArray(fromCtx) && fromCtx.length && !shotPlan.length) {
      shotPlan = fromCtx;
    }
  } catch {
    /* skip */
  }
}

if (!Array.isArray(shotPlan) || shotPlan.length === 0) {
  errors.push(
    "thiếu visual_shot_plan — sinh phase 1 (visual-shot-plan.md) và lưu assets/visual-shot-plan.json hoặc save_audio_script metadata",
  );
} else {
  const stockHeavy = shotPlan.filter((s) => s.hero_mode === "stock_accent").length;
  const ratio = stockHeavy / shotPlan.length;
  if (ratio > 0.4) {
    errors.push(
      `visual_shot_plan: ${(ratio * 100).toFixed(0)}% stock_accent — max 40%`,
    );
  }
  const nonStock = shotPlan.filter((s) => s.hero_mode !== "stock_accent").length;
  if (nonStock / shotPlan.length < 0.6) {
    errors.push("visual_shot_plan: <60% beat hero_mode !== stock_accent");
  }
  const hasDiagramOrRegistry = shotPlan.some((s) =>
    ["registry_block", "diagram", "social_card", "kinetic_type"].includes(
      s.hero_mode,
    ),
  );
  if (!hasDiagramOrRegistry) {
    errors.push("visual_shot_plan: thiếu beat registry_block/diagram/kinetic_type");
  }
}

if (exists("media-plan.md")) {
  const plan = read("media-plan.md");
  if (!/hero_type|registry_block|z_role/i.test(plan)) {
    errors.push(
      "media-plan.md: thiếu cột hero_type/registry_block/z_role — đọc media-mcp-activation.md",
    );
  }
} else {
  errors.push("missing media-plan.md");
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== VISUAL DENSITY FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error(
    "\nĐọc: visual-shot-plan.md + motion-complexity-activation.md + gen-beats-from-shot-plan.mjs",
  );
  process.exit(1);
}

console.log("check-visual-density: OK");
process.exit(0);
