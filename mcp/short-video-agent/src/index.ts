#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { uploadVideoToApi } from './upload-video.js';

function requireEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}`);
  }
  return value;
}

function apiBaseUrl(): string {
  return requireEnv('BIONG_API_BASE_URL').replace(/\/+$/, '');
}

function mcpToken(): string {
  return requireEnv('BIONG_MCP_TOKEN');
}

function mcpEndpoint(action: string): string {
  return `${apiBaseUrl()}/api/admin/plugin/vn4-e-learning/mcp/short-video/${action}`;
}

async function apiRequest(
  action: string,
  options: {
    method?: 'GET' | 'POST';
    query?: Record<string, string | number>;
    body?: Record<string, string | number>;
  } = {}
): Promise<unknown> {
  const method = options.method ?? 'POST';
  const url = new URL(mcpEndpoint(action));

  const useBody = method === 'POST' && options.body && Object.keys(options.body).length > 0;
  if (!useBody && options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${mcpToken()}`,
    Accept: 'application/json',
  };
  let body: string | undefined;
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
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`API ${action} trả về không phải JSON (${response.status}): ${text.slice(0, 500)}`);
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? response.statusText)
        : response.statusText;
    throw new Error(`API ${action} lỗi ${response.status}: ${message}`);
  }

  return payload;
}

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

const server = new McpServer({
  name: 'biong-short-video',
  version: '2.2.0',
});

