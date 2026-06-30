#!/usr/bin/env node
/**
 * Preflight: registry visual density — shot-plan, no scaffold/text-only beats.
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
  "code-typing",
  "code-3d-extrude",
  "code-shader-dissolve",
];

const CAPTION_ONLY = /^caption-/;

/** Placeholder scaffold — cấm ship render */
const PLACEHOLDER_PATTERNS = [
  />\s*Beat\s+\d+\s*</i,
  /ui-card[^>]*>\s*Beat\s+\d+/i,
  /class="[^"]*debug-beat/i,
];

/** Fingerprint gen-beats scaffold cũ — see isGenBeatsScaffold() */
function isGenBeatsScaffold(content) {
  return (
    /\.glow-orb/.test(content) &&
    /\.hero-row/.test(content) &&
    /\.kw\b/.test(content) &&
    !/data-registry-block/i.test(content) &&
    !/<canvas/i.test(content) &&
    !/lottie|dotlottie|three\.js|THREE\./i.test(content)
  );
}

function isTextOnlyBeat(content) {
  const hasRegistry =
    /data-registry-block/i.test(content) ||
    REGISTRY_BLOCK_NAMES.some(
      (b) =>
        content.includes(b) ||
        content.includes(`compositions/${b}`) ||
        content.includes(`data-composition-src="compositions/${b}`),
    );
  const hasRichVisual =
    hasRegistry ||
    /<canvas/i.test(content) ||
    /lottie|dotlottie/i.test(content) ||
    /three\.js|THREE\./i.test(content) ||
    /\.(stat-card|chart-card|flow-card|bento|ui-card|flow-node|bar-fill)/i.test(content) ||
    /data-composition-src/i.test(content);

  const textOnlyKinetic =
    (/\.hero-row|\.kw\b|class="kw"/i.test(content) || /class="[^"]*hero-row/i.test(content)) &&
    !hasRichVisual;

  return textOnlyKinetic;
}

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
if (exists("compositions")) {
  for (const name of fs.readdirSync(path.join(root, "compositions"))) {
    if (name.endsWith(".html")) {
      installedCompositions.push(name.replace(/\.html$/, ""));
    }
  }
}

const nonCaptionRegistry = REGISTRY_BLOCK_NAMES.filter((b) => !CAPTION_ONLY.test(b));
const installedNonCaption = nonCaptionRegistry.filter(
  (b) =>
    bundle.includes(b) ||
    installedCompositions.includes(b) ||
    fs.existsSync(path.join(root, "compositions", `${b}.html`)),
);

if (installedNonCaption.length < 2) {
  errors.push(
    `thiếu ≥2 registry block khác tên (không chỉ caption-*) — cần ${installedNonCaption.length}, chạy npx hyperframes add theo visual_shot_plan`,
  );
}

