import { spawn } from "node:child_process";
import path from "node:path";
import { resolveMcpToken } from "../lib/biong-env.mjs";
import { BIONG_FE_ROOT } from "./config.mjs";
import { diagnoseLaunchToken } from "./launch-token.mjs";

/** Ưu tiên dòng Caption lệch script / lỗi gọn — tránh trả cả log bootstrap+verify. */
function extractAssembleFailureMessage(stderr, stdout, exitCode) {
  const text = `${stderr}\n${stdout}`;
  const captionLine = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()
    .find((line) => /Caption lệch script/i.test(line));
  if (captionLine) return captionLine;

  const verifyFail = text.match(/=== CAPTION SYNC FAIL ===[\s\S]*?(?=\n\[|\n▶|$)/);
  if (verifyFail) {
    const firstError = verifyFail[0]
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("✗"));
    if (firstError) return firstError.replace(/^✗\s*/, "");
  }

  const stderrTrim = String(stderr || "").trim();
  if (stderrTrim) {
    const lines = stderrTrim.split("\n").map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1];
    if (last && last.length < 500) return last;
  }

  const stdoutTrim = String(stdout || "").trim();
  if (stdoutTrim) {
    const lines = stdoutTrim.split("\n").map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1];
    if (last && last.length < 500) return last;
  }

  return `Script exit ${exitCode}`;
}

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
        reject(new Error(extractAssembleFailureMessage(stderr, stdout, code)));
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
  // access_token từ FE là JWT user — không dùng làm MCP Bearer
  const mcpToken = resolveMcpToken(String(body?.mcp_token || "").trim(), BIONG_FE_ROOT);
  const apiBaseUrl = String(body?.api_base_url || "").trim();
  const launchToken = String(authHeader || body?.launch_token || "").trim();
  const allowCaptionMismatch =
    Boolean(body?.allow_caption_mismatch) || Boolean(body?.auto_confirm);

  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    throw new Error("Thiếu short_video_id hợp lệ");
  }

  const tokenCheck = diagnoseLaunchToken(shortVideoId, launchToken);
  if (!tokenCheck.ok) {
    throw new Error(tokenCheck.message || "launch_token không hợp lệ");
  }

  const assembleArgs = [
    "--short-video-id",
    String(shortVideoId),
    "--access-token",
    accessToken,
    "--mcp-token",
    mcpToken,
  ];
  if (apiBaseUrl) {
    assembleArgs.push("--api-base-url", apiBaseUrl);
  }
  if (allowCaptionMismatch) {
    assembleArgs.push("--allow-caption-mismatch");
    console.log(
      `[agent-render-daemon] assemble allow_caption_mismatch=true short_video_id=${shortVideoId}`,
    );
  }

  const result = await spawnNodeScript("scripts/assemble-import-html.mjs", assembleArgs);

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
  // access_token từ FE là JWT user — không dùng làm MCP Bearer
  const mcpToken = resolveMcpToken(String(body?.mcp_token || "").trim(), BIONG_FE_ROOT);
  const apiBaseUrl = String(body?.api_base_url || "").trim();
  const launchToken = String(authHeader || body?.launch_token || "").trim();
  const forceAssemble = Boolean(body?.force_assemble);
  // Pipeline full-auto gửi auto_confirm / allow_caption_mismatch — luôn bypass verify caption
  const allowCaptionMismatch =
    Boolean(body?.allow_caption_mismatch) || Boolean(body?.auto_confirm);

  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    throw new Error("Thiếu short_video_id hợp lệ");
  }

  const tokenCheck = diagnoseLaunchToken(shortVideoId, launchToken);
  if (!tokenCheck.ok) {
    throw new Error(tokenCheck.message || "launch_token không hợp lệ");
  }

  if (forceAssemble) {
    const assembleArgs = [
      "--short-video-id",
      String(shortVideoId),
      "--access-token",
      accessToken,
      "--mcp-token",
      mcpToken,
    ];
    if (apiBaseUrl) {
      assembleArgs.push("--api-base-url", apiBaseUrl);
    }
    if (allowCaptionMismatch) {
      assembleArgs.push("--allow-caption-mismatch");
      console.log(
        `[agent-render-daemon] render force_assemble allow_caption_mismatch=true short_video_id=${shortVideoId}`,
      );
    }
    await spawnNodeScript("scripts/assemble-import-html.mjs", assembleArgs);
  }

  const renderArgs = [
    "--short-video-id",
    String(shortVideoId),
    "--skip-assemble",
    "--access-token",
    accessToken,
  ];
  if (apiBaseUrl) {
    renderArgs.push("--api-base-url", apiBaseUrl);
  }
  const result = await spawnNodeScript("scripts/render-import-html.mjs", renderArgs);

  return {
    success: true,
    short_video_id: shortVideoId,
    action: "render-import-html",
    result,
  };
}

export async function runUploadAgentVideo(body, authHeader) {
  const shortVideoId = Number(body?.short_video_id || 0);
  const launchToken = String(authHeader || body?.launch_token || "").trim();

  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    throw new Error("Thiếu short_video_id hợp lệ");
  }

  const tokenCheck = diagnoseLaunchToken(shortVideoId, launchToken);
  if (!tokenCheck.ok) {
    throw new Error(tokenCheck.message || "launch_token không hợp lệ");
  }

  const result = await spawnNodeScript("scripts/upload-import-html.mjs", [
    "--short-video-id",
    String(shortVideoId),
  ]);

  return {
    success: true,
    short_video_id: shortVideoId,
    action: "upload-agent-video",
    result,
  };
}
