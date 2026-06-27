#!/usr/bin/env node
/**
 * Gate: verify caption-words.json dùng script text + Whisper timing hợp lệ.
 *
 * Usage: node verify-caption-sync.mjs <project-dir> [--strict] [--max-unmatched-ratio 0.1]
 */
import fs from "fs";
import path from "path";

const DRIFT_TOL = 0.08;
const DEFAULT_MAX_UNMATCHED = 0.1;
const MAX_COUNT_DRIFT_RATIO = 0.15;

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "");

const OMNIVOICE_EMOTION_TAG_RE =
  /\[(?:laughter|sigh|gasp|chuckle|whisper)\]/gi;

function stripScriptMarkers(text) {
  return String(text)
    .replace(/\[BGM:[^\]]*\]/gi, " ")
    .replace(/\[SFX:[^\]]*\]/gi, " ")
    .replace(/\[Dừng[^\]]*\]/gi, " ")
    .replace(OMNIVOICE_EMOTION_TAG_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeScript(text) {
  const cleaned = stripScriptMarkers(text);
  const raw = cleaned.match(/[\p{L}\p{N}]+(?:[.,!?;:…]+)?|[.,!?;:…]+/gu) ?? [];
  const words = [];
  for (const piece of raw) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    if (/^[.,!?;:…]+$/.test(trimmed)) {
      if (words.length) words[words.length - 1] += trimmed;
      continue;
    }
    const m = trimmed.match(/^([\p{L}\p{N}]+)([.,!?;:…]+)?$/u);
    if (m) words.push(m[2] ? m[1] + m[2] : m[1]);
    else words.push(trimmed);
  }
  return words;
}

