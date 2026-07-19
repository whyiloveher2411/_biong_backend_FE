#!/usr/bin/env node
/**
 * Render import_html — A1+B1:
 *   mỗi beat silent (--workers 1, parallel giữa các beat) → concat → overlay → mux audio.
 * Không dùng full composite index.html làm pass render chính.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hydrateBiongEnv, resolveApiBaseUrl } from "./lib/biong-env.mjs";
import { reportImportHtmlBeatErrors } from "./lib/fetch-short-video-context.mjs";
import { collectImportHtmlBeatErrors } from "./lib/collect-import-html-beat-errors.mjs";
import { snapBeatSectionsForIndex } from "./lib/build-import-html-index.mjs";
import { preparePerBeatClipDir } from "./lib/build-per-beat-render-index.mjs";
import { buildOverlayIndexHtml } from "./lib/build-overlay-index.mjs";
import { concatSilentBeatClips } from "./lib/concat-silent-beat-clips.mjs";
import { mixImportHtmlAudio } from "./lib/mix-import-html-audio.mjs";
import { mapPool, resolveConcurrency } from "./lib/map-pool.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HYPERFRAMES_PKG = "hyperframes@0.7.14";
hydrateBiongEnv(REPO_ROOT);

function parseArgs(argv) {
  const out = {
    shortVideoId: 0,
    skipAssemble: false,
    apiBaseUrl: "",
    accessToken: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--short-video-id" || arg === "-i") {
      out.shortVideoId = parseInt(argv[++i] ?? "0", 10);
    } else if (arg === "--skip-assemble") {
      out.skipAssemble = true;
    } else if (arg === "--api-base-url") {
      out.apiBaseUrl = argv[++i] ?? "";
    } else if (arg === "--access-token") {
      out.accessToken = argv[++i] ?? "";
    }
  }
  return out;
}

function runSync(cmd, args, opts = {}) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} exit ${result.status}`);
  }
}

function runAsync(cmd, args, opts = {}) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exit ${code}`));
    });
  });
}

function ensureSymlinkAbs(linkPath, targetAbs) {
  try {
    fs.lstatSync(linkPath);
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {
    /* missing */
  }
  fs.symlinkSync(targetAbs, linkPath);
}

function loadBeatMap(projectDir) {
  const beatMapPath = path.join(projectDir, "assets/beat-map.json");
  if (!fs.existsSync(beatMapPath)) {
    throw new Error("Thiếu assets/beat-map.json — chạy assemble trước");
  }
  return JSON.parse(fs.readFileSync(beatMapPath, "utf8"));
}

function hasSfxHook(projectDir) {
  const indexPath = path.join(projectDir, "index.html");
  if (fs.existsSync(indexPath) && /sfx-hook|sfx_hook/i.test(fs.readFileSync(indexPath, "utf8"))) {
    return true;
  }
  return fs.existsSync(path.join(projectDir, "assets/audio/sfx_hook.mp3"));
}

/**
 * @param {string} cwd
 * @param {string} outputAbs
 * @param {{ workers?: number|string }} [opts]
 *   Beat: workers=1 (capture tuần tự ≈ preview). Overlay: auto.
 *   Cấm tăng workers trong beat — multi-worker seek phá sticky opacity.
 */
