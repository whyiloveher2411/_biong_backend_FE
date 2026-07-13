#!/usr/bin/env node
/**
 * CLI upload MP4 — dùng uploadVideoToApi (native FormData ≤20MB / curl >20MB).
 *
 * Usage:
 *   node mcp/short-video-agent/scripts/upload-agent-video.mjs \
 *     --short-video-id 24 \
 *     --file /abs/path/output.mp4
 *
 * Env: BIONG_API_BASE_URL, BIONG_MCP_TOKEN
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveApiBaseUrl, resolveMcpToken } from '../../../scripts/lib/biong-env.mjs';
import { uploadVideoToApi } from '../dist/upload-video.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {
    shortVideoId: 0,
    file: '',
    hyperframesCliVersion: '',
    compositionPath: '',
    metadata: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--short-video-id' || arg === '-i') {
      out.shortVideoId = parseInt(argv[++i] ?? '0', 10);
    } else if (arg === '--file' || arg === '-f') {
      out.file = argv[++i] ?? '';
    } else if (arg === '--hyperframes-cli-version') {
      out.hyperframesCliVersion = argv[++i] ?? '';
    } else if (arg === '--composition-path') {
      out.compositionPath = argv[++i] ?? '';
    } else if (arg === '--metadata') {
      try {
        out.metadata = JSON.parse(argv[++i] ?? '{}');
      } catch {
        console.error('--metadata phải là JSON hợp lệ');
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node upload-agent-video.mjs --short-video-id ID --file PATH`);
      process.exit(0);
    }
  }

  return out;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.shortVideoId || args.shortVideoId <= 0) {
    console.error('Thiếu --short-video-id');
    process.exit(1);
  }
  if (!args.file) {
    console.error('Thiếu --file');
    process.exit(1);
  }

  const apiBaseUrl = resolveApiBaseUrl();
  const mcpToken = resolveMcpToken();
  if (!mcpToken) {
    console.error('Thiếu BIONG_MCP_TOKEN — thêm vào scripts/agent-render-daemon/.env.local hoặc .cursor/mcp.json');
    process.exit(1);
  }

  try {
    const result = await uploadVideoToApi({
      shortVideoId: args.shortVideoId,
      filePath: path.resolve(args.file),
      apiBaseUrl,
      mcpToken,
      hyperframesCliVersion: args.hyperframesCliVersion || undefined,
      compositionPath: args.compositionPath || undefined,
      metadata: args.metadata ?? undefined,
    });

    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      result.success === false
    ) {
      const message =
        typeof result.message === 'object' && result.message && 'content' in result.message
          ? String(result.message.content || 'Upload thất bại')
          : String(result.message || 'Upload thất bại');
      throw new Error(message);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Upload thất bại: ${message}`);
    process.exit(1);
  }
}

main();
