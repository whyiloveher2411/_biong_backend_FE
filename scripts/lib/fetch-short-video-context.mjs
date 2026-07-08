import { resolveApiBaseUrl, resolveMcpToken } from "./biong-env.mjs";

/**
 * Fetch short_video_get_context từ MCP API.
 */
export async function fetchShortVideoContext({
  shortVideoId,
  apiBaseUrl,
  mcpToken,
}) {
  const id = Number(shortVideoId || 0);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Thiếu short_video_id hợp lệ");
  }
  const base = resolveApiBaseUrl(apiBaseUrl);
  const token = resolveMcpToken(mcpToken);
  if (!token) {
    throw new Error("Thiếu BIONG_MCP_TOKEN — thêm vào scripts/agent-render-daemon/.env.local hoặc .cursor/mcp.json");
  }

  const root = base.endsWith("/api") ? base : `${base}/api`;
  const url = new URL(`${root}/admin/plugin/vn4-e-learning/mcp/short-video/get-context`);
  url.searchParams.set("short_video_id", String(id));

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`get-context trả về không phải JSON (${res.status})`);
  }

  if (!res.ok || payload?.success === false) {
    const message =
      typeof payload?.message === "object"
        ? String(payload.message?.content || "Lỗi get-context")
        : String(payload?.message || `HTTP ${res.status}`);
    throw new Error(message);
  }

  return payload;
}

export async function reportImportHtmlAssemble({
  shortVideoId,
  status,
  error = "",
  captionSync = null,
  beatErrors = null,
  stage = "assemble",
  apiBaseUrl,
  accessToken,
}) {
  const base = String(apiBaseUrl || process.env.BIONG_API_BASE_URL || "http://127.0.0.1:9999").replace(
    /\/+$/,
    "",
  );
  const token = String(accessToken || "").trim();
  if (!token) {
    return;
  }

  const root = base.endsWith("/api") ? base : `${base}/api`;
  const url = `${root}/admin/plugin/vn4-e-learning/app-mobile/marketing/short-video/report-import-html-assemble`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      short_video_id: shortVideoId,
      status,
      error: error || undefined,
      caption_sync: captionSync || undefined,
      beat_errors: beatErrors && Object.keys(beatErrors).length > 0 ? beatErrors : undefined,
      stage,
    }),
  }).catch(() => {});
}

export async function reportImportHtmlBeatErrors({
  shortVideoId,
  stage = "render",
  status,
  error = "",
  beatErrors = {},
  apiBaseUrl,
  accessToken,
}) {
  const base = String(apiBaseUrl || process.env.BIONG_API_BASE_URL || "http://127.0.0.1:9999").replace(
    /\/+$/,
    "",
  );
  const token = String(accessToken || "").trim();
  if (!token) {
    return;
  }

  const root = base.endsWith("/api") ? base : `${base}/api`;
  const url = `${root}/admin/plugin/vn4-e-learning/app-mobile/marketing/short-video/report-import-html-beat-errors`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      short_video_id: shortVideoId,
      stage,
      status,
      error: error || undefined,
      beat_errors: beatErrors,
    }),
  }).catch(() => {});
}
