#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hardcode token và url từ tinker + env.local để chắc chắn hoạt động
const DEFAULT_API_BASE_URL = 'http://localhost:9999';
const DEFAULT_MCP_TOKEN = '7f56fe5029955c86e583238300f2f223aee2f85fa6409619bf88c4824d12ff48';

function getEnv(name) {
  if (name === 'BIONG_API_BASE_URL') {
    return process.env.BIONG_API_BASE_URL || DEFAULT_API_BASE_URL;
  }
  if (name === 'BIONG_MCP_TOKEN') {
    return process.env.BIONG_MCP_TOKEN || DEFAULT_MCP_TOKEN;
  }
  return process.env[name] || '';
}

function mcpEndpoint(action) {
  const base = getEnv('BIONG_API_BASE_URL').replace(/\/+$/, '');
  return `${base}/api/admin/plugin/vn4-e-learning/mcp/short-video/${action}`;
}

async function apiRequest(action, options = {}) {
  const method = options.method ?? 'POST';
  const url = new URL(mcpEndpoint(action));

  const useBody = method === 'POST' && options.body && Object.keys(options.body).length > 0;
  if (!useBody && options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    Authorization: `Bearer ${getEnv('BIONG_MCP_TOKEN')}`,
    Accept: 'application/json',
  };

  let body;
  if (useBody && options.body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(
      Object.fromEntries(
        Object.entries(options.body).map(([key, value]) => [key, String(value)])
      )
    ).toString();
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body,
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`API ${action} trả về không phải JSON (${response.status}): ${text.slice(0, 500)}`);
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String(payload.message ?? response.statusText)
        : response.statusText;
    throw new Error(`API ${action} lỗi ${response.status}: ${message}`);
  }

  return payload;
}

function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];

  if (!action) {
    console.error('Cách dùng: node biong-mcp-client.mjs <action> [arguments...]');
    console.error('Các action: get-context, search-bgm, update-status, upload-video');
    process.exit(1);
  }

  try {
    if (action === 'get-context') {
      const id = parseInt(args[1], 10);
      if (!id) {
        console.error('Thiếu short_video_id');
        process.exit(1);
      }
      console.log(`Đang lấy context cho video ID: ${id}...`);
      const result = await apiRequest('get-context', {
        query: { short_video_id: id }
      });
      
      const targetDir = path.resolve(__dirname, `../storage/agent-renders/${id}/assets`);
      fs.mkdirSync(targetDir, { recursive: true });
      const snapPath = path.join(targetDir, 'get-context-snapshot.json');
      fs.writeFileSync(snapPath, formatJson(result), 'utf8');
      console.log(`Đã lưu context snapshot vào: ${snapPath}`);
    } 
    else if (action === 'search-bgm') {
      const query = args[1] || 'lofi ambient';
      const limit = parseInt(args[2], 10) || 8;
      console.log(`Đang tìm nhạc nền (Pixabay) cho: "${query}" (limit=${limit})...`);
      const result = await apiRequest('search-bgm', {
        query: { query, limit }
      });
      console.log(formatJson(result));
    } 
    else if (action === 'update-status') {
      const id = parseInt(args[1], 10);
      const status = args[2] || 'processing';
      const lastError = args[3] || '';
      if (!id) {
        console.error('Thiếu short_video_id');
        process.exit(1);
      }
      console.log(`Đang cập nhật trạng thái video ID ${id} thành: ${status}...`);
      const body = {
        short_video_id: id,
        status
      };
      if (lastError) {
        body.last_error = lastError;
      }
      const result = await apiRequest('update-status', { body });
      console.log('Cập nhật trạng thái thành công:', formatJson(result));
    } 
    else if (action === 'upload-video') {
      const id = parseInt(args[1], 10);
      const filePath = args[2];
      if (!id || !filePath) {
        console.error('Cách dùng: node biong-mcp-client.mjs upload-video <id> <file_path> [metadata_json]');
        process.exit(1);
      }
      
      const absPath = path.resolve(filePath);
      if (!fs.existsSync(absPath)) {
        console.error(`File không tồn tại: ${absPath}`);
        process.exit(1);
      }

      let metadata = {};
      if (args[3]) {
        try {
          metadata = JSON.parse(args[3]);
        } catch {
          console.error('Metadata phải là chuỗi JSON hợp lệ');
          process.exit(1);
        }
      }

      console.log(`Đang chuẩn bị upload video ID ${id} từ: ${absPath}...`);
      
      // Import hàm uploadVideoToApi từ file build mcp index
      // hoặc sử dụng curl trực tiếp để tránh build typescript mcp index
      const stat = fs.statSync(absPath);
      const filename = path.basename(absPath);
      const fileSize = stat.size;
      const apiBase = getEnv('BIONG_API_BASE_URL');
      const token = getEnv('BIONG_MCP_TOKEN');

      // endpoint upload-video
      const uploadUrl = new URL(`${apiBase}/api/admin/plugin/vn4-e-learning/mcp/short-video/upload-video`);
      uploadUrl.searchParams.set('short_video_id', String(id));

      console.log(`Kích thước file: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

      let uploadResult;
      if (fileSize > 20 * 1024 * 1024) {
        // Upload qua curl
        console.log('Kích thước > 20MB, đang upload qua curl...');
        const curlArgs = [
          '-sS',
          '-f',
          '-X',
          'POST',
          '-H',
          `Authorization: Bearer ${token}`,
          '-H',
          'Accept: application/json',
          '-F',
          `short_video_id=${id}`,
          '-F',
          `video=@${absPath};type=video/mp4;filename=${filename}`,
        ];
        if (metadata && Object.keys(metadata).length > 0) {
          curlArgs.push('-F', `metadata=${JSON.stringify(metadata)}`);
        }
        curlArgs.push(uploadUrl.toString());

        const result = spawnSync('curl', curlArgs, { encoding: 'utf8' });
        if (result.error) {
          throw new Error(`curl upload thất bại: ${result.error.message}`);
        }
        if (result.status !== 0) {
          throw new Error(`curl upload lỗi exit ${result.status}: ${result.stderr || result.stdout}`);
        }
        uploadResult = JSON.parse(result.stdout);
      } else {
        // Native fetch
        console.log('Kích thước <= 20MB, đang upload qua fetch...');
        const buffer = fs.readFileSync(absPath);
        const form = new FormData();
        form.append('short_video_id', String(id));
        form.append('video', new Blob([buffer], { type: 'video/mp4' }), filename);
        if (metadata && Object.keys(metadata).length > 0) {
          form.append('metadata', JSON.stringify(metadata));
        }

        const response = await fetch(uploadUrl.toString(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: form,
        });

        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Fetch upload lỗi ${response.status}: ${text}`);
        }
        uploadResult = JSON.parse(text);
      }

      console.log('Upload thành công:', formatJson(uploadResult));
    } 
    else {
      console.error(`Không hỗ trợ action: ${action}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Xảy ra lỗi khi chạy client:', error.message);
    process.exit(1);
  }
}

main();