async function renderHyperframes(cwd, outputAbs, opts = {}) {
  const workers = opts.workers ?? 1;
  await runAsync(
    "npx",
    [
      "--yes",
      HYPERFRAMES_PKG,
      "render",
      "--quality",
      "high",
      "--fps",
      "30",
      "--workers",
      String(workers),
      "-o",
      outputAbs,
    ],
    { cwd },
  );
  if (!fs.existsSync(outputAbs)) {
    throw new Error(`HyperFrames không ghi output: ${outputAbs}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const shortVideoId = Number(args.shortVideoId || 0);
  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    console.error("Usage: node scripts/render-import-html.mjs --short-video-id ID");
    process.exit(1);
  }

  const apiBaseUrl = resolveApiBaseUrl(args.apiBaseUrl);
  const accessToken = args.accessToken || process.env.BIONG_ACCESS_TOKEN || "";
  const projectDir = path.join(REPO_ROOT, "storage/agent-renders", String(shortVideoId), "my-video");
  const indexPath = path.join(projectDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("Thiếu index.html — chạy assemble trước");
  }

  const patchScript = path.join(
    REPO_ROOT,
    ".cursor/skills/biong-short-video-preflight/scripts/patch-import-html-render-lint.mjs",
  );
  const syncBeatsScript = path.join(
    REPO_ROOT,
    ".cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs",
  );

  const beatConcurrency = resolveConcurrency(process.env.IMPORT_HTML_BEAT_CONCURRENCY, {
    defaultValue: 3,
    min: 1,
    max: 4,
  });

  try {
    runSync("node", [patchScript, projectDir], { cwd: REPO_ROOT });
    runSync("node", [syncBeatsScript, projectDir], { cwd: REPO_ROOT });

    const preRenderLint = collectImportHtmlBeatErrors(projectDir);
    if (preRenderLint.beatIds.length > 0) {
      console.warn(`[render-import-html] WARN: ${preRenderLint.summary} — tiếp tục render (lenient)`);
    }

    const beatMap = loadBeatMap(projectDir);
    const totalVideoSec = Number(beatMap.totalVideoSec || 0);
    if (!(totalVideoSec > 0)) {
      throw new Error("beat-map.totalVideoSec invalid");
    }
    const sections = snapBeatSectionsForIndex(beatMap.sections || [], totalVideoSec);
    if (!sections.length) {
      throw new Error("beat-map.sections empty");
    }

    const rendersDir = path.join(projectDir, "renders");
    fs.mkdirSync(rendersDir, { recursive: true });

    // --- 1) Per-beat silent renders (parallel giữa beat, mỗi beat --workers 1) ---
    console.log(
      `\n[render-import-html] per-beat parallel concurrency=${beatConcurrency} (IMPORT_HTML_BEAT_CONCURRENCY), workers=1 each`,
    );

    const beatMp4s = await mapPool(sections, beatConcurrency, async (sec, index) => {
      const beatId = sec.id || sec.beat_id;
      const dur = Number(sec.durationSec);
      const beatFile = path.join(projectDir, "compositions", `${beatId}.html`);
      if (!fs.existsSync(beatFile)) {
        throw new Error(`Thiếu compositions/${beatId}.html`);
      }
      const slot = `${index + 1}/${sections.length}`;
      console.log(`\n[render-import-html] beat ${beatId} start (${dur.toFixed(3)}s) slot ${slot}`);
      try {
        const { clipDir, outputMp4 } = preparePerBeatClipDir(projectDir, beatId, dur);
        await renderHyperframes(clipDir, outputMp4, { workers: 1 });
        console.log(`[render-import-html] beat ${beatId} done slot ${slot}`);
        return outputMp4;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`beat ${beatId}: ${msg}`);
      }
    });

    // --- 2) Concat silent ---
    const silentPath = path.join(rendersDir, "visual-silent.mp4");
    console.log("\n[render-import-html] concat silent visual…");
    await concatSilentBeatClips(beatMp4s, silentPath, {
      concurrency: resolveConcurrency(
        process.env.IMPORT_HTML_FFMPEG_CONCURRENCY ?? process.env.IMPORT_HTML_BEAT_CONCURRENCY,
        { defaultValue: 3, min: 1, max: 4 },
      ),
    });

    // --- 3) Overlay pass ---
    const overlayDir = path.join(rendersDir, "overlay");
    fs.mkdirSync(overlayDir, { recursive: true });
    ensureSymlinkAbs(path.join(overlayDir, "compositions"), path.join(projectDir, "compositions"));
    ensureSymlinkAbs(path.join(overlayDir, "assets"), path.join(projectDir, "assets"));
    const underlayInOverlay = path.join(overlayDir, "underlay.mp4");
    fs.copyFileSync(silentPath, underlayInOverlay);
    const avatarOverlay =
      fs.existsSync(path.join(projectDir, "compositions/avatar-overlay.html"))
      && fs.existsSync(path.join(projectDir, "assets/avatar-overlay.json"));
    const showCaptions = fs.existsSync(path.join(projectDir, "compositions/captions.html"));
    if (avatarOverlay) {
      console.log("[render-import-html] avatar overlay ON");
    }
    if (!showCaptions) {
      console.log("[render-import-html] karaoke OFF — bỏ captions-layer");
    }
    fs.writeFileSync(
      path.join(overlayDir, "index.html"),
      buildOverlayIndexHtml({
        shortVideoId,
        totalVideoSec,
        underlaySrc: "underlay.mp4",
        avatarOverlay,
        showCaptions,
      }),
      "utf8",
    );
    const overlayMp4 = path.join(rendersDir, "visual-with-overlay.mp4");
    console.log("\n[render-import-html] overlay pass…");
    await renderHyperframes(overlayDir, overlayMp4, { workers: "auto" });

    // --- 4) Mux audio ---
    const finalMp4 = path.join(rendersDir, "final.mp4");
    console.log("\n[render-import-html] mix audio…");
    mixImportHtmlAudio({
      projectDir,
      videoPath: overlayMp4,
      outputPath: finalMp4,
      sfxHook: hasSfxHook(projectDir),
    });

    // Touch final last so findLatestMp4 still works
    const now = new Date();
    fs.utimesSync(finalMp4, now, now);

    await reportImportHtmlBeatErrors({
      shortVideoId,
      stage: "render",
      status: "ok",
      apiBaseUrl,
      accessToken,
    });

    console.log(
      JSON.stringify({
        success: true,
        short_video_id: shortVideoId,
        mp4: path.resolve(finalMp4),
        pipeline: "per-beat-concat-overlay-audio",
        beat_count: sections.length,
        beat_concurrency: beatConcurrency,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (fs.existsSync(projectDir)) {
      const collected = collectImportHtmlBeatErrors(projectDir);
      await reportImportHtmlBeatErrors({
        shortVideoId,
        stage: "render",
        status: "failed",
        error: message,
        beatErrors: collected.beatErrors,
        apiBaseUrl,
        accessToken,
      });
    }
    console.error(message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
