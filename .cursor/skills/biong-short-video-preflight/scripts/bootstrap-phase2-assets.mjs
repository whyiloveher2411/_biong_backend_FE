#!/usr/bin/env node
/**
 * Bootstrap phase 2 local files từ short_video_get_context snapshot.
 * Tránh agent ghi tay sai format / thiếu language.
 *
 * Usage:
 *   node bootstrap-phase2-assets.mjs <project-dir> [--context assets/get-context-snapshot.json]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_CONTEXT_REL = "assets/get-context-snapshot.json";
const AUDIO_SCRIPT_REL = "assets/audio-script.txt";
const AGENT_METADATA_REL = "assets/agent-metadata.json";

function parseArgs(argv) {
  const out = { projectDir: "", contextRel: DEFAULT_CONTEXT_REL };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--context" && argv[i + 1]) {
      out.contextRel = argv[++i];
    } else if (!argv[i].startsWith("-") && !out.projectDir) {
      out.projectDir = argv[i];
    }
  }
  return out;
}

function stripShortVideoSuffix(title) {
  return String(title ?? "")
    .trim()
    .replace(/\s*[—–-]\s*Short video\s*#\d+\s*$/iu, "")
    .trim();
}

function resolveArticleTitle(ctx) {
  const fromCtx = String(ctx.article_title ?? "").trim();
  if (fromCtx) return fromCtx;

  const fromBrief = String(ctx.creative_brief?.article_title ?? "").trim();
  if (fromBrief) return fromBrief;

  const fromMarketing = String(ctx.creative_brief?.marketing_post_title ?? "").trim();
  if (fromMarketing) return fromMarketing;

  return stripShortVideoSuffix(ctx.title ?? "");
}

function pickMetadata(ctx) {
  const meta = ctx.audio_script_metadata ?? {};
  const lang =
    meta.language ||
    ctx.lang ||
    ctx.language ||
    "vi";

  const markers = Array.isArray(meta.markers)
    ? meta.markers
    : Array.isArray(ctx.markers)
      ? ctx.markers
      : [];

  let timeline = meta.timeline ?? ctx.timeline ?? {};
  if (typeof timeline !== "object" || timeline === null) {
    timeline = {};
  }

  const estimated =
    Number(meta.estimated_duration_sec ?? ctx.estimated_duration_sec ?? timeline.total ?? 0) ||
    90;

  if (!timeline.total) {
    timeline = { ...timeline, total: estimated };
  }

  return {
    language: String(lang).split("-")[0].toLowerCase(),
    markers,
    timeline,
    estimated_duration_sec: estimated,
    article_title: resolveArticleTitle(ctx),
  };
}

function main() {
  const { projectDir: rawDir, contextRel } = parseArgs(process.argv);
  if (!rawDir) {
    console.error(
      `usage: node bootstrap-phase2-assets.mjs <project-dir> [--context ${DEFAULT_CONTEXT_REL}]`,
    );
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);
  const contextPath = path.join(projectDir, contextRel);

  if (!fs.existsSync(contextPath)) {
    console.error(
      `Thiếu ${contextRel} — lưu toàn bộ response short_video_get_context vào file này trước`,
    );
    process.exit(1);
  }

  let ctx;
  try {
    ctx = JSON.parse(fs.readFileSync(contextPath, "utf8"));
  } catch {
    console.error(`${contextRel} không parse được JSON`);
    process.exit(1);
  }

  const audioScript = String(ctx.audio_script ?? "").trim();
  if (!audioScript) {
    console.error("get-context-snapshot thiếu audio_script — chạy phase 1 save_audio_script trước");
    process.exit(1);
  }

  const metadata = pickMetadata(ctx);
  if (!metadata.markers.length) {
    console.warn(
      "[bootstrap] Cảnh báo: markers rỗng — HASCAS narrative anchors thiếu (chỉ ảnh hưởng Phase 1 metadata)",
    );
  }

  const visualShotPlan =
    ctx.visual_shot_plan ??
    ctx.audio_script_metadata?.visual_shot_plan ??
    metadata.visual_shot_plan ??
    null;

  fs.mkdirSync(path.join(projectDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(projectDir, AUDIO_SCRIPT_REL), audioScript);
  fs.writeFileSync(
    path.join(projectDir, AGENT_METADATA_REL),
    JSON.stringify(metadata, null, 2),
  );

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const skillAssetsDir = path.resolve(
    scriptDir,
    "../../biong-short-video-hyperframes/assets",
  );
  const globalStylesSrc = path.join(skillAssetsDir, "global-default-styles.css");
  const globalStylesDest = path.join(projectDir, "assets/global-default-styles.css");
  if (fs.existsSync(globalStylesSrc)) {
    fs.copyFileSync(globalStylesSrc, globalStylesDest);
    console.log("[bootstrap] copied assets/global-default-styles.css");
  } else {
    console.warn(
      "[bootstrap] Cảnh báo: thiếu skill global-default-styles.css — copy thủ công",
    );
  }

  const sfxSrc = path.join(skillAssetsDir, "audio/sfx_beat_move.mp3");
  const repoSfx = path.resolve(scriptDir, "../../../short_video_beat_move.mp3");
  const sfxDestDir = path.join(projectDir, "assets/audio");
  fs.mkdirSync(sfxDestDir, { recursive: true });
  const sfxSource = fs.existsSync(sfxSrc)
    ? sfxSrc
    : fs.existsSync(repoSfx)
      ? repoSfx
      : "";
  if (sfxSource) {
    fs.copyFileSync(sfxSource, path.join(sfxDestDir, "sfx_beat_move.mp3"));
    console.log("[bootstrap] copied assets/audio/sfx_beat_move.mp3");
  } else {
    console.warn(
      "[bootstrap] Cảnh báo: thiếu short_video_beat_move.mp3 — copy thủ công",
    );
  }

  if (Array.isArray(visualShotPlan) && visualShotPlan.length) {
    const shotPath = path.join(projectDir, "assets/visual-shot-plan.json");
    fs.writeFileSync(shotPath, JSON.stringify(visualShotPlan, null, 2));
    console.log(
      `[bootstrap] wrote assets/visual-shot-plan.json (${visualShotPlan.length} beats)`,
    );
  }

  const marketingPostImages = Array.isArray(ctx.creative_brief?.marketing_post_images)
    ? ctx.creative_brief.marketing_post_images
    : [];
  if (marketingPostImages.length) {
    const imagesPath = path.join(projectDir, "assets/marketing-post-images.json");
    fs.writeFileSync(imagesPath, JSON.stringify(marketingPostImages, null, 2));
    console.log(
      `[bootstrap] wrote assets/marketing-post-images.json (${marketingPostImages.length} images)`,
    );
  }

  console.log(
    `[bootstrap] wrote ${AUDIO_SCRIPT_REL} (${audioScript.length} chars), ${AGENT_METADATA_REL} (lang=${metadata.language}, markers=${metadata.markers.length})`,
  );
}

main();
