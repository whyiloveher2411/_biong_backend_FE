#!/usr/bin/env node
/**
 * Map script text (audio-script.txt) + Whisper timing (transcript.json)
 * → assets/caption-words.json + assets/caption-sync-report.json
 *
 * Usage: node sync-caption-from-script.mjs <project-dir>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  alignScriptToWhisper,
  tokenizeScript,
  toCaptionWords,
  totalVideoSec,
  stripPunct,
} from "./lib/caption-script-align.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHISPER_EMOTION_WORD_RE = /^(?:laugh|laughter|sigh|gasp)$/i;

function resolveTranscriptPath(projectDir) {
  const candidates = [
    path.join(projectDir, "transcript.json"),
    path.join(projectDir, "assets/transcript.json"),
    path.join(projectDir, "assets/audio/transcript.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadTranscriptWords(projectDir) {
  const trPath = resolveTranscriptPath(projectDir);
  if (!trPath) {
    throw new Error("Thiếu transcript.json — chạy hyperframes transcribe trước");
  }
  const raw = JSON.parse(fs.readFileSync(trPath, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.words ?? [];
  return list
    .filter((w) => w && "start" in w && "end" in w)
    .map((w) => ({
      text: String(w.text ?? "").trim(),
      start: Number(w.start),
      end: Number(w.end),
    }))
    .filter((w) => w.text.length > 0)
    .filter((w) => !WHISPER_EMOTION_WORD_RE.test(stripPunct(w.text)));
}

const CAPTION_ALIGN_LOOKAHEAD = Number(process.env.CAPTION_LOOKAHEAD || 5);

function main() {
  const projectDir = path.resolve(process.argv[2] || "");
  if (!process.argv[2]) {
    console.error("usage: node sync-caption-from-script.mjs <project-dir>");
    process.exit(1);
  }

  const scriptPath = path.join(projectDir, "assets/audio-script.txt");
  const outWordsPath = path.join(projectDir, "assets/caption-words.json");
  const reportPath = path.join(projectDir, "assets/caption-sync-report.json");

  if (!fs.existsSync(scriptPath)) {
    console.error(`Thiếu ${scriptPath} — lưu audio_script từ get_context trước`);
    process.exit(1);
  }

  if (!resolveTranscriptPath(projectDir)) {
    console.error(`Thiếu transcript.json — chạy hyperframes transcribe trước`);
    process.exit(1);
  }

  const scriptText = fs.readFileSync(scriptPath, "utf8");
  const scriptWords = tokenizeScript(scriptText);
  const transcriptWords = loadTranscriptWords(projectDir);

  if (!scriptWords.length) {
    console.error("audio-script.txt rỗng sau khi strip markers");
    process.exit(1);
  }
  if (!transcriptWords.length) {
    console.error("transcript.json không có word timings");
    process.exit(1);
  }

  const {
    mapped,
    exactCount,
    fuzzyCount,
    positionalCount,
    interpolatedCount,
    corrections,
    unmatchedWords,
    transcriptPointerEnd,
    densityDrift,
  } = alignScriptToWhisper(scriptWords, transcriptWords, {
    lookahead: CAPTION_ALIGN_LOOKAHEAD,
  });

  const duration = totalVideoSec(transcriptWords, mapped);
  const captionWords = toCaptionWords(mapped, duration);

  fs.mkdirSync(path.dirname(outWordsPath), { recursive: true });
  fs.writeFileSync(outWordsPath, JSON.stringify(captionWords, null, 2));

  const timedCount = exactCount + fuzzyCount + positionalCount;
  const report = {
    generatedAt: new Date().toISOString(),
    alignModule: path.join(__dirname, "lib/caption-script-align.mjs"),
    scriptWordCount: scriptWords.length,
    transcriptWordCount: transcriptWords.length,
    exactCount,
    fuzzyCount,
    positionalCount,
    interpolatedCount,
    timedCount,
    unmatchedCount: unmatchedWords.length,
    unmatchedRatio: scriptWords.length
      ? +(unmatchedWords.length / scriptWords.length).toFixed(4)
      : 0,
    unmatchedWords,
    corrections,
    densityDrift,
    totalVideoSec: duration,
    transcriptPointerEnd,
    scriptSample: scriptWords.slice(0, 8),
    captionSample: captionWords.slice(0, 8),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(
    `[sync-caption] ${timedCount}/${scriptWords.length} timed` +
      ` (exact=${exactCount} fuzzy=${fuzzyCount} positional=${positionalCount})` +
      (interpolatedCount ? `; ${interpolatedCount} interpolated` : " ✓"),
  );
  if (corrections.length) {
    const sample = corrections
      .slice(0, 5)
      .map((c) => `"${c.whisper}"→"${c.script}"`)
      .join(", ");
    console.log(`[sync-caption] corrected: ${sample}`);
  }
  if (unmatchedWords.length) {
    console.warn(`[sync-caption] interpolated: ${unmatchedWords.slice(0, 12).join(" ")}`);
  }
  console.log(`[sync-caption] wrote ${outWordsPath}`);
}

main();
