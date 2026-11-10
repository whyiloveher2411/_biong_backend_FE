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

function apiRootUrl(): string {
  const baseUrl = apiBaseUrl();
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

function mcpToken(): string {
  return requireEnv('BIONG_MCP_TOKEN');
}

function mcpEndpoint(action: string): string {
  return `${apiRootUrl()}/admin/plugin/vn4-e-learning/mcp/short-video/${action}`;
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
    throw new Error(
      `API ${action} trả về không phải JSON (${response.status}) tại ${url.toString()}: ${text.slice(0, 500)}`
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? response.statusText)
        : response.statusText;
    throw new Error(`API ${action} lỗi ${response.status} tại ${url.toString()}: ${message}`);
  }

  return payload;
}

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

const server = new McpServer({
  name: 'biong-short-video',
  version: '2.7.0',
});

const video3dId = z.number().int().positive();

async function video3dRequest(action: string, input: object = {}, shortVideoId?: number) {
  const body: Record<string, string | number> = { action, input: JSON.stringify(input) };
  if (shortVideoId !== undefined) body.short_video_id = shortVideoId;
  const raw = await apiRequest('video-html-3d', { body });
  const boundary = ['beat_list','beat_map','translations','visual_prompt'].includes(action)
    || (action === 'scene_assets' && ['manifest','save_environment','character_design'].includes(String((input as Record<string, unknown>).operation)));
  const result = typeof raw === 'object' && raw !== null ? { ...raw,
    interaction_policy: { stop_after_each_stage: true, one_beat_at_a_time: true,
      natural_sfx: 'suggestions_only_user_selects', code_sfx: 'automatic_mp3',
      next_beat_requires_explicit_user_confirmation: true },
    ...(boundary && 'success' in raw && raw.success === true ? {stop_required:true,next_action:'await_user_review'} : {}),
  } : raw;
  return {
    isError: typeof result === 'object' && result !== null && 'success' in result && result.success === false,
    content: [{ type: 'text' as const, text: formatJson(result) }],
  };
}

server.tool(
  'short_video_3d_start',
  'Tạo draft HTML 3D trong CMS sau khi user xác nhận brief. Giữ cùng idempotency_key khi retry cùng brief. Tool chỉ tạo draft và trả ID.',
  {
    confirmed: z.literal(true),
    idempotency_key: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/),
    topic: z.string().trim().min(1).max(200),
    topic_group: z.enum(['Business', 'History', 'What-if']),
    language: z.string().regex(/^[a-z]{2,3}(-[a-zA-Z0-9]{2,8})*$/),
    duration_sec: z.number().int().min(15).max(3600),
    aspect: z.enum(['16:9', '9:16']).optional().describe('Mặc định 16:9'),
    asset_mode: z.enum(['shared', 'free']),
    tts: z.enum(['gemini', 'saydi']),
  },
  async (brief) => video3dRequest('start', brief)
);

server.tool(
  'short_video_3d_status',
  'Đọc checkpoint gọn của CMS: narration, Whisper, beat audio, HTML còn thiếu, pipeline, upload và URL video. Có agent_review và pending natural SFX. Đọc trước khi retry; status/QC ready không cho phép tự sang bước hoặc beat khác.',
  { short_video_id: video3dId },
  async ({ short_video_id }) => video3dRequest('status', {}, short_video_id)
);

