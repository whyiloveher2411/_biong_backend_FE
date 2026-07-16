#!/usr/bin/env node
/**
 * Map caption-words (Whisper-aligned) → per-beat element timing JSON.
 * Output: assets/beat-timing/beat_N.json
 *
 * Usage: node build-beat-element-timing.mjs <project-dir>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { norm, stripPunct, wordSimilarity } from "./lib/caption-script-align.mjs";

const SHOT_PLAN_REL = "assets/visual-shot-plan.json";
const BEAT_MAP_REL = "assets/beat-map.json";
const CAPTION_WORDS_REL = "assets/caption-words.json";
const TIMING_DIR_REL = "assets/beat-timing";

const STAGGER_SEC = 0.1;

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
    .filter(Boolean);
}

function findPhraseStart(captionWords, phraseTokens, fromIndex = 0) {
  if (!phraseTokens.length) return -1;

  for (let i = fromIndex; i < captionWords.length; i++) {
    const firstCap = String(captionWords[i]?.text ?? captionWords[i]?.word ?? "");
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
      const cap = String(captionWords[i + j]?.text ?? captionWords[i + j]?.word ?? "");
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

function loadJson(projectDir, rel) {
  const p = path.join(projectDir, rel);
  if (!fs.existsSync(p)) throw new Error(`Thiếu ${rel}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadShotPlan(projectDir) {
  const raw = loadJson(projectDir, SHOT_PLAN_REL);
  return Array.isArray(raw) ? raw : raw.visual_shot_plan ?? [];
}

function splitPhraseIntoChunks(phrase, maxWords = 4) {
  const tokens = tokenizePhrase(phrase);
  if (tokens.length <= maxWords) return [tokens.join(" ")];
  const chunks = [];
  for (let i = 0; i < tokens.length; i += maxWords) {
    chunks.push(tokens.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

export function buildBeatElementTiming(shotPlan, beatMap, captionWords) {
  const sections = beatMap.sections ?? [];
  const results = [];

  for (let i = 0; i < shotPlan.length; i++) {
    const shot = shotPlan[i];
    const beatId = shot.beat_id ?? `beat_${i + 1}`;
    const section =
      sections.find((s) => (s.beat_id ?? s.id) === beatId) ?? sections[i];
    if (!section) continue;

    const startSec = Number(section.startSec ?? 0);
    const durationSec = Number(section.durationSec ?? 0);
    const phrase = String(shot.phrase_anchor ?? shot.phrase_text ?? "").trim();
    const elements = [];

    const elementIds = shot.element_ids ?? [];
    const chunks = splitPhraseIntoChunks(phrase);
    let searchFrom = 0;

    chunks.forEach((chunk, ci) => {
      const tokens = tokenizePhrase(chunk);
      const capIdx = findPhraseStart(captionWords, tokens, searchFrom);
      let whisperStart = startSec;
      if (capIdx >= 0) {
        whisperStart = Number(captionWords[capIdx].start);
        searchFrom = capIdx + tokens.length;
      } else {
        whisperStart = startSec + ci * STAGGER_SEC * 3;
      }
      const id = elementIds[ci] ?? (ci === 0 ? "hero_line" : `line_${ci + 1}`);
      elements.push({
        id,
        text: chunk,
        show_at_local_sec: +(whisperStart - startSec + ci * STAGGER_SEC).toFixed(3),
        whisper_start: +whisperStart.toFixed(3),
      });
    });

    const enrichments = shot.visual_enrichment ?? [];
    enrichments.forEach((enr, ei) => {
      const text = String(enr.text ?? "").trim();
      if (!text) return;
      let whisperStart = enr.show_at_sec;
      if (whisperStart == null) {
        const tokens = tokenizePhrase(text).slice(0, 6);
        const capIdx = findPhraseStart(captionWords, tokens, searchFrom);
        if (capIdx >= 0) {
          whisperStart = Number(captionWords[capIdx].start);
        } else {
          whisperStart = startSec + durationSec * 0.3 + ei * STAGGER_SEC * 2;
        }
      }
      const local = Math.max(0, whisperStart - startSec);
      elements.push({
        id: enr.type ? `${enr.type}_${ei + 1}` : `enrichment_${ei + 1}`,
        text,
        type: enr.type ?? "enrichment",
        show_at_local_sec: +local.toFixed(3),
        whisper_start: +Number(whisperStart).toFixed(3),
      });
    });

    elements.sort((a, b) => a.show_at_local_sec - b.show_at_local_sec);

    const timing = {
      beat_id: beatId,
      visual_description: String(
        section.visual_description ?? shot.visual_description ?? "",
      ).trim(),
      startSec: +startSec.toFixed(3),
      durationSec: +durationSec.toFixed(3),
      phrase_anchor: phrase,
      elements,
    };
    results.push(timing);
  }

  return results;
}

function main() {
  const { projectDir: rawDir } = parseArgs(process.argv);
  if (!rawDir) {
    console.error("usage: node build-beat-element-timing.mjs <project-dir>");
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);

  let shotPlan;
  let beatMap;
  let captionWords;
  try {
    shotPlan = loadShotPlan(projectDir);
    beatMap = loadJson(projectDir, BEAT_MAP_REL);
    captionWords = loadJson(projectDir, CAPTION_WORDS_REL);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (!Array.isArray(captionWords) || !captionWords.length) {
    console.error("caption-words.json rỗng");
    process.exit(1);
  }

  const timings = buildBeatElementTiming(shotPlan, beatMap, captionWords);
  const outDir = path.join(projectDir, TIMING_DIR_REL);
  fs.mkdirSync(outDir, { recursive: true });

  for (const t of timings) {
    const file = path.join(outDir, `${t.beat_id}.json`);
    fs.writeFileSync(file, JSON.stringify(t, null, 2));
    console.log(
      `[beat-timing] ${t.beat_id}: ${t.elements.length} elements, ${t.durationSec}s`,
    );
  }

  const indexPath = path.join(outDir, "index.json");
  fs.writeFileSync(
    indexPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        beats: timings.map((t) => ({
          beat_id: t.beat_id,
          file: `${t.beat_id}.json`,
          element_count: t.elements.length,
        })),
      },
      null,
      2,
    ),
  );

  console.log(`[beat-timing] wrote ${timings.length} files → ${TIMING_DIR_REL}/`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
