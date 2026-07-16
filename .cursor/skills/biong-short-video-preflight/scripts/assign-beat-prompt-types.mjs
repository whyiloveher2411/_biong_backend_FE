#!/usr/bin/env node
/**
 * Bảo đảm mỗi beat trong visual_shot_plan có visual_description tiếng Anh.
 * Tên file được giữ để không phá các lệnh render/preflight hiện có.
 *
 * Usage: node assign-beat-prompt-types.mjs <project-dir> [--seed <n>]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SHOT_PLAN_REL = "assets/visual-shot-plan.json";
const ASSIGNMENT_REL = "assets/prompt-assignment.json";

const DESCRIPTION_BY_INTENT = {
  hook_shock: "Open with one oversized focal statement, then fracture the surrounding interface into layered signals before resolving into a sharp visual question.",
  stat: "Build a verified metric card with a restrained count reveal, supporting scale markers, and a final comparison frame that keeps the number dominant.",
  comparison: "Stage a clear before-and-after split, move the dividing boundary through the frame, and resolve both states into one concise takeaway.",
  process: "Construct an input-to-output workflow with connected nodes, animate each handoff in sequence, and finish on the resulting system state.",
  cta: "Gather the established visual elements into one confident closing card, reveal the next action, and hold a clean final frame.",
  transition: "Transform the current visual motif into the next chapter through a short geometric wipe with continuous deterministic motion.",
};

function parseArgs(argv) {
  const out = { projectDir: "", seed: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--seed" && argv[i + 1]) {
      out.seed = Number(argv[++i]);
    } else if (!argv[i].startsWith("-") && !out.projectDir) {
      out.projectDir = argv[i];
    }
  }
  return out;
}

function loadShotPlan(projectDir) {
  const p = path.join(projectDir, SHOT_PLAN_REL);
  if (!fs.existsSync(p)) {
    throw new Error(`Thiếu ${SHOT_PLAN_REL} — sinh visual_shot_plan trước`);
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const plan = Array.isArray(raw) ? raw : raw.visual_shot_plan ?? [];
  if (!plan.length) throw new Error(`${SHOT_PLAN_REL} rỗng`);
  return { raw, plan, isWrapped: !Array.isArray(raw) };
}

function validEnglishDescription(value) {
  const text = String(value ?? "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 8 && words.length <= 80 && !/[À-ỹ]/.test(text);
}

function fallbackDescription(shot, index) {
  const intent = String(shot.content_intent ?? "").trim();
  if (DESCRIPTION_BY_INTENT[intent]) return DESCRIPTION_BY_INTENT[intent];
  const layouts = [
    "Compose a layered editorial card system, reveal the primary idea first, then introduce two supporting elements before settling into a balanced final frame.",
    "Build a spatial diagram around one central object, animate related signals from the edges, and resolve the relationships with clear hierarchy.",
    "Use a progressive stack of interface panels, shift focus between them with depth and scale, and end with the strongest result in front.",
    "Create an abstract problem-to-solution sequence, compress scattered elements into an organized structure, and hold the resolved state for readability.",
  ];
  return layouts[index % layouts.length];
}

export function assignVisualDescriptions(shotPlan) {
  const assignments = [];

  for (let i = 0; i < shotPlan.length; i++) {
    const shot = shotPlan[i];
    const beatId = shot.beat_id ?? `beat_${i + 1}`;
    const existing = String(shot.visual_description ?? "").trim();
    const description = validEnglishDescription(existing)
      ? existing
      : fallbackDescription(shot, i);
    delete shot.hf_prompt_type;
    shot.visual_description = description;
    assignments.push({
      beat_id: beatId,
      visual_description: description,
      source: validEnglishDescription(existing) ? "preserved" : "generated",
    });
  }

  return { shotPlan, assignments };
}

/** @deprecated Tên export cũ được giữ cho tooling ngoài repo. */
export const assignPromptTypes = assignVisualDescriptions;

function main() {
  const { projectDir: rawDir, seed: cliSeed } = parseArgs(process.argv);
  if (!rawDir) {
    console.error("usage: node assign-beat-prompt-types.mjs <project-dir> [--seed <n>]");
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);
  let shotData;
  try {
    shotData = loadShotPlan(projectDir);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  void cliSeed;
  const { shotPlan, assignments } = assignVisualDescriptions(shotData.plan);

  const outShot = shotData.isWrapped
    ? { ...shotData.raw, visual_shot_plan: shotPlan }
    : shotPlan;

  const shotPath = path.join(projectDir, SHOT_PLAN_REL);
  fs.mkdirSync(path.dirname(shotPath), { recursive: true });
  fs.writeFileSync(shotPath, JSON.stringify(outShot, null, 2));

  const assignPath = path.join(projectDir, ASSIGNMENT_REL);
  fs.writeFileSync(
    assignPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        schema_version: 2,
        composer: "universal-composer",
        assignments,
      },
      null,
      2,
    ),
  );

  console.log(`[assign-visual-descriptions] ${assignments.length} beats prepared`);
  for (const a of assignments) {
    console.log(`  ${a.beat_id}: ${a.source}`);
  }
  console.log(`[assign-visual-descriptions] wrote ${SHOT_PLAN_REL} + ${ASSIGNMENT_REL}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
