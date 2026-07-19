#!/usr/bin/env node
/**
 * Ghép import_html composition — deterministic, không agent.
 *
 * Usage:
 *   node scripts/assemble-import-html.mjs --short-video-id 24
 *     [--api-base-url URL] [--access-token TOKEN] [--mcp-token TOKEN]
 *     [--skip-bgm-download] [--dry-run] [--skip-preflight]
 *     [--allow-caption-mismatch]  # bỏ verify --strict; karaoke text = script
 *     [--context-snapshot PATH]  # bỏ qua MCP fetch, dùng file JSON local
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveApiBaseUrl, resolveMcpToken } from "./lib/biong-env.mjs";
import { fetchShortVideoContext, reportImportHtmlAssemble } from "./lib/fetch-short-video-context.mjs";
import { collectImportHtmlBeatErrors } from "./lib/collect-import-html-beat-errors.mjs";
import { downloadToUrl, copyIfExists } from "./lib/download-asset.mjs";
import { buildAmbientLayerHtml } from "./lib/build-ambient-layer.mjs";
import { buildImportHtmlIndexHtml } from "./lib/build-import-html-index.mjs";
import { runNodeScript, runImportHtmlPreflight, PREFLIGHT } from "./lib/run-import-html-preflight.mjs";
import {
  tokenizeScript,
  interpolateTiming,
} from "../.cursor/skills/biong-short-video-preflight/scripts/lib/caption-script-align.mjs";
import { buildLipSyncTimeline } from "../.cursor/skills/biong-short-video-preflight/scripts/lib/avatar-lip-sync.mjs";
import { createAudioEnergy } from "../.cursor/skills/biong-short-video-preflight/scripts/lib/avatar-audio-energy.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HF_ASSETS = path.join(REPO_ROOT, ".cursor/skills/biong-short-video-hyperframes/assets");

function extFromUrl(url) {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname);
    const m = /\.(png|jpe?g|webp|gif)$/i.exec(base);
    if (m) return m[0].toLowerCase().replace("jpeg", "jpg");
  } catch {
    /* ignore */
  }
  return ".png";
}

/**
 * Tải avatar assets + ghi assets/avatar-overlay.json.
 * @returns {Promise<boolean>} true nếu bật overlay
 */
