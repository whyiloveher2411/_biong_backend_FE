#!/usr/bin/env node
/**
 * Map script text (audio-script.txt) + Whisper timing (transcript.json)
 * → assets/caption-words.json + assets/caption-sync-report.json
 *
 * Usage: node sync-caption-from-script.mjs <project-dir>
 */
import fs from "fs";
import path from "path";

const LOOKAHEAD = 40;

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "");

function stripScriptMarkers(text) {
  return String(text)
    .replace(/\[BGM:[^\]]*\]/gi, " ")
    .replace(/\[SFX:[^\]]*\]/gi, " ")
    .replace(/\[Dừng[^\]]*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeScript(text) {
  const cleaned = stripScriptMarkers(text);
  if (!cleaned) return [];

  const raw = cleaned.match(/[\p{L}\p{N}]+(?:[.,!?;:…]+)?|[.,!?;:…]+/gu) ?? [];
  const words = [];

  for (const piece of raw) {
    const trimmed = piece.trim();
    if (!trimmed) continue;

    if (/^[.,!?;:…]+$/.test(trimmed)) {
      if (words.length) {
        words[words.length - 1] = words[words.length - 1] + trimmed;
      }
      continue;
    }

    const m = trimmed.match(/^([\p{L}\p{N}]+)([.,!?;:…]+)?$/u);
    if (m) {
      words.push(m[2] ? m[1] + m[2] : m[1]);
    } else {
      words.push(trimmed);
    }
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
    .filter((w) => w.text.length > 0);
}

function interpolateTiming(prev, next, index, total) {
  if (prev && next) {
    const t = (index + 1) / (total + 1);
    const start = prev.end + (next.start - prev.end) * t;
    const end = start + Math.max(0.08, (next.end - next.start) * 0.5);
    return { start: +start.toFixed(3), end: +end.toFixed(3) };
  }
  if (prev) {
    const dur = Math.max(0.12, prev.end - prev.start);
    return {
      start: +(prev.end + 0.02).toFixed(3),
      end: +(prev.end + 0.02 + dur).toFixed(3),
    };
  }
  if (next) {
    const dur = Math.max(0.12, next.end - next.start);
    return {
      start: +Math.max(0, next.start - dur).toFixed(3),
      end: +next.start.toFixed(3),
    };
  }
  return { start: 0, end: 0.2 };
}

function mapScriptToTranscript(scriptWords, transcriptWords) {
  const state = { p: 0 };
  const mapped = [];
  const unmatched = [];

  for (let i = 0; i < scriptWords.length; i++) {
    const text = scriptWords[i];
    const target = norm(text.replace(/[.,!?;:…]+$/u, ""));

    let found = -1;
    for (let j = state.p; j < Math.min(transcriptWords.length, state.p + LOOKAHEAD); j++) {
      const tw = norm(transcriptWords[j].text.replace(/[.,!?;:…]+$/u, ""));
      if (tw && tw === target) {
        found = j;
        break;
      }
    }

    if (found >= 0) {
      mapped.push({
        text,
        start: transcriptWords[found].start,
        end: transcriptWords[found].end,
        matched: true,
        transcriptIndex: found,
      });
      state.p = found + 1;
    } else {
      const prev = mapped.length ? mapped[mapped.length - 1] : null;
      const nextTw = transcriptWords[state.p] ?? null;
      const timing = interpolateTiming(prev, nextTw, unmatched.length, scriptWords.length);
      mapped.push({
        text,
        start: timing.start,
        end: timing.end,
        matched: false,
        transcriptIndex: null,
      });
      unmatched.push(text);
    }
  }

  return { mapped, unmatched, transcriptPointerEnd: state.p };
}

function totalVideoSec(transcriptWords, mapped) {
  if (transcriptWords.length) {
    return +Math.max(...transcriptWords.map((w) => w.end)).toFixed(2);
  }
  if (mapped.length) {
    return +Math.max(...mapped.map((w) => w.end)).toFixed(2);
  }
  return 0;
}

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

  const trPath = resolveTranscriptPath(projectDir);
  if (!trPath) {
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

  const { mapped, unmatched, transcriptPointerEnd } = mapScriptToTranscript(
    scriptWords,
    transcriptWords,
  );

  const duration = totalVideoSec(transcriptWords, mapped);
  const captionWords = mapped.map(({ text, start, end }) => ({
    text,
    start: Math.max(0, Math.min(start, duration || start)),
    end: Math.min(duration || end, Math.max(end, start + 0.05)),
  }));

  fs.mkdirSync(path.dirname(outWordsPath), { recursive: true });
  fs.writeFileSync(outWordsPath, JSON.stringify(captionWords, null, 2));

  const matchedCount = mapped.filter((w) => w.matched).length;
  const report = {
    generatedAt: new Date().toISOString(),
    scriptWordCount: scriptWords.length,
    transcriptWordCount: transcriptWords.length,
    matchedCount,
    unmatchedCount: unmatched.length,
    unmatchedRatio: scriptWords.length
      ? +(unmatched.length / scriptWords.length).toFixed(4)
      : 0,
    unmatchedWords: unmatched,
    totalVideoSec: duration,
    transcriptPointerEnd,
    scriptSample: scriptWords.slice(0, 8),
    captionSample: captionWords.slice(0, 8),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(
    `[sync-caption] ${matchedCount}/${scriptWords.length} words matched` +
      (unmatched.length ? `; ${unmatched.length} interpolated` : " ✓"),
  );
  if (unmatched.length) {
    console.warn(`[sync-caption] unmatched: ${unmatched.slice(0, 12).join(" ")}`);
  }
  console.log(`[sync-caption] wrote ${outWordsPath}`);
}

main();
