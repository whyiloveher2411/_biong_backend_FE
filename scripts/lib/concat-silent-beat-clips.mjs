/**
 * ffmpeg helpers: concat silent beat clips → visual-silent.mp4
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { mapPool, resolveConcurrency } from "./map-pool.mjs";

function runFfmpegSync(args) {
  console.log(`\n▶ ffmpeg ${args.join(" ")}`);
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg exit ${result.status}`);
  }
}

function runFfmpegAsync(args) {
  console.log(`\n▶ ffmpeg ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}`));
    });
  });
}

/**
 * Concat beat MP4s (hard cut), strip audio, unify 1080x1920@30.
 * Normalize từng clip có thể chạy song song (vẫn re-encode thống nhất trước concat copy).
 *
 * @param {string[]} clipPaths
 * @param {string} outputPath
 * @param {{ concurrency?: number }} [opts]
 */
export async function concatSilentBeatClips(clipPaths, outputPath, opts = {}) {
  if (!clipPaths?.length) {
    throw new Error("concatSilentBeatClips: empty clip list");
  }
  for (const p of clipPaths) {
    if (!fs.existsSync(p)) {
      throw new Error(`Missing beat clip: ${p}`);
    }
  }

  const concurrency = resolveConcurrency(opts.concurrency, {
    defaultValue: 3,
    min: 1,
    max: 4,
  });

  const outDir = path.dirname(outputPath);
  fs.mkdirSync(outDir, { recursive: true });
  const listPath = path.join(outDir, "concat-list.txt");

  const indices = clipPaths.map((_, i) => i);
  console.log(`[concat] normalize ${clipPaths.length} clips concurrency=${concurrency}`);

  const normalized = await mapPool(indices, concurrency, async (i) => {
    const normPath = path.join(outDir, `_norm_${String(i).padStart(3, "0")}.mp4`);
    await runFfmpegAsync([
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
    return normPath;
  });

  const listBody = normalized
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(listPath, listBody, "utf8");

  runFfmpegSync([
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
