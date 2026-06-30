#!/usr/bin/env node
/**
 * Map HASCAS narrative markers → timings (optional/debug — không dùng làm nguồn beat visual mặc định).
 *
 * Usage: node map-markers-to-timing.mjs <project-dir> [--metadata assets/agent-metadata.json]
 */
import fs from "fs";
import path from "path";
import { norm, stripPunct, wordSimilarity } from "./lib/caption-script-align.mjs";

const DEFAULT_METADATA_REL = "assets/agent-metadata.json";
const CAPTION_WORDS_REL = "assets/caption-words.json";
const BEAT_MAP_REL = "assets/beat-map.json";
const SYNC_REPORT_REL = "assets/caption-sync-report.json";

function parseArgs(argv) {
  const out = { projectDir: "", metadataRel: DEFAULT_METADATA_REL };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--metadata" && argv[i + 1]) {
      out.metadataRel = argv[++i];
    } else if (!argv[i].startsWith("-") && !out.projectDir) {
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
    .slice(0, 5);
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

function rescaleMarkerTime(markerTime, timelineTotal, totalVideoSec) {
  if (!timelineTotal || timelineTotal <= 0) return markerTime;
  return +(markerTime * (totalVideoSec / timelineTotal)).toFixed(3);
}

/** Cấm beat overlap — mỗi clip chỉ 1 beat visible (tránh ghost 19M + Gen Z). */
function normalizeSequentialSections(sections, totalVideoSec) {
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

function main() {
  const { projectDir: rawDir, metadataRel } = parseArgs(process.argv);
  if (!rawDir) {
    console.error(
      `usage: node map-markers-to-timing.mjs <project-dir> [--metadata ${DEFAULT_METADATA_REL}]`,
    );
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);
  const metadataPath = path.join(projectDir, metadataRel);

  if (!fs.existsSync(metadataPath)) {
    console.error(
      `Thiếu ${metadataRel} — lưu markers + timeline từ get_context vào file này trước phase 2`,
    );
    process.exit(1);
  }

  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch {
    console.error(`${metadataRel} không parse được JSON`);
    process.exit(1);
  }

  const markers = metadata.markers ?? metadata.audio_script_metadata?.markers ?? [];
  const timeline = metadata.timeline ?? metadata.audio_script_metadata?.timeline ?? {};

  if (!Array.isArray(markers) || markers.length === 0) {
    console.error(`${metadataRel} thiếu mảng markers`);
    process.exit(1);
  }

  const captionWords = loadCaptionWords(projectDir);
  const totalVideoSec = loadTotalVideoSec(projectDir, captionWords);
  const timelineTotal = Number(timeline.total ?? metadata.estimated_duration_sec ?? 90);

  const scaleFactor =
    timelineTotal > 0 ? +(totalVideoSec / timelineTotal).toFixed(4) : 1;

  const sections = [];
  let searchFrom = 0;

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const markerText = String(marker.text ?? "").trim();
    const phraseTokens = tokenizePhrase(markerText);
    const capIndex = findPhraseStart(captionWords, phraseTokens, searchFrom);

    let startSec;
    let source;

    if (capIndex >= 0) {
      startSec = Number(captionWords[capIndex].start);
      source = "caption-word-match";
      searchFrom = capIndex + 1;
    } else {
      startSec = rescaleMarkerTime(Number(marker.time ?? 0), timelineTotal, totalVideoSec);
      source = "hascas-rescaled";
    }

    const nextMarker = markers[i + 1];
    let endSec;
    if (nextMarker) {
      const nextPhrase = tokenizePhrase(nextMarker.text ?? "");
      const nextIndex = findPhraseStart(captionWords, nextPhrase, searchFrom);
      if (nextIndex >= 0) {
        endSec = Number(captionWords[nextIndex].start);
      } else {
        endSec = rescaleMarkerTime(
          Number(nextMarker.time ?? totalVideoSec),
          timelineTotal,
          totalVideoSec,
        );
      }
    } else {
      endSec = totalVideoSec;
    }

    if (endSec <= startSec) {
      endSec = Math.min(totalVideoSec, startSec + 2);
    }

    sections.push({
      id: marker.section ?? marker.id ?? `beat_${i + 1}`,
      markerText,
      markerTimeEstimate: Number(marker.time ?? 0),
      startSec: +startSec.toFixed(3),
      endSec: +endSec.toFixed(3),
      durationSec: +(endSec - startSec).toFixed(3),
      source,
    });
  }

  normalizeSequentialSections(sections, totalVideoSec);

  const beatMap = {
    generatedAt: new Date().toISOString(),
    totalVideoSec,
    timelineTotalEstimate: timelineTotal,
    scaleFactor,
    sections,
  };

  const outPath = path.join(projectDir, BEAT_MAP_REL);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(beatMap, null, 2));

  const matched = sections.filter((s) => s.source === "caption-word-match").length;
  console.log(
    `[beat-map] ${matched}/${sections.length} sections matched caption words, total=${totalVideoSec}s, scale=${scaleFactor}`,
  );
  if (matched < sections.length) {
    console.warn(
      `[beat-map] ${sections.length - matched} section(s) dùng hascas-rescaled — kiểm tra marker text khớp script`,
    );
  }
  console.log(`[beat-map] wrote ${BEAT_MAP_REL}`);
}

main();
