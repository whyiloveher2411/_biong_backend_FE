#!/usr/bin/env node
/**
 * Map visual_shot_plan phrase_anchor → real audio timings via caption word matches.
 * Nguồn beat visual mặc định — không dùng HASCAS markers.
 *
 * Usage: node map-shot-plan-to-beat-map.mjs <project-dir>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { norm, stripPunct, wordSimilarity } from "./lib/caption-script-align.mjs";

const SHOT_PLAN_REL = "assets/visual-shot-plan.json";
const CAPTION_WORDS_REL = "assets/caption-words.json";
const BEAT_MAP_REL = "assets/beat-map.json";
const SYNC_REPORT_REL = "assets/caption-sync-report.json";
const METADATA_REL = "assets/agent-metadata.json";

function parseArgs(argv) {
  const out = { projectDir: "" };
  for (let i = 2; i < argv.length; i++) {
    if (!argv[i].startsWith("-") && !out.projectDir) {
      out.projectDir = argv[i];
    }
  }
  return out;
}

function tokenizePhrase(text) {
  return String(text ?? "")
    .replace(/\[.*?\]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function loadShotPlan(projectDir) {
  const shotPath = path.join(projectDir, SHOT_PLAN_REL);
  if (!fs.existsSync(shotPath)) {
    throw new Error(`Thiếu ${SHOT_PLAN_REL} — sinh visual_shot_plan Phase 2 trước`);
  }
  const raw = JSON.parse(fs.readFileSync(shotPath, "utf8"));
  const plan = Array.isArray(raw) ? raw : raw.visual_shot_plan ?? [];
  if (!plan.length) {
    throw new Error(`${SHOT_PLAN_REL} rỗng`);
  }
  return plan;
}

function loadCaptionWords(projectDir) {
  const p = path.join(projectDir, CAPTION_WORDS_REL);
  if (!fs.existsSync(p)) {
    throw new Error(`Thiếu ${CAPTION_WORDS_REL} — chạy sync-caption-from-script.mjs trước`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadTotalVideoSec(projectDir, captionWords) {
  const reportPath = path.join(projectDir, SYNC_REPORT_REL);
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      if (report.totalVideoSec > 0) return report.totalVideoSec;
    } catch {
      /* skip */
    }
  }
  if (captionWords.length) {
    return Math.max(...captionWords.map((w) => Number(w.end) || 0));
  }
  return 0;
}

