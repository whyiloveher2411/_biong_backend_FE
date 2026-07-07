import { spawn } from "node:child_process";
import path from "node:path";
import { BIONG_FE_ROOT } from "./config.mjs";
import { diagnoseLaunchToken } from "./launch-token.mjs";

function spawnNodeScript(scriptRelative, args, envExtra = {}) {
  const scriptPath = path.join(BIONG_FE_ROOT, scriptRelative);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: BIONG_FE_ROOT,
      env: { ...process.env, ...envExtra },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `Script exit ${code}`));
        return;
      }
      const lastLine = stdout
        .trim()
        .split("\n")
        .filter((line) => line.startsWith("{"))
        .pop();
      if (lastLine) {
        try {
          resolve(JSON.parse(lastLine));
          return;
        } catch {
          // fall through
        }
      }
      resolve({ success: true, stdout: stdout.trim() });
    });
  });
}

export async function runAssembleImportHtml(body, authHeader) {
  const shortVideoId = Number(body?.short_video_id || 0);
  const accessToken = String(body?.access_token || "").trim();
  const apiBaseUrl = String(body?.api_base_url || "").trim();
  const launchToken = String(authHeader || body?.launch_token || "").trim();

  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    throw new Error("Thiếu short_video_id hợp lệ");
  }

  const tokenCheck = diagnoseLaunchToken(shortVideoId, launchToken);
  if (!tokenCheck.ok) {
    throw new Error(tokenCheck.message || "launch_token không hợp lệ");
  }

  const result = await spawnNodeScript("scripts/assemble-import-html.mjs", [
    "--short-video-id",
    String(shortVideoId),
    "--api-base-url",
    apiBaseUrl,
    "--access-token",
    accessToken,
  ]);

  return {
    success: true,
    short_video_id: shortVideoId,
    action: "assemble",
    result,
  };
}

export async function runRenderImportHtml(body, authHeader) {
  const shortVideoId = Number(body?.short_video_id || 0);
  const accessToken = String(body?.access_token || "").trim();
  const apiBaseUrl = String(body?.api_base_url || "").trim();
  const launchToken = String(authHeader || body?.launch_token || "").trim();
  const forceAssemble = Boolean(body?.force_assemble);

  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    throw new Error("Thiếu short_video_id hợp lệ");
  }

  const tokenCheck = diagnoseLaunchToken(shortVideoId, launchToken);
  if (!tokenCheck.ok) {
    throw new Error(tokenCheck.message || "launch_token không hợp lệ");
  }

  if (forceAssemble) {
    await spawnNodeScript("scripts/assemble-import-html.mjs", [
      "--short-video-id",
      String(shortVideoId),
      "--api-base-url",
      apiBaseUrl,
      "--access-token",
      accessToken,
    ]);
  }

  const result = await spawnNodeScript("scripts/render-import-html.mjs", [
    "--short-video-id",
    String(shortVideoId),
    "--skip-assemble",
  ]);

  return {
    success: true,
    short_video_id: shortVideoId,
    action: "render-import-html",
    result,
  };
}
