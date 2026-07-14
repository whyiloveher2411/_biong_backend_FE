/**
 * ffmpeg helpers: concat silent beat clips → visual-silent.mp4
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function runFfmpeg(args) {
  console.log(`\n▶ ffmpeg ${args.join(" ")}`);
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg exit ${result.status}`);
  }
}

/**
 * Concat beat MP4s (hard cut), strip audio, unify 1080x1920@30.
 */
export function concatSilentBeatClips(clipPaths, outputPath) {
  if (!clipPaths?.length) {
    throw new Error("concatSilentBeatClips: empty clip list");
  }
  for (const p of clipPaths) {
    if (!fs.existsSync(p)) {
      throw new Error(`Missing beat clip: ${p}`);
    }
  }

  const outDir = path.dirname(outputPath);
  fs.mkdirSync(outDir, { recursive: true });
  const listPath = path.join(outDir, "concat-list.txt");

  // Re-encode each clip to identical stream first (avoid concat demuxer codec mismatch)
  const normalized = [];
  for (let i = 0; i < clipPaths.length; i++) {
    const normPath = path.join(outDir, `_norm_${String(i).padStart(3, "0")}.mp4`);
    runFfmpeg([
      "-y",
      "-i",
      clipPaths[i],
      "-an",
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-movflags",
      "+faststart",
      normPath,
    ]);
    normalized.push(normPath);
  }

  const listBody = normalized
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(listPath, listBody, "utf8");

  runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  for (const p of normalized) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
  try {
    fs.unlinkSync(listPath);
  } catch {
    /* ignore */
  }

  return outputPath;
}
