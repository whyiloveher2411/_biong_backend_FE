/**
 * Mix narration + BGM chain + SFX lên video overlay (B1).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildScheduledChain,
  loadOrBuildManifest,
} from "../../.cursor/skills/biong-short-video-preflight/scripts/lib/bgm-chain.mjs";
import { snapBeatSectionsForIndex } from "./build-import-html-index.mjs";

const SFX_HOOK_VOLUME = 0.45;
const SFX_BEAT_VOLUME = 0.55;
const SFX_DURATION_SEC = 0.58;

function runFfmpeg(args) {
  console.log(`\n▶ ffmpeg ${args.join(" ")}`);
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg exit ${result.status}`);
  }
}

function probeMediaDurationSec(filePath) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    return 0;
  }
  const value = Number(String(result.stdout || "").trim());
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function loadBeatMap(projectDir) {
  const beatMapPath = path.join(projectDir, "assets/beat-map.json");
  if (!fs.existsSync(beatMapPath)) {
    throw new Error("Thiếu assets/beat-map.json");
  }
  return JSON.parse(fs.readFileSync(beatMapPath, "utf8"));
}

/**
 * @returns {{ finalMp4: string }}
 */
export function mixImportHtmlAudio({
  projectDir,
  videoPath,
  outputPath,
  sfxHook = false,
}) {
  const beatMap = loadBeatMap(projectDir);
  const totalVideoSec = Number(beatMap.totalVideoSec || 0);
  if (!(totalVideoSec > 0)) {
    throw new Error("beat-map totalVideoSec invalid");
  }

  const narration = path.join(projectDir, "assets/audio/narration.mp3");
  if (!fs.existsSync(narration)) {
    throw new Error("Thiếu assets/audio/narration.mp3");
  }

  const inputs = ["-y", "-i", videoPath, "-i", narration];
  /** @type {string[]} */
  const filterParts = [];
  /** @type {string[]} */
  const mixLabels = [];

  // [0]=video, [1]=narration
  filterParts.push(`[1:a]volume=1.0,aformat=sample_rates=44100:channel_layouts=stereo[narr]`);
  mixLabels.push("[narr]");

  let inputIndex = 2;

  // BGM chain
  let bgmScheduled = [];
  try {
    const manifest = loadOrBuildManifest(projectDir, { totalVideoSec });
    const chain = buildScheduledChain(manifest);
    bgmScheduled = chain.scheduled || [];
  } catch (err) {
    console.warn(
      `[mix-audio] BGM skip: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const crossfadeSec = 0.5;
  for (let i = 0; i < bgmScheduled.length; i++) {
    const seg = bgmScheduled[i];
    const abs = path.join(projectDir, seg.file);
    if (!fs.existsSync(abs)) {
      console.warn(`[mix-audio] missing BGM ${seg.file}`);
      continue;
    }
    inputs.push("-i", abs);
    const delayMs = Math.max(0, Math.round(seg.startSec * 1000));
    const vol = Number(seg.volume) > 0 ? Number(seg.volume) : 0.3;
    const label = `bgm${i}`;
    // Trim to scheduled duration; fade in/out at segment boundaries for crossfade
    const dur = Math.max(0.05, Number(seg.durationSec));
    const fadeIn = i === 0 ? 0.01 : Math.min(crossfadeSec, dur / 2);
    const fadeOut = i === bgmScheduled.length - 1 ? 0.01 : Math.min(crossfadeSec, dur / 2);
    filterParts.push(
      `[${inputIndex}:a]atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fadeIn.toFixed(3)},afade=t=out:st=${(dur - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)},volume=${vol.toFixed(2)},adelay=${delayMs}|${delayMs},aformat=sample_rates=44100:channel_layouts=stereo[${label}]`,
    );
    mixLabels.push(`[${label}]`);
    inputIndex += 1;
  }

  // SFX hook at t=0
  const sfxHookPath = path.join(projectDir, "assets/audio/sfx_hook.mp3");
  if (sfxHook && fs.existsSync(sfxHookPath)) {
    inputs.push("-i", sfxHookPath);
    filterParts.push(
      `[${inputIndex}:a]atrim=0:${SFX_DURATION_SEC},asetpts=PTS-STARTPTS,volume=${SFX_HOOK_VOLUME},aformat=sample_rates=44100:channel_layouts=stereo[sfxhook]`,
    );
    mixLabels.push("[sfxhook]");
    inputIndex += 1;
  }

  // Beat transition SFX (beat 2+)
  const sfxMovePath = path.join(projectDir, "assets/audio/sfx_beat_move.mp3");
  const sections = snapBeatSectionsForIndex(
    beatMap.sections || [],
    totalVideoSec,
  );
  if (fs.existsSync(sfxMovePath)) {
    for (let i = 1; i < sections.length; i++) {
      const start = Number(sections[i].startSec || 0);
      const delayMs = Math.max(0, Math.round(start * 1000));
      inputs.push("-i", sfxMovePath);
      const label = `sfx${i}`;
      filterParts.push(
        `[${inputIndex}:a]atrim=0:${SFX_DURATION_SEC},asetpts=PTS-STARTPTS,volume=${SFX_BEAT_VOLUME},adelay=${delayMs}|${delayMs},aformat=sample_rates=44100:channel_layouts=stereo[${label}]`,
      );
      mixLabels.push(`[${label}]`);
      inputIndex += 1;
    }
  }

  const n = mixLabels.length;
  filterParts.push(
    `${mixLabels.join("")}amix=inputs=${n}:duration=longest:dropout_transition=0:normalize=0[aout]`,
  );

  const videoDur = probeMediaDurationSec(videoPath);
  const narrDur = probeMediaDurationSec(narration);
  const outputDur = Math.max(videoDur, narrDur, totalVideoSec);
  const padSec = Math.max(0, outputDur - videoDur);
  const videoMap = padSec > 0.01 ? "[vout]" : "0:v:0";
  if (padSec > 0.01) {
    filterParts.unshift(
      `[0:v]tpad=stop_mode=clone:stop_duration=${padSec.toFixed(3)}[vout]`,
    );
  }

  const filterComplex = filterParts.join(";");

  const ffmpegArgs = [
    ...inputs,
    "-filter_complex",
    filterComplex,
    "-map",
    videoMap,
    "-map",
    "[aout]",
  ];
  if (padSec > 0.01) {
    ffmpegArgs.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18");
  } else {
    ffmpegArgs.push("-c:v", "copy");
  }
  ffmpegArgs.push("-c:a", "aac", "-b:a", "192k", "-t", outputDur.toFixed(3), outputPath);
  runFfmpeg(ffmpegArgs);

  return { finalMp4: outputPath };
}
