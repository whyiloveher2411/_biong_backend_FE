#!/usr/bin/env node
/**
 * Preflight: beat transition SFX bắt buộc (short_video_beat_move.mp3).
 *
 * Usage: node check-beat-transition-sfx.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";
import { parseBeatHostSections } from "./lib/beat-host-sections.mjs";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-beat-transition-sfx.mjs <project-dir>");
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

if (!exists("index.html")) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const indexHtml = read("index.html");

if (!exists("assets/audio/sfx_beat_move.mp3")) {
  errors.push(
    "thiếu assets/audio/sfx_beat_move.mp3 — chạy wire-beat-transition-sfx.mjs hoặc copy từ short_video_beat_move.mp3",
  );
}

function parseSfxClips(html) {
  const clips = [];
  const re = /<audio\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    if (!/sfx-beat-move|sfx_beat_move/i.test(tag)) continue;
    const id = tag.match(/\bid="([^"]+)"/i)?.[1] ?? "";
    const start = parseFloat(
      tag.match(/data-start\s*=\s*["']([^"']+)["']/i)?.[1] ?? "NaN",
    );
    const volume = parseFloat(
      tag.match(/data-volume\s*=\s*["']([^"']+)["']/i)?.[1] ?? "NaN",
    );
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    clips.push({ id, start, volume, src, raw: tag });
  }
  return clips;
}

const beats = parseBeatHostSections(indexHtml);
const transitions = beats.filter((b) => b.num >= 2);
const sfxClips = parseSfxClips(indexHtml);

if (transitions.length === 0) {
  warnings.push("index.html: chỉ 1 beat — không cần sfx beat transition");
} else if (sfxClips.length < transitions.length) {
  errors.push(
    `thiếu sfx beat transition: cần ${transitions.length} clip (beat 2…${transitions[transitions.length - 1].num}), hiện ${sfxClips.length} — đọc beat-transition-sfx.md`,
  );
}

const sfxIds = new Set();
for (const clip of sfxClips) {
  if (!clip.id) {
    errors.push("sfx-beat-move: thiếu id (renderer strict mode) — id=\"sfx-beat-N\"");
  } else if (sfxIds.has(clip.id)) {
    errors.push(`sfx-beat-move: id trùng "${clip.id}" — mỗi beat-host cần id sfx riêng`);
  } else {
    sfxIds.add(clip.id);
  }
  if (!/sfx_beat_move\.mp3/i.test(clip.src)) {
    errors.push(
      `sfx-beat-move ${clip.id || "?"}: src phải assets/audio/sfx_beat_move.mp3 (short_video_beat_move.mp3)`,
    );
  }
  if (Number.isFinite(clip.volume) && (clip.volume < 0.45 || clip.volume > 0.65)) {
    warnings.push(
      `sfx-beat-move ${clip.id}: volume ${clip.volume} — khuyến nghị 0.5–0.6`,
    );
  }
}

for (const beat of transitions) {
  const clip = sfxClips.find((c) => c.id === `sfx-beat-${beat.num}`);
  if (!clip) {
    errors.push(`thiếu sfx-beat-${beat.num} tại data-start=${beat.start.toFixed(3)}s`);
    continue;
  }
  const drift = Math.abs(clip.start - beat.start);
  if (drift > 0.05) {
    errors.push(
      `sfx-beat-${beat.num}: data-start=${clip.start.toFixed(3)} lệch beat-host ${beat.start.toFixed(3)}s`,
    );
  }
}

if (exists("compositions")) {
  for (const name of fs.readdirSync(path.join(root, "compositions"))) {
    if (!name.endsWith(".html")) continue;
    const content = read(path.join("compositions", name));
    if (/<audio\b[^>]*sfx_beat_move/i.test(content)) {
      errors.push(`${name}: cấm <audio sfx_beat_move> — chỉ mount trong index.html`);
    }
  }
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== BEAT TRANSITION SFX FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error(
    "\nFix: node .cursor/skills/biong-short-video-preflight/scripts/wire-beat-transition-sfx.mjs <project-dir>",
  );
  console.error("Đọc: beat-transition-sfx.md");
  process.exit(1);
}

console.log(
  `check-beat-transition-sfx: OK (${sfxClips.length} clips, ${transitions.length} transitions)`,
);
process.exit(0);