async function prepareAvatarOverlay(projectDir, ctx, importHtml, log) {
  const render = ctx?.agent_avatar_render;
  const cfgPath = path.join(projectDir, "assets/avatar-overlay.json");
  const compositionPath = path.join(projectDir, "compositions/avatar-overlay.html");
  const avatarId = Number(ctx?.agent_avatar_id || ctx?.agent_avatar?.avatar_id || 0);
  // Hiện avatar = có avatar_id (không còn toggle riêng)
  const showAvatar = avatarId > 0;
  if (!showAvatar || !render) {
    try {
      if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
      if (fs.existsSync(compositionPath)) fs.unlinkSync(compositionPath);
    } catch {
      /* ignore */
    }
    if (avatarId > 0 && !render) {
      log(
        "⚠️ Có avatar_id nhưng thiếu agent_avatar_render (avatar chưa verified / thiếu master) — bỏ overlay",
      );
    }
    return false;
  }
  const remoteAssets = render.assets && typeof render.assets === "object" ? render.assets : {};
  const masterUrl = String(remoteAssets.master || render.master_url || "").trim();
  if (!masterUrl) {
    log("⚠️ Avatar bật nhưng thiếu master_url — bỏ avatar overlay");
    return false;
  }

  const avatarDir = path.join(projectDir, "assets/avatar");
  fs.mkdirSync(avatarDir, { recursive: true });
  const localAssets = {};

  for (const [key, urlRaw] of Object.entries(remoteAssets)) {
    const url = String(urlRaw || "").trim();
    if (!url) continue;
    const ext = extFromUrl(url);
    const destRel = `assets/avatar/${key}${ext}`;
    const destAbs = path.join(projectDir, destRel);
    try {
      await downloadToUrl(url, destAbs);
      localAssets[key] = destRel;
    } catch (err) {
      log(`⚠️ Không tải được avatar asset ${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!localAssets.master && masterUrl) {
    const destRel = `assets/avatar/master${extFromUrl(masterUrl)}`;
    try {
      await downloadToUrl(masterUrl, path.join(projectDir, destRel));
      localAssets.master = destRel;
    } catch (err) {
      log(`⚠️ Không tải master avatar: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  let words = [];
  const captionList = importHtml?.caption_words_list;
  const captionNested = importHtml?.caption_words?.words;
  const whisper = importHtml?.whisper_words;
  if (Array.isArray(captionList) && captionList.length) {
    words = captionList;
  } else if (Array.isArray(captionNested) && captionNested.length) {
    words = captionNested;
  } else if (Array.isArray(whisper) && whisper.length) {
    words = whisper;
  }

  const cfg = {
    enabled: true,
    avatar_id: render.avatar_id || 0,
    assets: localAssets,
    composite_hints: render.composite_hints || null,
    pip: render.pip || { anchor: "bottom_right", width_ratio: 0.2, margin_px: 28 },
    words,
  };
  fs.writeFileSync(
    path.join(projectDir, "assets/avatar-overlay.json"),
    JSON.stringify(cfg, null, 2),
  );
  log(
    `Avatar overlay: id=${cfg.avatar_id}, assets=${Object.keys(localAssets).length}, words=${words.length}`,
  );
  return true;
}

/**
 * Preprocess lip-sync v2 → assets/avatar/mouth-timeline.json (trước gen-avatar-overlay).
 */
function prepareAvatarLipSyncTimeline(projectDir, totalSec, log) {
  const cfgPath = path.join(projectDir, "assets/avatar-overlay.json");
  if (!fs.existsSync(cfgPath)) return null;
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    return null;
  }
  if (!cfg?.enabled) return null;
  const words = Array.isArray(cfg.words) ? cfg.words : [];
  const duration = Math.max(0.1, Number(totalSec) || 0.1);

  let energyAt = null;
  let isLowEnergy = null;
  for (const rel of ["assets/narration.mp3", "assets/audio/narration.mp3", "narration.mp3"]) {
    const abs = path.join(projectDir, rel);
    if (!fs.existsSync(abs)) continue;
    const energy = createAudioEnergy(abs);
    if (energy.ok) {
      energyAt = (t) => energy.peakNorm(t);
      isLowEnergy = (t) => energy.isLowEnergy(t);
      log(`Avatar lip-sync RMS: ${rel} (${energy.durationSec.toFixed(1)}s)`);
    }
    break;
  }

  const tl = buildLipSyncTimeline({
    words,
    totalSec: duration,
    energyAt,
    isLowEnergy,
  });
  const outPath = path.join(projectDir, "assets/avatar/mouth-timeline.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(tl, null, 2));
  const st = tl.stats || {};
  log(
    `Avatar lip-sync v2: cues=${st.cueCount ?? 0} speaking=${st.speakingSec ?? 0}s silence=${st.silenceSec ?? 0}s gRatio=${st.gRatio ?? 0}`,
  );
  return tl;
}

function parseArgs(argv) {
  const out = {
    shortVideoId: 0,
    apiBaseUrl: "",
    accessToken: "",
    mcpToken: "",
    skipBgmDownload: false,
    dryRun: false,
    skipPreflight: false,
    allowCaptionMismatch: false,
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
    } else if (arg === "--allow-caption-mismatch") {
      out.allowCaptionMismatch = true;
    }
  }
  return out;
}

/**
 * Ép caption-words.json: text = audio script, timing giữ từ sync (nội suy nếu thiếu).
 * Dùng khi user xác nhận tiếp tục dù verify --strict fail.
 */
function forceCaptionWordsTextFromScript(projectDir) {
  const scriptPath = path.join(projectDir, "assets/audio-script.txt");
  const wordsPath = path.join(projectDir, "assets/caption-words.json");
  if (!fs.existsSync(scriptPath) || !fs.existsSync(wordsPath)) {
    throw new Error("Thiếu audio-script.txt hoặc caption-words.json — không ép text script được");
  }

  const scriptWords = tokenizeScript(fs.readFileSync(scriptPath, "utf8"));
  if (!scriptWords.length) {
    throw new Error("audio-script.txt rỗng sau tokenize");
  }

  let existing = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
    existing = Array.isArray(parsed) ? parsed : [];
  } catch {
    existing = [];
  }

  const n = scriptWords.length;
  const rebuilt = [];

  for (let i = 0; i < n; i++) {
    const prevExisting = existing[i - 1];
    const curExisting = existing[i];
    const nextExisting = existing[i + 1];

    const hasCur =
      curExisting &&
      Number.isFinite(Number(curExisting.start)) &&
      Number.isFinite(Number(curExisting.end));

    let start;
    let end;
    if (hasCur) {
      start = Number(curExisting.start);
      end = Number(curExisting.end);
    } else {
      const prev = rebuilt[i - 1]
        ? { start: rebuilt[i - 1].start, end: rebuilt[i - 1].end }
        : prevExisting && Number.isFinite(Number(prevExisting.start))
          ? { start: Number(prevExisting.start), end: Number(prevExisting.end) }
          : null;
      const next =
        nextExisting && Number.isFinite(Number(nextExisting.start))
          ? { start: Number(nextExisting.start), end: Number(nextExisting.end) }
          : null;
      const timing = interpolateTiming(prev, next, i, n);
      start = timing.start;
      end = timing.end;
    }

    if (end <= start) {
      end = start + 0.08;
    }

    rebuilt.push({
      text: scriptWords[i],
      start: +start.toFixed(3),
      end: +end.toFixed(3),
    });
  }

  for (let i = 1; i < rebuilt.length; i++) {
    if (rebuilt[i].start < rebuilt[i - 1].end) {
      rebuilt[i].start = rebuilt[i - 1].end;
    }
    if (rebuilt[i].end <= rebuilt[i].start) {
      rebuilt[i].end = +(rebuilt[i].start + 0.08).toFixed(3);
    }
  }

  fs.writeFileSync(wordsPath, JSON.stringify(rebuilt, null, 2));
  return { scriptWordCount: n, previousWordCount: existing.length };
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

function readCaptionSyncSummary(projectDir) {
  const reportPath = path.join(projectDir, "assets/caption-sync-report.json");
  if (!fs.existsSync(reportPath)) return null;
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    return {
      exact_ratio: report.exactRatio ?? null,
      trusted_ratio: report.trustedRatio ?? null,
      max_gap_sec: report.maxGapSec ?? null,
      large_gap_count: report.largeGapCount ?? 0,
      karaoke_quality: report.karaokeQuality ?? null,
      synced_at: report.generatedAt ?? null,
    };
  } catch {
    return null;
  }
}

function buildCaptionSyncFailureMessage(projectDir, fallback = "") {
  const parts = [];
  try {
    const reportPath = path.join(projectDir, "assets/caption-sync-report.json");
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      const scriptCount = Number(report.scriptWordCount || 0);
      const interpolated = Number(report.interpolatedCount || 0);
      const unmatchedRatio = Number(report.unmatchedRatio || 0);
      const trustedRatio = Number(report.trustedRatio || 0);
      const source = String(report.source || "");

      if (scriptCount > 0 && interpolated > 0) {
        const pct = ((interpolated / scriptCount) * 100).toFixed(1);
        parts.push(`Caption lệch script: ${interpolated}/${scriptCount} từ (${pct}%) chưa khớp timing Whisper`);
      } else if (unmatchedRatio > 0.1) {
        parts.push(`Caption lệch script ${(unmatchedRatio * 100).toFixed(1)}%`);
      }
      if (trustedRatio > 0 && trustedRatio < 0.7) {
        parts.push(`Timing tin cậy ${(trustedRatio * 100).toFixed(1)}% (cần ≥70%)`);
      }
      const remainingUntrusted =
        Number(report.preRepairUntrustedCount ?? 0) - Number(report.repairedCount ?? 0);
      if (remainingUntrusted > 0) {
        parts.push(
          `${remainingUntrusted} từ chưa khớp Whisper sau sửa lân cận — kiểm tra transcribe hoặc audio script`,
        );
      } else if (Number(report.whisperWordCount || report.transcriptWordCount || 0) === 0) {
        parts.push("Thiếu whisper_words — chạy transcribe Whisper trên tab HTML chatbot");
      }
    }
  } catch {
    // ignore parse errors
  }

  if (parts.length > 0) {
    return parts.join(". ");
  }
  return fallback || "verify-caption-sync thất bại — caption script và Whisper chưa khớp";
}