function findPhraseStart(captionWords, phraseTokens, fromIndex = 0) {
  if (!phraseTokens.length) return -1;

  for (let i = fromIndex; i < captionWords.length; i++) {
    const firstCap = String(captionWords[i]?.text ?? "");
    const firstExact =
      norm(stripPunct(firstCap)) === norm(stripPunct(phraseTokens[0]));
    const firstFuzzy = wordSimilarity(firstCap, phraseTokens[0]) >= 0.72;
    if (!firstExact && !firstFuzzy) continue;

    let ok = true;
    for (let j = 1; j < phraseTokens.length; j++) {
      if (i + j >= captionWords.length) {
        ok = false;
        break;
      }
      const cap = String(captionWords[i + j]?.text ?? "");
      const exact = norm(stripPunct(cap)) === norm(stripPunct(phraseTokens[j]));
      const fuzzy = wordSimilarity(cap, phraseTokens[j]) >= 0.72;
      if (!exact && !fuzzy) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

function interpolateStartSec(index, totalBeats, totalVideoSec) {
  if (totalBeats <= 1) return 0;
  return +((index / totalBeats) * totalVideoSec).toFixed(3);
}

/** Cấm beat overlap — mỗi clip chỉ 1 beat visible. */
export function normalizeSequentialSections(sections, totalVideoSec) {
  if (!sections.length) return;
  const MIN_DUR = 0.6;

  for (let i = 1; i < sections.length; i++) {
    const prevEnd = sections[i - 1].endSec;
    if (sections[i].startSec < prevEnd - 0.001) {
      sections[i].startSec = +prevEnd.toFixed(3);
      if (!sections[i].source.includes("no-overlap")) {
        sections[i].source = `${sections[i].source}+no-overlap`;
      }
    }
  }

  for (let i = 0; i < sections.length - 1; i++) {
    sections[i].endSec = +sections[i + 1].startSec.toFixed(3);
    sections[i].durationSec = +(sections[i].endSec - sections[i].startSec).toFixed(3);
    if (sections[i].durationSec < MIN_DUR) {
      sections[i].endSec = +(sections[i].startSec + MIN_DUR).toFixed(3);
      sections[i].durationSec = MIN_DUR;
      sections[i + 1].startSec = sections[i].endSec;
      if (!sections[i + 1].source.includes("no-overlap")) {
        sections[i + 1].source = `${sections[i + 1].source}+no-overlap`;
      }
    }
  }

  const last = sections[sections.length - 1];
  last.endSec = +totalVideoSec.toFixed(3);
  last.durationSec = +(last.endSec - last.startSec).toFixed(3);
}

export function buildBeatMapFromShotPlan(shotPlan, captionWords, totalVideoSec) {
  const sections = [];
  let searchFrom = 0;

  for (let i = 0; i < shotPlan.length; i++) {
    const shot = shotPlan[i];
    const phraseText = String(
      shot.phrase_anchor ?? shot.phrase_text ?? shot.markerText ?? "",
    ).trim();
    const phraseTokens = tokenizePhrase(phraseText);
    const capIndex = findPhraseStart(captionWords, phraseTokens, searchFrom);

    let startSec;
    if (capIndex >= 0) {
      startSec = Number(captionWords[capIndex].start);
      searchFrom = capIndex + 1;
    } else {
      startSec = interpolateStartSec(i, shotPlan.length, totalVideoSec);
    }

    const nextShot = shotPlan[i + 1];
    let endSec;
    if (nextShot) {
      const nextPhrase = tokenizePhrase(
        nextShot.phrase_anchor ?? nextShot.phrase_text ?? "",
      );
      const nextIndex = findPhraseStart(captionWords, nextPhrase, searchFrom);
      if (nextIndex >= 0) {
        endSec = Number(captionWords[nextIndex].start);
      } else {
        endSec = interpolateStartSec(i + 1, shotPlan.length, totalVideoSec);
        if (endSec <= startSec) {
          endSec = interpolateStartSec(i + 1, shotPlan.length, totalVideoSec);
        }
      }
    } else {
      endSec = totalVideoSec;
    }

    if (endSec <= startSec) {
      endSec = Math.min(totalVideoSec, startSec + 2);
    }

    sections.push({
      id: shot.beat_id ?? shot.section ?? `beat_${i + 1}`,
      beat_id: shot.beat_id ?? `beat_${i + 1}`,
      visual_description:
        String(shot.visual_description ?? "").trim() ||
        "Build a clear layered composition around the verified beat content, reveal supporting elements in sequence, and resolve into one readable final frame.",
      phrase_anchor: phraseText,
      startSec: +startSec.toFixed(3),
      endSec: +endSec.toFixed(3),
      durationSec: +(endSec - startSec).toFixed(3),
    });
  }

  normalizeSequentialSections(sections, totalVideoSec);

  return {
    schema_version: 2,
    generatedAt: new Date().toISOString(),
    source: "visual-shot-plan",
    totalVideoSec,
    sections,
  };
}

function main() {
  const { projectDir: rawDir } = parseArgs(process.argv);
  if (!rawDir) {
    console.error("usage: node map-shot-plan-to-beat-map.mjs <project-dir>");
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);

  let shotPlan;
  let captionWords;
  try {
    shotPlan = loadShotPlan(projectDir);
    captionWords = loadCaptionWords(projectDir);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const totalVideoSec = loadTotalVideoSec(projectDir, captionWords);
  if (totalVideoSec <= 0) {
    console.error("totalVideoSec = 0 — chạy transcribe + caption sync trước");
    process.exit(1);
  }

  const beatMap = buildBeatMapFromShotPlan(shotPlan, captionWords, totalVideoSec);

  const outPath = path.join(projectDir, BEAT_MAP_REL);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(beatMap, null, 2));

  const matched = beatMap.sections.filter((s) => s.source === "caption-word-match").length;
  console.log(
    `[shot-plan-beat-map] ${matched}/${beatMap.sections.length} beats matched caption words, total=${totalVideoSec}s`,
  );
  if (matched < beatMap.sections.length) {
    console.warn(
      `[shot-plan-beat-map] ${beatMap.sections.length - matched} beat(s) interpolated — kiểm tra phrase_anchor khớp script`,
    );
  }
  console.log(`[shot-plan-beat-map] wrote ${BEAT_MAP_REL}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
