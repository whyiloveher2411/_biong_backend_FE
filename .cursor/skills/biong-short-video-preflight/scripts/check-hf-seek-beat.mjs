#!/usr/bin/env node
/**
 * Preflight: validate t-based hf-seek beat sub-compositions.
 *
 * Usage: node check-hf-seek-beat.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isImportHtmlProject } from "./lib/import-html-beat-render.mjs";

export function checkHfSeekBeatFile(name, content, expectedDuration = null) {
  const errors = [];

  if (!/^beat_\d+\.html$/i.test(name)) {
    return errors;
  }

  if (!/addEventListener\s*\(\s*['"]hf-seek['"]/i.test(content)) {
    errors.push(`${name}: thiếu addEventListener('hf-seek') — đọc hf-prompt-beat-contract.md`);
  }
  if (!/function\s+render\s*\(/i.test(content)) {
    errors.push(`${name}: thiếu function render() — motion phải pure function of t`);
  }
  if (/gsap\.timeline/i.test(content)) {
    errors.push(`${name}: cấm gsap.timeline — dùng t-based render()`);
  }
  if (/data-registry-block/i.test(content)) {
    errors.push(`${name}: cấm data-registry-block — dựng visual theo visual_description`);
  }
  if (/hook-title-plate|plate-rust|\.border-3d/i.test(content)) {
    errors.push(`${name}: cấm legacy hook-title/border-3d — dùng hyperframes prompt`);
  }

  const hasTransparent =
    /background\s*:\s*transparent\s*!important/i.test(content) ||
    /#root[^}]*background\s*:\s*transparent/i.test(content);
  if (
    !hasTransparent &&
    /#root[^}]*background\s*:\s*#[0-9a-f]{3,8}/i.test(content)
  ) {
    errors.push(`${name}: #root opaque che stock — background: transparent !important`);
  }

  const durMatch = content.match(
    /data-duration\s*=\s*["']([0-9.]+)["']/i,
  );
  if (durMatch && expectedDuration != null) {
    const declared = Number(durMatch[1]);
    const diff = Math.abs(declared - expectedDuration);
    if (diff > 0.15) {
      errors.push(
        `${name}: data-duration=${declared}s khác beat-map ${expectedDuration}s (±0.15)`,
      );
    }
  }

  if (!/TIMINGS|show_at_local_sec|beat-timing/i.test(content)) {
    errors.push(
      `${name}: thiếu TIMINGS / beat-timing reference — embed assets/beat-timing/${name.replace(".html", "")}.json`,
    );
  }

  return errors;
}

function main() {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error("usage: node check-hf-seek-beat.mjs <project-dir>");
    process.exit(1);
  }

  const root = path.resolve(projectDir);
  if (isImportHtmlProject(root)) {
    console.log(
      "check-hf-seek-beat: skip (import_html — dùng check-import-html-beat-render.mjs)",
    );
    process.exit(0);
  }

  const errors = [];
  const compDir = path.join(root, "compositions");

  const durationByBeat = new Map();
  const beatMapPath = path.join(root, "assets/beat-map.json");
  if (fs.existsSync(beatMapPath)) {
    try {
      const bm = JSON.parse(fs.readFileSync(beatMapPath, "utf8"));
      for (const s of bm.sections ?? []) {
        const id = s.beat_id ?? s.id;
        if (id) durationByBeat.set(id, s.durationSec);
      }
    } catch {
      /* skip */
    }
  }

  const shotPlanPath = path.join(root, "assets/visual-shot-plan.json");
  if (fs.existsSync(shotPlanPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(shotPlanPath, "utf8"));
      const plan = Array.isArray(raw) ? raw : raw.visual_shot_plan ?? [];
      for (const shot of plan) {
        const id = shot.beat_id;
        const description = String(shot.visual_description ?? "").trim();
        if (id && (!description || /[À-ỹ]/.test(description) || !/[A-Za-z]/.test(description))) {
          errors.push(
            `${id}: visual_description phải là tiếng Anh và không được để trống`,
          );
        }
      }
    } catch {
      errors.push("assets/visual-shot-plan.json parse error");
    }
  }

  if (!fs.existsSync(compDir)) {
    console.error("FAIL: missing compositions/");
    process.exit(1);
  }

  for (const name of fs.readdirSync(compDir)) {
    if (!/^beat_\d+\.html$/i.test(name)) continue;
    const content = fs.readFileSync(path.join(compDir, name), "utf8");
    const beatId = name.replace(/\.html$/i, "");
    const expected = durationByBeat.get(beatId) ?? null;
    errors.push(...checkHfSeekBeatFile(name, content, expected));
  }

  if (errors.length) {
    console.error("\n=== HF-SEEK BEAT FAIL ===\n");
    errors.forEach((e) => console.error(`✗ ${e}`));
    process.exit(1);
  }

  console.log("check-hf-seek-beat: OK");
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
