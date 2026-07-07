#!/usr/bin/env node
/**
 * Render import_html sau khi đã assemble.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hydrateBiongEnv } from "./lib/biong-env.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
hydrateBiongEnv(REPO_ROOT);

function parseArgs(argv) {
  const out = { shortVideoId: 0, skipAssemble: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--short-video-id" || arg === "-i") {
      out.shortVideoId = parseInt(argv[++i] ?? "0", 10);
    } else if (arg === "--skip-assemble") {
      out.skipAssemble = true;
    }
  }
  return out;
}

function run(cmd, args, opts = {}) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} exit ${result.status}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const shortVideoId = Number(args.shortVideoId || 0);
  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    console.error("Usage: node scripts/render-import-html.mjs --short-video-id ID");
    process.exit(1);
  }

  const projectDir = path.join(REPO_ROOT, "storage/agent-renders", String(shortVideoId), "my-video");
  const indexPath = path.join(projectDir, "index.html");
  if (!args.skipAssemble && !fs.existsSync(indexPath)) {
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
  run("node", [patchScript, projectDir], { cwd: REPO_ROOT });
  run("node", [syncBeatsScript, projectDir], { cwd: REPO_ROOT });

  run("npx", ["--yes", "hyperframes@0.7.14", "render", "--quality", "high", "--strict"], {
    cwd: projectDir,
  });

  const rendersDir = path.join(projectDir, "renders");
  const mp4s = fs.existsSync(rendersDir)
    ? fs.readdirSync(rendersDir).filter((f) => f.endsWith(".mp4")).sort()
    : [];
  const mp4 = mp4s[mp4s.length - 1];
  if (!mp4) {
    throw new Error("Không tìm thấy MP4 output");
  }

  const absMp4 = path.resolve(rendersDir, mp4);
  const uploadScript = path.join(REPO_ROOT, "mcp/short-video-agent/scripts/upload-agent-video.mjs");
  run(
    "node",
    [uploadScript, "--short-video-id", String(shortVideoId), "--file", absMp4],
    { cwd: REPO_ROOT },
  );

  console.log(
    JSON.stringify({
      success: true,
      short_video_id: shortVideoId,
      mp4: absMp4,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
