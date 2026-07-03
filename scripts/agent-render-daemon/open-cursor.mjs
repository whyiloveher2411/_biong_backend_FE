import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { BIONG_FE_ROOT, CURSOR_APP_NAME } from './config.mjs';
import { normalizeAgentPhase, promptRelativePath } from './agent-phase.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_CURSOR_CLI = '/Applications/Cursor.app/Contents/Resources/app/bin/cursor';

function resolveCursorCli() {
  const fromEnv = String(process.env.CURSOR_CLI_PATH || '').trim();
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  if (existsSync(DEFAULT_CURSOR_CLI)) {
    return DEFAULT_CURSOR_CLI;
  }
  return '';
}

function buildBootstrapPrompt(shortVideoId, phase) {
  const normalized = normalizeAgentPhase(phase);
  const promptRelative = promptRelativePath(shortVideoId, normalized);

  if (normalized === '1') {
    return [
      `Tạo audio script viral cho short video ID ${shortVideoId} (phase 1).`,
      `Đọc và thực thi đầy đủ trong @${promptRelative}`,
      'Invoke skills theo prompt: extract-core-signals → viral-audio-script → audit → save_audio_script qua MCP.',
    ].join('\n');
  }

  if (normalized === 'continue') {
    return [
      `Render lại video agent short video ID ${shortVideoId} (continue — không dùng data final cũ).`,
      `Đọc và thực thi đầy đủ trong @${promptRelative}`,
      'Invoke /biong-short-video-hyperframes — bootstrap sạch my-video, không tái dùng beat/compositions cũ.',
    ].join('\n');
  }

  return [
    `Render video agent short video ID ${shortVideoId} (phase 2).`,
    `Đọc và thực thi đầy đủ trong @${promptRelative}`,
    'Invoke /biong-short-video-hyperframes theo file đó.',
  ].join('\n');
}

function buildCursorDeeplink(text) {
  return `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(text)}`;
}

async function focusExistingCursor() {
  await execFileAsync('osascript', ['-e', 'tell application "Cursor" to activate'], {
    timeout: 5000,
  });
}

async function openWorkspaceReuseWindow() {
  const cursorCli = resolveCursorCli();
  if (cursorCli) {
    // -r: mở folder trong cửa sổ Cursor đang mở (không spawn window mới)
    await execFileAsync(cursorCli, ['-r', BIONG_FE_ROOT], { timeout: 15000 });
    return 'cursor-cli-reuse';
  }

  // Fallback: chỉ activate app đang chạy — tránh open -a <path> tạo window mới
  try {
    await focusExistingCursor();
    return 'osascript-activate';
  } catch {
    await execFileAsync('open', ['-a', CURSOR_APP_NAME], { timeout: 15000 });
    return 'open-app-only';
  }
}

export async function openCursorForRender(shortVideoId, phase = '2') {
  const bootstrap = buildBootstrapPrompt(shortVideoId, phase);
  const deeplink = buildCursorDeeplink(bootstrap);

  const focusMethod = await openWorkspaceReuseWindow();

  await new Promise((resolve) => {
    setTimeout(resolve, 800);
  });

  await focusExistingCursor().catch(() => {});

  await execFileAsync('open', [deeplink], { timeout: 15000 });

  return {
    cursor_opened: true,
    focus_method: focusMethod,
    deeplink,
    workspace: BIONG_FE_ROOT,
  };
}
