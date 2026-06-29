#!/usr/bin/env node
/**
 * Preflight: BGM + meme SFX hook + media-plan (phase 2 render).
 *
 * Usage: node check-media-stack.mjs <project-dir> [--strict]
 * Exit 0 = pass, 1 = fail (errors on stderr).
 */
import fs from "fs";
import path from "path";
import { resolveTranscriptPath, loadTranscriptWords } from "./lib/transcript-path.mjs";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const projectDir = args.find((a) => !a.startsWith("-"));

if (!projectDir) {
  console.error("usage: node check-media-stack.mjs <project-dir> [--strict]");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function scriptHasSfxTag() {
  const candidates = ["assets/audio-script.txt"];
  for (const rel of candidates) {
    if (!exists(rel)) continue;
    if (/\[SFX:/i.test(read(rel))) return true;
  }
  return false;
}

function parseTotalVideoSec() {
  const reportPath = path.join(root, "assets/caption-sync-report.json");
  if (exists("assets/caption-sync-report.json")) {
    try {
      const report = JSON.parse(read("assets/caption-sync-report.json"));
      if (report.totalVideoSec > 0) return report.totalVideoSec;
    } catch {
      /* skip */
    }
  }

  const transcriptPath = resolveTranscriptPath(root);
  if (transcriptPath) {
    try {
      const { words } = loadTranscriptWords(root);
      if (words.length > 0) {
        return Math.max(...words.map((w) => w.end));
      }
    } catch {
      /* skip */
    }
  }

  if (exists("assets/caption-words.json")) {
    try {
      const data = JSON.parse(read("assets/caption-words.json"));
      if (Array.isArray(data) && data.length > 0) {
        const end = Number(data[data.length - 1]?.end ?? 0);
        if (end > 0) return end;
      }
    } catch {
      /* skip */
    }
  }

  return 0;
}

function extractAudioTracks(html) {
  const tracks = [];
  const re =
    /<audio\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const trackIdx = tag.match(/data-track-index\s*=\s*["'](\d+)["']/i)?.[1];
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const duration = tag.match(/data-duration\s*=\s*["']([^"']+)["']/i)?.[1];
    const volume = tag.match(/data-volume\s*=\s*["']([^"']+)["']/i)?.[1];
    tracks.push({
      trackIndex: trackIdx ? parseInt(trackIdx, 10) : null,
      src,
      duration: duration ? parseFloat(duration) : null,
      volume: volume ? parseFloat(volume) : null,
      raw: tag,
    });
  }
  return tracks;
}

const needsSfx = scriptHasSfxTag();

if (!exists("index.html")) {
  errors.push("missing index.html");
} else {
  const indexHtml = read("index.html");
  const tracks = extractAudioTracks(indexHtml);

  const track12 = tracks.filter((t) => t.trackIndex === 12);
  const track11 = tracks.filter((t) => t.trackIndex === 11);

  if (needsSfx) {
    if (!exists("assets/audio/sfx_hook.mp3")) {
      errors.push("missing assets/audio/sfx_hook.mp3 (script has [SFX: ...])");
    }
    if (track12.length === 0) {
      errors.push("index.html: no <audio data-track-index=\"12\"> for meme SFX hook");
    } else {
      const hooked = track12.some((t) => /sfx_hook/i.test(t.src));
      if (!hooked) {
        errors.push(
          "index.html: track 12 must src=../assets/audio/sfx_hook.mp3 (or sfx_hook in path)",
        );
      }
      const badStart = track12.some((t) => !/data-start\s*=\s*["']0["']/i.test(t.raw));
      if (badStart) {
        warnings.push("track 12: recommend data-start=\"0\" for hook punch");
      }
    }
  }

  if (!exists("assets/audio/bgm.mp3")) {
    errors.push("missing assets/audio/bgm.mp3");
  }
  if (track11.length === 0) {
    errors.push("index.html: no <audio data-track-index=\"11\"> for global BGM");
  } else {
    const bgm = track11[0];
    if (!/bgm/i.test(bgm.src)) {
      warnings.push("track 11: src should point to bgm.mp3");
    }
    const totalSec = parseTotalVideoSec();
    if (totalSec > 0 && bgm.duration !== null && bgm.duration + 0.5 < totalSec) {
      errors.push(
        `BGM data-duration=${bgm.duration} < totalVideoSec=${totalSec.toFixed(2)}`,
      );
    }
  }
}

if (strict && exists("media-plan.md")) {
  const plan = read("media-plan.md");
  if (needsSfx && !/sfx_hook/i.test(plan)) {
    warnings.push("media-plan.md: missing sfx_hook row (recommended)");
  }
  if (!/bgm_global/i.test(plan)) {
    warnings.push("media-plan.md: missing bgm_global row (recommended)");
  }
} else if (strict && needsSfx) {
  warnings.push("missing media-plan.md (recommended deliverable)");
}

if (warnings.length) {
  for (const w of warnings) {
    console.error("WARN:", w);
  }
}

if (errors.length) {
  for (const e of errors) {
    console.error("FAIL:", e);
  }
  process.exit(1);
}

console.log("check-media-stack: OK");
process.exit(0);