function buildBeatTimingFailureMessage(projectDir, fallback = "") {
  return fallback || "check-beat-timing thất bại — timing beat không hợp lệ (liên tục / khớp audio)";
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
      try {
        ctx = await fetchShortVideoContext({
          shortVideoId,
          apiBaseUrl,
          mcpToken,
        });
      } catch (fetchError) {
        const detail = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(
          `fetch context failed (${apiBaseUrl || "default"}): ${detail}`,
        );
      }
    }

    if (ctx.render_mode !== "import_html") {
      throw new Error("render_mode phải là import_html");
    }
    const importHtml = ctx.import_html || {};
    if (!importHtml.import_html_ready) {
      throw new Error("import_html chưa sẵn sàng — cần đủ beat HTML + whisper");
    }

    const beatMap = { ...(importHtml.beat_map || {}) };
    let sections = beatMap?.sections || [];
    if (!sections.length) {
      throw new Error("Thiếu beat_map.sections");
    }
    // Giữ nguyên sections từ CMS — không tách beat_*_partN trong code.
    // Gợi ý 5–20s chỉ nằm ở prompt chia beat (AI phân bố nội dung).

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
    const beatHtmlById = {};
    for (const sec of importHtml.beat_map?.sections || []) {
      const beatId = sec.id || sec.beat_id;
      const entry = beatHtmlRaw[beatId];
      const html = typeof entry === "string" ? entry : entry?.html;
      if (html) {
        beatHtmlById[String(beatId)] = String(html);
      }
    }

    const keepBeatIds = new Set();
    for (const sec of sections) {
      const beatId = sec.id || sec.beat_id;
      const html = beatHtmlById[String(beatId)];
      if (!html) {
        throw new Error(`Thiếu beat_html cho ${beatId}`);
      }
      keepBeatIds.add(String(beatId));
      fs.writeFileSync(path.join(projectDir, "compositions", `${beatId}.html`), html, "utf8");
      log(`Wrote compositions/${beatId}.html`);
    }

    // Xóa beat_*.html thừa từ lần render trước (VD: CMS rút 21→16 beat).
    const compositionsDir = path.join(projectDir, "compositions");
    for (const name of fs.readdirSync(compositionsDir)) {
      const m = /^beat_\d+(?:_part\d+)?\.html$/i.exec(name);
      if (!m) continue;
      const staleId = name.replace(/\.html$/i, "");
      if (keepBeatIds.has(staleId)) continue;
      fs.unlinkSync(path.join(compositionsDir, name));
      log(`Removed stale compositions/${name}`);
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
      path.join(projectDir, "compositions/ambient-layer.html"),
      buildAmbientLayerHtml(totalVideoSec),
    );

    const sfxBeatTransition = assets.sfx_beat_transition !== false;
    const sfxHook = Boolean(assets.sfx_hook);
    let avatarOverlay = false;
    const showCaptions = ctx?.agent_show_karaoke !== false;

    fs.writeFileSync(
      path.join(projectDir, "index.html"),
      buildImportHtmlIndexHtml({
        shortVideoId,
        totalVideoSec,
        sections,
        options: { sfxHook, avatarOverlay, showCaptions },
      }),
    );
    log(`Wrote index.html skeleton (karaoke=${showCaptions ? "on" : "off"})`);

    runNodeScript("bootstrap-phase2-assets.mjs", projectDir, [], "bootstrap-phase2-assets");

    if (!whisperWords.length) {
      throw new Error(
        "Thiếu whisper_words — chạy transcribe Whisper trên tab HTML chatbot trước khi ghép",
      );
    }

    fs.writeFileSync(
      path.join(projectDir, "assets/transcribe-manifest.json"),
      JSON.stringify({ source: "cms_whisper", language: "vi", word_count: whisperWords.length }, null, 2),
    );
    runNodeScript("sync-caption-from-script.mjs", projectDir, [], "sync-caption-from-script");

    if (showCaptions) {
      if (args.allowCaptionMismatch) {
        log("⚠️ allow-caption-mismatch — bỏ verify strict; karaoke text = script");
        const forced = forceCaptionWordsTextFromScript(projectDir);
        log(
          `Ép caption text từ script: ${forced.scriptWordCount} từ (trước đó ${forced.previousWordCount})`,
        );
      } else {
        try {
          runNodeScript("verify-caption-sync.mjs", projectDir, ["--strict"], "verify-caption-sync");
        } catch (verifyError) {
          const detail = buildCaptionSyncFailureMessage(
            projectDir,
            verifyError instanceof Error ? verifyError.message : String(verifyError),
          );
          throw new Error(detail);
        }
      }
    } else {
      log("Karaoke tắt — bỏ verify caption sync / không ghép captions-layer");
    }

    const timelineSec = patchTimelineDurationFromCaption({
      projectDir,
      shortVideoId,
      beatMap,
      sections,
      options: { sfxHook, avatarOverlay, showCaptions },
    });
    log(`Timeline duration patched to ${timelineSec}s from caption sync`);

    avatarOverlay = await prepareAvatarOverlay(projectDir, ctx, importHtml, log);
    if (avatarOverlay) {
      // refresh index với avatar host sau khi đã có config
      fs.writeFileSync(
        path.join(projectDir, "index.html"),
        buildImportHtmlIndexHtml({
          shortVideoId,
          totalVideoSec: timelineSec,
          sections,
          options: { sfxHook, avatarOverlay: true, showCaptions },
        }),
      );
      // Ưu tiên words đã sync karaoke
      try {
        const cwPath = path.join(projectDir, "assets/caption-words.json");
        if (fs.existsSync(cwPath)) {
          const cw = JSON.parse(fs.readFileSync(cwPath, "utf8"));
          const list = Array.isArray(cw?.words) ? cw.words : Array.isArray(cw) ? cw : [];
          if (list.length) {
            const cfgPath = path.join(projectDir, "assets/avatar-overlay.json");
            const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
            cfg.words = list;
            fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
            log(`Avatar overlay words ← caption-words.json (${list.length})`);
          }
        }
      } catch {
        /* keep whisper/caption from context */
      }
    }

    runNodeScript(
      "normalize-import-html-beat-for-render.mjs",
      projectDir,
      ["--localize-images"],
      "normalize-import-html-beat",
    );
    runNodeScript("sync-index-beats-from-map.mjs", projectDir, [], "sync-index-beats");
    if (showCaptions) {
      runNodeScript("gen-captions-html.mjs", projectDir, [], "gen-captions-html");
    } else {
      try {
        const captionsPath = path.join(projectDir, "compositions/captions.html");
        if (fs.existsSync(captionsPath)) fs.unlinkSync(captionsPath);
      } catch {
        /* ignore */
      }
      log("Bỏ gen-captions-html (karaoke tắt)");
    }
    runNodeScript(
      "gen-brand-watermark.mjs",
      projectDir,
      ["--duration", String(timelineSec)],
      "gen-brand-watermark",
    );
    if (avatarOverlay) {
      prepareAvatarLipSyncTimeline(projectDir, timelineSec, log);
      runNodeScript(
        "gen-avatar-overlay.mjs",
        projectDir,
        ["--duration", String(timelineSec)],
        "gen-avatar-overlay",
      );
    }

    if (bgmSegments.length > 0) {
      runNodeScript("wire-bgm-chain.mjs", projectDir, [], "wire-bgm-chain");
    }
    if (sfxBeatTransition) {
      runNodeScript("wire-beat-transition-sfx.mjs", projectDir, ["--volume=0.35"], "wire-beat-transition-sfx");
    }

    runNodeScript("patch-import-html-render-lint.mjs", projectDir, [], "patch-import-html-render-lint");
    runNodeScript("sync-index-beats-from-map.mjs", projectDir, [], "sync-index-beats-final");

    if (!args.skipPreflight) {
      try {
        runImportHtmlPreflight(projectDir, {
          strictCaption: showCaptions && !args.allowCaptionMismatch,
          skipCaptionVerify: !showCaptions || args.allowCaptionMismatch,
        });
      } catch (preflightError) {
        const raw = preflightError instanceof Error ? preflightError.message : String(preflightError);
        if (/check-beat-timing/i.test(raw)) {
          throw new Error(buildBeatTimingFailureMessage(projectDir, raw));
        }
        throw preflightError;
      }
    }

    const beatLint = collectImportHtmlBeatErrors(projectDir);
    if (beatLint.beatIds.length > 0) {
      log(`⚠️ ${beatLint.summary} — bỏ qua, tiếp tục ghép (lenient)`);
    }

    await reportImportHtmlAssemble({
      shortVideoId,
      status: "ok",
      captionSync: readCaptionSyncSummary(projectDir),
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
    const isCaptionSyncFail =
      /Caption lệch script|verify-caption-sync|cấm dùng Whisper text|chưa khớp timing Whisper/i.test(
        message,
      );
    let beatErrors = {};
    // Caption sync fail không phải lỗi HTML beat — tránh gắn nhầm lên mọi beat.
    if (!isCaptionSyncFail && fs.existsSync(projectDir)) {
      beatErrors = collectImportHtmlBeatErrors(projectDir).beatErrors;
    }
    await reportImportHtmlAssemble({
      shortVideoId,
      status: "failed",
      error: message,
      beatErrors,
      stage: "assemble",
      apiBaseUrl,
      accessToken,
    });
    console.error(message);
    process.exit(1);
  }
}

main();
