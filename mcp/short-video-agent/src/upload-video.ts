import fs from 'node:fs';
import path from 'node:path';
import FormData from 'form-data';

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

export async function uploadVideoToApi(options: UploadVideoOptions): Promise<unknown> {
  const resolved = path.resolve(options.filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File không tồn tại: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Không phải file: ${resolved}`);
  }

  const buffer = fs.readFileSync(resolved);
  const filename = path.basename(resolved);

  const form = new FormData();
  form.append('short_video_id', String(options.shortVideoId));
  form.append('video', buffer, {
    filename,
    contentType: 'video/mp4',
    knownLength: buffer.length,
  });

  if (options.hyperframesCliVersion) {
    form.append('hyperframes_cli_version', options.hyperframesCliVersion);
  }
  if (options.compositionPath) {
    form.append('composition_path', options.compositionPath);
  }
  if (options.metadata) {
    form.append('metadata', JSON.stringify(options.metadata));
  }

  const url = new URL(uploadEndpoint(options.apiBaseUrl));
  url.searchParams.set('short_video_id', String(options.shortVideoId));

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.mcpToken}`,
    Accept: 'application/json',
    ...form.getHeaders(),
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: form as unknown as BodyInit,
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(
      `API upload-video trả về không phải JSON (${response.status}): ${text.slice(0, 500)}`
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? response.statusText)
        : response.statusText;
    throw new Error(`API upload-video lỗi ${response.status}: ${message}`);
  }

  return payload;
}