for (const { name, content } of beatFiles) {
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(content)) {
      errors.push(
        `${name}: placeholder scaffold (Beat N) — viết beat HTML thủ công theo visual_shot_plan`,
      );
      break;
    }
  }
  if (isGenBeatsScaffold(content)) {
    errors.push(
      `${name}: gen-beats scaffold cũ — viết lại beat HTML từ registry/GSAP/Lottie (gen-beats đã gỡ)`,
    );
  }
  if (isTextOnlyBeat(content)) {
    errors.push(
      `${name}: text-only beat — cần registry/chart/flow/lottie/canvas, không chỉ kinetic words`,
    );
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
  const hasStagger = /stagger\s*:/i.test(content);
  if (!hasStagger) {
    errors.push(`${name}: GSAP thiếu stagger group — đọc gsap-beat-checklist.md`);
  }
  if (!/content-cluster/i.test(content)) {
    errors.push(
      `${name}: thiếu .content-cluster — hero+support phải gom cụm căn giữa dọc (layout-9x16-zones.md)`,
    );
  }
  if (
    /flex:\s*0\s+0\s+5[0-9]%|min-height:\s*4[0-9]{2}px/i.test(content) &&
    !/content-cluster/i.test(content)
  ) {
    errors.push(
      `${name}: layout zone-split (52%/min-height) — dùng .content-cluster justify-content:center`,
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
      snap?.visual_shot_plan ??
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
    "thiếu visual_shot_plan — sinh Phase 2 sau transcribe; lưu assets/visual-shot-plan.json",
  );
} else {
  for (let i = 0; i < shotPlan.length; i++) {
    const shot = shotPlan[i];
    const id = shot.beat_id ?? `beat_${i + 1}`;
    if (!String(shot.phrase_anchor ?? shot.phrase_text ?? "").trim()) {
      errors.push(`${id}: thiếu phrase_anchor`);
    }
    if (!String(shot.layout_archetype ?? "").trim()) {
      errors.push(`${id}: thiếu layout_archetype — đọc visual-layout-archetypes.md`);
    }
    if (!String(shot.visual_story ?? "").trim()) {
      errors.push(`${id}: thiếu visual_story`);
    }
    const stack = shot.render_stack ?? [];
    if (!Array.isArray(stack) || stack.length < 2) {
      errors.push(`${id}: render_stack cần ≥2 entry (registry/gsap/lottie/threejs/shader)`);
    }
  }

  const archetypes = shotPlan.map((s) => s.layout_archetype).filter(Boolean);
  const uniqueArchetypes = new Set(archetypes);
  let totalVideoSec = 60;
  if (exists("assets/beat-map.json")) {
    try {
      const bm = JSON.parse(read("assets/beat-map.json"));
      if (bm.totalVideoSec > 0) totalVideoSec = bm.totalVideoSec;
    } catch {
      /* skip */
    }
  }
  if (totalVideoSec >= 60 && uniqueArchetypes.size < 3 && shotPlan.length >= 4) {
    errors.push(
      `visual_shot_plan: cần ≥3 layout_archetype unique (video ≥60s) — hiện ${uniqueArchetypes.size}`,
    );
  }
  for (let i = 2; i < archetypes.length; i++) {
    if (
      archetypes[i] === archetypes[i - 1] &&
      archetypes[i] === archetypes[i - 2]
    ) {
      errors.push(
        `visual_shot_plan: >2 beat liên tiếp cùng layout_archetype "${archetypes[i]}"`,
      );
      break;
    }
  }

  const stockHeavy = shotPlan.filter((s) => s.hero_mode === "stock_accent").length;
  const ratio = stockHeavy / shotPlan.length;
  if (ratio > 0.5) {
    warnings.push(
      `visual_shot_plan: ${(ratio * 100).toFixed(0)}% stock_accent — cân nhắc thêm registry/kinetic`,
    );
  }

  if (exists("assets/beat-map.json")) {
    try {
      const bm = JSON.parse(read("assets/beat-map.json"));
      const sections = bm.sections ?? [];
      for (let i = 0; i < Math.min(sections.length, shotPlan.length); i++) {
        const dur = sections[i].durationSec ?? 0;
        const shot = shotPlan[i];
        if (dur > 12 && !shot.internal_acts && !shot.multi_clip) {
          warnings.push(
            `${shot.beat_id ?? sections[i].id}: beat ${dur.toFixed(1)}s >12s — thêm internal_acts hoặc tách beat`,
          );
        }
      }
    } catch {
      /* skip */
    }
  }
}

if (exists("media-plan.md")) {
  const plan = read("media-plan.md");
  if (!/hero_type|registry_block|z_role|layout_archetype/i.test(plan)) {
    errors.push(
      "media-plan.md: thiếu cột hero_type/registry_block/z_role/layout_archetype",
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
    "\nĐọc: visual-shot-plan.md + visual-layout-archetypes.md + motion-complexity-activation.md",
  );
  process.exit(1);
}

console.log("check-visual-density: OK");
process.exit(0);
