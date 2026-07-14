#!/usr/bin/env node
/**
 * Upload MP4 import_html mới nhất lên CMS store (sau bước render).
 *
 * Usage:
 *   node scripts/upload-import-html.mjs --short-video-id ID
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hydrateBiongEnv } from "./lib/biong-env.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
hydrateBiongEnv(REPO_ROOT);

function parseArgs(argv) {
  const out = { shortVideoId: 0 };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--short-video-id" || arg === "-i") {
      out.shortVideoId = parseInt(argv[++i] ?? "0", 10);
    }
  }
  return out;
}

function findLatestMp4(rendersDir) {
  if (!fs.existsSync(rendersDir)) {
    return "";
  }
  const preferred = path.join(rendersDir, "final.mp4");
  if (fs.existsSync(preferred)) {
    return path.resolve(preferred);
  }
  const mp4s = fs
    .readdirSync(rendersDir)
    .filter((f) => f.endsWith(".mp4"))
    .map((f) => {
      const abs = path.resolve(rendersDir, f);
      const stat = fs.statSync(abs);
      return { abs, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
  return mp4s.length > 0 ? mp4s[mp4s.length - 1].abs : "";
}

function main() {
  const args = parseArgs(process.argv);
  const shortVideoId = Number(args.shortVideoId || 0);
  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    console.error("Usage: node scripts/upload-import-html.mjs --short-video-id ID");
    process.exit(1);
  }

  const rendersDir = path.join(
    REPO_ROOT,
    "storage/agent-renders",
    String(shortVideoId),
    "my-video",
    "renders",
  );
  const absMp4 = findLatestMp4(rendersDir);
  if (!absMp4) {
    console.error(`Không tìm thấy MP4 trong ${rendersDir}`);
    process.exit(1);
  }

  const uploadScript = path.join(REPO_ROOT, "mcp/short-video-agent/scripts/upload-agent-video.mjs");
  console.log(`\n▶ node ${uploadScript} --short-video-id ${shortVideoId} --file ${absMp4}`);
  const result = spawnSync(
    process.execPath,
    [uploadScript, "--short-video-id", String(shortVideoId), "--file", absMp4],
    { cwd: REPO_ROOT, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log(
    JSON.stringify({
      success: true,
      short_video_id: shortVideoId,
      mp4: absMp4,
      action: "upload-import-html",
    }),
  );
}

main();