server.tool(
  'short_video_3d_step',
  'Làm từng công đoạn và dừng cho user kiểm tra sau mỗi công đoạn. Ở giai đoạn HTML, mỗi lượt chỉ một beat: TTS/Whisper, visual, gợi ý natural SFX + tự tạo MP3 code SFX, HTML, QC và lưu rồi STOP. Natural SFX chỉ là gợi ý để user tự tìm/chọn, không mở browser hoặc tải tự động. Không tự làm tất cả beat. Chỉ gọi continue_beat sau khi user nói rõ sang beat tiếp theo; trích nguyên văn xác nhận, không tự tạo xác nhận. Technical ready/QC pass không có nghĩa user đã duyệt.',
  {
    short_video_id: video3dId,
    step: z.discriminatedUnion('action', [
      z.object({ action: z.literal('gemini_voice'), voice: z.string().min(1).optional(), style: z.string().max(1000).optional() }),
      z.object({ action: z.literal('saydi_catalog') }),
      z.object({ action: z.literal('saydi_voice'), voice: z.string().min(1) }),
      z.object({
        action: z.literal('saydi_cast'),
        operation: z.enum(['get', 'save', 'save_manifest']),
        manifest: z.string().optional(),
        config: z.record(z.unknown()).optional(),
      }),
      z.object({ action: z.literal('narration') }),
      z.object({ action: z.literal('beat_list'), list_text: z.string().min(1) }),
      z.object({ action: z.literal('translations'), translations: z.record(z.string()), source_language: z.string().optional() }),
      z.object({ action: z.literal('merge_audio') }),
      z.object({ action: z.literal('transcribe') }),
      z.object({ action: z.literal('division_prompt'), phase: z.enum(['full', 'segmentation']).optional(), limit_beats: z.number().int().positive().optional() }),
      z.object({ action: z.literal('beat_map'), marketing_json_ai: z.union([z.string().min(1), z.record(z.unknown())]) }),
      z.object({
        action: z.literal('visual_prompt'),
        segments: z.array(z.record(z.unknown())).min(1),
        chunk_index: z.number().int().nonnegative().optional(),
        chunk_size: z.number().int().min(1).max(50).optional(),
      }),
      z.object({
        action: z.literal('scene_assets'),
        operation: z.enum(['get', 'manifest', 'environment_prompt', 'save_environment', 'material_catalog', 'material_search', 'resolve_materials', 'design_catalog', 'character_design', 'preview']).describe('Shared environments: material_catalog lists valid ambientCG categories; material_search ranks within category. Declare material.name + userData.svMaterial in factory. save_environment automatically resolves/downloads/applies PBR once after generation. resolve_materials upgrades an existing annotated environment using both current hashes. Never search/download in beat HTML.'),
        text: z.string().optional(),
        expected_revision: z.string().optional(),
        asset_id: z.string().optional(),
        category: z.string().optional(),
        keywords: z.array(z.string()).max(8).optional(),
        expected_module_hash: z.string().optional(),
        expected_spec_hash: z.string().optional(),
        design: z.object({
          template: z.literal('mai_v1').optional(),
          selections: z.record(z.string()).optional(),
          colors: z.record(z.string()).optional(),
          parameters: z.record(z.number()).optional(),
        }).optional(),
      }),
      z.object({ action: z.literal('save_visual'), mark_id: z.string().min(1), image_prompt: z.string().min(1) }),
      z.object({ action: z.literal('beat_audio'), beat_ids: z.array(z.string().min(1)).length(1) }),
      z.object({
        action: z.literal('prepare_beat_html'),
        beat_id: z.string().min(1),
      }).describe('Lấy prompt và revision để tự viết HTML. Nhân vật phải dùng action/actionTime + IK; đọc scene_assets/design_catalog actions và ik_contract. Chọn hành động có sẵn; nếu thiếu, thiết kế hành động riêng beat bằng ikTargets, kiểm tra contact/grip/foot lock và reverse seek.'),
      z.object({
        action: z.literal('audit_beat_html'),
        beat_id: z.string().min(1),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        html: z.string().min(1).max(524288),
      }).describe('QC candidate sau khi sinh HTML, không lưu. Nếu chưa đạt, sửa theo repair_prompt trong cùng phiên và kiểm tra lại tối đa hai lần; không chuyển beat khi còn lỗi.'),
      z.object({
        action: z.literal('save_beat_html'),
        beat_id: z.string().min(1),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        html: z.string().min(1).max(524288),
      }).describe('Chạy QC bắt buộc rồi lưu HTML khi đạt; trả qc/repair_prompt nếu chưa đạt. Sau success + hash readback vẫn phải STOP cho user review. Chỉ continue_beat sau xác nhận user rõ ràng; natural pending vẫn giữ để user chọn.'),
      z.object({ action: z.literal('title'), title: z.string().min(1).max(200) }),
      z.object({ action: z.literal('karaoke'), enabled: z.boolean() }),
      z.object({ action: z.literal('timeline_audio') }).describe('Đọc clips SFX và bgm_clips riêng của track BGM cấp video; không copy bgm_clips vào save_timeline_audio.'),
      z.object({
        action: z.literal('save_timeline_audio'),
        revision: z.string().min(1),
        clips: z.array(z.record(z.unknown())),
      }).describe('Lưu toàn bộ clips SFX với revision mới, giữ các clip khác và liên kết event; không chứa bgm_clips. offset_sec tính trong nguồn, start_sec tuyệt đối video, duration_sec độ dài phát. Căn start_sec+(source_peak_sec-offset_sec)/speed đúng visual peak, nghe lại onset/peak/tail và đọc lại trước HTML. BGM quản lý qua save_bgm.'),
      z.object({
        action: z.literal('save_sound_plan'),
        beat_id: z.string().min(1),
        events: z.array(z.record(z.unknown())).max(24),
      }).describe('AI đề xuất phối hợp natural recordings và code accents cho beat này. CMS tự render code thành MP3; natural giữ là gợi ý để user tự tìm và bấm chọn. Không mở Pixabay/tải thay user, không bỏ một nhóm vì tiện. Giữ natural pending trong HTML review; cảnh không cần SFX có thể events rỗng với lý do rõ.'),
      z.object({ action: z.literal('natural_sfx'), beat_id: z.string().min(1), event_id: z.string().optional() }).describe('Read natural-sound suggestions/search URLs only. Does not open any browser or download audio. The user clicks the CMS cue to find/listen/select natural recordings. Keep pending suggestions in HTML, combine natural recordings with meaningful code accents; never drop either group merely for convenience.'),
      z.object({action:z.literal('continue_beat'),beat_id:z.string().regex(/^beat_[1-9][0-9]*$/),reviewed_beat_id:z.string().regex(/^beat_[1-9][0-9]*$/),reviewed_html_sha256:z.string().regex(/^[a-f0-9]{64}$/),user_confirmation:z.string().trim().min(1).max(4000)}).describe('ONLY after an explicit user message approving review and requesting the next beat. Quote that actual message verbatim; never invent/assume approval. Binds approval to the saved HTML hash and unlocks one requested beat only. For feedback, stay on the same beat without calling this action.'),
      z.object({
        action: z.literal('save_bgm'),
        segments: z.array(z.object({
          id: z.string().min(1), title: z.string().min(1),
          download_url: z.string().url(), duration_sec: z.number().positive(),
          provider: z.literal('mixkit'), volume: z.number().min(0.05).max(1.5),
        })).min(1).max(50),
      }).describe('Lưu BGM cấp video, bật nhạc nền và trả bgm_clips + timeline_source để xác minh track timeline. Không thêm BGM vào clips SFX.'),
    ]),
  },
  async ({ short_video_id, step: { action, ...input } }) => video3dRequest(action, input, short_video_id)
);

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
  'short_video_get_workflow_outputs',
  'Đọc workflow_outputs (key/value theo updateField trong index.md) đã lưu của short video. Dùng để kiểm tra field như plan-prompt / prompt-image-v2-final đã có chưa. Truyền workflow (vd "video-image") để lấy riêng 1 workflow.',
  {
    short_video_id: z.number().int().positive().describe('ID short video trong spacedev_app_short_video'),
    workflow: z.string().optional().describe('Key workflow (vd "video-image"); bỏ trống để lấy tất cả'),
  },
  async (args) => {
    const query: Record<string, string | number> = {
      short_video_id: args.short_video_id,
    };
    if (args.workflow) query.workflow = args.workflow;
    const result = await apiRequest('get-workflow-outputs', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_save_workflow_output',
  'Lưu 1 key/value output của workflow vào short video (field workflow_outputs, merge giữ key khác). Key = updateField trong index.md (vd plan-prompt, prompt-image-v2-final).',
  {
    short_video_id: z.number().int().positive(),
    workflow: z.string().min(1).describe('Key workflow (vd "video-image")'),
    key: z.string().min(1).describe('updateField key (vd plan-prompt, prompt-image-v2-final)'),
    value: z.string().describe('Nội dung output cần lưu'),
  },
  async (args) => {
    const result = await apiRequest('save-workflow-output', {
      body: {
        short_video_id: args.short_video_id,
        workflow: args.workflow,
        key: args.key,
        value: args.value,
      },
    });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_get_image_style',
  'Lấy style CMS đã resolve. Với video có sẵn truyền short_video_id, với draft HTML 3D chưa tạo truyền asset_mode để đọc file style workflow.',
  {
    short_video_id: z.number().int().positive().optional(),
    asset_mode: z.enum(['shared', 'free']).optional(),
  },
  async ({ short_video_id, asset_mode }) => {
    const query: Record<string, string | number> = {};
    if (short_video_id !== undefined) query.short_video_id = short_video_id;
    if (asset_mode !== undefined) query.asset_mode = asset_mode;
    const result = await apiRequest('get-image-style', { query });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_update_beat_image_prompts',
  'Import prompt beat vào đúng vị trí (buttonUpdate imagePromptBeatUpdate). Input là output "BEAT ..." (khối BEAT N kèm SCRIPT SENTENCE + section prompt visual/ảnh — nhận nhiều tên field như IMAGE PROMPT / VISUAL PROMPT / SCENE PROMPT). All-or-nothing, validate phía backend.',
  {
    short_video_id: z.number().int().positive(),
    file_text: z.string().min(1).describe('Toàn bộ output BEAT ... của workflow'),
  },
  async (args) => {
    const result = await apiRequest('update-beat-image-prompts', {
      body: {
        short_video_id: args.short_video_id,
        file_text: args.file_text,
      },
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
  'Tìm nhạc nền (Pixabay Audio API nếu có quyền; fallback Mixkit URL MP3 trực tiếp) — BGM chain: trả nhiều candidate (limit=8), agent tải bgm_1.mp3, bgm_2.mp3… cùng mood rồi chạy wire-bgm-chain.mjs. Cấm min_duration_sec=totalVideoSec và cấm loop.',
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
  'short_video_generate_sound',
  'Sinh âm thanh AI (AudioCraft) — 2 chế độ: mode="sfx" (AudioGen, mặc định) hoặc mode="bgm" (MusicGen nhạc nền). Trả file/file_path (WAV local) + download_url để tải về assets/audio/. Hỗ trợ đầy đủ tham số sampling.',
  {
    mode: z
      .enum(['sfx', 'bgm'])
      .optional()
      .describe('sfx = sound effect (AudioGen, mặc định); bgm = background music (MusicGen)'),
    prompt: z.string().min(1).describe('Mô tả âm thanh (tiếng Anh cho kết quả tốt nhất)'),
    duration: z.number().positive().optional().describe('Giây — sfx mặc định 1.5; bgm mặc định 30'),
    seed: z.number().int().optional().describe('Seed tái lập (bỏ trống = ngẫu nhiên)'),
    top_k: z.number().int().positive().optional().describe('Sampling top-k (mặc định model ~250)'),
    top_p: z.number().min(0).max(1).optional().describe('Sampling top-p (0 = tắt)'),
    temperature: z.number().positive().optional().describe('Sampling temperature (mặc định ~1.0)'),
    cfg_coef: z.number().positive().optional().describe('Classifier-free guidance (mặc định ~3.0)'),
    single_event: z
      .boolean()
      .optional()
      .describe('Chỉ mode sfx: true = 1 lần duy nhất, false = cho phép lặp lại'),
    model: z
      .string()
      .optional()
      .describe('Override model: facebook/audiogen-* (sfx) hoặc facebook/musicgen-* (bgm)'),
  },
  async (args) => {
    const body: Record<string, string | number> = {
      mode: args.mode ?? 'sfx',
      prompt: args.prompt,
    };
    if (args.duration !== undefined) body.duration = args.duration;
    if (args.seed !== undefined) body.seed = args.seed;
    if (args.top_k !== undefined) body.top_k = args.top_k;
    if (args.top_p !== undefined) body.top_p = args.top_p;
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.cfg_coef !== undefined) body.cfg_coef = args.cfg_coef;
    if (args.single_event !== undefined) body.single_event = args.single_event ? 1 : 0;
    if (args.model !== undefined && args.model.trim() !== '') body.model = args.model;

    const result = await apiRequest('generate-sound', { body });
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
  'short_video_get_import_html_beat_prompt',
  'Lấy prompt server để sinh HTML beat import_html (hf_prompt_type + duration + whisper pacing). Dùng trong phase import_html_full.',
  {
    short_video_id: z.number().int().positive(),
    beat_id: z.string().min(1).describe('beat_N trong beat_map'),
  },
  async (args) => {
    const result = await apiRequest('get-import-html-beat-prompt', {
      body: {
        short_video_id: args.short_video_id,
        beat_id: args.beat_id,
      },
    });
    return {
      content: [{ type: 'text', text: formatJson(result) }],
    };
  }
);

server.tool(
  'short_video_save_import_html_beat',
  'Lưu HTML beat import_html lên CMS (validate document đơn, cấm karaoke). Trả beats_html_completed/total.',
  {
    short_video_id: z.number().int().positive(),
    beat_id: z.string().min(1).describe('beat_N trong beat_map'),
    html: z.string().min(1).describe('Document HTML self-contained <!doctype html>…</html>'),
  },
  async (args) => {
    const result = await apiRequest('save-import-html-beat', {
      body: {
        short_video_id: args.short_video_id,
        beat_id: args.beat_id,
        html: args.html,
      },
    });
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
