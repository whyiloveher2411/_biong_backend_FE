import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BIONG_FE_ROOT, DEFAULT_API_BASE_URL } from './config.mjs';
import { normalizeAgentPhase, promptFileName, promptRelativePath } from './agent-phase.mjs';
import { diagnoseLaunchToken } from './launch-token.mjs';
import { openCursorForRender } from './open-cursor.mjs';

async function fetchAgentPrompt({ shortVideoId, accessToken, apiBaseUrl, phase }) {
  const normalizedPhase = normalizeAgentPhase(phase);
  const base = String(apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  const url = `${base}/api/admin/plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-prompt`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      short_video_id: shortVideoId,
      id: shortVideoId,
      phase: normalizedPhase,
      access_token: accessToken,
    }),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`get-agent-prompt trả về không phải JSON (${response.status})`);
  }

  if (!response.ok || !payload?.success) {
    const message = typeof payload?.message === 'object'
      ? String(payload.message?.content || 'Lỗi get-agent-prompt')
      : String(payload?.message || `HTTP ${response.status}`);
    throw new Error(message);
  }

  const prompt = String(payload.prompt || '').trim();
  if (!prompt) {
    throw new Error(`Prompt bước ${normalizedPhase} trống`);
  }

  return prompt;
}

export async function triggerAgentRender(body, authHeader) {
  const shortVideoId = Number(body?.short_video_id || 0);
  const accessToken = String(body?.access_token || '').trim();
  const apiBaseUrl = String(body?.api_base_url || DEFAULT_API_BASE_URL).trim();
  const launchToken = String(authHeader || body?.launch_token || '').trim();

  if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
    throw new Error('Thiếu short_video_id hợp lệ');
  }
  if (!accessToken) {
    throw new Error('Thiếu access_token');
  }

  const tokenCheck = diagnoseLaunchToken(shortVideoId, launchToken);
  if (!tokenCheck.ok) {
    throw new Error(tokenCheck.message || 'launch_token không hợp lệ hoặc đã hết hạn');
  }
  const phase = normalizeAgentPhase(tokenCheck.phase || body?.phase);

  const prompt = await fetchAgentPrompt({ shortVideoId, accessToken, apiBaseUrl, phase });

  const assetsDir = path.join(
    BIONG_FE_ROOT,
    'storage',
    'agent-renders',
    String(shortVideoId),
    'assets',
  );
  await mkdir(assetsDir, { recursive: true });

  const promptFile = promptFileName(phase);
  const promptPath = path.join(assetsDir, promptFile);
  const metaPath = path.join(assetsDir, 'agent-launch-meta.json');

  await writeFile(promptPath, `${prompt}\n`, 'utf8');
  await writeFile(
    metaPath,
    `${JSON.stringify({
      short_video_id: shortVideoId,
      phase,
      launched_at: new Date().toISOString(),
      method: 'local_daemon',
      api_base_url: apiBaseUrl,
      prompt_file: promptFile,
    }, null, 2)}\n`,
    'utf8',
  );

  const cursor = await openCursorForRender(shortVideoId, phase);

  return {
    success: true,
    short_video_id: shortVideoId,
    phase,
    prompt_path: promptPath,
    prompt_relative: promptRelativePath(shortVideoId, phase),
    cursor_opened: cursor.cursor_opened,
    workspace: cursor.workspace,
  };
}
