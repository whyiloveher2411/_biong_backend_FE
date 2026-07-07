import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BIONG_FE_ROOT } from "./config.mjs";

const BASE_PREVIEW_PORT = Number(process.env.BIONG_PREVIEW_BASE_PORT || 4173);
const previewProcesses = new Map();

function projectDir(shortVideoId) {
  return path.join(BIONG_FE_ROOT, "storage/agent-renders", String(shortVideoId), "my-video");
}

function isProcessAlive(child) {
  return child && child.exitCode === null && !child.killed;
}

async function waitForPreviewHttp(port, child, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  const urls = [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`];

  while (Date.now() < deadline) {
    if (!isProcessAlive(child)) {
      throw new Error("hyperframes preview thoát sớm — xem log daemon");
    }

    for (const url of urls) {
      try {
        const res = await fetch(url, { method: "GET" });
        if (res.ok || res.status === 304) {
          return url.replace(/\/$/, "");
        }
      } catch {
        // retry
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Preview chưa sẵn sàng sau ${Math.round(timeoutMs / 1000)}s — kiểm tra port ${port}`);
}

export function getPreviewStatus(shortVideoId) {
  const entry = previewProcesses.get(Number(shortVideoId));
  if (!entry || !isProcessAlive(entry.child)) {
    if (entry) {
      previewProcesses.delete(Number(shortVideoId));
    }
    return { running: false };
  }
  return {
    running: true,
    preview_url: entry.previewUrl,
    port: entry.port,
  };
}

export async function startPreviewServer(shortVideoId) {
  const id = Number(shortVideoId || 0);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Thiếu short_video_id hợp lệ");
  }

  const proj = projectDir(id);
  const indexPath = path.join(proj, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("Chưa có composition — bấm Ghép composition trước");
  }

  const existing = getPreviewStatus(id);
  if (existing.running && existing.preview_url) {
    return {
      preview_url: existing.preview_url,
      port: existing.port,
      reused: true,
    };
  }

  const port = BASE_PREVIEW_PORT + (id % 200);

  const child = spawn(
    "npx",
    ["--yes", "hyperframes@0.7.14", "preview", "--port", String(port), "--no-open"],
    {
      cwd: proj,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    },
  );

  let bootError = "";
  child.stderr?.on("data", (chunk) => {
    const text = chunk.toString();
    process.stderr.write(`[preview:${id}] ${text}`);
    if (/✗|error|not a directory/i.test(text)) {
      bootError = text.trim().split("\n").pop() || bootError;
    }
  });
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[preview:${id}] ${chunk}`);
  });
  child.on("exit", (code) => {
    previewProcesses.delete(id);
    if (code && code !== 0) {
      process.stderr.write(`[preview:${id}] exit ${code}\n`);
    }
  });

  const previewUrl = await waitForPreviewHttp(port, child).catch((error) => {
    if (bootError) {
      throw new Error(bootError);
    }
    throw error;
  });

  previewProcesses.set(id, { child, port, previewUrl });

  return {
    preview_url: previewUrl,
    port,
    reused: false,
  };
}

export function stopPreviewServer(shortVideoId) {
  const id = Number(shortVideoId || 0);
  const entry = previewProcesses.get(id);
  if (entry?.child && isProcessAlive(entry.child)) {
    entry.child.kill("SIGTERM");
  }
  previewProcesses.delete(id);
}
