import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** File > 20MB — upload qua curl -F (streaming, khớp PHP local). */
export const CURL_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

export interface UploadVideoOptions {
  shortVideoId: number;
  filePath: string;
  apiBaseUrl: string;
  mcpToken: string;
  hyperframesCliVersion?: string;
  compositionPath?: string;
  metadata?: Record<string, unknown>;
}

function uploadEndpoint(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/+$/, '');
  return `${base}/api/admin/plugin/vn4-e-learning/mcp/short-video/upload-video`;
}

function buildUploadUrl(apiBaseUrl: string, shortVideoId: number): string {
  const url = new URL(uploadEndpoint(apiBaseUrl));
  url.searchParams.set('short_video_id', String(shortVideoId));
  return url.toString();
}

function parseApiPayload(text: string, statusHint?: number): unknown {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(
      `API upload-video trả về không phải JSON (${statusHint ?? '?'}): ${text.slice(0, 500)}`
    );
  }

  if (statusHint !== undefined && statusHint >= 400) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? statusHint)
        : String(statusHint);
    throw new Error(`API upload-video lỗi ${statusHint}: ${message}`);
  }

  return payload;
}

function assertOkPayload(payload: unknown, status: number): void {
  if (status >= 400) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? status)
        : `HTTP ${status}`;
    throw new Error(`API upload-video lỗi ${status}: ${message}`);
  }
}

function appendOptionalFormFields(form: FormData, options: UploadVideoOptions): void {
  if (options.hyperframesCliVersion) {
    form.append('hyperframes_cli_version', options.hyperframesCliVersion);
  }
  if (options.compositionPath) {
    form.append('composition_path', options.compositionPath);
  }
  if (options.metadata) {
    form.append('metadata', JSON.stringify(options.metadata));
  }
}

function appendOptionalCurlFields(args: string[], options: UploadVideoOptions): void {
  if (options.hyperframesCliVersion) {
    args.push('-F', `hyperframes_cli_version=${options.hyperframesCliVersion}`);
  }
  if (options.compositionPath) {
    args.push('-F', `composition_path=${options.compositionPath}`);
  }
  if (options.metadata) {
    args.push('-F', `metadata=${JSON.stringify(options.metadata)}`);
  }
}

/** ≤20MB — native fetch + FormData/Blob (không dùng package form-data). */
async function uploadViaNativeFetch(
  resolved: string,
  filename: string,
  fileSize: number,
  options: UploadVideoOptions
): Promise<unknown> {
  const buffer = fs.readFileSync(resolved);
  if (buffer.length !== fileSize) {
    throw new Error(`Đọc file không đủ byte: ${resolved}`);
  }

  const form = new FormData();
  form.append('short_video_id', String(options.shortVideoId));
  form.append('video', new Blob([buffer], { type: 'video/mp4' }), filename);
  appendOptionalFormFields(form, options);

  const response = await fetch(buildUploadUrl(options.apiBaseUrl, options.shortVideoId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.mcpToken}`,
      Accept: 'application/json',
    },
    body: form,
  });

  const text = await response.text();
  const payload = parseApiPayload(text, response.status);
  assertOkPayload(payload, response.status);
  return payload;
}

/** >20MB — curl -F streaming (đã verify OK với PHP local). */
function uploadViaCurl(
  resolved: string,
  filename: string,
  options: UploadVideoOptions
): unknown {
  const args = [
    '-sS',
    '-f',
    '-X',
    'POST',
    '-H',
    `Authorization: Bearer ${options.mcpToken}`,
    '-H',
    'Accept: application/json',
    '-F',
    `short_video_id=${options.shortVideoId}`,
    '-F',
    `video=@${resolved};type=video/mp4;filename=${filename}`,
  ];
  appendOptionalCurlFields(args, options);
  args.push(buildUploadUrl(options.apiBaseUrl, options.shortVideoId));

  const result = spawnSync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(
      `curl không chạy được (${result.error.message}) — cài curl hoặc giảm file <20MB`
    );
  }

  if (result.status !== 0) {
    const hint = (result.stderr || result.stdout || '').trim().slice(0, 800);
    throw new Error(
      `curl upload lỗi exit ${result.status ?? '?'}${hint ? `: ${hint}` : ''}`
    );
  }

  const text = (result.stdout ?? '').trim();
  if (!text) {
    throw new Error('curl upload: response body rỗng');
  }

  return parseApiPayload(text);
}

export async function uploadVideoToApi(options: UploadVideoOptions): Promise<unknown> {
  const resolved = path.resolve(options.filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File không tồn tại: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Không phải file: ${resolved}`);
  }

  const filename = path.basename(resolved);
  const fileSize = stat.size;

  if (fileSize > CURL_UPLOAD_THRESHOLD_BYTES) {
    return uploadViaCurl(resolved, filename, options);
  }

  return uploadViaNativeFetch(resolved, filename, fileSize, options);
}