function resolveTranscriptPath(projectDir) {
  const candidates = [
    path.join(projectDir, "transcript.json"),
    path.join(projectDir, "assets/transcript.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadTranscriptWords(projectDir) {
  const trPath = resolveTranscriptPath(projectDir);
  if (!trPath) return [];
  const raw = JSON.parse(fs.readFileSync(trPath, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.words ?? [];
  return list.filter((w) => w && "start" in w).map((w) => String(w.text ?? "").trim());
}

function parseArgs(argv) {
  const out = { strict: false, maxUnmatched: DEFAULT_MAX_UNMATCHED };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--strict") out.strict = true;
    else if (argv[i] === "--max-unmatched-ratio") {
      out.maxUnmatched = parseFloat(argv[++i] ?? String(DEFAULT_MAX_UNMATCHED));
    }
  }
  return out;
}

function main() {
  const projectDir = path.resolve(process.argv[2] || "");
  const opts = parseArgs(process.argv);

  if (!process.argv[2]) {
    console.error("usage: node verify-caption-sync.mjs <project-dir> [--strict]");
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  const scriptPath = path.join(projectDir, "assets/audio-script.txt");
  const wordsPath = path.join(projectDir, "assets/caption-words.json");
  const reportPath = path.join(projectDir, "assets/caption-sync-report.json");

  if (!fs.existsSync(scriptPath)) {
    errors.push("Thiếu assets/audio-script.txt");
  }
  if (!fs.existsSync(wordsPath)) {
    errors.push("Thiếu assets/caption-words.json — chạy sync-caption-from-script.mjs trước");
  }

  if (errors.length) {
    errors.forEach((e) => console.error(`✗ ${e}`));
    process.exit(1);
  }

  const scriptWords = tokenizeScript(fs.readFileSync(scriptPath, "utf8"));
  const captionWords = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
  const transcriptTexts = resolveTranscriptPath(projectDir)
    ? loadTranscriptWords(projectDir)
    : [];

  if (!Array.isArray(captionWords) || !captionWords.length) {
    errors.push("caption-words.json rỗng hoặc không phải array");
  }

  const countDrift =
    scriptWords.length > 0
      ? Math.abs(captionWords.length - scriptWords.length) / scriptWords.length
      : 1;

  if (countDrift > MAX_COUNT_DRIFT_RATIO) {
    errors.push(
      `Word count lệch ${(countDrift * 100).toFixed(0)}% (script=${scriptWords.length}, caption=${captionWords.length})`,
    );
  }

  let report = null;
  if (fs.existsSync(reportPath)) {
    try {
      report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    } catch {
      warnings.push("caption-sync-report.json không parse được");
    }
  } else {
    warnings.push("Thiếu caption-sync-report.json — nên chạy sync-caption-from-script.mjs");
  }

  if (report && report.unmatchedRatio > opts.maxUnmatched) {
    errors.push(
      `Unmatched ratio ${(report.unmatchedRatio * 100).toFixed(1)}% > ${(opts.maxUnmatched * 100).toFixed(0)}%`,
    );
  }

  const scriptNorm = scriptWords.map((w) => norm(w.replace(/[.,!?;:…]+$/u, "")));
  const captionNorm = captionWords.map((w) =>
    norm(String(w.text ?? "").replace(/[.,!?;:…]+$/u, "")),
  );
  const transcriptNorm = transcriptTexts.map((w) =>
    norm(w.replace(/[.,!?;:…]+$/u, "")),
  );

  let matchesScript = 0;
  let matchesWhisperOnly = 0;
  const len = Math.min(scriptNorm.length, captionNorm.length);

  for (let i = 0; i < len; i++) {
    if (captionNorm[i] === scriptNorm[i]) matchesScript++;
    else if (transcriptNorm.includes(captionNorm[i]) && !scriptNorm.includes(captionNorm[i])) {
      matchesWhisperOnly++;
    }
  }

  const scriptMatchRatio = len ? matchesScript / len : 0;
  if (scriptMatchRatio < 0.85) {
    errors.push(
      `Caption text không khớp script (${(scriptMatchRatio * 100).toFixed(0)}% match) — có thể đang dùng Whisper text`,
    );
  }

  if (matchesWhisperOnly >= 3) {
    errors.push(
      `Phát hiện ${matchesWhisperOnly} từ giống Whisper nhưng khác script — cấm dùng Whisper làm hiển thị`,
    );
  }

  const standalonePunct = captionWords.filter((w) =>
    /^[.,!?;:…]+$/.test(String(w.text ?? "").trim()),
  );
  if (standalonePunct.length >= 2) {
    errors.push(
      `Caption có ${standalonePunct.length} token dấu câu riêng — dấu phải gắn từ script`,
    );
  }

  let totalVideoSec = report?.totalVideoSec ?? 0;
  if (!totalVideoSec && captionWords.length) {
    totalVideoSec = Math.max(...captionWords.map((w) => Number(w.end) || 0));
  }

  for (let i = 0; i < captionWords.length; i++) {
    const w = captionWords[i];
    const start = Number(w.start);
    const end = Number(w.end);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      errors.push(`Word #${i} thiếu start/end hợp lệ`);
      continue;
    }
    if (end < start) {
      errors.push(`Word #${i} "${w.text}": end < start`);
    }
    if (totalVideoSec > 0 && start > totalVideoSec + DRIFT_TOL) {
      errors.push(`Word #${i} "${w.text}": start vượt totalVideoSec`);
    }
    if (i > 0) {
      const prev = captionWords[i - 1];
      if (start + DRIFT_TOL < Number(prev.start)) {
        errors.push(`Timing không monotonic tại word #${i}`);
      }
    }
  }

  warnings.forEach((w) => console.warn(`⚠ ${w}`));

  if (errors.length) {
    console.error("\n=== CAPTION SYNC FAIL ===\n");
    errors.forEach((e) => console.error(`✗ ${e}`));
    console.error(
      "\nSửa: chạy lại sync-caption-from-script.mjs; đọc caption-sync-report.json",
    );
    process.exit(1);
  }

  console.log(
    `✓ Caption sync OK — ${captionWords.length} words, script match ${(scriptMatchRatio * 100).toFixed(0)}%, duration ~${totalVideoSec}s`,
  );

  if (opts.strict && report?.unmatchedCount > 0) {
    console.warn(`⚠ strict: ${report.unmatchedCount} word(s) interpolated — kiểm tra lại`);
  }

  process.exit(0);
}

main();
