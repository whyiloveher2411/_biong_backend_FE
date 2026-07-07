#!/usr/bin/env node
/**
 * Ghép import_html composition — deterministic, không agent.
 *
 * Usage:
 *   node scripts/assemble-import-html.mjs --short-video-id 24
 *     [--api-base-url URL] [--access-token TOKEN] [--mcp-token TOKEN]
 *     [--skip-bgm-download] [--dry-run] [--skip-preflight]
 *     [--context-snapshot PATH]  # bỏ qua MCP fetch, dùng file JSON local
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveApiBaseUrl, resolveMcpToken } from "./lib/biong-env.mjs";
import { fetchShortVideoContext, reportImportHtmlAssemble } from "./lib/fetch-short-video-context.mjs";
import { downloadToUrl, copyIfExists } from "./lib/download-asset.mjs";
import { buildAmbientLayerHtml } from "./lib/build-ambient-layer.mjs";
import { buildImportHtmlIndexHtml } from "./lib/build-import-html-index.mjs";
import { runNodeScript, runImportHtmlPreflight, PREFLIGHT } from "./lib/run-import-html-preflight.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HF_ASSETS = path.join(REPO_ROOT, ".cursor/skills/biong-short-video-hyperframes/assets");

function parseArgs(argv) {
  const out = {
    shortVideoId: 0,
    apiBaseUrl: "",
    accessToken: "",
    mcpToken: "",
    skipBgmDownload: false,
    dryRun: false,
    skipPreflight: false,
    contextSnapshot: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--short-video-id" || arg === "-i") {
      out.shortVideoId = parseInt(argv[++i] ?? "0", 10);
    } else if (arg === "--api-base-url") {
      out.apiBaseUrl = argv[++i] ?? "";
    } else if (arg === "--access-token") {
      out.accessToken = argv[++i] ?? "";
    } else if (arg === "--mcp-token") {
      out.mcpToken = argv[++i] ?? "";
    } else if (arg === "--context-snapshot") {
      out.contextSnapshot = argv[++i] ?? "";
    } else if (arg === "--skip-bgm-download") {
      out.skipBgmDownload = true;
    } else if (arg === "--dry-run") {
      out.dryRun = true;
    } else if (arg === "--skip-preflight") {
      out.skipPreflight = true;
    }
  }
  return out;
}

function resolveAudioUrl(ctx) {
  if (typeof ctx.audio_file === "string" && ctx.audio_file.trim()) {
    return ctx.audio_file.trim();
  }
  if (ctx.audio_file && typeof ctx.audio_file === "object") {
    return String(ctx.audio_file.url || ctx.audio_file.vi?.url || "").trim();
  }
  return "";
}

function ensureProjectScaffold(projectDir, shortVideoId, totalVideoSec) {
  fs.mkdirSync(path.join(projectDir, "assets/audio"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "assets/fonts"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "assets/images"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "compositions"), { recursive: true });

  const packagePath = path.join(projectDir, "package.json");
  if (!fs.existsSync(packagePath)) {
    fs.writeFileSync(
      packagePath,
      JSON.stringify(
        {
          name: "my-video",
          private: true,
          type: "module",
          scripts: {
            dev: "npx --yes hyperframes@0.7.14 preview",
            check:
              "npx --yes hyperframes@0.7.14 lint && npx --yes hyperframes@0.7.14 validate && npx --yes hyperframes@0.7.14 inspect",
            render: "npx --yes hyperframes@0.7.14 render",
          },
        },
        null,
        2,
      ),
    );
  }

  const metaPath = path.join(projectDir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          title: `Short Video #${shortVideoId}`,
          duration: totalVideoSec,
          fps: 30,
          width: 1080,
          height: 1920,
        },
        null,
        2,
      ),
    );
  }
}

function copySharedAssets(projectDir) {
  const logoSrc = path.join(HF_ASSETS, "spacedev-logo.png");
  copyIfExists(logoSrc, path.join(projectDir, "assets/images/spacedev-logo.png"));

  const fontNames = [
    "BeVietnamPro-Regular.ttf",
    "BeVietnamPro-SemiBold.ttf",
    "BeVietnamPro-Bold.ttf",
    "BeVietnamPro-ExtraBold.ttf",
  ];
  const fontSearchRoots = [
    path.join(REPO_ROOT, ".cursor/skills/biong-short-video-hyperframes/assets/fonts"),
    path.join(REPO_ROOT, ".cursor/skills/biong-short-video-preflight/scripts/fixtures/visual-pipeline-minimal/assets/fonts"),
    path.join(projectDir, "assets/fonts"),
  ];
  for (const name of fontNames) {
    const dest = path.join(projectDir, "assets/fonts", name);
    if (fs.existsSync(dest)) {
      continue;
    }
    for (const root of fontSearchRoots) {
      if (copyIfExists(path.join(root, name), dest)) {
        break;
      }
    }
  }

  const globalCssSrc = path.join(HF_ASSETS, "global-default-styles.css");
  copyIfExists(globalCssSrc, path.join(projectDir, "assets/global-default-styles.css"));
}

async function writeBgmChain(projectDir, segments, totalVideoSec, skipDownload) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return;
  }

  const audioDir = path.join(projectDir, "assets/audio");
  fs.mkdirSync(audioDir, { recursive: true });

  const manifestSegments = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const fileName = `bgm_${i + 1}.mp3`;
    const rel = `assets/audio/${fileName}`;
    const abs = path.join(projectDir, rel);
    if (!skipDownload) {
      await downloadToUrl(seg.download_url, abs);
    } else if (!fs.existsSync(abs)) {
      throw new Error(`Thiếu ${rel} — bỏ --skip-bgm-download hoặc tải BGM trước`);
    }
    manifestSegments.push({
      id: seg.id || `bgm-${i + 1}`,
      file: rel,
      fileDurationSec: Number(seg.duration_sec || 0),
    });
  }

  const manifest = {
    mood: "import_html",
    totalVideoSec,
    crossfadeSec: 0.5,
    segments: manifestSegments,
  };
  fs.writeFileSync(path.join(projectDir, "assets/bgm-chain.json"), JSON.stringify(manifest, null, 2));
}

function patchTimelineDurationFromCaption({
  projectDir,
  shortVideoId,
  beatMap,
  sections,
  options = {},
}) {
  const reportPath = path.join(projectDir, "assets/caption-sync-report.json");
  if (!fs.existsSync(reportPath)) {
    return Number(beatMap.totalVideoSec || 0);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const captionTotal = Number(report.totalVideoSec || 0);
  if (!(captionTotal > 0)) {
    return Number(beatMap.totalVideoSec || 0);
  }

  const beatSum = sections.reduce((sum, sec) => sum + Number(sec.durationSec || 0), 0);
  if (captionTotal > beatSum + 0.01) {
    const last = sections[sections.length - 1];
    if (last) {
      const delta = captionTotal - beatSum;
      last.durationSec = Number(last.durationSec || 0) + delta;
      last.endSec = Number(last.endSec || last.startSec + last.durationSec);
    }
  }

  beatMap.totalVideoSec = captionTotal;
  beatMap.sections = sections;
  fs.writeFileSync(path.join(projectDir, "assets/beat-map.json"), JSON.stringify(beatMap, null, 2));
  fs.writeFileSync(
    path.join(projectDir, "index.html"),
    buildImportHtmlIndexHtml({
      shortVideoId,
      totalVideoSec: captionTotal,
      sections,
      options,
    }),
  );
  fs.writeFileSync(
    path.join(projectDir, "compositions/ambient-layer.html"),
    buildAmbientLayerHtml(captionTotal),
  );
  fs.writeFileSync(
    path.join(projectDir, "meta.json"),
    JSON.stringify(
      {
        title: beatMap.title || `Short Video #${shortVideoId}`,
        duration: captionTotal,
        fps: 30,
        width: 1080,
        height: 1920,
      },
      null,
      2,
    ),
  );

  return captionTotal;
}

async function main() {
  const args = parseArgs(process.argv);
  const shortVideoId = Number(args.shortVideoId || 0);
  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    console.error("Usage: node scripts/assemble-import-html.mjs --short-video-id ID");
    process.exit(1);
  }

  const apiBaseUrl = resolveApiBaseUrl(args.apiBaseUrl);
  const accessToken = args.accessToken || process.env.BIONG_ACCESS_TOKEN || "";
  const mcpToken = resolveMcpToken(args.mcpToken);

  const renderRoot = path.join(REPO_ROOT, "storage/agent-renders", String(shortVideoId));
  const assetsDir = path.join(renderRoot, "assets");
  const projectDir = path.join(renderRoot, "my-video");
  const logPath = path.join(projectDir, "assets/assemble-log.txt");

  const log = (line) => {
    const msg = `[${new Date().toISOString()}] ${line}`;
    console.log(msg);
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, `${msg}\n`);
    } catch {
      // ignore
    }
  };

  try {
    await reportImportHtmlAssemble({
      shortVideoId,
      status: "none",
      apiBaseUrl,
      accessToken,
    });

    log(`Fetch context short_video_id=${shortVideoId}`);
    let ctx;
    if (args.contextSnapshot) {
      const snapPath = path.isAbsolute(args.contextSnapshot)
        ? args.contextSnapshot
        : path.join(REPO_ROOT, args.contextSnapshot);
      if (!fs.existsSync(snapPath)) {
        throw new Error(`Không tìm thấy context snapshot: ${snapPath}`);
      }
      ctx = JSON.parse(fs.readFileSync(snapPath, "utf8"));
      log(`Loaded context snapshot: ${snapPath}`);
    } else {
      ctx = await fetchShortVideoContext({
        shortVideoId,
        apiBaseUrl,
        mcpToken,
      });
    }

    if (ctx.render_mode !== "import_html") {
      throw new Error("render_mode phải là import_html");
    }
    const importHtml = ctx.import_html || {};
    if (!importHtml.import_html_ready) {
      throw new Error("import_html chưa sẵn sàng — cần đủ beat HTML + whisper");
    }

    const beatMap = importHtml.beat_map;
    const sections = beatMap?.sections || [];
    if (!sections.length) {
      throw new Error("Thiếu beat_map.sections");
    }

    const totalVideoSec = Number(
      beatMap.totalVideoSec || ctx.audio_file_duration_sec || sections.at(-1)?.endSec || 0,
    );
    if (!(totalVideoSec > 0)) {
      throw new Error("Không xác định được totalVideoSec");
    }

    if (args.dryRun) {
      log(`DRY RUN OK — ${sections.length} beats, ${totalVideoSec}s`);
      return;
    }

    ensureProjectScaffold(projectDir, shortVideoId, totalVideoSec);
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, "get-context-snapshot.json"), JSON.stringify(ctx, null, 2));
    fs.writeFileSync(path.join(projectDir, "assets/get-context-snapshot.json"), JSON.stringify(ctx, null, 2));
    fs.writeFileSync(path.join(projectDir, "assets/beat-map.json"), JSON.stringify(beatMap, null, 2));
    fs.writeFileSync(path.join(projectDir, "assets/render-mode.json"), JSON.stringify({ render_mode: "import_html" }, null, 2));
    fs.writeFileSync(
      path.join(projectDir, "assets/audio-script.txt"),
      `${String(ctx.audio_script || "").trim()}\n`,
    );

    const beatHtmlRaw = importHtml.beat_html || {};
    for (const sec of sections) {
      const beatId = sec.id || sec.beat_id;
      const entry = beatHtmlRaw[beatId];
      const html = typeof entry === "string" ? entry : entry?.html;
      if (!html) {
        throw new Error(`Thiếu beat_html cho ${beatId}`);
      }
      fs.writeFileSync(path.join(projectDir, "compositions", `${beatId}.html`), String(html), "utf8");
      log(`Wrote compositions/${beatId}.html`);
    }

    const audioUrl = resolveAudioUrl(ctx);
    if (!audioUrl) {
      throw new Error("Thiếu audio_file URL");
    }
    await downloadToUrl(audioUrl, path.join(projectDir, "assets/audio/narration.mp3"));
    log("Downloaded narration.mp3");

    const assets = importHtml.assets || {};
    const bgmSegments = Array.isArray(assets.bgm_segments) ? assets.bgm_segments : [];
    if (bgmSegments.length > 0) {
      await writeBgmChain(projectDir, bgmSegments, totalVideoSec, args.skipBgmDownload);
      log(`BGM chain: ${bgmSegments.length} segment(s)`);
    }

    copySharedAssets(projectDir);

    const whisperWords = importHtml.whisper_words || [];
    fs.writeFileSync(path.join(projectDir, "transcript.json"), JSON.stringify(whisperWords, null, 2));
    fs.writeFileSync(
      path.join(projectDir, "assets/transcribe-manifest.json"),
      JSON.stringify({ source: "cms_whisper", language: "vi", word_count: whisperWords.length }, null, 2),
    );

    fs.writeFileSync(
      path.join(projectDir, "compositions/ambient-layer.html"),
      buildAmbientLayerHtml(totalVideoSec),
    );

    const sfxBeatTransition = assets.sfx_beat_transition !== false;
    const sfxHook = Boolean(assets.sfx_hook);

    fs.writeFileSync(
      path.join(projectDir, "index.html"),
      buildImportHtmlIndexHtml({
        shortVideoId,
        totalVideoSec,
        sections,
        options: { sfxHook },
      }),
    );
    log("Wrote index.html skeleton");

    runNodeScript("bootstrap-phase2-assets.mjs", projectDir, [], "bootstrap-phase2-assets");
    runNodeScript("sync-caption-from-script.mjs", projectDir, [], "sync-caption-from-script");
    runNodeScript("verify-caption-sync.mjs", projectDir, ["--strict"], "verify-caption-sync");

    const timelineSec = patchTimelineDurationFromCaption({
      projectDir,
      shortVideoId,
      beatMap,
      sections,
      options: { sfxHook },
    });
    log(`Timeline duration patched to ${timelineSec}s from caption sync`);

    runNodeScript(
      "normalize-import-html-beat-for-render.mjs",
      projectDir,
      ["--localize-images"],
      "normalize-import-html-beat",
    );
    runNodeScript("sync-index-beats-from-map.mjs", projectDir, [], "sync-index-beats");
    runNodeScript("gen-captions-html.mjs", projectDir, [], "gen-captions-html");
    runNodeScript(
      "gen-brand-watermark.mjs",
      projectDir,
      ["--duration", String(timelineSec)],
      "gen-brand-watermark",
    );

    if (bgmSegments.length > 0) {
      runNodeScript("wire-bgm-chain.mjs", projectDir, [], "wire-bgm-chain");
    }
    if (sfxBeatTransition) {
      runNodeScript("wire-beat-transition-sfx.mjs", projectDir, ["--volume=0.35"], "wire-beat-transition-sfx");
    }

    runNodeScript("patch-import-html-render-lint.mjs", projectDir, [], "patch-import-html-render-lint");
    runNodeScript("sync-index-beats-from-map.mjs", projectDir, [], "sync-index-beats-final");

    if (!args.skipPreflight) {
      runImportHtmlPreflight(projectDir);
    }

    await reportImportHtmlAssemble({
      shortVideoId,
      status: "ok",
      apiBaseUrl,
      accessToken,
    });

    log(`✅ Assemble hoàn tất — ${projectDir}`);
    console.log(
      JSON.stringify({
        success: true,
        short_video_id: shortVideoId,
        project_dir: projectDir,
        total_video_sec: timelineSec,
        beat_count: sections.length,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`❌ ${message}`);
    await reportImportHtmlAssemble({
      shortVideoId,
      status: "failed",
      error: message,
      apiBaseUrl,
      accessToken,
    });
    console.error(message);
    process.exit(1);
  }
}

main();
