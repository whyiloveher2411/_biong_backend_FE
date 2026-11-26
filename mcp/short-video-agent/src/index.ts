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
  version: '2.28.0',
});

const video3dId = z.number().int().positive();

// Autopilot flag per video (status/start/autopilot/continue_beat responses carry it; fetched once otherwise).
const autopilotByVideo = new Map<number, boolean>();
function rememberAutopilot(id: number | undefined, raw: unknown) {
  if (!id || typeof raw !== 'object' || raw === null) return;
  const r = raw as Record<string, unknown>;
  const a = r.autopilot;
  if (typeof a === 'boolean') autopilotByVideo.set(id, a);
  else if (typeof a === 'object' && a !== null && typeof (a as Record<string, unknown>).enabled === 'boolean') autopilotByVideo.set(id, (a as Record<string, boolean>).enabled);
}

async function video3dRequest(action: string, input: object = {}, shortVideoId?: number) {
  const body: Record<string, string | number> = { action, input: JSON.stringify(input) };
  if (shortVideoId !== undefined) body.short_video_id = shortVideoId;
  const raw = await apiRequest('video-html-3d', { body });
  const startedId = action === 'start' && typeof raw === 'object' && raw !== null ? Number((raw as Record<string, unknown>).short_video_id) : undefined;
  rememberAutopilot(shortVideoId ?? startedId, raw);
  if (shortVideoId !== undefined && !autopilotByVideo.has(shortVideoId)) {
    rememberAutopilot(shortVideoId, await apiRequest('video-html-3d', { body: { action: 'status', input: '{}', short_video_id: shortVideoId } }));
  }
  const autopilot = shortVideoId !== undefined && autopilotByVideo.get(shortVideoId) === true;
  const boundary = ['beat_list','beat_map','translations','visual_prompt'].includes(action)
    || (action === 'scene_assets' && ['manifest','save_environment','character_design'].includes(String((input as Record<string, unknown>).operation)));
  const result = typeof raw === 'object' && raw !== null ? { ...raw,
    interaction_policy: autopilot
      ? { autopilot: true, stop_after_each_stage: false, one_beat_at_a_time: true,
          natural_sfx: 'natural_sfx_auto (library + Freesound)', code_sfx: 'automatic_mp3', visual_review: 'required_every_beat',
          next_beat: 'continue_beat without user_confirmation (stored autopilot request)', final_stage: 'scripts/beat-html/autopilot.php finish' }
      : { stop_after_each_stage: true, one_beat_at_a_time: true,
          natural_sfx: 'suggestions_only_user_selects', code_sfx: 'automatic_mp3', visual_review: 'required_every_beat',
          next_beat_requires_explicit_user_confirmation: true },
    ...(boundary && !autopilot && 'success' in raw && raw.success === true ? {stop_required:true,next_action:'await_user_review'} : {}),
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
    language: z.string().regex(/^[a-z]{2,3}(-[a-zA-Z0-9]{2,8})*$/).optional().describe('Mặc định en (tiếng Anh), không hỏi user trừ khi user tự nêu ngôn ngữ khác.'),
    duration_sec: z.number().int().min(15).max(3600).optional().describe('Mặc định 600 (10 phút), không hỏi user trừ khi user tự nêu thời lượng khác.'),
    aspect: z.enum(['16:9', '9:16']).optional().describe('Mặc định 16:9'),
    asset_mode: z.enum(['shared', 'free']),
    tts: z.enum(['gemini', 'saydi']),
    render_engine: z.enum(['blender', 'threejs']).optional().describe('Mặc định threejs (HTML beat). blender = MakeHuman + asset CC0 + Cycles, chỉ khi user chọn.'),
    video_format: z.enum(['story', 'showcase', 'explainer']).optional().describe('Mặc định story (kể chuyện nhiều beat). showcase = bảng xếp hạng / so sánh: MỘT beat dài, camera tour lia qua các vùng (bục, nền toà nhà, cờ/logo, nhãn trong cảnh), thường không voice (voice_mode mặc định none), atlas bị ép none, thời lượng beat = thời lượng brief. Hỏi user khi chốt brief nếu video là top N / so sánh / linh thú / món ăn các nước. explainer = giải thích đồ vật / cơ chế ("Vì sao bình gas phát nổ?"): toàn lời kể (narrative_style ép narration), đồ vật là chủ thể (studio sạch, vỏ trong suốt, hạt khí, mức lỏng, nhãn viên thuốc), nhân vật chỉ khi có hành động (character_style default), atlas ép none; bỏ trống thì aspect 9:16, duration_sec 90 (không có HUD trên đầu; persistent_hud mặc định tắt cho mọi video); review kịch bản = người nghe lạnh + kiểm chứng kiến thức. Chọn khi user muốn video giải thích một đồ vật/cơ chế đời thường.'),
    voice_mode: z.enum(['full', 'mixed', 'none']).optional().describe('Mặc định full (Nhiều voice). mixed = Voice vừa: lời dẫn chính đọc, câu phụ/dữ kiện trong <caption>…</caption> chỉ hiện chữ. none = Không voice: kể bằng câu chữ ở đáy khung + nhạc/SFX, thoại thành bong bóng. Hỏi user khi chốt brief.'),
    narrative_style: z.enum(['narration', 'mixed', 'dialogue-heavy', 'dialogue']).optional().describe('Kiểu lời của kịch bản kể chuyện (video_format story). Bỏ trống = dialogue-heavy (Kể ít + thoại nhiều; mặc định từ 22/11/2026, không hỏi user) cho video story. mixed = Kể nhiều + thoại: lời dẫn chính xen thoại nhân vật, như trước. narration = Toàn lời kể: một giọng dẫn truyện, nhân vật chỉ diễn, không có lượt nói của nhân vật. dialogue-heavy (mặc định): thoại nhân vật gánh câu chuyện (≥ 55% âm tiết, nhắm ~70%, ít nhất 2 vai nói), lời dẫn chỉ nối cảnh/câu tiền đề/đúc kết. dialogue = Toàn thoại: mọi lời nằm trong <voice> của nhân vật, không có người dẫn truyện (hook, giải thích, đúc kết, CTA do nhân vật nói); không dùng cùng voice_mode mixed. Lưu kịch bản sai kiểu lời bị từ chối (narrative_style_mismatch). Không hỏi khi chốt brief; user nêu kiểu khác thì truyền.'),
    ink_line: z.enum(['detail', 'thick']).optional().describe('Kiểu viền của style nhân vật ink-toon (engine threejs, story, không khoá atlas_style). Bỏ trống = detail (Viền mảnh + chi tiết: viền bao 2 px + nét chi tiết 1,1 px ở mọi cạnh, mép, chỗ tiếp xúc bằng THREE.SVQuality edges; tán lá dùng màu lá sẫm). thick = Viền dày 6,5 px như cũ (chỉ đường bao). Gate lưu beat kiểm SVCast.create(\'ink-toon\', {renderer, lines: \'detail\'}) + enableAO({…, edges: true}).'),
    dialogue_emotion: z.enum(['low', 'medium', 'high']).optional().describe('Mức biểu cảm của lời thoại nhân vật (video_format story, narrative_style khác narration). Bỏ trống = high (Nhiều biểu cảm: mọi câu thoại có cảm xúc rõ — câu cảm thán, hỏi gắt, thán từ, câu bỏ lửng; chọn tình huống gây phản ứng mạnh, nhân vật tính khí tương phản; đường cong cảm xúc lên đỉnh ở lúc tưởng thua; ≥ 50% lượt thoại có feeling/style hoặc âm <gasp>/<laugh>…; producer notes có EMOTION MAP). medium = Biểu cảm vừa: cảm xúc rõ ở hook, các bước ngoặt, cao trào, payoff (≥ 20% lượt có chỉ dẫn). low = Ít biểu cảm: lời tự nhiên, tiết chế. Mức này đổi cả nội dung kịch bản, chỉ dẫn TTS và diễn xuất visual/HTML. Lưu kịch bản thiếu biểu cảm bị từ chối (dialogue_emotion_mismatch). Đưa ra cho user chọn khi chốt brief; không chọn thì bỏ trống.'),
    vfx_density: z.enum(['none', 'medium', 'high']).optional().describe('Tần suất hiệu ứng hình ảnh (engine threejs, bộ kit THREE.SVFx, 26 hiệu ứng theo 4 nhóm — motion: afterimage, smear, speedLines, panBlur (nền kéo vệt, vật chính nét), ramp (giả tua nhanh); accent: impactFrame, shake, burst, slash, muzzleFlash, lightning, beam, chroma, glitch; matter: puff, debris, splash, splatter, ring, dissolve; ambient: sparkle, glow, aura, emit (steam/smoke/fire), weather (rain/snow/leaves/petals), motes). Bỏ trống = high (Nhiều: thường xuyên nhưng có lý do: hiệu ứng chỉ là phản ứng với sự kiện vật lý trên hình như di chuyển nhanh, nhảy, rơi, ném, va chạm, vật bật ra; không cho lời nói, cử chỉ tay, người bước vào, vật chỉ quan trọng, bụi trang trí; khoảng 6/10 beat, beat không có sự kiện ghi VFX: none). medium = Vừa: chỉ khoảnh khắc mạnh nhất (khoảng 3–4/10 beat). none = Không có. Visual mỗi beat ghi dòng `VFX: <loại> on <vật> at "<từ kích hoạt>" — <tác dụng>`; HTML dựng bằng `THREE.SVFx.create({scene, seed})` + `FX.update(t, camera)` mỗi frame; lưu beat sai tần suất bị từ chối (vfx_density_mismatch). Đưa ra cho user chọn khi chốt brief; không chọn thì bỏ trống.'),
    persistent_hud: z.boolean().optional().describe('Mặc định TẮT cho mọi video (26/11/2026): chỉ truyền true khi user tự yêu cầu. Bật chữ xuyên suốt video (HUD: bộ đếm, nhãn trạng thái/chương, mốc thời gian ở mép trên). Lập nội dung bằng step action hud ở công đoạn visual.'),
    atlas_density: z.enum(['none', 'medium', 'high', 'all']).optional().describe('Tần suất beat dùng 3D Style Atlas (engine threejs). Bỏ trống = mặc định theo nhóm chủ đề (Business high, History none, What-if medium). none = Không có; medium = Vừa (chỉ vài khoảnh khắc giải thích); high = Nhiều (xen kẽ cảnh kể chuyện và cảnh atlas); all = Toàn bộ (mọi beat là atlas). Hỏi user khi chốt brief nếu muốn khác mặc định.'),
    atlas_style: z.enum(['painted', 'ink-toon', 'spotlight-stage', 'paper-pop-up', 'led-wall', 'soft-clay', 'inflated', 'tiny-diorama', 'low-poly', 'voxel']).optional().describe('Khoá MỘT style atlas cho mọi beat của video (engine threejs, video_format story). Bỏ trống = style chọn theo từng beat. Khi khoá, tần suất là all (không truyền atlas_density khác all), mọi visual ghi `STYLE: <id>`, nhân vật dựng lại theo style và dùng chung khối mã `// SV-CAST BEGIN … END` giữa các beat. Đưa ra cho user chọn khi chốt brief; không chọn thì bỏ trống (theo từng beat).'),
    autopilot: z.boolean().optional().describe('Chạy tự động từ brief đến upload, không dừng chờ duyệt (mọi gate kỹ thuật vẫn chạy: QC, va chạm, visual review, SFX, BGM, flicker). MẶC ĐỊNH BẬT từ 22/11/2026 (user đã cho phép sẵn, không hỏi khi chốt brief). Truyền false chỉ khi user nói muốn duyệt từng bước.'),
    short_variant: z.boolean().optional().describe('Biến thể Short 9:16 (YouTube Shorts) của video dài: chỉ video story 16:9, thời lượng ≥ 90 s. Bỏ trống = tắt. Hỏi user khi chốt brief (Bật/Tắt). Bật thì sau khi video dài upload xong (autopilot.php finish trả short_variant.next) Agent chọn beat giữ/bỏ (không đổi lời), reviewer độc lập chấm một lần, rồi make-short.mjs ghép short.mp4 9:16 và ghi CMS. Docs: docs/short-video/short-variant.md.'),
    autopilot_confirmation: z.string().trim().min(1).max(4000).optional().describe('Bỏ trống: CMS ghi chỉ dẫn mặc định của workflow. Nếu user tự nói yêu cầu chạy tự động thì trích NGUYÊN VĂN. Dùng thay cho xác nhận từng beat của continue_beat.'),
    character_style: z.enum(['default', 'stick-head', 'ink-toon', 'soft-clay', 'inflated', 'tiny-diorama', 'low-poly', 'voxel', 'paper-pop-up', 'spotlight-stage', 'block-avatar', 'brick-toy']).optional().describe('Style nhân vật: CHỈ nhân vật dựng theo một style atlas (runtime THREE.SVCast, hình viên thuốc đơn giản), bối cảnh vẫn theo từng beat như bình thường (engine threejs, video_format story). Bỏ trống = `default` (nhân vật bình thường, Character Designer; mặc định từ 22/11/2026, không hỏi user) cho video story Three.js không khoá style (video trước đó: stick-head từ 17/11 22:00, ink-toon 16/11–17/11); `default` = nhân vật bình thường (Character Designer); `stick-head` (Đầu tròn) = giữ nguyên nhân vật Character Designer, chỉ đổi đầu thành quả cầu màu da với mặt vẽ (THREE.SVStickHead, CMS tự gắn khi compose), cảm xúc phóng đại qua update(t,{emotion,...}); `block-avatar` (Người khối) = người khối đồ chơi qua THREE.SVCast: thân hộp, tay chân khối khớp vai/hông, đầu hộp bo góc mặt vẽ phẳng to, tóc/mũ khối, giữ màu và trang phục thiết kế (C.fromDesign). Không truyền style khác default cùng atlas_style (khoá style cả video đã gồm nhân vật). Khi chọn: visual beat 1 có `CAST SHEET:`, mỗi visual có dòng `CAST:`, HTML beat mặc định dựng nhân vật bằng `THREE.SVCast.create(<id>, {renderer})` trong khối `// SV-CAST BEGIN … END`; video shared không gán asset nhân vật. ink-toon: mọi đối tượng của bối cảnh cũng có viền mực 6,5 px — mọi HTML beat mặc định gọi `C.inkWorld(scene)` mỗi frame trước `C.frame(...)` (gate lưu kiểm). Không hỏi khi chốt brief; user nêu style khác thì truyền.'),
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
  'Làm từng công đoạn. Mặc định dừng cho user kiểm tra sau mỗi công đoạn; ở giai đoạn HTML mỗi lượt một beat: TTS/Whisper, visual, sound plan (natural + MP3 code), HTML, QC, visual review (chụp frame, đối chiếu VISUAL) và lưu rồi STOP; natural SFX là gợi ý để user chọn; chỉ continue_beat sau khi user nói rõ sang beat tiếp (trích nguyên văn). Khi status.autopilot.enabled (user đã yêu cầu chạy đến hết): không dừng, natural_sfx_auto, continue_beat không cần trích, cuối cùng scripts/beat-html/autopilot.php finish (render → flicker → upload). Visual review bắt buộc ở cả hai chế độ.',
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
      z.object({
        action: z.literal('script_review'),
        operation: z.enum(['get', 'check', 'store']),
        script: z.string().max(60000).optional().describe('Kịch bản ứng viên (thẻ <voice>); bỏ trống = kịch bản đang lưu. store luôn dùng bản đang lưu và đòi lời nói trùng bản đã review.'),
        review: z.record(z.unknown()).optional().describe('sv_script_review_v1: review_skeleton của get + reviewers[] = JSON nguyên văn của 2 reviewer độc lập (nguoi-nghe-lanh, bien-tap-truyen) + round 1–3 + history.'),
        user_override: z.string().trim().min(1).max(4000).optional().describe('Chỉ khi hết 3 vòng chưa pass: trích NGUYÊN VĂN tin nhắn user chấp nhận kịch bản; không tự viết.'),
      }).describe('Vòng chất lượng kịch bản story (video tạo từ 19/11/2026 23:00): get = đo bằng code (độ dài, câu mở, CTA, câu dài, mốc giờ, gate kiểu lời) + 2 prompt reviewer đã điền kịch bản; chạy mỗi prompt trong agent MỚI độc lập, check, sửa theo blocking (giữ keep), tối đa 3 vòng; store gắn review đạt vào lời nói của kịch bản đang lưu. beat_audio/narration từ chối script_review_required khi chưa có. Docs: docs/short-video/script-review.md.'),
      z.object({
        action: z.literal('hud'),
        operation: z.enum(['get', 'save']),
        hud: z.object({
          slots: z.array(z.object({
            id: z.string().regex(/^[a-z][a-z0-9_]{0,23}$/),
            kind: z.enum(['counter', 'label']),
            anchor: z.enum(['top-left', 'top-center', 'top-right']).optional(),
            label: z.string().max(40).optional(),
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            initial: z.union([z.number(), z.string().max(32)]).optional(),
          })).min(1).max(6),
          keys: z.array(z.object({
            slot: z.string(),
            beat_id: z.string().regex(/^beat_\d+$/),
            value: z.union([z.number(), z.string().max(32)]),
            at_word: z.string().max(80).optional(),
            at_sec: z.number().min(0).max(600).optional(),
            tween_sec: z.number().min(0).max(6).optional(),
          })).max(400).optional(),
          hidden_beats: z.array(z.string().regex(/^beat_\d+$/)).optional(),
        }).optional().describe('Chữ xuyên suốt cả video (CMS vẽ lớp phủ). keys gắn beat + từ trong lời/caption (at_word) hoặc giây local (at_sec).'),
      }),
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
        operation: z.enum(['get', 'manifest', 'environment_prompt', 'save_environment', 'material_catalog', 'material_search', 'resolve_materials', 'design_catalog', 'character_design', 'preview', 'series_cast_list', 'series_cast_link', 'series_cast_sync']).describe('Shared environments: material_catalog lists valid ambientCG categories; material_search ranks within category. Declare material.name + userData.svMaterial in factory. save_environment automatically resolves/downloads/applies PBR once after generation. resolve_materials upgrades an existing annotated environment using both current hashes. Never search/download in beat HTML. Series cast (dàn nhân vật cố định): series_cast_list lists recurring members; series_cast_link applies member cast_id design to character asset_id (needs expected_module_hash + expected_spec_hash from get); series_cast_sync re-applies the member latest design when the asset shows series_cast.stale.'),
        text: z.string().optional(),
        expected_revision: z.string().optional(),
        asset_id: z.string().optional(),
        category: z.string().optional(),
        keywords: z.array(z.string()).max(8).optional(),
        cast_id: z.string().optional(),
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
        visual_review: z.record(z.unknown()).describe('Bắt buộc: file review đã điền của ĐÚNG HTML này (scripts/beat-html/visual-review.php --template → beat-live shot … --sheet → xem từng frame, điền status pass|fail + seen mô tả hình thật → --check). Thiếu, sai hash hoặc còn fail → visual_review_required kèm expected_checks.'),
      }).describe('Chạy QC bắt buộc + kiểm visual review rồi lưu HTML khi đạt; trả qc/repair_prompt nếu chưa đạt. Sau success + hash readback: không autopilot thì STOP cho user review; autopilot thì continue_beat. Natural pending: user chọn trong CMS, hoặc natural_sfx_auto khi autopilot.'),
      z.object({
        action: z.literal('blender_asset'),
        operation: z.enum(['list', 'save']),
        asset_id: z.string().optional(),
        blend_path: z.string().optional(),
        preview_path: z.string().optional(),
        spec: z.record(z.unknown()).optional(),
      }).describe('Render engine blender only. list: cast/set của manifest, file .blend dự kiến và hướng dẫn dựng (MakeHuman, HDRI/asset CC0). save: đăng ký .blend + ảnh review đã dựng cho CHÍNH video này (cast/<id>/ hoặc env/<id>/ có build.py), rồi STOP cho user review.'),
      z.object({ action: z.literal('blender_context'), beat_id: z.string().min(1) }).describe('Render engine blender only — thay prepare_beat_html: trả visual, timing Whisper của beat, sound plan/SFX cue, cast/env .blend, đường dẫn, lệnh render draft/final, prompt beat và revision.'),
      z.object({
        action: z.literal('save_beat_video'),
        beat_id: z.string().min(1),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        video_path: z.string().min(1),
      }).describe('Render engine blender only — lưu beats/<beat>/final.mp4 (preset final, qc_final.json ok, đúng duration/size) làm video của beat; CMS tự trộn narration/SFX/BGM khi render. Sau success + hash vẫn STOP cho user review; continue_beat dùng reviewed_html_sha256 = video_sha256.'),
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
      z.object({action:z.literal('continue_beat'),beat_id:z.string().regex(/^beat_[1-9][0-9]*$/),reviewed_beat_id:z.string().regex(/^beat_[1-9][0-9]*$/),reviewed_html_sha256:z.string().regex(/^[a-f0-9]{64}$/),user_confirmation:z.string().trim().min(1).max(4000).optional()}).describe('Without autopilot: ONLY after an explicit user message approving review and requesting the next beat; quote that actual message verbatim, never invent/assume approval. With autopilot on (status.autopilot.enabled) omit user_confirmation: the stored autopilot request is used. Either way the reviewed beat needs a passing visual review bound to its saved HTML (visual_review_required otherwise). Binds to the saved HTML hash and unlocks one beat.'),
      z.object({ action: z.literal('autopilot'), operation: z.enum(['get', 'enable', 'disable']), user_confirmation: z.string().trim().min(1).max(4000).optional() }).describe('Bật/tắt chạy tự động cho video đã có. enable cần user_confirmation = NGUYÊN VĂN tin nhắn user yêu cầu chạy đến hết không dừng; không tự bật.'),
      z.object({ action: z.literal('short_variant'), operation: z.enum(['get', 'enable', 'disable']) }).describe('Biến thể Short 9:16 của video dài (story 16:9 ≥ 90 s): get = trạng thái (off | pending | done | file_missing, output, next); enable/disable cho video đã có. Làm sau khi video dài upload: short-variant.php context → cut-list → review-prompt (agent độc lập) → make-short.mjs prepare/render (tự ghi CMS).'),
      z.object({ action: z.literal('natural_sfx_auto'), beat_id: z.string().min(1), event_ids: z.array(z.string()).max(24).optional(), allow_freesound: z.boolean().optional(), user_confirmation: z.string().trim().min(1).max(4000).optional() }).describe('Tự gắn bản thu thật cho các cue natural đang chờ của beat: thư viện storage/sfx-library (bản thu có giấy phép) rồi Freesound CC0/CC BY (FREESOUND_API_KEY), cắt onset/đoạn đủ dài, khoá timeline + đọc lại. Chỉ khi autopilot bật hoặc kèm user_confirmation trích nguyên văn yêu cầu của user. unmatched → đổi query cue trong save_sound_plan. Kiểm peak_after_cue_sec với khoảnh khắc trên hình.'),
      z.object({ action: z.literal('sfx_library'), operation: z.enum(['search', 'freesound']), query: z.string().min(1).max(200), category: z.enum(['foley', 'emotion', 'ambience']).optional(), need_sec: z.number().positive().optional() }).describe('Chỉ đọc: tìm trong thư viện SFX (điểm, giấy phép, onset/peak) hoặc thử Freesound.'),
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
  'Lấy style CMS đã resolve. Với video có sẵn truyền short_video_id, với draft video-html chưa tạo truyền asset_mode (+ render_engine, mặc định threejs) để đọc file style workflow.',
  {
    short_video_id: z.number().int().positive().optional(),
    asset_mode: z.enum(['shared', 'free']).optional(),
    render_engine: z.enum(['blender', 'threejs']).optional(),
  },
  async ({ short_video_id, asset_mode, render_engine }) => {
    const query: Record<string, string | number> = {};
    if (short_video_id !== undefined) query.short_video_id = short_video_id;
    if (asset_mode !== undefined) query.asset_mode = asset_mode;
    if (render_engine !== undefined) query.render_engine = render_engine;
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
