#!/usr/bin/env node
/**
 * Transcribe narration MP3 — locale-aware (model + language từ metadata/CLI/env).
 *
 * Usage:
 *   node transcribe-audio.mjs <project-dir> [--lang <iso>] [--model <whisper-model>] [--audio <rel-path>]
 *
 * Locale resolution (cao → thấp): --lang > SHORT_VIDEO_TRANSCRIBE_LANG > assets/agent-metadata.json
 *   (fields: language | script_language | locale | tts_language) > default vi
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { tokenizeScript } from "./lib/caption-script-align.mjs";
import {
  CANONICAL_TRANSCRIPT_REL,
  TRANSCRIBE_MANIFEST_REL,
  canonicalTranscriptPath,
  deleteStaleTranscripts,
  parseTranscriptRaw,
} from "./lib/transcript-path.mjs";
import {
  checkTranscriptWordCountDrift,
  detectWrongLanguageTranscript,
} from "./lib/transcribe-sanity.mjs";
import {
  resolveTranscribeConfig,
  formatTranscribeHint,
} from "./lib/transcribe-locale.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NARRATION_CANDIDATES = [
  "assets/audio/narration.mp3",
  "assets/audio/voiceover.mp3",
  "assets/audio/audio.mp3",
  "assets/narration.mp3",
];

export function parseTranscribeArgs(argv) {
  const out = { projectDir: "", audioRel: "", lang: "", model: "" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--audio" && argv[i + 1]) {
      out.audioRel = argv[++i];
    } else if (argv[i] === "--lang" && argv[i + 1]) {
      out.lang = argv[++i];
    } else if (argv[i] === "--model" && argv[i + 1]) {
      out.model = argv[++i];
    } else if (!argv[i].startsWith("-") && !out.projectDir) {
      out.projectDir = argv[i];
    }
  }
  return out;
}

export function resolveNarrationPath(projectDir, audioRel) {
  if (audioRel) {
    const p = path.join(projectDir, audioRel);
    if (fs.existsSync(p)) return p;
    throw new Error(`Không tìm thấy audio: ${audioRel}`);
  }

  for (const rel of NARRATION_CANDIDATES) {
    const p = path.join(projectDir, rel);
    if (fs.existsSync(p)) return p;
  }

  const audioDir = path.join(projectDir, "assets/audio");
  if (fs.existsSync(audioDir)) {
    const mp3s = fs
      .readdirSync(audioDir)
      .filter((f) => f.endsWith(".mp3") && !/bgm|sfx/i.test(f))
      .map((f) => path.join(audioDir, f));
    if (mp3s.length === 1) return mp3s[0];
    if (mp3s.length > 1) {
      mp3s.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
      return mp3s[0];
    }
  }

  throw new Error(
    `Không tìm thấy narration MP3 — truyền --audio hoặc đặt tại ${NARRATION_CANDIDATES[0]}`,
  );
}

function runHyperframesTranscribe(projectDir, audioAbsPath, config) {
  const audioRel = path.relative(projectDir, audioAbsPath);
  const args = [
    "hyperframes",
    "transcribe",
    audioRel,
    ...config.whisperArgs,
    "-d",
    projectDir,
    "--json",
  ];

  console.log(`[transcribe-audio] npx ${args.join(" ")}`);
  const result = spawnSync("npx", args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`hyperframes transcribe failed (exit ${result.status}): ${err.slice(0, 500)}`);
  }

  const outPath = canonicalTranscriptPath(projectDir);
  if (!fs.existsSync(outPath)) {
    throw new Error(
      `Transcribe xong nhưng thiếu ${CANONICAL_TRANSCRIPT_REL} — kiểm tra hyperframes CLI`,
    );
  }
  return outPath;
}

function loadScriptWords(projectDir) {
  const scriptPath = path.join(projectDir, "assets/audio-script.txt");
  if (!fs.existsSync(scriptPath)) return [];
  return tokenizeScript(fs.readFileSync(scriptPath, "utf8"));
}

export function runTranscribe(projectDir, options = {}) {
  const config = resolveTranscribeConfig(projectDir, {
    lang: options.lang,
    model: options.model,
  });

  const audioPath = resolveNarrationPath(projectDir, options.audioRel ?? "");
  const removed = deleteStaleTranscripts(projectDir);
  if (removed.length) {
    console.log(`[transcribe-audio] đã xóa transcript cũ: ${removed.join(", ")}`);
  }

  const transcriptPath = runHyperframesTranscribe(projectDir, audioPath, config);
  const raw = JSON.parse(fs.readFileSync(transcriptPath, "utf8"));
  const transcriptWords = parseTranscriptRaw(raw);
  const scriptWords = loadScriptWords(projectDir);

  const langCheck = detectWrongLanguageTranscript(scriptWords, transcriptWords, {
    lang: config.lang,
    profile: config.profile,
  });
  if (langCheck.fail) {
    throw new Error(
      `Sanity check ngôn ngữ FAIL (${config.lang}): ${langCheck.reason}. Gợi ý: ${formatTranscribeHint(config)}`,
    );
  }

  if (scriptWords.length > 0) {
    const driftCheck = checkTranscriptWordCountDrift(
      scriptWords.length,
      transcriptWords.length,
    );
    if (driftCheck.fail) {
      throw new Error(`Sanity check word count FAIL: ${driftCheck.reason}`);
    }
  }

  const audioStat = fs.statSync(audioPath);
  const manifest = {
    generatedAt: new Date().toISOString(),
    audioPath: path.relative(projectDir, audioPath),
    audioMtimeMs: audioStat.mtimeMs,
    audioSizeBytes: audioStat.size,
    model: config.model,
    language: config.lang,
    localeSource: config.source,
    profile: config.profile.sanity,
    transcriptPath: CANONICAL_TRANSCRIPT_REL,
    wordCount: transcriptWords.length,
    durationSec:
      transcriptWords.length > 0
        ? +Math.max(...transcriptWords.map((w) => w.end)).toFixed(3)
        : 0,
  };

  const manifestOut = path.join(projectDir, TRANSCRIBE_MANIFEST_REL);
  fs.mkdirSync(path.dirname(manifestOut), { recursive: true });
  fs.writeFileSync(manifestOut, JSON.stringify(manifest, null, 2));

  return { manifest, transcriptPath, config };
}

function main() {
  const { projectDir: rawDir, audioRel, lang, model } = parseTranscribeArgs(process.argv);
  if (!rawDir) {
    console.error(
      "usage: node transcribe-audio.mjs <project-dir> [--lang <iso>] [--model <model>] [--audio <rel>]",
    );
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);
  if (!fs.existsSync(projectDir)) {
    console.error(`Thư mục không tồn tại: ${projectDir}`);
    process.exit(1);
  }

  try {
    const { manifest, config } = runTranscribe(projectDir, { audioRel, lang, model });
    console.log(
      `[transcribe-audio] OK — ${manifest.wordCount} words, ~${manifest.durationSec}s, lang=${config.lang}, model=${config.model} (source: ${config.source.lang})`,
    );
    console.log(`[transcribe-audio] wrote ${CANONICAL_TRANSCRIPT_REL} + ${TRANSCRIBE_MANIFEST_REL}`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
