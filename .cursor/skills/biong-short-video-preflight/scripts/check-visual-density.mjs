#!/usr/bin/env node
/**
 * Preflight: visual density — shot-plan visual_description, t-based beats.
 *
 * Usage: node check-visual-density.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";
import { checkHfSeekBeatFile } from "./check-hf-seek-beat.mjs";

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

const PLACEHOLDER_PATTERNS = [
  />\s*Beat\s+\d+\s*</i,
  /class="[^"]*debug-beat/i,
];

const OPAQUE_BEAT_BG =
  /#root[^}]*background\s*:\s*#(?:0[Bb]0[Ff]1[Aa]|151[Bb]2[Bb])|html,\s*body[^}]*background\s*:\s*#(?:0[Bb]0[Ff]1[Aa])/;

if (!exists("index.html")) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const beatFiles = [];
if (exists("compositions")) {
  for (const name of fs.readdirSync(path.join(root, "compositions"))) {
    if (/^beat_\d+\.html$/i.test(name)) {
      beatFiles.push({ name, content: read(path.join("compositions", name)) });
    }
  }
}

const durationByBeat = new Map();
if (exists("assets/beat-map.json")) {
  try {
    const bm = JSON.parse(read("assets/beat-map.json"));
    for (const s of bm.sections ?? []) {
      const id = s.beat_id ?? s.id;
      if (id) durationByBeat.set(id, s.durationSec);
    }
  } catch {
    /* skip */
  }
}

for (const { name, content } of beatFiles) {
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(content)) {
      errors.push(`${name}: placeholder scaffold — viết beat theo visual_description`);
      break;
    }
  }
  if (
    OPAQUE_BEAT_BG.test(content) &&
    !/background\s*:\s*transparent\s*!important/i.test(content)
  ) {
    errors.push(`${name}: nền opaque che stock — transparent !important`);
  }
  const beatId = name.replace(/\.html$/i, "");
  errors.push(
    ...checkHfSeekBeatFile(name, content, durationByBeat.get(beatId) ?? null),
  );
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

if (!Array.isArray(shotPlan) || shotPlan.length === 0) {
  errors.push("thiếu visual_shot_plan — sinh Phase 2 sau transcribe");
} else {
  for (let i = 0; i < shotPlan.length; i++) {
    const shot = shotPlan[i];
    const id = shot.beat_id ?? `beat_${i + 1}`;
    if (!String(shot.phrase_anchor ?? shot.phrase_text ?? "").trim()) {
      errors.push(`${id}: thiếu phrase_anchor`);
    }
    const description = String(shot.visual_description ?? "").trim();
    if (
      !description ||
      /[À-ỹ]/.test(description) ||
      !/[A-Za-z]/.test(description)
    ) {
      errors.push(
        `${id}: visual_description phải là tiếng Anh và không được để trống — chạy assign-beat-prompt-types.mjs`,
      );
    }
    if (!String(shot.visual_story ?? "").trim()) {
      errors.push(`${id}: thiếu visual_story`);
    }
  }

  const descriptions = shotPlan.map((s) =>
    String(s.visual_description ?? "").trim().toLowerCase(),
  );
  for (let i = 1; i < descriptions.length; i++) {
    if (descriptions[i] && descriptions[i] === descriptions[i - 1]) {
      errors.push(
        "visual_shot_plan: 2 beat liên tiếp có visual_description giống nhau",
      );
      break;
    }
  }

  const anchors = shotPlan.map((s) =>
    String(s.phrase_anchor ?? s.phrase_text ?? "").trim().toLowerCase(),
  );
  const seenAnchors = new Set();
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    if (!anchor) continue;
    if (seenAnchors.has(anchor)) {
      const id = shotPlan[i].beat_id ?? `beat_${i + 1}`;
      errors.push(`${id}: phrase_anchor trùng beat khác`);
    }
    seenAnchors.add(anchor);
  }

  if (exists("assets/beat-map.json")) {
    try {
      const bm = JSON.parse(read("assets/beat-map.json"));
      const sections = bm.sections ?? [];
      for (let i = 0; i < Math.min(sections.length, shotPlan.length); i++) {
        const dur = sections[i].durationSec ?? 0;
        const shot = shotPlan[i];
        const isLastBeat = i === sections.length - 1;
        if (dur <= 0) {
          errors.push(
            `${shot.beat_id ?? sections[i].id}: beat duration phải > 0`,
          );
        } else if (dur < 5 && !(isLastBeat && dur > 0)) {
          warnings.push(
            `${shot.beat_id ?? sections[i].id}: beat ${dur.toFixed(1)}s <5s — khuyến nghị gộp khi chia beat (prompt AI)`,
          );
        } else if (dur > 20) {
          warnings.push(
            `${shot.beat_id ?? sections[i].id}: beat ${dur.toFixed(1)}s >20s — khuyến nghị tách khi chia beat (prompt AI); code giữ nguyên`,
          );
        }
      }
    } catch {
      /* skip */
    }
  }
}

const timingDir = path.join(root, "assets/beat-timing");
if (!fs.existsSync(timingDir)) {
  errors.push("thiếu assets/beat-timing/ — chạy build-beat-element-timing.mjs");
} else {
  for (const shot of shotPlan) {
    const id = shot.beat_id ?? "beat_1";
    if (!fs.existsSync(path.join(timingDir, `${id}.json`))) {
      errors.push(`${id}: thiếu assets/beat-timing/${id}.json`);
    }
  }
}

if (exists("media-plan.md")) {
  const plan = read("media-plan.md");
  if (!/visual_description|accent_media|bg_media/i.test(plan)) {
    errors.push("media-plan.md: thiếu visual_description / accent / bg");
  }
} else {
  errors.push("missing media-plan.md");
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== VISUAL DENSITY FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: hf-prompt-catalog.md + hf-prompt-beat-contract.md + visual-shot-plan.md");
  process.exit(1);
}

console.log("check-visual-density: OK");
process.exit(0);
