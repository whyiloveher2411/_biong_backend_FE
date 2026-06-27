#!/usr/bin/env node
/**
 * Gate: verify caption-words.json dùng script text + Whisper timing hợp lệ.
 *
 * Usage: node verify-caption-sync.mjs <project-dir> [--strict] [--max-unmatched-ratio 0.1]
 */
import fs from "fs";
import path from "path";
import { norm, stripPunct, tokenizeScript } from "./lib/caption-script-align.mjs";

const DRIFT_TOL = 0.08;
const DEFAULT_MAX_UNMATCHED = 0.1;
const MAX_COUNT_DRIFT_RATIO = 0.15;

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
  return list
    .filter((w) => w && "start" in w)
    .map((w) => String(w.text ?? "").trim());
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

  if (opts.strict && !fs.existsSync(reportPath)) {
    errors.push("Thiếu assets/caption-sync-report.json — chạy sync-caption-from-script.mjs trước (--strict)");
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
  } else if (!opts.strict) {
    warnings.push("Thiếu caption-sync-report.json — nên chạy sync-caption-from-script.mjs");
  }

  if (report && report.unmatchedRatio > opts.maxUnmatched) {
    errors.push(
      `Unmatched ratio ${(report.unmatchedRatio * 100).toFixed(1)}% > ${(opts.maxUnmatched * 100).toFixed(0)}%`,
    );
  }

  if (opts.strict && captionWords.length !== scriptWords.length) {
    errors.push(
      `Strict: caption word count (${captionWords.length}) !== script (${scriptWords.length})`,
    );
  }

  let whisperLeakCount = 0;
  for (let i = 0; i < Math.min(scriptWords.length, captionWords.length); i++) {
    const scriptText = scriptWords[i];
    const captionText = String(captionWords[i].text ?? "");

    if (captionText !== scriptText) {
      errors.push(
        `Word #${i}: caption "${captionText}" !== script "${scriptText}" — cấm dùng Whisper text`,
      );
    }

    const captionNorm = norm(stripPunct(captionText));
    const scriptNorm = norm(stripPunct(scriptText));
    const whisperNorm = norm(stripPunct(transcriptTexts[i] ?? ""));

    if (
      captionNorm === whisperNorm &&
      captionNorm !== scriptNorm &&
      whisperNorm.length > 0
    ) {
      whisperLeakCount++;
    }
  }

  if (whisperLeakCount > 0) {
    errors.push(
      `Phát hiện ${whisperLeakCount} từ hiển thị text Whisper thay vì script`,
    );
  }

  const scriptMatchRatio =
    scriptWords.length > 0
      ? captionWords.filter((w, i) => String(w.text ?? "") === scriptWords[i]).length /
        scriptWords.length
      : 0;

  if (!opts.strict && scriptMatchRatio < 0.85) {
    errors.push(
      `Caption text không khớp script (${(scriptMatchRatio * 100).toFixed(0)}% match) — có thể đang dùng Whisper text`,
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

  if (opts.strict && report?.interpolatedCount > 0) {
    console.warn(
      `⚠ strict: ${report.interpolatedCount} word(s) interpolated — kiểm tra caption-sync-report.json`,
    );
  }

  process.exit(0);
}

main();
