#!/usr/bin/env node
/**
 * Gán hf_prompt_type random cho mỗi beat trong visual_shot_plan.
 * - beat_1: pool hook (kinetic-type, cinematic-title, social-reel)
 * - beat_2+: pool đủ 9 type
 * - Cấm 2 beat liên tiếp cùng type
 * - sting-transition: chỉ beat có durationSec ≤ 8 (nếu đã có beat-map)
 *
 * Usage: node assign-beat-prompt-types.mjs <project-dir> [--seed <n>]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SHOT_PLAN_REL = "assets/visual-shot-plan.json";
const BEAT_MAP_REL = "assets/beat-map.json";
const ASSIGNMENT_REL = "assets/prompt-assignment.json";

const HOOK_POOL = ["kinetic-type", "cinematic-title", "social-reel"];

const ALL_TYPES = [
  "cinematic-title",
  "kinetic-type",
  "social-reel",
  "data-story",
  "product-reveal",
  "lower-third-overlay",
  "sting-transition",
  "premium-spot",
  "universal-composer",
];

const INTENT_WEIGHTS = {
  hook_shock: ["kinetic-type", "cinematic-title", "social-reel"],
  stat: ["data-story"],
  comparison: ["data-story", "universal-composer"],
  process: ["universal-composer", "product-reveal"],
  cta: ["premium-spot", "social-reel"],
  transition: ["sting-transition"],
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

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function loadBeatDurations(projectDir) {
  const p = path.join(projectDir, BEAT_MAP_REL);
  if (!fs.existsSync(p)) return new Map();
  try {
    const bm = JSON.parse(fs.readFileSync(p, "utf8"));
    const map = new Map();
    for (const s of bm.sections ?? []) {
      const id = s.beat_id ?? s.id;
      if (id) map.set(id, s.durationSec ?? 0);
    }
    return map;
  } catch {
    return new Map();
  }
}

function pickRandom(pool, rng, exclude) {
  const filtered = pool.filter((t) => t !== exclude);
  const choices = filtered.length ? filtered : pool;
  return choices[Math.floor(rng() * choices.length)];
}

function weightedPick(pool, intent, rng, exclude) {
  const preferred = INTENT_WEIGHTS[intent] ?? [];
  const weighted = pool.filter((t) => preferred.includes(t) && t !== exclude);
  if (weighted.length && rng() < 0.6) {
    return weighted[Math.floor(rng() * weighted.length)];
  }
  return pickRandom(pool, rng, exclude);
}

export function assignPromptTypes(shotPlan, options = {}) {
  const { durations = new Map(), seed = Date.now() } = options;
  const rng = mulberry32(seed);
  const assignments = [];
  let prevType = null;

  for (let i = 0; i < shotPlan.length; i++) {
    const shot = shotPlan[i];
    const beatId = shot.beat_id ?? `beat_${i + 1}`;
    const isBeat1 = i === 0 || beatId === "beat_1";
    let pool = isBeat1 ? [...HOOK_POOL] : [...ALL_TYPES];

    const dur = durations.get(beatId) ?? shot.max_duration_sec ?? 20;
    if (dur > 8) {
      pool = pool.filter((t) => t !== "sting-transition");
    }

    const intent = shot.content_intent ?? "";
    let type = weightedPick(pool, intent, rng, prevType);

    if (type === prevType) {
      type = pickRandom(pool, rng, prevType);
    }

    shot.hf_prompt_type = type;
    assignments.push({
      beat_id: beatId,
      hf_prompt_type: type,
      pool: isBeat1 ? "hook" : "all",
      durationSec: dur || null,
    });
    prevType = type;
  }

  return { shotPlan, assignments, seed };
}

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

  const durations = loadBeatDurations(projectDir);
  const metaPath = path.join(projectDir, "assets/agent-metadata.json");
  let seed = cliSeed;
  if (seed == null && fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      seed = Number(meta.short_video_id) || Date.now();
    } catch {
      seed = Date.now();
    }
  }
  if (seed == null) seed = Date.now();

  const { shotPlan, assignments } = assignPromptTypes(shotData.plan, {
    durations,
    seed,
  });

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
        seed,
        hook_whitelist: HOOK_POOL,
        no_consecutive_repeat: true,
        assignments,
      },
      null,
      2,
    ),
  );

  console.log(`[assign-prompt-types] ${assignments.length} beats assigned (seed=${seed})`);
  for (const a of assignments) {
    console.log(`  ${a.beat_id}: ${a.hf_prompt_type}`);
  }
  console.log(`[assign-prompt-types] wrote ${SHOT_PLAN_REL} + ${ASSIGNMENT_REL}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
