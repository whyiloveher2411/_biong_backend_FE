import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(__dirname, '.env.local'));
loadDotEnv(path.join(__dirname, '.env'));

const feRootDefault = path.resolve(__dirname, '../..');

export const DAEMON_VERSION = '1.0.0';
export const DAEMON_HOST = '127.0.0.1';
export const DAEMON_PORT = Number(process.env.BIONG_RENDER_DAEMON_PORT || 9477);
export const DAEMON_SECRET = String(process.env.BIONG_RENDER_DAEMON_TOKEN || '').trim();
export const BIONG_FE_ROOT = path.resolve(
  String(process.env.BIONG_FE_ROOT || feRootDefault).trim() || feRootDefault,
);
export const DEFAULT_API_BASE_URL = String(
  process.env.BIONG_API_BASE_URL || 'http://127.0.0.1:9999',
).replace(/\/+$/, '');
export const CURSOR_APP_NAME = String(process.env.CURSOR_APP_NAME || 'Cursor').trim();

export function assertDaemonConfig() {
  if (!DAEMON_SECRET) {
    throw new Error(
      'Thiếu BIONG_RENDER_DAEMON_TOKEN — tạo .env.local trong scripts/agent-render-daemon/',
    );
  }
}
