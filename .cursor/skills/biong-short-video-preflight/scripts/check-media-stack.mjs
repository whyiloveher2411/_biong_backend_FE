#!/usr/bin/env node
/**
 * Preflight: BGM chain + meme SFX hook + media-plan (phase 2 render).
 *
 * Usage: node check-media-stack.mjs <project-dir> [--strict]
 * Exit 0 = pass, 1 = fail (errors on stderr).
 */
import fs from "fs";
import path from "path";
import {
  BGM_CHAIN_MANIFEST_REL,
  chainCoverageOk,
  loadOrBuildManifest,
  parseTotalVideoSec,
} from "./lib/bgm-chain.mjs";

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

function extractAudioTracks(html) {
  const tracks = [];
  const re = /<audio\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const id = tag.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const trackIdx = tag.match(/data-track-index\s*=\s*["'](\d+)["']/i)?.[1];
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const start = tag.match(/data-start\s*=\s*["']([^"']+)["']/i)?.[1];
    const duration = tag.match(/data-duration\s*=\s*["']([^"']+)["']/i)?.[1];
    tracks.push({
      id,
      trackIndex: trackIdx ? parseInt(trackIdx, 10) : null,
      src,
      start: start ? parseFloat(start) : null,
      duration: duration ? parseFloat(duration) : null,
      raw: tag,
    });
  }
  return tracks;
}

function extractBgmChainSegments(html) {
  const block = html.match(/<!-- bgm-chain:begin -->[\s\S]*?<!-- bgm-chain:end -->/);
  if (!block) return [];
  const tracks = extractAudioTracks(block[0]);
  return tracks.filter((t) => /bgm/i.test(t.src) || /bgm-chain-segment/.test(t.raw));
}

const needsSfx = scriptHasSfxTag();
const totalVideoSec = parseTotalVideoSec(root);

if (!exists("index.html")) {
  errors.push("missing index.html");
} else {
  const indexHtml = read("index.html");
  const tracks = extractAudioTracks(indexHtml);
  const track12 = tracks.filter((t) => t.trackIndex === 12);
  const bgmSegments = extractBgmChainSegments(indexHtml);
  const track11 = tracks.filter((t) => t.trackIndex === 11 && /bgm/i.test(t.src));

  if (needsSfx) {
    if (!exists("assets/audio/sfx_hook.mp3")) {
      errors.push("missing assets/audio/sfx_hook.mp3 (script has [SFX: ...])");
    }
    if (track12.length === 0) {
      errors.push('index.html: no <audio data-track-index="12"> for meme SFX hook');
    } else {
      const hooked = track12.some((t) => /sfx_hook/i.test(t.src));
      if (!hooked) {
        errors.push(
          "index.html: track 12 must src=../assets/audio/sfx_hook.mp3 (or sfx_hook in path)",
        );
      }
    }
  }

  const hasManifest = exists(BGM_CHAIN_MANIFEST_REL);
  const hasLegacyBgm = exists("assets/audio/bgm.mp3");
  const hasNumberedBgm = exists("assets/audio") &&
    fs.readdirSync(path.join(root, "assets/audio")).some((f) => /^bgm_\d+\.mp3$/i.test(f));

  if (!hasManifest && !hasLegacyBgm && !hasNumberedBgm) {
    errors.push(`missing ${BGM_CHAIN_MANIFEST_REL} and no assets/audio/bgm_*.mp3 or bgm.mp3`);
  }

  if (track11.length === 0 && bgmSegments.length === 0) {
    errors.push('index.html: no BGM chain segment on track 11 — chạy wire-bgm-chain.mjs');
  }

  if (/\bloop\b/i.test(indexHtml) && /bgm/i.test(indexHtml)) {
    errors.push("index.html: cấm loop trên BGM — dùng BGM chain (wire-bgm-chain.mjs)");
  }

  if (totalVideoSec > 0 && (hasManifest || hasLegacyBgm || hasNumberedBgm)) {
    try {
      const manifest = loadOrBuildManifest(root, { totalVideoSec });
      const scheduled = manifest.segments.map((s, i) => ({
        ...s,
        startSec: bgmSegments[i]?.start ?? (i === 0 ? 0 : null),
        durationSec: bgmSegments[i]?.duration ?? s.fileDurationSec,
      }));

      if (bgmSegments.length > 0) {
        const last = bgmSegments[bgmSegments.length - 1];
        const covered =
          (last.start ?? 0) + (last.duration ?? 0);
        if (covered < totalVideoSec - 0.5) {
          errors.push(
            `BGM chain coverage ${covered.toFixed(2)}s < totalVideoSec=${totalVideoSec.toFixed(2)} — thêm segment`,
          );
        }
      } else if (!chainCoverageOk(
        scheduled.filter((s) => s.startSec != null),
        totalVideoSec,
      )) {
        errors.push(
          "BGM chain chưa wire vào index.html — chạy wire-bgm-chain.mjs",
        );
      }

      if (totalVideoSec > 90 && bgmSegments.length === 1) {
        warnings.push("video >90s nhưng chỉ 1 BGM segment — nên thêm bgm_2.mp3+");
      }
    } catch (err) {
      errors.push(String(err.message ?? err));
    }
  }
}

if (strict && exists("media-plan.md")) {
  const plan = read("media-plan.md");
  if (needsSfx && !/sfx_hook/i.test(plan)) {
    warnings.push("media-plan.md: missing sfx_hook row (recommended)");
  }
  if (!/bgm_global|bgm_\d|bgm-chain/i.test(plan)) {
    warnings.push("media-plan.md: missing bgm_global / bgm chain rows (recommended)");
  }
  if (!/hero_type|registry_block/i.test(plan)) {
    warnings.push(
      "media-plan.md: thiếu cột hero_type/registry_block — đọc media-mcp-activation.md",
    );
  }
} else if (strict) {
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
