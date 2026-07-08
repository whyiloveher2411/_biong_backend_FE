#!/usr/bin/env node
/**
 * Wire beat transition SFX — copy sfx_beat_move.mp3 + mount clips beat 2…N.
 *
 * Usage: node wire-beat-transition-sfx.mjs <project-dir> [--duration=0.58] [--volume=0.55]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  nextSfxTrackIndex,
  parseBeatHostSections,
} from "./lib/beat-host-sections.mjs";

const args = process.argv.slice(2);
const durationArg = args.find((a) => a.startsWith("--duration="));
const volumeArg = args.find((a) => a.startsWith("--volume="));
const SFX_DURATION = durationArg ? parseFloat(durationArg.split("=")[1]) : 0.58;
const SFX_VOLUME = volumeArg ? parseFloat(volumeArg.split("=")[1]) : 0.55;
const projectDir = path.resolve(args.find((a) => !a.startsWith("-")) || "");

if (!projectDir) {
  console.error(
    "usage: node wire-beat-transition-sfx.mjs <project-dir> [--duration=0.58] [--volume=0.55]",
  );
  process.exit(1);
}

const indexPath = path.join(projectDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("missing index.html");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillSfx = path.resolve(
  scriptDir,
  "../../biong-short-video-hyperframes/assets/audio/sfx_beat_move.mp3",
);
const repoSfx = path.resolve(scriptDir, "../../../short_video_beat_move.mp3");
const destDir = path.join(projectDir, "assets/audio");
const destSfx = path.join(destDir, "sfx_beat_move.mp3");

fs.mkdirSync(destDir, { recursive: true });
const srcSfx = fs.existsSync(skillSfx)
  ? skillSfx
  : fs.existsSync(repoSfx)
    ? repoSfx
    : "";
if (!srcSfx) {
  console.error(
    "thiếu short_video_beat_move.mp3 — đặt ở repo root hoặc skill assets/audio/",
  );
  process.exit(1);
}
fs.copyFileSync(srcSfx, destSfx);

let html = fs.readFileSync(indexPath, "utf8");
html = html.replace(
  /<audio\b[^>]*class="[^"]*sfx-beat-move[^"]*"[^>]*>\s*<\/audio>\s*/gi,
  "",
);
html = html.replace(
  /<audio\b[^>]*src="[^"]*sfx_beat_move[^"]*"[^>]*>\s*<\/audio>\s*/gi,
  "",
);

const beats = parseBeatHostSections(html);
const transitions = beats.filter((b) => b.num >= 2);
if (transitions.length === 0) {
  console.warn("[wire-beat-transition-sfx] không tìm thấy beat 2+ — bỏ qua wire clips");
  process.exit(0);
}

let trackIndex = 14;
const clips = transitions
  .map(({ num, start }) => {
    const track = nextSfxTrackIndex(trackIndex);
    trackIndex = track.trackIndex;
    return `    <audio class="clip sfx-beat-move" id="sfx-beat-${num}" src="assets/audio/sfx_beat_move.mp3"
      data-start="${start.toFixed(3)}" data-duration="${SFX_DURATION.toFixed(2)}" data-track-index="${track.value}" data-volume="${SFX_VOLUME.toFixed(2)}"></audio>`;
  })
  .join("\n");

const insertBefore =
  html.match(/\n\s*<audio\b[^>]*\bid="(?:narration|narration-audio)/i) ??
  html.match(/\n\s*<audio\b[^>]*\bdata-track-index="10"/i) ??
  html.match(/\n\s*<div class="clip hf-overlay-caption"/i);

if (!insertBefore) {
  console.error("index.html: không tìm vị trí chèn sfx-beat-move (trước narration/caption)");
  process.exit(1);
}

html = html.replace(insertBefore[0], `\n${clips}\n${insertBefore[0]}`);
fs.writeFileSync(indexPath, html);

console.log(
  `[wire-beat-transition-sfx] copied sfx_beat_move.mp3 + wired ${transitions.length} clips (beat 2…${transitions[transitions.length - 1].num})`,
);
