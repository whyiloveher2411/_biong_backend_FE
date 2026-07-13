#!/usr/bin/env node
/**
 * Render import_html sau khi đã assemble.
 * Chế độ lenient: không chặn lint beat, render không --strict.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hydrateBiongEnv, resolveApiBaseUrl } from "./lib/biong-env.mjs";
import { reportImportHtmlBeatErrors } from "./lib/fetch-short-video-context.mjs";
import { collectImportHtmlBeatErrors } from "./lib/collect-import-html-beat-errors.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

  const apiBaseUrl = resolveApiBaseUrl(args.apiBaseUrl);
  const accessToken = args.accessToken || process.env.BIONG_ACCESS_TOKEN || "";
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

  try {
    run("node", [patchScript, projectDir], { cwd: REPO_ROOT });
    run("node", [syncBeatsScript, projectDir], { cwd: REPO_ROOT });

    const preRenderLint = collectImportHtmlBeatErrors(projectDir);
    if (preRenderLint.beatIds.length > 0) {
      console.warn(`[render-import-html] WARN: ${preRenderLint.summary} — tiếp tục render (lenient)`);
    }

    run("npx", ["--yes", "hyperframes@0.7.14", "render", "--quality", "high"], {
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
        mp4: absMp4,
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
