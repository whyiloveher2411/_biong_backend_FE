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
      "[bootstrap] Cảnh báo: markers rỗng — map-markers-to-timing sẽ fallback HASCAS rescale",
    );
  }

  fs.mkdirSync(path.join(projectDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(projectDir, AUDIO_SCRIPT_REL), audioScript);
  fs.writeFileSync(
    path.join(projectDir, AGENT_METADATA_REL),
    JSON.stringify(metadata, null, 2),
  );

  console.log(
    `[bootstrap] wrote ${AUDIO_SCRIPT_REL} (${audioScript.length} chars), ${AGENT_METADATA_REL} (lang=${metadata.language}, markers=${metadata.markers.length})`,
  );
}

main();