server.tool(
  'short_video_get_context',
  'Lấy creative brief + audio_script/audio_file + agent_workflow + production_playbook.media_assets (Pexels stock + Pixabay BGM MCP). Trả workflow_mode, agent_tts_platforms, tts_chain (đã lọc theo user chọn).',
  {
    short_video_id: z.number().int().positive().describe('ID short video trong spacedev_app_short_video'),
  },
  async ({ short_video_id }) => {
    const result = await apiRequest('get-context', {
      query: { short_video_id },
    });

    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_save_audio_script',
  'Lưu kịch bản audio viral 60–180s (bắt buộc [SFX: ...]). Phase 1: extract → creative → viral (one-pass) → audit → save → DỪNG chờ admin duyệt. Không visual_shot_plan.',
  {
    short_video_id: z.number().int().positive(),
    text: z.string().min(1).describe('Script có [BGM]/[Dừng Ns] — viết cho tai nghe'),
    metadata: z.record(z.unknown()).optional().describe('estimated_duration_sec: 60–180, core_signals, markers, timeline HASCAS'),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      short_video_id: args.short_video_id,
      text: args.text,
    };
    if (args.metadata) {
      query.metadata = JSON.stringify(args.metadata);
    }
    const result = await apiRequest('save-audio-script', { body: query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_generate_narration_tts',
  'Sinh voiceover TTS qua CMS queue sau admin duyệt — CẤM agent Phase 2 gọi tool này. Chỉ dùng nội bộ queue worker hoặc retry CMS. Nếu audio_file đã có → reject.',
  {
    short_video_id: z.number().int().positive(),
    text: z.string().min(1).describe('Lời thoại narration cần TTS'),
    clip_id: z.string().optional().describe('ID clip agent (mặc định narration, vd beat_1, hook)'),
    lang_code: z.string().optional(),
    voice_sample: z.string().optional().describe('Saydi voice sample key'),
    voice_code: z.string().optional().describe('Vbee voice code key'),
    speed: z.number().optional(),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      short_video_id: args.short_video_id,
      text: args.text,
    };
    if (args.clip_id) query.clip_id = args.clip_id;
    if (args.lang_code) query.lang_code = args.lang_code;
    if (args.voice_sample) query.voice_sample = args.voice_sample;
    if (args.voice_code) query.voice_code = args.voice_code;
    if (args.speed !== undefined) query.speed = args.speed;
    const result = await apiRequest('generate-narration-tts', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_get_audio_status',
  '[Pipeline CMS Remotion only] Kiểm tra audio scene Saydi/Vbee — KHÔNG dùng cho video agent sáng tạo tự do.',
  {
    short_video_id: z.number().int().positive(),
  },
  async ({ short_video_id }) => {
    const result = await apiRequest('get-audio-status', {
      query: { short_video_id },
    });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_generate_script',
  '[Pipeline CMS Remotion only] Sinh TikTokScript vào CMS — KHÔNG dùng cho video agent sáng tạo tự do.',
  {
    short_video_id: z.number().int().positive(),
    lang: z.string().optional(),
    model: z.string().optional(),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      short_video_id: args.short_video_id,
    };
    if (args.lang) query.lang = args.lang;
    if (args.model) query.model = args.model;
    const result = await apiRequest('generate-script', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_generate_scene_audio',
  '[Pipeline CMS Remotion only] TTS scene theo script_json CMS — KHÔNG dùng cho video agent sáng tạo tự do.',
  {
    short_video_id: z.number().int().positive(),
    scene_id: z.string().optional().describe('Chỉ sinh một scene; bỏ trống để sinh tất cả pending'),
    force: z.boolean().optional().describe('Sinh lại audio dù đã có'),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      short_video_id: args.short_video_id,
    };
    if (args.scene_id) query.scene_id = args.scene_id;
    if (args.force) query.force = '1';
    const result = await apiRequest('generate-scene-audio', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_update_agent_status',
  'Cập nhật agent_video_status và metadata (chỉ field agent_video_*).',
  {
    short_video_id: z.number().int().positive(),
    status: z.enum(['none', 'processing', 'completed', 'failed']),
    last_error: z.string().optional(),
    hyperframes_cli_version: z.string().optional(),
    composition_path: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      short_video_id: args.short_video_id,
      status: args.status,
    };

    if (args.last_error) query.last_error = args.last_error;
    if (args.hyperframes_cli_version) query.hyperframes_cli_version = args.hyperframes_cli_version;
    if (args.composition_path) query.composition_path = args.composition_path;
    if (args.warnings?.length) query.warnings = JSON.stringify(args.warnings);
    if (args.metadata) query.metadata = JSON.stringify(args.metadata);

    const result = await apiRequest('update-status', { query });

    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_search_stock_media',
  'Tìm stock ảnh/video Pexels — BẮT BUỘC phase render mỗi beat (≥1 visual). Xem production_playbook.media_assets. Trả download_url — agent tải local.',
  {
    query: z.string().min(1).describe('Từ khóa EN hoặc VI — server có alias map'),
    media_type: z.enum(['image', 'video']).optional().describe('Mặc định image'),
    page: z.number().int().positive().optional(),
    per_page: z.number().int().positive().max(25).optional(),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      query: args.query,
      media_type: args.media_type ?? 'image',
    };
    if (args.page !== undefined) query.page = args.page;
    if (args.per_page !== undefined) query.per_page = args.per_page;
    const result = await apiRequest('search-stock-media', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_search_meme_sound',
  'Tìm meme SFX Myinstants — hook punch (vine boom, sấm sét…). 1 lần/video tại giây 0. Trả download_url — agent tải assets/audio/sfx_hook.mp3.',
  {
    query: z.string().min(1).describe('Từ khóa: vine boom, airhorn, sấm sét, crying meme…'),
    limit: z.number().int().positive().max(15).optional(),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      query: args.query,
    };
    if (args.limit !== undefined) query.limit = args.limit;
    const result = await apiRequest('search-meme-sound', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_search_bgm',
  'Tìm nhạc nền Pixabay — BẮT BUỘC 1 track/video (global BGM). Nhẹ nhàng, giọng đọc vẫn chính. Truyền min_duration_sec sau transcribe. Trả download_url — agent tải assets/audio/bgm.mp3.',
  {
    query: z.string().min(1).describe('Mood/genre: lofi ambient, soft corporate, cinematic...'),
    min_duration_sec: z.number().positive().optional().describe('Lọc track ngắn hơn tổng video (giây)'),
    limit: z.number().int().positive().max(15).optional(),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      query: args.query,
    };
    if (args.min_duration_sec !== undefined) {
      query.min_duration_sec = args.min_duration_sec;
    }
    if (args.limit !== undefined) query.limit = args.limit;
    const result = await apiRequest('search-bgm', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_search_giphy',
  'Tìm GIF/sticker Giphy — accent visual (hook reaction, celebrate). Trả download_url — agent tải assets/images/.',
  {
    query: z.string().min(1).describe('Từ khóa: celebration, mind blown, shocked, fire…'),
    media_type: z.enum(['gif', 'sticker']).optional().describe('Mặc định sticker'),
    limit: z.number().int().positive().max(15).optional(),
    offset: z.number().int().min(0).optional(),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      query: args.query,
      media_type: args.media_type ?? 'sticker',
    };
    if (args.limit !== undefined) query.limit = args.limit;
    if (args.offset !== undefined) query.offset = args.offset;
    const result = await apiRequest('search-giphy', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_upload_agent_video',
  'Upload MP4 HyperFrames lên S3 và cập nhật agent_video_url (không ghi đè video_url Remotion).',
  {
    short_video_id: z.number().int().positive(),
    file_path: z.string().describe('Đường dẫn tuyệt đối tới file MP4 local'),
    hyperframes_cli_version: z.string().optional(),
    composition_path: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  },
  async (args) => {
    const result = await uploadVideoToApi({
      shortVideoId: args.short_video_id,
      filePath: args.file_path,
      apiBaseUrl: apiBaseUrl(),
      mcpToken: mcpToken(),
      hyperframesCliVersion: args.hyperframes_cli_version,
      compositionPath: args.composition_path,
      metadata: args.metadata,
    });

    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[biong-short-video-mcp] ${message}`);
  process.exit(1);
});
