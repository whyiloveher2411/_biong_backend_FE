import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';
import { DEFAULT_TTS_PLATFORMS } from './agentVideoUi';

export type ApiMessage = { content?: string } | string;

export type VisualStyleCatalogItem = {
    key: string;
    label: string;
    description?: string;
};

export type AgentRenderMode = 'creative' | 'import_html';

export type AgentVisualMode = 'hyperframes' | 'whiteboard' | 'video_2s';

export type AgentImageAnimationEffect =
    | 'none'
    | 'random'
    | 'zoom_in'
    | 'zoom_out'
    | 'pan_left'
    | 'pan_right'
    | 'tilt_up'
    | 'tilt_down'
    | 'focus_pull';

export const AGENT_IMAGE_ANIMATION_OPTIONS: Array<{ value: AgentImageAnimationEffect; label: string }> = [
    { value: 'random', label: 'Ngẫu nhiên' },
    { value: 'none', label: 'Không hiệu ứng' },
    { value: 'zoom_in', label: 'Zoom In' },
    { value: 'zoom_out', label: 'Zoom Out' },
    { value: 'pan_left', label: 'Pan Trái' },
    { value: 'pan_right', label: 'Pan Phải' },
    { value: 'tilt_up', label: 'Tilt Lên' },
    { value: 'tilt_down', label: 'Tilt Xuống' },
    { value: 'focus_pull', label: 'Mờ → nét' },
];

export type AgentImageAnimationBeatValue = AgentImageAnimationEffect | 'common';

/** Options cho RIÊNG từng beat — mặc định 'common' = theo tiêu chuẩn chung. */
export const AGENT_IMAGE_ANIMATION_BEAT_OPTIONS: Array<{
    value: AgentImageAnimationBeatValue;
    label: string;
}> = [
    { value: 'common', label: 'Theo tiêu chuẩn chung' },
    ...AGENT_IMAGE_ANIMATION_OPTIONS,
];

export type AgentWhiteboardConfig = {
    resolution?: '720p' | '1080p' | string;
    board_theme?: string;
    transition?: string;
    hand?: string;
    gen_style?: string;
    hold_ratio?: number;
    color_ratio?: number;
    photo_place_mode?: 'draw' | 'drag' | 'instant' | string;
    transition_duration_sec?: number;
    /** Tài nguyên riêng lẻ (chuẩn bị cho CapCut) — bỏ render video beat, ghép final, upload store, BGM, thumbnail. */
    assets_mode?: boolean;
    /** Hiệu ứng chuyển động ảnh mặc định toàn clip (mặc định 'random'). */
    image_animation_effect?: AgentImageAnimationEffect | string;
    /** Số beat render mỗi job (batch, render song song) — 1 = mỗi beat 1 job. */
    beats_per_job?: number;
};

export type BeatRegionPoint = [number, number];

/**
 * Vùng chọn trên ảnh beat (region tool) — polygon chuẩn hóa 0-1 theo ảnh gốc.
 * action 'draw' = vẽ tay trong vùng; 'place' = đưa ảnh trong vùng vào.
 * script_start_word/script_end_word = index trong whisper words toàn video —
 * vùng phải render hoàn chỉnh khi đọc đến từ script_end_word.
 */
/**
 * Mẫu background của RIÊNG 1 vùng: user chọn 1 vùng nhỏ background trên ảnh —
 * render sẽ lặp lại mẫu này để fill nền vùng đó thay cho bảng trắng.
 */
export type BeatBackgroundSample = {
    points: BeatRegionPoint[];
};

export type BeatRegion = {
    id: string;
    name?: string;
    /**
     * Lớp ảnh (BeatImageLayer.id) mà vùng này được vẽ trên. Rỗng/thiếu = lớp
     * ảnh đầu tiên của beat (beat cũ chỉ có 1 ảnh → không cần field này).
     */
    layer_id?: string | null;
    /** Group timeline UI (không ảnh hưởng logic render mask). */
    group_id?: string | null;
    /** Thứ tự hiển thị trong group (tùy chọn). */
    group_order?: number | null;
    /** Tên hiển thị của group (đồng bộ trên mọi member). */
    group_name?: string | null;
    points: BeatRegionPoint[];
    /**
     * draw = vẽ tay trong vùng; place = đưa ảnh trong vùng vào;
     * erase = XÓA VÙNG THỪA — phần này không được đưa vào/vẽ, hiển thị ảnh gốc
     * (dùng để bỏ phần chọn thừa sau khi tự chọn vật thể).
     */
    action: 'draw' | 'place' | 'erase';
    parent_id?: string | null;
    /**
     * "VÙNG CHA HIỆN NGAY" (setting RIÊNG cho TỪNG vùng cha — vùng có vùng con):
     * phần thừa của vùng cha (sau khi trừ các vùng con) hiện NGUYÊN ẢNH trong
     * beat từ đầu — chỉ các vùng con được vẽ/đưa vào theo cài đặt. Tắt/không
     * con: vùng vẽ/đưa vào như hiện tại (cha trước, rồi đến vùng con).
     */
    parent_leftover_instant?: boolean;
    script_start_word?: number | null;
    script_end_word?: number | null;
    /**
     * THỜI GIAN render (giây, scene-relative trong beat) — dùng thay cho chọn
     * từ script (whisper có thể thiếu / muốn kiểm soát chính xác). start_sec =
     * thời điểm vùng BẮT ĐẦU render, end_sec = thời điểm vùng render XONG.
     */
    start_sec?: number | null;
    end_sec?: number | null;
    /** Mẫu background riêng của vùng này — lặp lại fill nền vùng khi render. */
    bg_sample?: BeatBackgroundSample | null;
    /**
     * Ảnh nền ĐÃ VÁ (inpaint — bỏ vật thể, nền giữ nguyên) — công cụ "Giữ nền":
     * render hiển thị nền này cho vùng chọn thay vì tile bg_sample.
     */
    background_image?: string | null;
    /** "Chỉ vật trong vùng": contour vật thể (GrabCut/ML) — render ưu tiên khi có. */
    object_points?: BeatRegionPoint[];
    /** Tọa độ TOÀN VÙNG thủ công (trước khi refine) — UI hiển thị đúng option + rollback. */
    full_points?: BeatRegionPoint[];
    /** Chế độ chọn: 'object' = chỉ vật trong vùng; 'full' = toàn vùng (mặc định). */
    select_mode?: 'object' | 'full';
    /**
     * HIỆU ỨNG SAU KHI RENDER (action='place' | 'draw'):
     * - place: full PLACE_EFFECT_OPTIONS, mặc định 'loang'
     * - draw: chỉ DRAW_EFFECT_OPTIONS (loang / mirror_sheen / neon_border / none),
     *   mặc định 'none'
     * Field dùng chung place_effect (PHP/engine đã truyền sẵn).
     */
    place_effect?: PlaceEffectKey;
    /**
     * MÀU ĐÈN NEON CHẠY VIỀN (place_effect='neon_border'): preset engine hỗ
     * trợ — 'cyan' (mặc định), 'pink', 'yellow', 'lime', 'orange', 'purple',
     * 'red', 'green', 'blue', 'white'. Chỉ hiển thị UI khi chọn neon_border.
     */
    place_effect_color?: NeonColorKey;
    /**
     * KIỂU TAY ĐƯA ẢNH VÀO (action='place'):
     * - 'ban_tay_dua_anh_vao' (mặc định — bàn tay lòng bàn tay đưa ảnh vào)
     * - 'hand_move' (tay kéo ảnh cũ)
     * Bỏ trống → dùng kiểu mặc định. Hiệu ứng zoom_out_bounce/pop_in_bounce
     * không dùng tay (không hiển thị selector).
     */
    place_hand?: string | null;
    /**
     * HƯỚNG ĐƯA ẢNH VÀO (action='place', có tay):
     * random | top_down | left | right | bottom_up | top_left_down | top_right_down |
     * bottom_left_up | bottom_right_up. Không áp dụng zoom_out_bounce /
     * pop_in_bounce / nam_cham.
     */
    place_entry_direction?: PlaceEntryDirectionKey | null;
    /**
     * STYLE CUTOUT (action='place' | 'draw') — gắn cố định trên ảnh, giữ suốt beat.
     * Khác PLACE_EFFECT_OPTIONS / DRAW_EFFECT_OPTIONS: hiệu ứng tạm, tắt sau
     * animation. Các field dưới đây độc lập, bật kết hợp được.
     */
    /** Bóng đổ (place: mặc định bật; draw: chỉ khi bật/tắt rõ trên UI). */
    place_shadow?: boolean;
    /** Viền màu quanh cutout — mặc định tắt; bật → chọn place_border_color. */
    place_border?: boolean;
    /** Màu viền (place_border=true) — mặc định 'white'. */
    place_border_color?: PlaceBorderColorKey;
    /** Viền giấy xé (mép cắt giấy cát tông + bóng) — mặc định tắt. */
    place_torn_paper?: boolean;
    /**
     * KIỂU TAY VẼ (action='draw'): id tay/bút trong whiteboard/pencil/meta.json —
     * 'but_chi' (mặc định), 'but_long_den_1', 'but_long_den_2', ...
     * Bỏ trống / null → bút chì (meta default), không còn ô "Mặc định" riêng trên UI.
     */
    draw_hand?: string | null;
    /**
     * Cách đưa nội dung vào (action='place') — override beat-level photo_place_mode.
     * draw = vẽ tay outline; drag_in = tay kéo từ ngoài; instant = đặt tại chỗ.
     */
    entry_mode?: RegionEntryModeKey;
    /** Cửa sổ hiệu ứng gây chú ý (scene-relative sec). null = tắt. */
    attention_start_sec?: number | null;
    attention_end_sec?: number | null;
    /** Loại gây chú ý — một loại / vùng. `none` hoặc thiếu + không cửa sổ = tắt. */
    attention_type?: AttentionEffectKey;
    /** Biên scale tối đa [1.05–1.3], mặc định 1.2 — engine không scale < 1.0. */
    attention_scale_max?: number;
    /** Chu kỳ 1 nhịp thở / sóng / quét (giây), mặc định 1.2. */
    attention_cycle_sec?: number;
    /** Cường độ spotlight / glitch / saber / god_rays [0.35–1], mặc định 0.75. */
    attention_intensity?: number;
};

/** Cách đưa ảnh/cutout vào scene (per-region / overlay). */
export type RegionEntryModeKey = 'draw' | 'drag_in' | 'instant';

export const REGION_ENTRY_MODE_OPTIONS: Array<{
    value: RegionEntryModeKey;
    label: string;
    description: string;
}> = [
    {
        value: 'instant',
        label: 'Đặt tại chỗ',
        description: 'Hiện ngay tại vị trí (hoặc bounce nếu chọn hiệu ứng nảy)',
    },
    {
        value: 'draw',
        label: 'Vẽ tay',
        description: 'Tay vẽ outline trước, rồi lộ nội dung trong vùng',
    },
    {
        value: 'drag_in',
        label: 'Đưa từ ngoài vào',
        description: 'Tay kéo ảnh từ ngoài màn hình vào vùng',
    },
];

export const ATTENTION_SCALE_MAX_DEFAULT = 1.2;
export const ATTENTION_CYCLE_SEC_DEFAULT = 1.2;
export const ATTENTION_DURATION_DEFAULT_SEC = 2.5;
export const ATTENTION_MIN_WINDOW_SEC = 0.3;
export const ATTENTION_SCALE_MAX_MIN = 1.05;
export const ATTENTION_SCALE_MAX_LIMIT = 1.3;
export const ATTENTION_INTENSITY_DEFAULT = 0.75;
export const ATTENTION_INTENSITY_MIN = 0.35;
export const ATTENTION_INTENSITY_MAX = 1;
export const ATTENTION_MAGENTA = '#ec407a';

/** Một loại gây chú ý / vùng (giống place_effect). */
export type AttentionEffectKey =
    | 'none'
    | 'breathe'
    | 'spotlight'
    | 'glitch'
    | 'ripple'
    | 'saber'
    | 'god_rays'
    | 'light_sweep';

export const ATTENTION_EFFECT_OPTIONS: Array<{
    value: AttentionEffectKey;
    label: string;
    timelineLabel: string;
    description: string;
}> = [
    {
        value: 'none',
        label: 'Tắt',
        timelineLabel: '',
        description: 'Không hiệu ứng gây chú ý',
    },
    {
        value: 'breathe',
        label: 'Thở',
        timelineLabel: 'thở',
        description: 'Phóng to / thu nhỏ nhịp nhàng trên chính vùng đã đặt',
    },
    {
        value: 'spotlight',
        label: 'Tối nền',
        timelineLabel: 'tối nền',
        description: 'Vùng khác tối lại, vùng này sáng nhất, mép mờ dần như ánh sáng buổi tối',
    },
    {
        value: 'glitch',
        label: 'Nhiễu sóng',
        timelineLabel: 'glitch',
        description: 'Tách nhẹ rìa đỏ / xanh dương quanh vùng (chromatic aberration)',
    },
    {
        value: 'ripple',
        label: 'Sóng xung kích',
        timelineLabel: 'sóng',
        description: 'Vòng sóng lan từ tâm vùng ra ngoài, lặp theo chu kỳ',
    },
    {
        value: 'saber',
        label: 'Năng lượng viền',
        timelineLabel: 'saber',
        description: 'Luồng sáng nhỏ chạy vòng quanh viền vùng chú ý',
    },
    {
        value: 'god_rays',
        label: 'Tia xuyên thấu',
        timelineLabel: 'tia sáng',
        description: 'Tia sáng dài xuyên nền tối quanh vùng, như đèn pha trong sương',
    },
    {
        value: 'light_sweep',
        label: 'Quét sáng',
        timelineLabel: 'quét sáng',
        description: 'Tia sáng sắc quét ngang bề mặt vùng từ trái sang phải',
    },
];

const ATTENTION_EFFECT_KEYS: AttentionEffectKey[] = ATTENTION_EFFECT_OPTIONS.map((opt) => opt.value);

export function normalizeAttentionType(
    raw: unknown,
    hasWindow = false,
): AttentionEffectKey {
    const value = String(raw || '').trim().toLowerCase() as AttentionEffectKey;
    if (ATTENTION_EFFECT_KEYS.includes(value) && value !== 'none') {
        return value;
    }
    if (value === 'none') {
        return hasWindow ? 'breathe' : 'none';
    }
    return hasWindow ? 'breathe' : 'none';
}

export function normalizeAttentionIntensity(raw: unknown): number {
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num)) {
        return ATTENTION_INTENSITY_DEFAULT;
    }
    return Math.max(ATTENTION_INTENSITY_MIN, Math.min(ATTENTION_INTENSITY_MAX, num));
}

export function attentionEffectTimelineLabel(type: AttentionEffectKey | null | undefined): string {
    const key = normalizeAttentionType(type, true);
    return ATTENTION_EFFECT_OPTIONS.find((opt) => opt.value === key)?.timelineLabel || 'chú ý';
}

/**
 * LỚP ẢNH NGUỒN trong 1 beat — mỗi lớp là 1 ảnh full-frame cùng canvas, vẽ vùng
 * (region) được trên chính ảnh đó. Các lớp THAY NHAU theo slot thời gian, trong
 * khi custom background của beat giữ nguyên xuyên suốt (không nháy nền).
 * Beat cũ (1 ảnh) được resolve lazy thành đúng 1 lớp — dữ liệu đã lưu không đổi.
 */
export type BeatImageLayer = {
    id: string;
    name?: string;
    image_url: string;
    /** Slot thời gian trên timeline beat (scene-relative sec). */
    start_sec: number;
    end_sec: number;
    /** Thứ tự hiển thị (nhỏ = trước). */
    order?: number;
    /** Override cách đưa nội dung vào cho riêng lớp này ('' = theo beat). */
    photo_place_mode?: 'draw' | 'drag' | 'instant' | string;
};

/** Ảnh thêm upload tự do trên canvas beat. */
export type BeatImageOverlay = {
    id: string;
    name?: string;
    /** Lớp ảnh chứa overlay này. Rỗng = lớp ảnh đầu tiên. */
    layer_id?: string | null;
    /** Group timeline UI (không ảnh hưởng logic render). */
    group_id?: string | null;
    /** Thứ tự hiển thị trong group (tùy chọn). */
    group_order?: number | null;
    /** Tên hiển thị của group (đồng bộ trên mọi member). */
    group_name?: string | null;
    image_url: string;
    /** Tâm rect normalized 0–1 trên ảnh beat. */
    x: number;
    y: number;
    width: number;
    height: number;
    rotation_deg?: number;
    /** Thời gian xuất hiện (bar chính timeline). end_sec = lúc animate/đặt xong. */
    start_sec: number;
    end_sec: number;
    /** Sau end_sec ảnh ở lại đến hết beat. Tắt = ẩn khi hết cửa sổ [start, end). */
    hold_to_end?: boolean;
    /** GIF/animated WebP: lặp animation. Mặc định true. Tắt = phát 1 lần rồi giữ frame cuối. */
    repeat?: boolean;
    entry_mode?: RegionEntryModeKey;
    place_effect?: PlaceEffectKey;
    place_effect_color?: NeonColorKey;
    place_hand?: string | null;
    place_entry_direction?: PlaceEntryDirectionKey | null;
    place_shadow?: boolean;
    place_border?: boolean;
    place_border_color?: PlaceBorderColorKey;
    place_torn_paper?: boolean;
    /** Kiểu bút khi entry_mode=draw. */
    draw_hand?: string | null;
    attention_start_sec?: number | null;
    attention_end_sec?: number | null;
    attention_type?: AttentionEffectKey;
    attention_scale_max?: number;
    attention_cycle_sec?: number;
    attention_intensity?: number;
};

export function normalizeRegionEntryMode(raw: string | null | undefined): RegionEntryModeKey {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'draw' || value === 'drag_in' || value === 'instant') {
        return value;
    }
    return 'drag_in';
}

export function normalizeAttentionScaleMax(raw: unknown): number {
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num)) {
        return ATTENTION_SCALE_MAX_DEFAULT;
    }
    return Math.max(ATTENTION_SCALE_MAX_MIN, Math.min(ATTENTION_SCALE_MAX_LIMIT, num));
}

export function normalizeAttentionCycleSec(raw: unknown): number {
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num) || num <= 0.1) {
        return ATTENTION_CYCLE_SEC_DEFAULT;
    }
    return Math.max(0.4, Math.min(6, num));
}

export function isRegionAttentionEnabled(
    start: number | null | undefined,
    end: number | null | undefined,
): boolean {
    const s = typeof start === 'number' && Number.isFinite(start) ? start : null;
    const e = typeof end === 'number' && Number.isFinite(end) ? end : null;
    return s != null && e != null && e - s >= ATTENTION_MIN_WINDOW_SEC;
}

export function normalizeBeatImageOverlay(raw: unknown): BeatImageOverlay | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const item = raw as Record<string, unknown>;
    const id = String(item.id || '').trim();
    const imageUrl = String(item.image_url || '').trim();
    if (!id || !imageUrl) {
        return null;
    }
    const x = Number(item.x);
    const y = Number(item.y);
    const width = Number(item.width);
    const height = Number(item.height);
    const startSec = Number(item.start_sec);
    const endSec = Number(item.end_sec);
    return {
        id,
        name: typeof item.name === 'string' ? item.name : undefined,
        layer_id: typeof item.layer_id === 'string' && item.layer_id.trim()
            ? item.layer_id.trim()
            : null,
        group_id: typeof item.group_id === 'string' && item.group_id.trim()
            ? item.group_id.trim()
            : null,
        group_order: Number.isFinite(Number(item.group_order))
            ? Math.max(0, Math.floor(Number(item.group_order)))
            : null,
        group_name: typeof item.group_name === 'string' && item.group_name.trim()
            ? item.group_name.trim()
            : null,
        image_url: imageUrl,
        x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5,
        y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : 0.5,
        width: Number.isFinite(width) ? Math.max(0.02, Math.min(1, width)) : 0.2,
        height: Number.isFinite(height) ? Math.max(0.02, Math.min(1, height)) : 0.2,
        rotation_deg: Number.isFinite(Number(item.rotation_deg)) ? Number(item.rotation_deg) : 0,
        start_sec: Number.isFinite(startSec) ? Math.max(0, startSec) : 0,
        end_sec: Number.isFinite(endSec) ? Math.max(0, endSec) : 2,
        hold_to_end: Boolean(item.hold_to_end),
        // Mặc định lặp GIF; chỉ tắt khi client gửi false rõ ràng.
        repeat: item.repeat === false || item.repeat === 0 || item.repeat === '0' || item.repeat === 'false'
            ? false
            : true,
        entry_mode: normalizeRegionEntryMode(item.entry_mode as string | undefined),
        place_effect: item.place_effect != null
            ? normalizePlaceEffect(String(item.place_effect))
            : 'loang',
        place_effect_color: item.place_effect_color != null
            ? normalizeNeonColor(String(item.place_effect_color))
            : undefined,
        place_hand: item.place_hand != null ? String(item.place_hand) : null,
        place_entry_direction: item.place_entry_direction != null
            ? normalizePlaceEntryDirection(String(item.place_entry_direction))
            : null,
        place_shadow: item.place_shadow != null ? Boolean(item.place_shadow) : true,
        place_border: Boolean(item.place_border),
        place_border_color: item.place_border_color != null
            ? normalizePlaceBorderColor(String(item.place_border_color))
            : undefined,
        place_torn_paper: Boolean(item.place_torn_paper),
        draw_hand: item.draw_hand != null ? String(item.draw_hand) : null,
        attention_start_sec: finiteSecOrNull(item.attention_start_sec),
        attention_end_sec: finiteSecOrNull(item.attention_end_sec),
        attention_type: normalizeAttentionType(
            item.attention_type,
            isRegionAttentionEnabled(
                finiteSecOrNull(item.attention_start_sec),
                finiteSecOrNull(item.attention_end_sec),
            ),
        ),
        attention_scale_max: normalizeAttentionScaleMax(item.attention_scale_max),
        attention_cycle_sec: normalizeAttentionCycleSec(item.attention_cycle_sec),
        attention_intensity: normalizeAttentionIntensity(item.attention_intensity),
    };
}

function finiteSecOrNull(value: unknown): number | null {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
}

export function normalizeBeatImageOverlays(raw: unknown): BeatImageOverlay[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .map((item) => normalizeBeatImageOverlay(item))
        .filter((item): item is BeatImageOverlay => item != null);
}

export function normalizeBeatRegionAttentionFields(region: BeatRegion): BeatRegion {
    const out = { ...region };
    if (region.entry_mode != null) {
        out.entry_mode = normalizeRegionEntryMode(region.entry_mode);
    }
    if (region.attention_start_sec != null && !Number.isFinite(Number(region.attention_start_sec))) {
        out.attention_start_sec = null;
        out.attention_end_sec = null;
    }
    if (region.attention_end_sec != null && !Number.isFinite(Number(region.attention_end_sec))) {
        out.attention_end_sec = null;
    }
    const hasWindow = isRegionAttentionEnabled(out.attention_start_sec, out.attention_end_sec);
    out.attention_type = normalizeAttentionType(region.attention_type, hasWindow);
    if (!hasWindow) {
        out.attention_type = 'none';
    }
    if (region.attention_scale_max != null) {
        out.attention_scale_max = normalizeAttentionScaleMax(region.attention_scale_max);
    }
    if (region.attention_cycle_sec != null) {
        out.attention_cycle_sec = normalizeAttentionCycleSec(region.attention_cycle_sec);
    }
    out.attention_intensity = normalizeAttentionIntensity(region.attention_intensity);
    return out;
}

/** HIỆU ỨNG KHI ĐƯA VÀO vùng (action='place'). */
export type PlaceEffectKey = 'loang' | 'none' | 'slide_friction' | 'zoom_out_bounce' | 'pop_in_bounce' | 'mirror_sheen' | 'neon_border';

export const PLACE_EFFECT_OPTIONS: Array<{
    value: PlaceEffectKey;
    label: string;
    description: string;
}> = [
    {
        value: 'loang',
        label: 'Loang',
        description: 'Vệt phun màu/khói trắng + viền mực lan ra ngoài vùng (mặc định)',
    },
    {
        value: 'slide_friction',
        label: 'Quán tính trượt',
        description: 'Thả tay xong ảnh trượt tới vượt đích rồi nảy lui/tới… mỗi nhịp biên độ giảm 1/2, dừng đúng đích',
    },
    {
        value: 'zoom_out_bounce',
        label: 'Thu nhỏ -nảy',
        description: 'Ảnh từ RẤT TO co dần về đúng khung, quá đà nhồi nhỏ/rộng đàn hồi vài nhịp rồi khít (như ảnh rơi "bộp" xuống khung)',
    },
    {
        value: 'pop_in_bounce',
        label: 'Phóng to - nảy',
        description: 'Ảnh từ điểm nhỏ phóng vọt lên, quá đà to hơn khung rồi co lại vừa khít (như ảnh tự "bung" từ bảng)',
    },
    {
        value: 'mirror_sheen',
        label: 'Quét sáng tráng gương',
        description: 'Sau khi đặt xong, dải ánh sáng trắng mờ nghiêng 45° quét nhanh từ góc trên-trái xuống dưới-phải ảnh + điểm sáng tròn lóe ở rìa cuối (như kính tráng gương)',
    },
    {
        value: 'neon_border',
        label: 'Đèn neon chạy viền',
        description: 'Đốm sáng neon lao 3 vòng quanh viền ảnh vừa đặt (Trái → Trên → Phải → Dưới), đuôi sáng tàn dần kiểu đom đóm, vòng phình ra rồi co về, 2 frame cuối toàn viền flash — có âm thanh đèn neon chạy',
    },
    {
        value: 'none',
        label: 'Không hiệu ứng',
        description: 'Chỉ đặt ảnh vào vùng — KHÔNG có hiệu ứng nào (không loang, không âm thanh đặt ảnh)',
    },
];

/**
 * THỜI LƯỢNG HIỆU ỨNG SAU KHI ĐƯA ẢNH VÀO (cố định theo engine frames.py):
 * - loang          → place_fix 1.0s  (pf_frames = round(1.0 * fps))
 * - slide_friction → chuỗi nảy quán tính ~0.35s sau khi tay thả
 * - zoom_out_bounce / pop_in_bounce → scale đàn hồi 0.6s (scale_in_n)
 * - mirror_sheen   → quét sáng 0.4s  (ms_frames = round(0.4 * fps))
 * - neon_border    → đèn neon 1.2s   (nb_frames bị chặn tối đa 1.2s)
 * - none           → 0s (không có hiệu ứng sau khi đặt ảnh)
 * Dùng vẽ phần MỞ RỘNG sau thanh vùng trên timeline để user biết khoảng
 * thời gian hiệu ứng chiếm thêm và điều chỉnh bar hợp lý.
 */
export const PLACE_EFFECT_AFTER_SEC: Record<PlaceEffectKey, number> = {
    loang: 1.0,
    none: 0,
    slide_friction: 0.35,
    zoom_out_bounce: 0.6,
    pop_in_bounce: 0.6,
    mirror_sheen: 0.4,
    neon_border: 1.2,
};

/** Thời lượng hiệu ứng sau khi đặt ảnh của 1 vùng (giây). */
export function placeEffectAfterSec(effect: string | null | undefined): number {
    return PLACE_EFFECT_AFTER_SEC[normalizePlaceEffect(effect)] || 0;
}

/** Hiệu ứng SAU KHI VẼ TAY xong — subset của PlaceEffectKey; mặc định none. */
export type DrawEffectKey = 'loang' | 'mirror_sheen' | 'neon_border' | 'none';

export const DRAW_EFFECT_OPTIONS: Array<{
    value: DrawEffectKey;
    label: string;
    description: string;
}> = [
    {
        value: 'loang',
        label: 'Loang',
        description: 'Vệt phun màu/khói trắng + viền mực lan ra ngoài vùng sau khi vẽ xong',
    },
    {
        value: 'mirror_sheen',
        label: 'Quét sáng tráng gương',
        description: 'Vệt sáng chéo quét qua vùng vừa vẽ + điểm sáng lóe ở rìa',
    },
    {
        value: 'neon_border',
        label: 'Đèn neon chạy viền',
        description: 'Đốm sáng neon lao quanh viền vùng vừa vẽ',
    },
    {
        value: 'none',
        label: 'Không hiệu ứng',
        description: 'Chỉ vẽ tay — không thêm hiệu ứng sau khi vẽ xong (mặc định)',
    },
];

/** Khôi phục hiệu ứng draw hợp lệ; giá trị lạ / thiếu → 'none'. */
export function normalizeDrawEffect(raw: string | null | undefined): DrawEffectKey {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'loang' || value === 'mirror_sheen' || value === 'neon_border' || value === 'none') {
        return value;
    }
    return 'none';
}

/** Thời lượng hiệu ứng sau khi vẽ tay (giây) — cùng bảng PLACE_EFFECT_AFTER_SEC. */
export function drawEffectAfterSec(effect: string | null | undefined): number {
    return PLACE_EFFECT_AFTER_SEC[normalizeDrawEffect(effect)] || 0;
}

/** MÀU ĐÈN NEON CHẠY VIỀN (place_effect='neon_border') — đồng bộ preset engine. */
export const NEON_COLOR_KEYS = ['cyan', 'pink', 'yellow', 'lime', 'orange', 'purple', 'red', 'green', 'blue', 'white'] as const;
export type NeonColorKey = (typeof NEON_COLOR_KEYS)[number];

export const NEON_COLOR_OPTIONS: Array<{
    value: NeonColorKey;
    label: string;
    swatch: string;
}> = [
    { value: 'cyan', label: 'Xanh dương', swatch: '#00ffff' },
    { value: 'pink', label: 'Hồng', swatch: '#ff2e88' },
    { value: 'yellow', label: 'Vàng', swatch: '#e9ff3d' },
    { value: 'lime', label: 'Vàng chanh', swatch: '#39ff14' },
    { value: 'orange', label: 'Cam', swatch: '#ff7a00' },
    { value: 'purple', label: 'Tím', swatch: '#b026ff' },
    { value: 'red', label: 'Đỏ', swatch: '#ff1f3d' },
    { value: 'green', label: 'Xanh lá', swatch: '#00ff88' },
    { value: 'blue', label: 'Xanh biển', swatch: '#00a2ff' },
    { value: 'white', label: 'Trắng', swatch: '#ffffff' },
];

/** Khôi phục màu neon hợp lệ; giá trị lạ → 'cyan' (mặc định). */
export function normalizeNeonColor(raw: string | null | undefined): NeonColorKey {
    const value = String(raw || '').trim().toLowerCase();
    if ((NEON_COLOR_KEYS as readonly string[]).includes(value)) {
        return value as NeonColorKey;
    }
    return 'cyan';
}

/** Khôi phục place_effect hợp lệ (dữ liệu cũ có thể còn inertial_rotation/dynamic_shadow → về loang). */
export function normalizePlaceEffect(raw: string | null | undefined): PlaceEffectKey {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'none' || value === 'slide_friction' || value === 'zoom_out_bounce' || value === 'pop_in_bounce' || value === 'mirror_sheen' || value === 'neon_border') {
        return value;
    }
    return 'loang';
}

/** Bóng đổ khi đưa ảnh vào — mặc định bật; chỉ tắt khi raw === false. */
export function normalizePlaceShadow(raw: boolean | null | undefined): boolean {
    return raw !== false;
}

/** Bóng đổ style cutout theo action — place mặc định bật, draw mặc định tắt. */
export function normalizeCutoutShadow(
    action: BeatRegion['action'],
    raw: boolean | null | undefined,
): boolean {
    if (action === 'draw') {
        return raw === true;
    }
    return raw !== false;
}

/** Viền màu quanh cutout — mặc định tắt; chỉ bật khi raw === true. */
export function normalizePlaceBorder(raw: boolean | null | undefined): boolean {
    return raw === true;
}

/** Viền giấy xé — mặc định tắt; chỉ bật khi raw === true. */
export function normalizePlaceTornPaper(raw: boolean | null | undefined): boolean {
    return raw === true;
}

/** MÀU VIỀN cutout (place_border=true) — đồng bộ preset engine. */
export const PLACE_BORDER_COLOR_KEYS = [
    'white',
    'paper',
    'black',
    'red',
    'yellow',
    'cyan',
    'blue',
    'green',
    'pink',
    'orange',
] as const;
export type PlaceBorderColorKey = (typeof PLACE_BORDER_COLOR_KEYS)[number];

export const PLACE_BORDER_COLOR_OPTIONS: Array<{
    value: PlaceBorderColorKey;
    label: string;
    swatch: string;
}> = [
    { value: 'white', label: 'Trắng', swatch: '#ffffff' },
    { value: 'paper', label: 'Giấy', swatch: '#faf8f5' },
    { value: 'black', label: 'Đen', swatch: '#111111' },
    { value: 'red', label: 'Đỏ', swatch: '#ff1f3d' },
    { value: 'yellow', label: 'Vàng', swatch: '#e9ff3d' },
    { value: 'cyan', label: 'Xanh dương', swatch: '#00ffff' },
    { value: 'blue', label: 'Xanh biển', swatch: '#00a2ff' },
    { value: 'green', label: 'Xanh lá', swatch: '#00ff88' },
    { value: 'pink', label: 'Hồng', swatch: '#ff2e88' },
    { value: 'orange', label: 'Cam', swatch: '#ff7a00' },
];

/** Khôi phục màu viền hợp lệ; giá trị lạ → 'white' (mặc định). */
export function normalizePlaceBorderColor(raw: string | null | undefined): PlaceBorderColorKey {
    const value = String(raw || '').trim().toLowerCase();
    if ((PLACE_BORDER_COLOR_KEYS as readonly string[]).includes(value)) {
        return value as PlaceBorderColorKey;
    }
    return 'white';
}

/** KIỂU TAY ĐƯA ẢNH VÀO vùng (action='place') — đồng bộ whiteboard/keo-anh/meta.json. */
export const PLACE_HAND_KEYS = ['ban_tay_dua_anh_vao', 'hand_move', 'nam_cham', 'nhay_coc'] as const;
export type PlaceHandKey = (typeof PLACE_HAND_KEYS)[number];

/** Khôi phục place_hand hợp lệ; '' = dùng kiểu mặc định của engine. */
export function normalizePlaceHand(raw: string | null | undefined): PlaceHandKey | '' {
    const value = String(raw || '').trim().toLowerCase();
    if ((PLACE_HAND_KEYS as readonly string[]).includes(value)) {
        return value as PlaceHandKey;
    }
    return '';
}

/** Hiệu ứng ĐƯA VÀO không dùng tay (ảnh tự nảy vào khung) → ẩn selector kiểu tay. */
export function isPlaceHandlessEffect(effect: PlaceEffectKey): boolean {
    return effect === 'zoom_out_bounce' || effect === 'pop_in_bounce';
}

/** Vùng place: đặt tại chỗ (instant) — không kéo tay từ ngoài màn hình. */
export function isRegionPlaceInstantEntry(
    source: Pick<BeatRegion, 'action' | 'place_effect' | 'entry_mode'>,
): boolean {
    if (String(source.action || '').trim().toLowerCase() !== 'place') {
        return false;
    }
    const mode = source.entry_mode != null
        ? normalizeRegionEntryMode(source.entry_mode)
        : null;
    if (mode === 'instant') {
        return true;
    }
    if (mode === 'drag_in') {
        return false;
    }
    const effect = normalizePlaceEffect(source.place_effect);
    return effect === 'none' || isPlaceHandlessEffect(effect);
}

export function isOverlayInstantEntry(
    source: Pick<BeatImageOverlay, 'place_effect' | 'entry_mode'>,
): boolean {
    const mode = source.entry_mode != null
        ? normalizeRegionEntryMode(source.entry_mode)
        : null;
    if (mode === 'instant') {
        return true;
    }
    if (mode === 'drag_in') {
        return false;
    }
    const effect = normalizePlaceEffect(source.place_effect);
    return effect === 'none' || isPlaceHandlessEffect(effect);
}

/**
 * Thời lượng hiệu ứng sau ảnh dùng cho timeline / attention / preview render.
 * Đặt tại chỗ (`instant`): luôn 0 dù `place_effect` còn trong data (giữ để user chọn lại Đưa vào).
 */
export function renderPlaceEffectAfterSec(
    source:
        | Pick<BeatRegion, 'action' | 'entry_mode' | 'place_effect'>
        | Pick<BeatImageOverlay, 'entry_mode' | 'place_effect'>,
): number {
    if ('action' in source) {
        const action = String(source.action || '').trim().toLowerCase();
        if (action === 'draw') {
            return drawEffectAfterSec(normalizeDrawEffect(source.place_effect));
        }
        if (action !== 'place') {
            return 0;
        }
        if (isRegionPlaceInstantEntry(source)) {
            return 0;
        }
        return placeEffectAfterSec(source.place_effect);
    }
    const mode = source.entry_mode != null
        ? normalizeRegionEntryMode(source.entry_mode)
        : null;
    if (mode === 'draw') {
        return drawEffectAfterSec(normalizeDrawEffect(source.place_effect));
    }
    if (isOverlayInstantEntry(source)) {
        return 0;
    }
    return placeEffectAfterSec(source.place_effect);
}

/** Patch chọn hành động Vẽ tay. */
export function buildRegionDrawActionPatch(
    source: Pick<BeatRegion, 'place_effect'>,
): Pick<BeatRegion, 'action' | 'place_effect' | 'entry_mode'> {
    return {
        action: 'draw',
        entry_mode: 'draw',
        place_effect: normalizeDrawEffect(source.place_effect),
    };
}

/** Chọn "Đặt tại chỗ" — ảnh xuất hiện ngay tại vùng, không tay kéo.
 * Giữ `place_effect` trong data (user chọn lại Đưa vào còn hiệu ứng cũ);
 * render ép none. `start_sec=0` vì ảnh luôn đặt đúng chỗ từ đầu beat.
 */
export function buildRegionPlaceInstantEntryPatch(): Pick<
    BeatRegion,
    | 'action'
    | 'entry_mode'
    | 'place_hand'
    | 'place_entry_direction'
    | 'place_shadow'
    | 'start_sec'
    | 'script_start_word'
> {
    return {
        action: 'place',
        entry_mode: 'instant',
        place_hand: null,
        place_entry_direction: null,
        place_shadow: true,
        start_sec: 0,
        script_start_word: null,
    };
}

/** Chọn "Đưa vào" (kéo từ ngoài) — tay kéo + loang mặc định nếu đang đặt tại chỗ. */
export function buildRegionPlaceDragInPatch(
    source: Pick<BeatRegion, 'place_effect' | 'place_shadow'>,
): Pick<BeatRegion, 'action' | 'entry_mode' | 'place_effect' | 'place_shadow'> {
    const effect = normalizePlaceEffect(source.place_effect);
    const nextEffect = effect === 'none' || isPlaceHandlessEffect(effect) ? 'loang' : effect;
    return {
        action: 'place',
        entry_mode: 'drag_in',
        place_effect: nextEffect,
        place_shadow: normalizePlaceShadow(source.place_shadow),
    };
}

/** UI: hành động đang chọn trên vùng (3 option gom 1 nhóm). */
export function resolveRegionImageActionKey(
    source: Pick<BeatRegion, 'action' | 'place_effect' | 'entry_mode'>,
): 'draw' | 'drag_in' | 'instant' {
    if (String(source.action || '').trim().toLowerCase() === 'draw') {
        return 'draw';
    }
    return isRegionPlaceInstantEntry(source) ? 'instant' : 'drag_in';
}

/** Overlay «Đặt tại chỗ» — giữ place_effect trong data; render ép none; start=0. */
export function buildOverlayInstantEntryPatch(): Pick<
    BeatImageOverlay,
    'entry_mode' | 'place_hand' | 'place_entry_direction' | 'place_shadow' | 'start_sec'
> {
    return {
        entry_mode: 'instant',
        place_hand: null,
        place_entry_direction: null,
        place_shadow: true,
        start_sec: 0,
    };
}

export function buildOverlayDragInPatch(
    source: Pick<BeatImageOverlay, 'place_effect' | 'place_shadow'>,
): Pick<BeatImageOverlay, 'entry_mode' | 'place_effect' | 'place_shadow'> {
    const effect = normalizePlaceEffect(source.place_effect);
    const nextEffect = effect === 'none' || isPlaceHandlessEffect(effect) ? 'loang' : effect;
    return {
        entry_mode: 'drag_in',
        place_effect: nextEffect,
        place_shadow: source.place_shadow != null ? Boolean(source.place_shadow) : true,
    };
}

export function buildOverlayDrawActionPatch(
    source: Pick<BeatImageOverlay, 'place_effect'>,
): Pick<BeatImageOverlay, 'entry_mode' | 'place_effect'> {
    return {
        entry_mode: 'draw',
        place_effect: normalizeDrawEffect(source.place_effect),
    };
}

export function resolveOverlayImageActionKey(
    source: Pick<BeatImageOverlay, 'place_effect' | 'entry_mode'>,
): 'draw' | 'drag_in' | 'instant' {
    const mode = source.entry_mode != null
        ? normalizeRegionEntryMode(source.entry_mode)
        : null;
    if (mode === 'draw') {
        return 'draw';
    }
    return isOverlayInstantEntry(source) ? 'instant' : 'drag_in';
}

/**
 * Suy ra entry_mode khi lưu — ưu tiên entry_mode user chọn trên UI.
 */
export function resolveRegionEntryModeFromPlaceSettings(
    source: Pick<BeatRegion, 'action' | 'place_effect' | 'entry_mode'>,
): RegionEntryModeKey | undefined {
    const action = String(source.action || '').trim().toLowerCase();
    if (action === 'draw') {
        return 'draw';
    }
    if (action !== 'place') {
        return undefined;
    }
    if (source.entry_mode != null) {
        return normalizeRegionEntryMode(source.entry_mode);
    }
    return isRegionPlaceInstantEntry(source) ? 'instant' : 'drag_in';
}

/** Overlay ảnh thêm: cùng quy tắc. */
export function resolveOverlayEntryModeFromPlaceSettings(
    source: Pick<BeatImageOverlay, 'place_effect' | 'entry_mode'>,
): RegionEntryModeKey {
    if (source.entry_mode != null) {
        return normalizeRegionEntryMode(source.entry_mode);
    }
    return isOverlayInstantEntry(source) ? 'instant' : 'drag_in';
}

/** Hướng đưa ảnh vào — đồng bộ engine frames.py _PLACE_ENTRY_DIRECTION_ANGLES. */
export const PLACE_ENTRY_DIRECTION_KEYS = [
    'random',
    'top_down',
    'left',
    'right',
    'bottom_up',
    'top_left_down',
    'top_right_down',
    'bottom_left_up',
    'bottom_right_up',
] as const;
export type PlaceEntryDirectionKey = (typeof PLACE_ENTRY_DIRECTION_KEYS)[number];

export const PLACE_ENTRY_DIRECTION_OPTIONS: Array<{
    value: PlaceEntryDirectionKey;
    label: string;
    /** Nhãn ngắn trên lưới vùng chọn hướng. */
    cellLabel: string;
    description: string;
}> = [
    {
        value: 'random',
        label: 'Ngẫu nhiên',
        cellLabel: '?',
        description: 'Hướng vào tự do 360° (mặc định)',
    },
    {
        value: 'top_down',
        label: 'Trên ↓',
        cellLabel: 'Trên',
        description: 'Kéo từ phía trên xuống',
    },
    {
        value: 'left',
        label: '← Trái',
        cellLabel: 'Trái',
        description: 'Kéo từ cạnh trái vào',
    },
    {
        value: 'right',
        label: 'Phải →',
        cellLabel: 'Phải',
        description: 'Kéo từ cạnh phải vào',
    },
    {
        value: 'bottom_up',
        label: '↑ Dưới',
        cellLabel: 'Dưới',
        description: 'Kéo từ phía dưới lên',
    },
    {
        value: 'top_left_down',
        label: '↘ Góc',
        cellLabel: '↘',
        description: 'Kéo từ góc trái-trên chéo vào (↘)',
    },
    {
        value: 'top_right_down',
        label: '↙ Góc',
        cellLabel: '↙',
        description: 'Kéo từ góc phải-trên chéo vào (↙)',
    },
    {
        value: 'bottom_left_up',
        label: '↗ Góc',
        cellLabel: '↗',
        description: 'Kéo từ góc trái-dưới chéo vào (↗)',
    },
    {
        value: 'bottom_right_up',
        label: '↖ Góc',
        cellLabel: '↖',
        description: 'Kéo từ góc phải-dưới chéo vào (↖)',
    },
];

/** Lưới 3×3: góc — cạnh — góc; giữa = ngẫu nhiên. */
export const PLACE_ENTRY_DIRECTION_GRID: readonly PlaceEntryDirectionKey[][] = [
    ['top_left_down', 'top_down', 'top_right_down'],
    ['left', 'random', 'right'],
    ['bottom_left_up', 'bottom_up', 'bottom_right_up'],
];

const PLACE_ENTRY_DIRECTION_BY_KEY = Object.fromEntries(
    PLACE_ENTRY_DIRECTION_OPTIONS.map((opt) => [opt.value, opt]),
) as Record<PlaceEntryDirectionKey, (typeof PLACE_ENTRY_DIRECTION_OPTIONS)[number]>;

/** Nhãn ô lưới hướng đưa vào. */
export function placeEntryDirectionCellLabel(key: PlaceEntryDirectionKey): string {
    return PLACE_ENTRY_DIRECTION_BY_KEY[key]?.cellLabel ?? key;
}

/** Mô tả tooltip ô lưới hướng đưa vào. */
export function placeEntryDirectionDescription(key: PlaceEntryDirectionKey): string {
    return PLACE_ENTRY_DIRECTION_BY_KEY[key]?.description ?? key;
}

/** Khôi phục hướng đưa vào hợp lệ; giá trị lạ / thiếu → 'random'. */
export function normalizePlaceEntryDirection(raw: string | null | undefined): PlaceEntryDirectionKey {
    const value = String(raw || '').trim().toLowerCase();
    if ((PLACE_ENTRY_DIRECTION_KEYS as readonly string[]).includes(value)) {
        return value as PlaceEntryDirectionKey;
    }
    return 'random';
}

/** Hướng đưa vào áp dụng khi có tay kéo / nhảy cốc (không bounce / nam châm). */
export function isPlaceEntryDirectionApplicable(
    effect: PlaceEffectKey,
    placeHand?: string | null,
): boolean {
    if (isPlaceHandlessEffect(effect)) {
        return false;
    }
    const hand = normalizePlaceHand(placeHand);
    return hand !== 'nam_cham';
}

/** Patch khi đổi place_effect — xóa place_hand / hướng nếu không dùng tay.
 * Không đổi entry_mode (Đặt tại chỗ / Đưa vào do nhóm nút hành động quyết định).
 */
export function buildPlaceEffectRegionUpdate(
    effect: PlaceEffectKey,
): Pick<BeatRegion, 'place_effect' | 'place_hand' | 'place_entry_direction'> {
    const updates: Pick<BeatRegion, 'place_effect' | 'place_hand' | 'place_entry_direction'> = {
        place_effect: effect,
    };
    if (isPlaceHandlessEffect(effect) || effect === 'none') {
        updates.place_hand = null;
        updates.place_entry_direction = null;
    }
    return updates;
}

/** Patch khi đổi place_hand — xóa hướng nếu chọn nam_cham. */
export function buildPlaceHandRegionUpdate(
    handId: string | null,
): Pick<BeatRegion, 'place_hand' | 'place_entry_direction'> {
    const updates: Pick<BeatRegion, 'place_hand' | 'place_entry_direction'> = {
        place_hand: handId,
    };
    if (normalizePlaceHand(handId) === 'nam_cham') {
        updates.place_entry_direction = null;
    }
    return updates;
}

/** Loại hiệu ứng timeline trên beat — mở rộng union khi thêm loại mới. */
export type BeatTimelineEffectType = 'zoom';

export type BeatTimelineEffectBase = {
    id: string;
    type: BeatTimelineEffectType;
    /** Group timeline UI (không ảnh hưởng engine effect). */
    group_id?: string | null;
    /** Thứ tự hiển thị trong group (tùy chọn). */
    group_order?: number | null;
    /** Tên hiển thị của group (đồng bộ trên mọi member). */
    group_name?: string | null;
    start_sec: number;
    end_sec: number;
    name?: string;
    /** Thứ tự layer khi overlap — số lớn = áp sau (stack trên). */
    layer: number;
};

export type BeatZoomEffect = BeatTimelineEffectBase & {
    type: 'zoom';
    /** Mức zoom đích (1.0 – 2.0, khớp MAX_ZOOM engine). */
    zoom_level: number;
    /** Điểm zoom (0–1, ratio ảnh gốc). */
    focus_x: number;
    focus_y: number;
    /** Kết thúc đoạn zoom in / bắt đầu giữ zoom (scene-relative sec). */
    zoom_in_end_sec: number;
    /** Kết thúc đoạn giữ zoom / bắt đầu zoom out (scene-relative sec). */
    hold_end_sec: number;
};

export type BeatTimelineEffect = BeatZoomEffect;

export const BEAT_TIMELINE_EFFECT_MIN_DUR_SEC = 1.0;
export const BEAT_TIMELINE_EFFECT_MAX_ZOOM = 2.0;

export {
    normalizeBeatTimelineEffects,
    normalizeBeatZoomEffect,
} from './beatTimelineEffects/normalizeTimelineEffects';

export type AgentWhiteboardBeatOverride = {
    hand?: string;
    board_theme?: string;
    gen_style?: 'whiteboard' | 'sketch' | 'hybrid' | 'collage_art' | 'vox' | 'courtroom_sketch' | string;
    photo_place_mode?: 'draw' | 'drag' | 'instant' | string;
    duration_sec?: number;
    hold_sec?: number;
    color_sec?: number;
    transition_duration_sec?: number;
    /** Hiệu ứng chuyển động ảnh cho beat này (override clip-level; 'common' = theo chung). */
    image_animation_effect?: AgentImageAnimationBeatValue | string;
    /** Điểm tập trung (0-1, ratio của ảnh gốc) — frame cuối đưa điểm này ra giữa màn hình. */
    focus_x?: number | null;
    focus_y?: number | null;
    /**
     * Nền custom per-beat — khi có URL và không hidden, render chỉ hiện vùng cắt
     * (đúng tọa độ ảnh beat) trên nền này thay vì ảnh beat ngoài vùng.
     */
    custom_background_url?: string | null;
    /** Tạm ẩn custom background (preview + render dùng ảnh beat; giữ URL). */
    custom_background_hidden?: boolean;
    /**
     * Dán toàn bộ ảnh beat (PNG nền trong suốt) lên trên custom background thay
     * vì chỉ lộ vùng cắt. Vùng vẫn chỉ cắt trên ảnh beat.
     */
    beat_image_over_background?: boolean;
    /**
     * NHIỀU LỚP ẢNH trong beat — các ảnh thay nhau theo slot thời gian, dùng
     * chung 1 custom background. Rỗng/thiếu = beat 1 ảnh như trước (resolve
     * lazy thành 1 lớp qua `resolveBeatImageLayers`).
     */
    image_layers?: BeatImageLayer[];
    /**
     * Kế hoạch slot lớp ảnh (beat-relative) do bước chia beat theo JSON sinh từ
     * timing lời thoại con — tồn tại TRƯỚC khi có ảnh, dùng thay việc chia đều
     * khi ảnh được lưu về sau.
     */
    image_layer_slots?: Array<{ start_sec: number; end_sec: number }>;
    /** Vùng chọn hành động (region tool) — mỗi vùng vẽ tay hoặc đưa vào theo script. */
    regions?: BeatRegion[];
    /** Ảnh thêm upload tự do trên canvas beat. */
    image_overlays?: BeatImageOverlay[];
    /** Hiệu ứng timeline (zoom, …) trên beat — theo khoảng thời gian scene-relative. */
    timeline_effects?: BeatTimelineEffect[];
};

export type WhiteboardBeatRenderEntry = {
    status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
    job_id?: number;
    silent_mp4?: string;
    video_path?: string;
    video_url?: string;
    error?: string;
    queued_at?: string;
    updated_at?: string;
};

export type SocialAccountItem = {
    index: number;
    title: string;
    social_type: string;
    url?: string;
    has_cookie?: boolean;
    has_facebook_session?: boolean;
    has_tiktok_session?: boolean;
};

export type ImportHtmlBgmSegment = {
    id: string;
    title?: string;
    download_url: string;
    preview_url?: string;
    duration_sec: number;
    provider?: string;
    /** Volume riêng từng bài (0.05–1.5, mặc định 0.3). */
    volume?: number;
};

export type ImportHtmlMarketingPostImage = {
    url: string;
    caption?: string;
};

export type ImportHtmlVisualCatalogItem = {
    id: string;
    media_type: 'image' | 'video';
    url: string;
    preview_url?: string;
    title?: string;
    provider?: string;
    duration_sec?: number;
    caption?: string;
    search_query?: string;
    source?: string;
    /** URL gốc (GitHub raw) — dùng dedupe khi import README */
    origin_url?: string;
};

export type GithubReadmeMediaItem = {
    id: string;
    media_type: 'image' | 'video';
    resolved_url: string;
    origin_path?: string;
    alt?: string;
    ext?: string;
};

export type ImportHtmlGithubImageShot = {
    id: string;
    description: string;
    visual_catalog_id?: string;
};

export type ImportHtmlAssets = {
    bgm_segments?: ImportHtmlBgmSegment[];
    /** Tự lặp lại audio nền khi tổng thời lượng < video (mặc định true). */
    bgm_loop?: boolean;
    sfx_beat_transition?: boolean;
    sfx_hook?: boolean;
    visual_catalog?: ImportHtmlVisualCatalogItem[];
    github_image_shots?: ImportHtmlGithubImageShot[];
    readme_media?: GithubReadmeMediaItem[];
    github_default_branch?: string;
    github_top_repos?: {
        period?: string;
        limit?: number | string;
        repos?: Array<{
            full_name?: string;
            cover_image_url?: string;
            cover_visual_catalog_id?: string;
            visual_catalog_ids?: string[];
            status?: string;
            fetch_ok?: boolean;
            error?: string;
            [key: string]: unknown;
        }>;
    };
    updated_at?: string;
};

export type CaptionSyncSummary = {
    exact_ratio?: number | null;
    trusted_ratio?: number | null;
    max_gap_sec?: number | null;
    large_gap_count?: number;
    karaoke_quality?: 'ok' | 'poor' | string | null;
    synced_at?: string | null;
};

export type WhisperWord = {
    text: string;
    start: number;
    end: number;
    /** Index trong danh sách toàn video (thêm phía FE khi cần). */
    index?: number;
};

export type TtsPhoneticDictEntry = {
    id?: number;
    source_term: string;
    phonetic: string;
    phonetic_tokens?: string[];
    /** true → AI ≠ ai khi khớp phiên âm */
    case_sensitive?: boolean;
};

export type CaptionAlignOverride = {
    index: number;
    text: string;
    whisperText?: string;
    matchType?: string;
    start: number;
    end: number;
    useWhisperText?: boolean;
};

export type ImportHtmlComposition = {
    assembled_at?: string;
    assemble_status?: 'none' | 'ok' | 'failed' | string;
    assemble_error?: string;
    render_status?: 'none' | 'ok' | 'failed' | string;
    render_error?: string;
    render_failed_at?: string;
    caption_sync?: CaptionSyncSummary | null;
};

export function isKaraokeSyncPoor(captionSync?: CaptionSyncSummary | null): boolean {
    if (!captionSync) {
        return false;
    }
    if (captionSync.karaoke_quality === 'poor') {
        return true;
    }
    if ((captionSync.large_gap_count ?? 0) > 0) {
        return true;
    }
    if (captionSync.exact_ratio != null && captionSync.exact_ratio < 0.85) {
        return true;
    }
    if (captionSync.max_gap_sec != null && captionSync.max_gap_sec > 3) {
        return true;
    }
    return false;
}

export type ImportHtmlGeminiJobBlock = {
    status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
    job_ids?: number[];
    /** Beat đang có job pending/processing trên queue (khôi phục UI sau refresh). */
    active_beat_ids?: string[];
    queued_at?: string;
    updated_at?: string;
    error?: string;
    progress?: {
        current?: number;
        total?: number;
        beat_id?: string;
        succeeded?: number;
        failed?: string[];
    };
};

export type ThumbnailQaStatus = '' | 'approved' | 'needs_regenerate';

export type ImportHtmlThumbnailIdea = {
    schema_version?: number;
    concept_id?: string;
    concept_label?: string;
    visual_style?: string;
    series_label?: string;
    headline?: string;
    subline?: string;
    curiosity_element?: string;
    subject?: string;
    layout?: string;
    visual_description?: string;
    background?: string;
    background_layers?: string;
    support_visuals_below?: string;
    content_signal?: string;
    color_accent?: string;
    avoid?: string[];
    rationale?: string;
    updated_at?: string;
};

export type ImportHtmlThumbnailBlock = {
    idea?: ImportHtmlThumbnailIdea;
    html?: string;
    updated_at?: string;
    creative_prompt?: string;
    qa_status?: ThumbnailQaStatus;
    qa_note?: string;
    image_url?: string;
    image_s3_key?: string;
    image_generated_at?: string;
    approved?: boolean;
    approved_at?: string;
    gemini_idea?: ImportHtmlGeminiJobBlock;
    gemini_fill?: ImportHtmlGeminiJobBlock;
};

export type ImportHtmlSummary = {
    html_length?: number;
    html_updated_at?: string;
    has_html?: boolean;
    whisper_status?: 'none' | 'processing' | 'completed' | 'failed' | string;
    whisper_word_count?: number;
    whisper_words?: WhisperWord[];
    whisper_transcribed_at?: string;
    whisper_stale?: boolean;
    whisper_error?: string;
    caption_words_status?: 'none' | 'validated' | 'failed' | string;
    caption_words_count?: number;
    caption_words_saved_at?: string;
    caption_align_overrides?: CaptionAlignOverride[];
    beat_map_ready?: boolean;
    beat_count?: number;
    beat_map_updated_at?: string;
    beats_html_total?: number;
    beats_html_completed?: number;
    beats_html_ready?: boolean;
    beats_image_total?: number;
    beats_image_completed?: number;
    beats_image_ready?: boolean;
    missing_beat_image_ids?: string[];
    gemini_image_fill?: ImportHtmlGeminiJobBlock;
    import_html_ready?: boolean;
    missing_beat_ids?: string[];
    beats_render_error_count?: number;
    beat_render_error_ids?: string[];
    gemini_fill?: ImportHtmlGeminiJobBlock;
    gemini_division?: {
        status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
        job_ids?: number[];
        queued_at?: string;
        updated_at?: string;
        error?: string;
    };
    gemini_refine_visual?: ImportHtmlGeminiJobBlock;
    gemini_refine_html?: ImportHtmlGeminiJobBlock;
    thumbnail?: ImportHtmlThumbnailBlock;
    gemini_thumbnail_idea?: ImportHtmlGeminiJobBlock;
    gemini_thumbnail_fill?: ImportHtmlGeminiJobBlock;
    /** Backend: true khi có job Puppeteer/headless đang chạy (một nguồn sự thật, không map theo pipeline step). */
    headless_browser_active?: boolean;
    beat_qa_counts?: {
        approved?: number;
        needs_html_refill?: number;
        needs_visual_tweak?: number;
        unreviewed?: number;
    };
    assets?: ImportHtmlAssets;
    composition?: ImportHtmlComposition;
    bgm_total_sec?: number;
    bgm_covers_video?: boolean;
    bgm_loop?: boolean;
    html?: string;
    beat_map?: import('./agentVideoBeatMap').BeatMap | null;
    beat_html?: Record<string, import('./agentVideoBeatMap').BeatHtmlEntry>;
    beat_image?: Record<string, import('./agentVideoBeatMap').BeatImageEntry>;
    beat_versions?: import('./agentVideoBeatMap').BeatVersionsByBeatId;
    beat_active_version_id?: Record<string, string>;
    marketing_post_images?: ImportHtmlMarketingPostImage[];
};

export type OmnivoiceVoiceCatalogItem = {
    key: string;
    label: string;
    source?: string;
    preview_url?: string;
};

export type OmnivoiceVoiceMode = 'clone' | 'design';

export type OmnivoiceVoiceDesignTokenGroup = {
    id: string;
    label: string;
    tokens: string[];
};

export type SaveOmnivoiceVoicePayload = {
    mode: OmnivoiceVoiceMode;
    voice?: string;
    design?: string;
};

export type SaydiVoiceSampleItem = {
    name: string;
    display_name: string;
    gender?: string;
    language?: string;
    accent?: string;
    age?: string;
    description?: string;
    featured?: boolean;
    priority?: number;
    preview_url?: string;
};

const DEFAULT_SAYDI_VOICE = 'adam-11labs-vi';
export { DEFAULT_SAYDI_VOICE };

const OMNIVOICE_VOICE_PREVIEW_API_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/preview-omnivoice-voice';

const SAYDI_VOICE_PREVIEW_API_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/preview-saydi-voice';

function withAccessToken(path: string): string {
    if (!path) {
        return '';
    }
    try {
        const url = path.startsWith('http://') || path.startsWith('https://')
            ? new URL(path)
            : new URL(convertToURL(getAdminApiPrefix(), path));
        const token = getAccessToken();
        if (token && !url.searchParams.get('access_token')) {
            url.searchParams.set('access_token', token);
        }
        return url.toString();
    } catch {
        return '';
    }
}

export function resolveOmnivoiceVoicePreviewUrl(
    item: Pick<OmnivoiceVoiceCatalogItem, 'key' | 'preview_url'> | string,
): string {
    const key = typeof item === 'string'
        ? String(item || '').trim()
        : String(item?.key || '').trim();
    const rawPreview = typeof item === 'string'
        ? ''
        : String(item?.preview_url || '').trim();

    let path = rawPreview;
    if (!path && key) {
        path = `${OMNIVOICE_VOICE_PREVIEW_API_PATH}?voice=${encodeURIComponent(key)}`;
    }
    return withAccessToken(path);
}

export function resolveOmnivoiceVoiceDesignPreviewUrl(design: string): string {
    const trimmed = String(design || '').trim();
    if (!trimmed) {
        return '';
    }
    const path = `${OMNIVOICE_VOICE_PREVIEW_API_PATH}?mode=design&voice_design=${encodeURIComponent(trimmed)}`;
    return withAccessToken(path);
}

export function resolveSaydiVoicePreviewUrl(
    item: Pick<SaydiVoiceSampleItem, 'name' | 'preview_url'> | string,
): string {
    const name = typeof item === 'string'
        ? String(item || '').trim()
        : String(item?.name || '').trim();
    const rawPreview = typeof item === 'string'
        ? ''
        : String(item?.preview_url || '').trim();

    let path = rawPreview;
    if (!path && name) {
        path = `${SAYDI_VOICE_PREVIEW_API_PATH}?voice=${encodeURIComponent(name)}`;
    }
    return withAccessToken(path);
}

export type AgentSourceFormatCatalogItem = {
    key: string;
    label: string;
    description?: string;
};

export type AvatarPipAnchor =
    | 'top_left'
    | 'top_right'
    | 'bottom_left'
    | 'bottom_right'
    | 'center';

export type NarrationSegment = {
    id?: string;
    index: number;
    text: string;
    word_count: number;
    url: string;
    s3_key?: string;
    duration_sec: number;
    tts_engine?: string;
    status?: string;
    /** 'manual' = file admin upload thủ công, 'tts' = đoạn do TTS sinh. */
    source?: string;
    filename?: string;
};

/** Trạng thái ghép các file MP3 upload thủ công. */
export type ManualAudioState = {
    manual_segment_count: number;
    finalized_at: string;
    /** Danh sách đoạn đã đổi sau lần ghép gần nhất — cần ghép lại. */
    dirty: boolean;
};

/** Mode bước Ảnh beat — sibling agent_video_json.beat_image_fill_mode. */
export type BeatImageFillMode = 'auto' | 'manual';

export const DEFAULT_BEAT_IMAGE_FILL_MODE: BeatImageFillMode = 'auto';

export function normalizeBeatImageFillMode(raw?: string | null): BeatImageFillMode {
    const value = String(raw || '').trim().toLowerCase();
    return value === 'manual' ? 'manual' : 'auto';
}

/** Chỉ chạy beat còn thiếu ảnh khi fill ảnh beat — agent_video_json.beat_image_fill_only_missing. */
export type BeatImageFillOnlyMissing = boolean;

export const DEFAULT_BEAT_IMAGE_FILL_ONLY_MISSING = true;

export function normalizeBeatImageFillOnlyMissing(raw?: boolean | string | number | null): boolean {
    if (typeof raw === 'boolean') {
        return raw;
    }
    if (typeof raw === 'number') {
        return raw !== 0;
    }
    if (typeof raw === 'string') {
        const value = raw.trim().toLowerCase();
        return value === '' || ['1', 'true', 'yes', 'on'].includes(value);
    }
    return DEFAULT_BEAT_IMAGE_FILL_ONLY_MISSING;
}

/** Chỉ tạo audio beat còn thiếu khi chạy bước Audio từng beat — agent_video_json.beat_audio_only_missing. */
export type BeatAudioOnlyMissing = boolean;

export const DEFAULT_BEAT_AUDIO_ONLY_MISSING = true;

export function normalizeBeatAudioOnlyMissing(raw?: boolean | string | number | null): boolean {
    if (typeof raw === 'boolean') {
        return raw;
    }
    if (typeof raw === 'number') {
        return raw !== 0;
    }
    if (typeof raw === 'string') {
        const value = raw.trim().toLowerCase();
        return value === '' || ['1', 'true', 'yes', 'on'].includes(value);
    }
    return DEFAULT_BEAT_AUDIO_ONLY_MISSING;
}

export type AgentVideoBeatAudioItem = {
    mark_id: string;
    order: number;
    status: 'pending' | 'generating' | 'ready' | 'error' | string;
    source: 'tts' | 'upload' | string;
    tts_engine?: string;
    duration_sec: number;
    start_sec?: number;
    end_sec?: number;
    pause_after_ms?: number;
    url?: string;
    whisper_word_count?: number;
    /** Whisper RIÊNG của beat (beat-local 0s, chạy trên MP3 beat) — ưu tiên hơn whisper full. */
    whisper_words?: { text: string; start: number; end: number }[];
    qa_passed?: boolean;
    error?: string;
};

export type AgentVideoBeatAudioState = {
    enabled: boolean;
    total: number;
    ready: number;
    items: AgentVideoBeatAudioItem[];
    merged?: {
        url?: string;
        duration_sec?: number;
        updated_at?: string;
        pause_config?: { end_ms: number; comma_ms: number; none_ms: number };
    };
    updated_at?: string;
};

export type AgentVideoContentResponse = {
    success?: boolean;
    title?: string;
    audio_script?: string;
    audio_script_updated_at?: string;
    audio_script_generated_at?: string;
    audio_script_approved?: boolean;
    audio_script_approved_at?: string;
    audio_script_tts_reading?: string;
    audio_script_tts_reading_updated_at?: string;
    audio_file?: string;
    audio_file_duration_sec?: number;
    capcut_project_name?: string;
    capcut_project_path?: string;
    capcut_last_sync_json?: Record<string, unknown>;
    narration_segments?: NarrationSegment[];
    manual_audio?: ManualAudioState;
    agent_tts_auto?: boolean;
    agent_auto_fill_beat_html?: boolean;
    agent_gemini_open_browser?: boolean;
    agent_github_screenshot_homepage?: boolean;
    agent_introduce_app?: boolean;
    desired_script_duration_sec?: number | null;
    /** Vị trí timeline (giây) lần cuối user seek/scrub — restore khi mở lại. */
    last_timeline_sec?: number | null;
    audio_script_style_id?: number | null;
    agent_avatar_id?: number;
    agent_show_avatar?: boolean;
    agent_avatar_anchor?: AvatarPipAnchor;
    agent_show_karaoke?: boolean;
    agent_render_debug?: boolean;
    agent_beat_audio?: boolean;
    beat_audio?: AgentVideoBeatAudioState;
    beat_audio_only_missing?: boolean;
    agent_clip_aspect?: '9:16' | '16:9';
    clip_render_spec?: import('./agentVideoClipAspect').ClipRenderSpec;
    agent_visual_mode?: AgentVisualMode | string;
    agent_image_text_lang?: AgentImageTextLang | string;
    agent_beat_frequency?: import('./agentVideoBeatFrequency').AgentBeatFrequency | string;
    agent_whiteboard_config?: AgentWhiteboardConfig;
    agent_whiteboard_beat_overrides?: Record<string, AgentWhiteboardBeatOverride>;
    whiteboard_beat_renders?: Record<string, WhiteboardBeatRenderEntry>;
    agent_avatar?: {
        show?: boolean;
        avatar_id?: number;
        title?: string;
        master_url?: string;
        anchor?: AvatarPipAnchor;
    };
    agent_tts_platforms?: string[];
    agent_omnivoice_voice?: string;
    agent_omnivoice_voice_mode?: OmnivoiceVoiceMode;
    agent_omnivoice_voice_design?: string;
    agent_omnivoice_speed?: number;
    agent_saydi_voice?: string;
    omnivoice_voice_catalog?: OmnivoiceVoiceCatalogItem[];
    omnivoice_voice_design_tokens?: OmnivoiceVoiceDesignTokenGroup[];
    agent_video_status?: string;
    agent_video_url?: string;
    agent_video_rendered_at?: string;
    has_local_final_mp4?: boolean;
    local_final_mp4_url?: string;
    local_final_mp4_size_bytes?: number;
    local_final_mp4_modified_at?: string;
    agent_video_summary?: {
        estimated_duration_sec?: number | null;
        cta_mode?: string;
        marker_count?: number;
    };
    agent_tts_job_id?: number | null;
    agent_tts_status?: string;
    last_error?: string | null;
    tts_pending?: boolean;
    tts_failed?: boolean;
    needs_tts_enqueue?: boolean;
    tts_chain?: string[];
    tts_providers?: {
        chatgpt_web?: boolean;
        omnivoice?: boolean;
        omnivoice_local?: boolean;
        omnivoice_kaggle?: boolean;
        vieneu?: boolean;
        saydi?: boolean;
        vbee?: boolean;
    };
    visual_style?: string;
    visual_style_resolved?: string;
    visual_style_source?: string;
    visual_style_catalog?: VisualStyleCatalogItem[];
    /** @deprecated Transitional read fallback. */
    hf_theme?: string;
    /** @deprecated Transitional read fallback. */
    hf_theme_resolved?: string;
    /** @deprecated Transitional read fallback. */
    hf_theme_source?: string;
    /** @deprecated Transitional read fallback. */
    hf_theme_catalog?: VisualStyleCatalogItem[];
    workflow_mode?: string;
    agent_workflow?: {
        ready_for_video?: boolean;
        ready_for_continue?: boolean;
        ready_for_phase_2?: boolean;
        script_approved?: boolean;
        has_script?: boolean;
        has_agent_video?: boolean;
        tts_pending?: boolean;
        tts_failed?: boolean;
        phase?: string;
        render_mode?: AgentRenderMode;
        import_html_ready?: boolean;
        whisper_status?: string;
    };
    gemini_script?: {
        status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
        mode?: 'create' | 'improve' | string;
        job_ids?: number[];
        queued_at?: string;
        updated_at?: string;
        error?: string;
    };
    gemini_script_hook?: {
        status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
        job_ids?: number[];
        queued_at?: string;
        updated_at?: string;
        error?: string;
        source?: string;
    };
    gemini_script_phonetic?: {
        status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
        job_ids?: number[];
        queued_at?: string;
        updated_at?: string;
        error?: string;
        source?: string;
    };
    marketing_post_id?: number;
    app_mobile_id?: number;
    app_mobile_title?: string;
    social_accounts?: SocialAccountItem[];
    social_description?: string;
    social_hashtags?: string;
    thumbnail?: unknown;
    thumbnail_url?: string;
    agent_source_content?: string;
    agent_additional_info?: string;
    agent_github_repo?: string;
    agent_tiktok_url?: string;
    agent_youtube_url?: string;
    agent_source_format?: string;
    agent_source_format_catalog?: AgentSourceFormatCatalogItem[];
    content_plain_text?: string;
    readme_media?: GithubReadmeMediaItem[];
    post_eligible?: boolean;
    social_posted?: boolean;
    render_mode?: AgentRenderMode;
    import_html?: ImportHtmlSummary;
    tts_phonetic_dict?: TtsPhoneticDictEntry[];
    full_auto_pipeline?: FullAutoPipelineSummary;
    full_auto_step_toggles?: FullAutoStepToggles;
    beat_image_fill_mode?: BeatImageFillMode | string;
    beat_image_fill_only_missing?: boolean;
    github_top_enrich?: GithubTopEnrichSummary;
    topic_research?: TopicResearchBlock;
    remix?: RemixBlock;
};

export type GithubTopEnrichSummary = {
    status?: 'none' | 'preparing' | 'ready' | 'failed' | string;
    period?: string;
    limit?: number | string;
    total?: number;
    done?: number;
    failed?: number;
    queued?: number;
    current_index?: number;
    current_full_name?: string;
    percent?: number;
    error?: string;
    started_at?: string;
    updated_at?: string;
};

export type TopicResearchSourceItem = {
    url?: string;
    kind?: 'html' | 'youtube' | string;
    status?: 'pending' | 'ready' | 'failed' | 'skipped' | string;
    title?: string;
    markdown?: string;
    error?: string;
    fetched_at?: string;
};

export type TopicResearchBlock = {
    topic?: string;
    urls?: string[];
    sources?: TopicResearchSourceItem[];
    fetch?: {
        status?: 'idle' | 'preparing' | 'ready' | 'failed' | string;
        percent?: number;
        done?: number;
        total?: number;
        failed?: number;
        current_url?: string;
        error?: string;
        started_at?: string;
        updated_at?: string;
    };
    synthesize?: {
        status?: 'idle' | 'preparing' | 'ready' | 'failed' | string;
        error?: string;
        at?: string;
        job_id?: number | null;
    };
};

export type RemixBlock = {
    platform?: 'tiktok' | 'youtube' | string;
    raw_transcript?: string;
    meta?: {
        title?: string;
        uploader?: string;
        duration_sec?: number | null;
    };
    extract?: {
        status?: 'idle' | 'preparing' | 'ready' | 'failed' | string;
        error?: string;
        at?: string;
    };
    synthesize?: {
        status?: 'idle' | 'preparing' | 'ready' | 'failed' | string;
        error?: string;
        at?: string;
        job_id?: number | null;
    };
    backfill_at?: string;
};

export type FullAutoPipelineStepStatus = 'pending' | 'running' | 'skipped' | 'done' | 'failed' | string;

export const FULL_AUTO_PIPELINE_STEP_ORDER = [
    'script_create',
    'script_improve',
    'script_improve_qa',
    'script_phonetic_normalize',
    'approve_tts',
    'whisper',
    'beat_division',
    'beat_fill',
    'beat_image_fill',
    'beat_refine_visual',
    'beat_refine_html',
    'beat_audio',
    'bgm',
    'render',
    'whiteboard_mux',
    'upload',
    'thumbnail_idea',
    'thumbnail_fill',
    'thumbnail_capture',
] as const;

export type FullAutoPipelineStepKey = (typeof FULL_AUTO_PIPELINE_STEP_ORDER)[number];

/**
 * Các bước pipeline dùng trình duyệt nền (Puppeteer / headless Chrome).
 * Mirror backend `marketing_short_video_full_auto_headless_pipeline_steps()`.
 */
export const FULL_AUTO_PIPELINE_HEADLESS_STEPS = [
    'script_create',
    'script_improve',
    'script_improve_qa',
    'script_phonetic_normalize',
    'approve_tts',
    'beat_division',
    'beat_fill',
    'beat_image_fill',
    'beat_refine_visual',
    'beat_refine_html',
    'render',
    'thumbnail_idea',
    'thumbnail_fill',
    'thumbnail_capture',
] as const;

export function isFullAutoPipelineHeadlessStep(step: string): step is FullAutoPipelineStepKey {
    return (FULL_AUTO_PIPELINE_HEADLESS_STEPS as readonly string[]).includes(step);
}

/**
 * Các bước pipeline dùng AI (Gemini, Whisper, TTS AI…).
 * Mirror backend `marketing_short_video_full_auto_ai_pipeline_steps()`.
 */
export const FULL_AUTO_PIPELINE_AI_STEPS = [
    'script_create',
    'script_improve',
    'script_improve_qa',
    'script_phonetic_normalize',
    'approve_tts',
    'whisper',
    'beat_division',
    'beat_fill',
    'beat_refine_visual',
    'beat_refine_html',
    'thumbnail_idea',
    'thumbnail_fill',
] as const;

export function isFullAutoPipelineAiStep(step: string): step is FullAutoPipelineStepKey {
    return (FULL_AUTO_PIPELINE_AI_STEPS as readonly string[]).includes(step);
}

export type FullAutoPipelineStep = {
    status?: FullAutoPipelineStepStatus;
    at?: string;
    error?: string | null;
    job_id?: number | null;
};

export type FullAutoPipelineScriptQaLoop = {
    attempt?: number;
    max_attempts?: number;
    last_diagnosis?: {
        pass?: boolean;
        summary?: string;
        issues?: Array<{
            code?: string;
            severity?: string;
            message?: string;
            fix_hint?: string;
        }>;
    } | null;
    previous_script?: string;
    history?: Array<Record<string, unknown>>;
};

export type FullAutoPipelineSummary = {
    enabled?: boolean;
    status?: 'idle' | 'running' | 'paused' | 'failed' | 'completed' | string;
    current_step?: string;
    ran_script_create?: boolean;
    started_at?: string;
    updated_at?: string;
    steps?: Record<string, FullAutoPipelineStep>;
    /** Các bước được phép chạy lại (đã từng tới). */
    restartable_steps?: string[];
    error_count?: number;
    last_error?: {
        step?: string;
        message?: string;
        at?: string;
        detail?: Record<string, unknown>;
    } | null;
    headless_browser_active?: boolean;
    /** Danh sách step key dùng headless browser — mirror PHP. */
    headless_steps?: FullAutoPipelineStepKey[];
    /** Danh sách step key dùng AI — mirror PHP. */
    ai_steps?: FullAutoPipelineStepKey[];
    /** Vòng lặp QA (mirror full_auto_pipeline.qa_loops). */
    qa_loops?: Record<string, FullAutoPipelineScriptQaLoop>;
};

/** Checkbox «Chạy» — sibling agent_video_json.full_auto_step_toggles (mặc định true). */
export type FullAutoStepToggleKey =
    | 'script_improve'
    | 'script_phonetic_normalize'
    | 'bgm'
    | 'render'
    | 'thumbnail';

export type FullAutoStepToggles = Record<FullAutoStepToggleKey, boolean>;

export const DEFAULT_FULL_AUTO_STEP_TOGGLES: FullAutoStepToggles = {
    script_improve: true,
    script_phonetic_normalize: true,
    bgm: true,
    render: true,
    thumbnail: true,
};

export function normalizeFullAutoStepToggles(
    raw?: Partial<FullAutoStepToggles> | null,
): FullAutoStepToggles {
    return {
        script_improve: raw?.script_improve !== false,
        script_phonetic_normalize: raw?.script_phonetic_normalize !== false,
        bgm: raw?.bgm !== false,
        render: raw?.render !== false,
        thumbnail: raw?.thumbnail !== false,
    };
}

/** Map pipeline step → toggle key (improve+QA dùng chung; render+upload; thumbnail 3 bước). */
export function fullAutoStepToggleKeyForStep(stepKey: string): FullAutoStepToggleKey | null {
    if (stepKey === 'script_improve' || stepKey === 'script_improve_qa') {
        return 'script_improve';
    }
    if (stepKey === 'script_phonetic_normalize') {
        return stepKey;
    }
    if (stepKey === 'bgm') {
        return 'bgm';
    }
    if (stepKey === 'render' || stepKey === 'upload') {
        return 'render';
    }
    if (stepKey === 'thumbnail_idea' || stepKey === 'thumbnail_fill' || stepKey === 'thumbnail_capture') {
        return 'thumbnail';
    }
    return null;
}

export const FULL_AUTO_PIPELINE_STEP_LABELS: Record<FullAutoPipelineStepKey, string> = {
    script_create: 'Tạo script',
    script_improve: 'Cải thiện script',
    script_improve_qa: 'Đánh giá script',
    script_phonetic_normalize: 'Chuẩn hóa giọng đọc',
    approve_tts: 'Duyệt / TTS',
    whisper: 'Whisper',
    beat_audio: 'Audio từng beat',
    beat_division: 'Chia beat',
    beat_fill: 'Fill HTML beat',
    beat_image_fill: 'Ảnh beat',
    beat_refine_visual: 'Refine visual',
    beat_refine_html: 'Refine HTML beat',
    bgm: 'BGM',
    render: 'Render',
    whiteboard_mux: 'Final video',
    upload: 'Upload store',
    thumbnail_idea: 'Thumbnail idea',
    thumbnail_fill: 'Thumbnail HTML',
    thumbnail_capture: 'Chụp thumbnail',
};

export const FULL_AUTO_PIPELINE_STEP_GROUPS = [
    {
        key: 'script',
        label: 'Script',
        steps: [
            'script_create',
            'script_improve',
            'script_improve_qa',
            'script_phonetic_normalize',
            'approve_tts',
            'whisper',
        ],
    },
    {
        key: 'beat',
        label: 'Beat',
        steps: [
            'beat_division',
            'beat_fill',
            'beat_image_fill',
            'beat_refine_visual',
            'beat_refine_html',
        ],
    },
    {
        key: 'audio',
        label: 'Audio',
        steps: ['beat_audio'],
    },
    {
        key: 'audio_background',
        label: 'Audio background',
        steps: ['bgm'],
    },
    {
        key: 'render',
        label: 'Render',
        steps: ['render', 'whiteboard_mux', 'upload'],
    },
    {
        key: 'thumbnail',
        label: 'Thumbnail',
        steps: ['thumbnail_idea', 'thumbnail_fill', 'thumbnail_capture'],
    },
] as const;

export function getFullAutoPipelineStepIndex(step: FullAutoPipelineStepKey): number {
    return FULL_AUTO_PIPELINE_STEP_ORDER.indexOf(step) + 1;
}

const GROUPED_FULL_AUTO_PIPELINE_STEP_ORDER = FULL_AUTO_PIPELINE_STEP_GROUPS.flatMap((group) => group.steps);
if (
    GROUPED_FULL_AUTO_PIPELINE_STEP_ORDER.length !== FULL_AUTO_PIPELINE_STEP_ORDER.length
    || GROUPED_FULL_AUTO_PIPELINE_STEP_ORDER.some((step, index) => step !== FULL_AUTO_PIPELINE_STEP_ORDER[index])
) {
    throw new Error('FULL_AUTO_PIPELINE_STEP_GROUPS phải khớp 1:1 với FULL_AUTO_PIPELINE_STEP_ORDER');
}

const HEADLESS_STEPS_IN_ORDER = FULL_AUTO_PIPELINE_HEADLESS_STEPS.filter(
    (step) => (FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(step),
);
if (HEADLESS_STEPS_IN_ORDER.length !== FULL_AUTO_PIPELINE_HEADLESS_STEPS.length) {
    throw new Error('FULL_AUTO_PIPELINE_HEADLESS_STEPS chứa step không hợp lệ');
}

const AI_STEPS_IN_ORDER = FULL_AUTO_PIPELINE_AI_STEPS.filter(
    (step) => (FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(step),
);
if (AI_STEPS_IN_ORDER.length !== FULL_AUTO_PIPELINE_AI_STEPS.length) {
    throw new Error('FULL_AUTO_PIPELINE_AI_STEPS chứa step không hợp lệ');
}

export type JsonResponse = {
    success?: boolean;
    message?: ApiMessage;
};

export type AgentHeadlessPreviewAccessResponse = JsonResponse & {
    ws_url?: string;
    websocket_url?: string;
    viewer_url?: string;
    token?: string;
    access_token?: string;
    expires_at?: string | number;
    expires_in?: number;
    short_video_id?: number;
};

export type SaveAdminAudioScriptResponse = JsonResponse & {
    audio_script_approved?: boolean;
    audio_reset?: boolean;
};

export type SaveAdminAudioScriptTtsReadingResponse = JsonResponse & {
    reading_changed?: boolean;
    audio_reset?: boolean;
};

export type ApproveAudioScriptResponse = JsonResponse & {
    tts_queued?: boolean;
    tts_job_id?: string | number;
    tts_enqueue_error?: string;
    audio_reset?: boolean;
    tts_status?: string;
};

export function parseApiMessage(message: ApiMessage | undefined): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function authHeaders(): Record<string, string> {
    const token = getAccessToken();
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function shortVideoBody(shortVideoId: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        short_video_id: shortVideoId,
        id: shortVideoId,
        ...extra,
    };
}

async function postJson(path: string, body: Record<string, unknown>): Promise<JsonResponse> {
    const token = getAccessToken() ?? '';
    const response = await fetch(
        convertToURL(getAdminApiPrefix(), path),
        {
            method: 'POST',
            credentials: 'include',
            headers: authHeaders(),
            body: JSON.stringify({ ...body, access_token: token }),
        },
    );
    return response.json() as Promise<JsonResponse>;
}

export function normalizePlatforms(platforms: string[] | undefined): string[] {
    if (Array.isArray(platforms) && platforms.length > 0) {
        return platforms;
    }
    return [...DEFAULT_TTS_PLATFORMS];
}

export async function uploadAgentAudioMp3(shortVideoId: number, file: File): Promise<JsonResponse> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('audio', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-agent-audio',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json() as JsonResponse;
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload thất bại');
    }
    return result;
}

export type ManualAudioSegmentsResponse = JsonResponse & {
    narration_segments?: NarrationSegment[];
    manual_audio?: ManualAudioState;
};

/** Lưu thứ tự / xóa đoạn MP3 upload thủ công — gửi danh sách id còn lại theo thứ tự. */
export async function saveManualAudioSegments(
    shortVideoId: number,
    segmentIds: string[],
): Promise<ManualAudioSegmentsResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-manual-audio-segments',
        shortVideoBody(shortVideoId, { segment_ids: segmentIds }),
    ) as Promise<ManualAudioSegmentsResponse>;
}

/** Ghép các đoạn MP3 thủ công (0,3s giữa 2 đoạn) và hoàn thành bước Duyệt / TTS. */
export async function finalizeManualAgentAudio(
    shortVideoId: number,
): Promise<ManualAudioSegmentsResponse & {
    segment_count?: number;
    duration_sec?: number;
    url?: string;
    full_auto_pipeline?: FullAutoPipelineSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/finalize-manual-agent-audio',
        shortVideoBody(shortVideoId),
    ) as Promise<ManualAudioSegmentsResponse & {
        segment_count?: number;
        duration_sec?: number;
        url?: string;
        full_auto_pipeline?: FullAutoPipelineSummary;
    }>;
}

export async function uploadAgentVisualImage(shortVideoId: number, file: File): Promise<JsonResponse & {
    url?: string;
    preview_url?: string;
    s3_key?: string;
}> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('image', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-agent-visual-image',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json() as JsonResponse & {
        url?: string;
        preview_url?: string;
        s3_key?: string;
    };
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload ảnh thất bại');
    }
    return result;
}

export async function savePublishFlags(
    shortVideoId: number,
    flags: { postEligible?: boolean; socialPosted?: boolean },
): Promise<JsonResponse & { post_eligible?: boolean; social_posted?: boolean }> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (flags.postEligible !== undefined) {
        body.post_eligible = flags.postEligible ? '1' : '0';
    }
    if (flags.socialPosted !== undefined) {
        body.social_posted = flags.socialPosted ? '1' : '0';
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-publish-flags',
        body,
    );
}

export async function postFacebookReels(
    shortVideoId: number,
    options: {
        socialIndex: number;
        accountTitle?: string;
        autoPublish?: boolean;
        openBrowser?: boolean;
        caption?: string;
        hashtags?: string;
    },
): Promise<JsonResponse & {
    social_posted?: boolean;
    matched_account?: string;
    reel_url?: string;
    ready_to_publish?: boolean;
    published?: boolean;
    error_code?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/post-facebook-reels',
        shortVideoBody(shortVideoId, {
            social_index: options.socialIndex,
            account_title: options.accountTitle || '',
            auto_publish: options.autoPublish ? '1' : '0',
            open_browser: options.openBrowser === false ? '0' : '1',
            caption: options.caption || '',
            hashtags: options.hashtags || '',
        }),
    );
}

export async function postTikTok(
    shortVideoId: number,
    options: {
        socialIndex: number;
        accountTitle?: string;
        autoPublish?: boolean;
        openBrowser?: boolean;
        caption?: string;
        hashtags?: string;
    },
): Promise<JsonResponse & {
    social_posted?: boolean;
    matched_account?: string;
    post_url?: string;
    ready_to_publish?: boolean;
    published?: boolean;
    thumbnail_uploaded?: boolean;
    error_code?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/post-tiktok',
        shortVideoBody(shortVideoId, {
            social_index: options.socialIndex,
            account_title: options.accountTitle || '',
            auto_publish: options.autoPublish ? '1' : '0',
            open_browser: options.openBrowser === false ? '0' : '1',
            caption: options.caption || '',
            hashtags: options.hashtags || '',
        }),
    );
}

export async function saveSocialCopy(
    shortVideoId: number,
    payload: { socialDescription?: string; socialHashtags?: string },
): Promise<JsonResponse & {
    social_description?: string;
    social_hashtags?: string;
}> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (payload.socialDescription !== undefined) {
        body.social_description = payload.socialDescription;
    }
    if (payload.socialHashtags !== undefined) {
        body.social_hashtags = payload.socialHashtags;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-social-copy',
        body,
    );
}

export async function saveAgentVisualStyle(
    shortVideoId: number,
    visualStyle: string,
): Promise<JsonResponse & {
    visual_style?: string;
    visual_style_resolved?: string;
    visual_style_source?: string;
    hf_theme?: string;
    hf_theme_resolved?: string;
    hf_theme_source?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-hf-theme',
        shortVideoBody(shortVideoId, { visual_style: visualStyle }),
    );
}

export async function saveAgentOmnivoiceVoice(
    shortVideoId: number,
    payload: SaveOmnivoiceVoicePayload,
): Promise<JsonResponse & {
    agent_omnivoice_voice?: string;
    agent_omnivoice_voice_mode?: OmnivoiceVoiceMode;
    agent_omnivoice_voice_design?: string;
    omnivoice_voice_catalog?: OmnivoiceVoiceCatalogItem[];
    omnivoice_voice_design_tokens?: OmnivoiceVoiceDesignTokenGroup[];
}> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId, {
        agent_omnivoice_voice_mode: payload.mode,
    });
    if (payload.mode === 'clone' && payload.voice) {
        body.agent_omnivoice_voice = payload.voice;
    }
    if (payload.mode === 'design' && payload.design) {
        body.agent_omnivoice_voice_design = payload.design;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-omnivoice-voice',
        body,
    );
}

export async function fetchSaydiVoiceSamples(
    shortVideoId: number,
    options?: { forceRefresh?: boolean },
): Promise<JsonResponse & {
    samples?: SaydiVoiceSampleItem[];
    genders?: string[];
    languages?: string[];
    agent_saydi_voice?: string;
    default_saydi_voice?: string;
    count?: number;
    cached?: boolean;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-saydi-voice-samples',
        shortVideoBody(shortVideoId, {
            force_refresh: options?.forceRefresh ? '1' : '0',
        }),
    );
}

export async function saveAgentSaydiVoice(
    shortVideoId: number,
    voice: string,
): Promise<JsonResponse & {
    agent_saydi_voice?: string;
    default_saydi_voice?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-saydi-voice',
        shortVideoBody(shortVideoId, {
            agent_saydi_voice: voice,
        }),
    );
}

export async function saveAgentTtsSettings(
    shortVideoId: number,
    enabled?: boolean,
    platforms?: string[],
    speed?: number,
): Promise<JsonResponse> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (enabled !== undefined) {
        body.agent_tts_auto = enabled ? '1' : '0';
    }
    if (platforms !== undefined) {
        body.agent_tts_platforms = platforms;
    }
    if (speed !== undefined) {
        body.agent_omnivoice_speed = speed;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-tts-mode',
        body,
    );
}

export async function saveAgentAutoFillBeatHtml(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_auto_fill_beat_html?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-auto-fill-beat-html',
        shortVideoBody(shortVideoId, {
            agent_auto_fill_beat_html: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_auto_fill_beat_html?: boolean }>;
}

export async function saveFullAutoStepToggles(
    shortVideoId: number,
    toggles: Partial<FullAutoStepToggles>,
): Promise<JsonResponse & {
    full_auto_step_toggles?: FullAutoStepToggles;
    full_auto_pipeline?: FullAutoPipelineSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-full-auto-step-toggles',
        shortVideoBody(shortVideoId, {
            full_auto_step_toggles: toggles,
        }),
    ) as Promise<JsonResponse & { full_auto_step_toggles?: FullAutoStepToggles }>;
}

export async function saveBeatImageFillMode(
    shortVideoId: number,
    mode: BeatImageFillMode,
    onlyMissing?: boolean,
): Promise<JsonResponse & { beat_image_fill_mode?: BeatImageFillMode; beat_image_fill_only_missing?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-beat-image-fill-mode',
        shortVideoBody(shortVideoId, {
            beat_image_fill_mode: mode,
            ...(onlyMissing !== undefined ? { beat_image_fill_only_missing: onlyMissing ? '1' : '0' } : {}),
        }),
    ) as Promise<JsonResponse & { beat_image_fill_mode?: BeatImageFillMode; beat_image_fill_only_missing?: boolean }>;
}

export async function saveAgentGeminiOpenBrowser(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_gemini_open_browser?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-gemini-open-browser',
        shortVideoBody(shortVideoId, {
            agent_gemini_open_browser: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_gemini_open_browser?: boolean }>;
}

export async function saveAgentGithubScreenshotHomepage(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & {
    agent_github_screenshot_homepage?: boolean;
    screenshot_status?: string;
    readme_media?: GithubReadmeMediaItem[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-github-screenshot-homepage',
        shortVideoBody(shortVideoId, {
            agent_github_screenshot_homepage: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        agent_github_screenshot_homepage?: boolean;
        screenshot_status?: string;
        readme_media?: GithubReadmeMediaItem[];
    }>;
}

export async function saveAgentIntroduceApp(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_introduce_app?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-introduce-app',
        shortVideoBody(shortVideoId, {
            agent_introduce_app: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_introduce_app?: boolean }>;
}

export async function saveAgentShowKaraoke(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_show_karaoke?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-show-karaoke',
        shortVideoBody(shortVideoId, {
            agent_show_karaoke: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_show_karaoke?: boolean }>;
}

export async function saveAgentBeatAudio(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_beat_audio?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-beat-audio',
        shortVideoBody(shortVideoId, {
            agent_beat_audio: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_beat_audio?: boolean }>;
}

export async function saveBeatAudioOnlyMissing(
    shortVideoId: number,
    onlyMissing: boolean,
): Promise<JsonResponse & { beat_audio_only_missing?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-beat-audio-only-missing',
        shortVideoBody(shortVideoId, {
            beat_audio_only_missing: onlyMissing ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { beat_audio_only_missing?: boolean }>;
}

export async function saveAgentRenderDebug(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_render_debug?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-render-debug',
        shortVideoBody(shortVideoId, {
            agent_render_debug: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_render_debug?: boolean }>;
}

export async function saveAgentClipAspect(
    shortVideoId: number,
    aspect: '9:16' | '16:9',
): Promise<JsonResponse & {
    agent_clip_aspect?: '9:16' | '16:9';
    clip_render_spec?: import('./agentVideoClipAspect').ClipRenderSpec;
    agent_visual_mode?: AgentVisualMode | string;
    agent_whiteboard_config?: AgentWhiteboardConfig;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-clip-aspect',
        shortVideoBody(shortVideoId, {
            agent_clip_aspect: aspect,
        }),
    ) as Promise<JsonResponse & {
        agent_clip_aspect?: '9:16' | '16:9';
        clip_render_spec?: import('./agentVideoClipAspect').ClipRenderSpec;
    }>;
}

export async function saveAgentVisualMode(
    shortVideoId: number,
    mode: AgentVisualMode,
): Promise<JsonResponse & { agent_visual_mode?: AgentVisualMode }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-visual-mode',
        shortVideoBody(shortVideoId, { agent_visual_mode: mode }),
    ) as Promise<JsonResponse & { agent_visual_mode?: AgentVisualMode }>;
}

export async function saveAgentBeatFrequency(
    shortVideoId: number,
    frequency: import('./agentVideoBeatFrequency').AgentBeatFrequency,
): Promise<JsonResponse & { agent_beat_frequency?: string }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-beat-frequency',
        shortVideoBody(shortVideoId, { agent_beat_frequency: frequency }),
    ) as Promise<JsonResponse & { agent_beat_frequency?: string }>;
}

export type AgentImageTextLang = 'vi' | 'en';

export function normalizeAgentImageTextLang(raw: unknown): AgentImageTextLang {
    const value = String(raw || '').trim().toLowerCase();
    return value === 'en' || value === 'english' ? 'en' : 'vi';
}

export async function saveAgentImageTextLang(
    shortVideoId: number,
    lang: AgentImageTextLang,
): Promise<JsonResponse & { agent_image_text_lang?: AgentImageTextLang }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-image-text-lang',
        shortVideoBody(shortVideoId, { agent_image_text_lang: lang }),
    ) as Promise<JsonResponse & { agent_image_text_lang?: AgentImageTextLang }>;
}

export type WhiteboardTransitionOption = {
    id: string;
    label: string;
    chroma_key?: string;
    effect_duration_sec?: number | null;
    effect_start_sec?: number | null;
    sfx_file?: string;
    sfx_url?: string;
    sfx_start_sec?: number | null;
    sfx_end_sec?: number | null;
    sfx_volume?: number | null;
};

export const DEFAULT_WHITEBOARD_TRANSITIONS: WhiteboardTransitionOption[] = [
    { id: 'none', label: 'Không hiệu ứng (cắt thẳng)' },
    { id: 'camera_pan', label: 'Camera pan' },
    { id: 'erase', label: 'Xóa bảng' },
    { id: 'slide', label: 'Tay kéo' },
    { id: 'ink_pop', label: 'Loang màu nước' },
    { id: 'fade', label: 'Cắt / Fade' },
    { id: 'page_flip', label: 'Lật trang' },
    { id: 'paper_tear', label: 'Xé giấy' },
    { id: 'paint_stroke', label: 'Quét cọ' },
    { id: 'random', label: 'Ngẫu nhiên' },
];

export async function fetchWhiteboardTransitions(): Promise<{
    transitions: WhiteboardTransitionOption[];
    default_transition: string;
}> {
    try {
        const res = await postJson(
            'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/transitions',
            {},
        ) as JsonResponse & {
            transitions?: WhiteboardTransitionOption[];
            default_transition?: string;
        };
        const list = Array.isArray(res.transitions)
            ? res.transitions.filter((t) => t?.id).map((t) => {
                const option: WhiteboardTransitionOption = {
                    id: String(t.id),
                    label: String(t.label || t.id),
                };
                if (t.sfx_file) option.sfx_file = String(t.sfx_file);
                if (t.sfx_url) option.sfx_url = String(t.sfx_url);
                if (t.chroma_key) option.chroma_key = String(t.chroma_key);
                if (t.effect_duration_sec !== undefined && t.effect_duration_sec !== null) {
                    option.effect_duration_sec = Number(t.effect_duration_sec);
                }
                if (t.effect_start_sec !== undefined && t.effect_start_sec !== null) {
                    option.effect_start_sec = Number(t.effect_start_sec);
                }
                if (t.sfx_start_sec !== undefined && t.sfx_start_sec !== null) {
                    option.sfx_start_sec = Number(t.sfx_start_sec);
                }
                if (t.sfx_end_sec !== undefined && t.sfx_end_sec !== null) {
                    option.sfx_end_sec = Number(t.sfx_end_sec);
                }
                if (t.sfx_volume !== undefined && t.sfx_volume !== null) {
                    option.sfx_volume = Number(t.sfx_volume);
                }
                return option;
            })
            : [];
        if (list.length > 0) {
            return {
                transitions: list,
                default_transition: String(res.default_transition || list[0].id || 'page_flip'),
            };
        }
    } catch {
        // fallback bên dưới
    }
    return {
        transitions: DEFAULT_WHITEBOARD_TRANSITIONS,
        default_transition: 'page_flip',
    };
}

export async function saveAgentWhiteboardConfig(
    shortVideoId: number,
    config: Partial<AgentWhiteboardConfig>,
): Promise<JsonResponse & { agent_whiteboard_config?: AgentWhiteboardConfig }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-whiteboard-config',
        shortVideoBody(shortVideoId, { agent_whiteboard_config: config }),
    ) as Promise<JsonResponse & { agent_whiteboard_config?: AgentWhiteboardConfig }>;
}

export async function saveAgentWhiteboardBeatOverride(
    shortVideoId: number,
    beatId: string,
    override: Partial<AgentWhiteboardBeatOverride>,
): Promise<JsonResponse & {
    beat_id?: string;
    override?: AgentWhiteboardBeatOverride;
    agent_whiteboard_beat_overrides?: Record<string, AgentWhiteboardBeatOverride>;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-whiteboard-beat-override',
        shortVideoBody(shortVideoId, { beat_id: beatId, override }),
    ) as Promise<JsonResponse & {
        beat_id?: string;
        override?: AgentWhiteboardBeatOverride;
        agent_whiteboard_beat_overrides?: Record<string, AgentWhiteboardBeatOverride>;
    }>;
}

/** Timeline vùng whiteboard từ server — đúng payload engine render (override đã lưu). */
export type AgentWhiteboardBeatRenderTimelineRegion = {
    id: string;
    name: string;
    action: string;
    parent_id: string | null;
    saved_start_sec: number | null;
    saved_end_sec: number | null;
    script_start_word: number | null;
    script_end_word: number | null;
    start_sec: number | null;
    complete_by_sec: number | null;
    place_effect?: string | null;
};

export type AgentWhiteboardBeatRenderTimeline = {
    source: string;
    beat_id: string;
    beat_start_sec: number;
    beat_duration_sec: number;
    note?: string;
    regions: AgentWhiteboardBeatRenderTimelineRegion[];
};

export async function getAgentWhiteboardBeatRenderTimeline(
    shortVideoId: number,
    beatId: string,
): Promise<JsonResponse & { timeline?: AgentWhiteboardBeatRenderTimeline }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-whiteboard-beat-render-timeline',
        shortVideoBody(shortVideoId, { beat_id: beatId }),
    ) as Promise<JsonResponse & { timeline?: AgentWhiteboardBeatRenderTimeline }>;
}

export type AutoSelectRegionResult = {
    success?: boolean;
    points?: BeatRegionPoint[];
    area?: number;
    background_image_url?: string | null;
    message?: string;
    /** Danh sách vật thể (candidates) — user chọn 1 trong số đó. */
    candidates?: { points: BeatRegionPoint[]; area?: number; score?: number }[];
};

/**
 * Tự chọn vật thể trong ảnh beat (GrabCut DIP) + tạo ảnh nền đã vá (inpaint).
 * mode 'click' → point "x,y" pixel ảnh gốc; mode 'bbox' → rect "x0,y0,x1,y1".
 */
export async function autoSelectAgentWhiteboardRegion(
    shortVideoId: number,
    beatId: string,
    mode: 'click' | 'bbox' | 'subtract' | 'union',
    payload: {
        point?: [number, number];
        rect?: [number, number, number, number];
        polyA?: [number, number][];
        polyB?: [number, number][];
        /** Polygon người dùng VẼ (pixel) — dùng centroid làm tâm ưu tiên chọn vật. */
        poly?: [number, number][];
        /** Tinh chỉnh thêm/bớt (px): >0 nới rộng, <0 thu hẹp. */
        alpha?: number;
        /** Chọn candidate index (khi nhiều vật). */
        candidate?: number;
        /** Lớp ảnh đang mở (beat nhiều lớp ảnh) — chọn vật trên đúng ảnh lớp đó. */
        layerId?: string;
    },
    keepBackground = false,
): Promise<JsonResponse & AutoSelectRegionResult> {
    const body: Record<string, unknown> = {
        beat_id: beatId,
        mode,
        keep_background: keepBackground ? '1' : '0',
    };
    if (payload.layerId) {
        body.layer_id = payload.layerId;
    }
    if (mode === 'click' && payload.point) {
        body.point = `${payload.point[0]},${payload.point[1]}`;
    }
    if (mode === 'bbox' && payload.rect) {
        body.rect = payload.rect.join(',');
    }
    const toStr = (pts: [number, number][]) => pts.map((pt) => `${pt[0]},${pt[1]}`).join(';');
    if ((mode === 'subtract' || mode === 'union') && payload.polyA && payload.polyB) {
        body.poly_a = toStr(payload.polyA);
        body.poly_b = toStr(payload.polyB);
    }
    if (payload.poly && payload.poly.length >= 3) {
        body.poly = toStr(payload.poly);
    }
    if (payload.alpha !== undefined) {
        body.alpha = String(payload.alpha);
    }
    if (payload.candidate !== undefined) {
        body.candidate = String(payload.candidate);
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/auto-select-agent-whiteboard-region',
        shortVideoBody(shortVideoId, body),
    ) as Promise<JsonResponse & AutoSelectRegionResult>;
}

export type Sam2AutoRegionItem = {
    points: BeatRegionPoint[];
    area?: number;
    score?: number;
};

export type AutoRegionsEngine = 'sam2' | 'birefnet';

export type Sam2AutoRegionsResult = {
    success?: boolean;
    engine?: AutoRegionsEngine | string;
    model?: string;
    /** BiRefNet refine: polygon 0–1 của vật lớn nhất trong vùng. */
    points?: BeatRegionPoint[];
    area?: number;
    regions?: Sam2AutoRegionItem[];
    message?: ApiMessage;
    debug?: string;
};

/**
 * BiRefNet — thu gọn vùng đã chọn thành vật lớn nhất (giống “Chỉ vật trong vùng”).
 * AbortSignal 5 phút (lần đầu tải weights).
 */
export async function sam2AutoRegionsAgentWhiteboard(
    shortVideoId: number,
    beatId: string,
    options: {
        rect: [number, number, number, number];
        poly?: [number, number][];
        engine?: AutoRegionsEngine;
        /** Lớp ảnh đang mở (beat nhiều lớp ảnh). */
        layerId?: string;
    },
): Promise<JsonResponse & Sam2AutoRegionsResult> {
    const engine: AutoRegionsEngine = options.engine === 'sam2' ? 'sam2' : 'birefnet';
    const token = getAccessToken() ?? '';
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = 300_000;
    const timer = controller
        ? window.setTimeout(() => controller.abort(), timeoutMs)
        : 0;
    const label = engine === 'birefnet' ? 'BiRefNet' : 'SAM 2';
    try {
        const body: Record<string, unknown> = {
            beat_id: beatId,
            engine,
            rect: options.rect.join(','),
            access_token: token,
        };
        if (options.layerId) {
            body.layer_id = options.layerId;
        }
        if (options.poly && options.poly.length >= 3) {
            body.poly = options.poly.map((pt) => `${pt[0]},${pt[1]}`).join(';');
        }
        const response = await fetch(
            convertToURL(
                getAdminApiPrefix(),
                'plugin/vn4-e-learning/app-mobile/marketing/short-video/sam2-auto-regions-agent-whiteboard',
            ),
            {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders(),
                body: JSON.stringify(shortVideoBody(shortVideoId, body)),
                signal: controller?.signal,
            },
        );
        return response.json() as Promise<JsonResponse & Sam2AutoRegionsResult>;
    } catch (err) {
        const aborted = err instanceof DOMException && err.name === 'AbortError';
        return {
            success: false,
            engine,
            message: aborted
                ? `${label} quá thời gian chờ (5 phút) — thử lại khi model đã cache`
                : (err instanceof Error ? err.message : `${label} gọi API thất bại`),
            points: [],
            regions: [],
        };
    } finally {
        if (timer) {
            window.clearTimeout(timer);
        }
    }
}

export async function enqueueGeminiWebBeatImageFill(
    shortVideoId: number,
    beatIds?: string[],
    force = true,
    onlyMissing = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    beat_ids?: string[];
    job_ids?: number[];
    gemini_image_fill?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-beat-image-fill',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
            only_missing: onlyMissing ? '1' : '0',
            ...(beatIds ? { beat_ids: beatIds } : {}),
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        beat_ids?: string[];
        job_ids?: number[];
        gemini_image_fill?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function regenerateAgentBeatImageZImage(
    shortVideoId: number,
    beatId: string,
    imagePrompt?: string,
): Promise<JsonResponse & {
    beat_id?: string;
    public_url?: string;
    image_prompt?: string;
    import_html?: ImportHtmlSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/regenerate-agent-beat-image-zimage',
        shortVideoBody(shortVideoId, {
            beat_id: beatId,
            ...(imagePrompt !== undefined ? { image_prompt: imagePrompt } : {}),
        }),
    ) as Promise<JsonResponse & {
        beat_id?: string;
        public_url?: string;
        image_prompt?: string;
        import_html?: ImportHtmlSummary;
    }>;
}

export type VerifiedAvatarOption = {
    id: number;
    title: string;
    master_url: string;
};

export async function listVerifiedAvatars(): Promise<JsonResponse & { avatars?: VerifiedAvatarOption[] }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/list-verified-avatars',
        {},
    ) as Promise<JsonResponse & { avatars?: VerifiedAvatarOption[] }>;
}

export async function saveAgentAvatar(
    shortVideoId: number,
    avatarId: number,
    anchor?: AvatarPipAnchor | string | null,
): Promise<JsonResponse & {
    agent_avatar_id?: number;
    agent_show_avatar?: boolean;
    agent_avatar_anchor?: AvatarPipAnchor;
    agent_avatar?: AgentVideoContentResponse['agent_avatar'];
}> {
    const body: Record<string, string> = {
        agent_avatar_id: avatarId > 0 ? String(avatarId) : '0',
    };
    if (anchor != null && String(anchor).trim() !== '') {
        body.agent_avatar_anchor = String(anchor).trim();
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-avatar',
        shortVideoBody(shortVideoId, body),
    ) as Promise<JsonResponse & {
        agent_avatar_id?: number;
        agent_show_avatar?: boolean;
        agent_avatar_anchor?: AvatarPipAnchor;
        agent_avatar?: AgentVideoContentResponse['agent_avatar'];
    }>;
}

export async function enqueueGeminiWebBeatFill(
    shortVideoId: number,
    beatIds?: string[],
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    beat_ids?: string[];
    job_ids?: number[];
    gemini_fill?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-beat-fill',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
            ...(beatIds ? { beat_ids: beatIds } : {}),
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        beat_ids?: string[];
        job_ids?: number[];
        gemini_fill?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function enqueueGeminiWebBeatQuickIterate(
    shortVideoId: number,
    beatId: string,
    qaRefineNote: string,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    beat_id?: string;
    beat_ids?: string[];
    job_ids?: number[];
    qa_status?: string;
    qa_refine_note?: string;
    gemini_refine_visual?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-beat-quick-iterate',
        shortVideoBody(shortVideoId, {
            beat_id: beatId,
            qa_refine_note: qaRefineNote,
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        beat_id?: string;
        beat_ids?: string[];
        job_ids?: number[];
        qa_status?: string;
        qa_refine_note?: string;
        gemini_refine_visual?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function enqueueGeminiWebBeatRefineHtml(
    shortVideoId: number,
    beatIds?: string[],
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    beat_ids?: string[];
    job_ids?: number[];
    gemini_refine_html?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-beat-refine-html',
        shortVideoBody(shortVideoId, {
            ...(beatIds ? { beat_ids: beatIds } : {}),
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        beat_ids?: string[];
        job_ids?: number[];
        gemini_refine_html?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function enqueueGeminiWebThumbnailIdea(
    shortVideoId: number,
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_id?: number;
    gemini_thumbnail_idea?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-thumbnail-idea',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_id?: number;
        gemini_thumbnail_idea?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function enqueueGeminiWebThumbnailFill(
    shortVideoId: number,
    force = true,
    options?: { mode?: 'create' | 'refine'; userPrompt?: string },
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_id?: number;
    gemini_thumbnail_fill?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-thumbnail-fill',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
            ...(options?.mode ? { mode: options.mode } : {}),
            ...(options?.userPrompt ? { user_prompt: options.userPrompt } : {}),
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_id?: number;
        gemini_thumbnail_fill?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function captureAgentThumbnail(
    shortVideoId: number,
    force = false,
): Promise<JsonResponse & {
    image_url?: string;
    thumbnail?: ImportHtmlThumbnailBlock;
    import_html?: ImportHtmlSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/capture-agent-thumbnail',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        image_url?: string;
        thumbnail?: ImportHtmlThumbnailBlock;
        import_html?: ImportHtmlSummary;
    }>;
}

export async function uploadLocalAgentVideo(
    shortVideoId: number,
): Promise<JsonResponse & {
    agent_video_url?: string;
    agent_video_status?: string;
    agent_video_rendered_at?: string;
    has_local_final_mp4?: boolean;
    local_final_mp4_url?: string;
    local_final_mp4_size_bytes?: number;
    local_final_mp4_modified_at?: string;
    full_auto_pipeline?: FullAutoPipelineSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-local-agent-video',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & {
        agent_video_url?: string;
        agent_video_status?: string;
        agent_video_rendered_at?: string;
        has_local_final_mp4?: boolean;
        local_final_mp4_url?: string;
        local_final_mp4_size_bytes?: number;
        local_final_mp4_modified_at?: string;
        full_auto_pipeline?: FullAutoPipelineSummary;
    }>;
}

export async function renderWhiteboardAgentVideo(
    shortVideoId: number,
    forceRender = false,
): Promise<JsonResponse & {
    queued?: boolean;
    job_id?: number;
    silent_stale?: boolean;
    has_local_final_mp4?: boolean;
    local_final_mp4_url?: string;
    full_auto_pipeline?: FullAutoPipelineSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/render-whiteboard-agent-video',
        shortVideoBody(shortVideoId, {
            force_render: forceRender ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: boolean;
        job_id?: number;
        silent_stale?: boolean;
        has_local_final_mp4?: boolean;
        local_final_mp4_url?: string;
        full_auto_pipeline?: FullAutoPipelineSummary;
    }>;
}

export async function enqueueGeminiWebBeatDivision(
    shortVideoId: number,
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_ids?: number[];
    gemini_division?: ImportHtmlSummary['gemini_division'];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-beat-division',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_ids?: number[];
        gemini_division?: ImportHtmlSummary['gemini_division'];
    }>;
}

export async function fetchBeatDivisionPrompt(
    shortVideoId: number,
    contentMode: 'text' | 'file' = 'text',
    limitBeats = 0,
    phase: 'full' | 'segmentation' = 'full',
): Promise<JsonResponse & {
    prompt?: string;
    content?: string;
    content_file_name?: string;
    limit_beats?: number;
    phase?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/get-beat-division-prompt',
        shortVideoBody(shortVideoId, {
            content_mode: contentMode === 'file' ? 'file' : 'inline',
            limit_beats: Math.max(0, Number(limitBeats) || 0),
            phase: phase === 'segmentation' ? 'segmentation' : 'full',
        }),
    ) as Promise<JsonResponse & {
        prompt?: string;
        content?: string;
        content_file_name?: string;
        limit_beats?: number;
        phase?: string;
    }>;
}

/** Giai đoạn 2 — prompt visual image_prompt theo chunk (2-phase manual). */
export async function fetchBeatVisualPrompt(
    shortVideoId: number,
    segments: unknown[],
    chunkIndex = 0,
    chunkSize = 10,
    all = false,
): Promise<JsonResponse & {
    prompt?: string;
    chunk_index?: number;
    chunk_size?: number;
    chunk_total?: number;
    beat_total?: number;
    expected_ids?: string[];
    all?: boolean;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/get-beat-visual-prompt',
        shortVideoBody(shortVideoId, {
            segments: JSON.stringify(segments),
            chunk_index: Math.max(0, Number(chunkIndex) || 0),
            chunk_size: Math.max(1, Number(chunkSize) || 10),
            all: all ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        prompt?: string;
        chunk_index?: number;
        chunk_size?: number;
        chunk_total?: number;
        beat_total?: number;
        expected_ids?: string[];
        all?: boolean;
    }>;
}

/**
 * Chia beat từ JSON user đã có sẵn (content + image_prompt + background_prompt).
 * Timing lấy từ Whisper word timing ở backend — JSON không cần mốc thời gian.
 */
export async function createBeatMapFromJson(
    shortVideoId: number,
    jsonText: string,
): Promise<JsonResponse & {
    beat_count?: number;
    errors?: string[];
    warnings?: string[];
    matched_beats?: number;
    anchor_ratio?: number;
    beat_map?: unknown;
    full_auto_pipeline?: unknown;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/create-beat-map-from-json',
        shortVideoBody(shortVideoId, {
            beats_json: jsonText,
        }),
    ) as Promise<JsonResponse & {
        beat_count?: number;
        errors?: string[];
        warnings?: string[];
        matched_beats?: number;
        anchor_ratio?: number;
        beat_map?: unknown;
        full_auto_pipeline?: unknown;
    }>;
}

/** Lưu draft JSON giai đoạn 1/2 — giữ lại khi refresh, user sửa thủ công được. */
export async function saveBeatDivisionDraft(
    shortVideoId: number,
    phase: '1' | '2',
    jsonText: string,
): Promise<JsonResponse & {
    phase?: string;
    beat_count?: number;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/save-beat-division-draft',
        shortVideoBody(shortVideoId, {
            phase,
            json_text: jsonText,
        }),
    ) as Promise<JsonResponse & {
        phase?: string;
        beat_count?: number;
    }>;
}

/** Đọc draft JSON giai đoạn 1/2 đã lưu. */
export async function fetchBeatDivisionDraft(shortVideoId: number): Promise<JsonResponse & {
    phase1_json?: string | null;
    phase2_json?: string | null;
    phase1_valid?: boolean;
    phase2_valid?: boolean;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/get-beat-division-draft',
        shortVideoBody(shortVideoId, {}),
    ) as Promise<JsonResponse & {
        phase1_json?: string | null;
        phase2_json?: string | null;
        phase1_valid?: boolean;
        phase2_valid?: boolean;
    }>;
}

/** Beat thủ công của clip video 2s — chỉ đánh dấu khoảng từ + timing, chưa có prompt ảnh. */
export type ManualBeatMarkPayload = {
    id?: string;
    order?: number;
    startTokenIndex: number;
    endTokenIndex: number;
    content: string;
    image_prompt?: string;
    startSec: number;
    endSec: number;
    durationSec?: number;
    /** Beat đã xác nhận timeline thủ công — realign whisper không đè timing. */
    timeline_confirmed?: boolean;
    created_at?: string;
};

type ManualBeatResponse = JsonResponse & {
    manual_beat_marks?: ManualBeatMarkPayload[];
    total?: number;
    all_prompts_filled?: boolean;
    beat_division_completed?: boolean;
    full_auto_pipeline?: FullAutoPipelineSummary;
    timeline_confirmed?: boolean;
};

export async function fetchManualBeatMarks(shortVideoId: number): Promise<ManualBeatResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/get-marks',
        shortVideoBody(shortVideoId, {}),
    ) as Promise<ManualBeatResponse>;
}

export async function saveManualBeatMarks(
    shortVideoId: number,
    marks: ManualBeatMarkPayload[],
): Promise<ManualBeatResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/save-marks',
        shortVideoBody(shortVideoId, { marks }),
    ) as Promise<ManualBeatResponse>;
}

export async function addManualBeatMark(
    shortVideoId: number,
    mark: ManualBeatMarkPayload,
): Promise<ManualBeatResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/add-mark',
        shortVideoBody(shortVideoId, { mark }),
    ) as Promise<ManualBeatResponse>;
}

export async function deleteManualBeatMark(
    shortVideoId: number,
    markId: string,
): Promise<ManualBeatResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/delete-mark',
        shortVideoBody(shortVideoId, { mark_id: markId }),
    ) as Promise<ManualBeatResponse>;
}

export async function mergeManualBeatMarks(
    shortVideoId: number,
    markIds: string[],
): Promise<ManualBeatResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/merge-marks',
        shortVideoBody(shortVideoId, { mark_ids: markIds }),
    ) as Promise<ManualBeatResponse>;
}

export type ConfirmManualBeatTimingRange = {
    startTokenIndex: number;
    endTokenIndex: number;
    startSec: number;
    endSec: number;
};

/**
 * Xác nhận timeline thủ công cho 1 beat (video 2s): timing theo whisper của từ
 * user chọn, đánh dấu timeline_confirmed — beat n là chuẩn, backend dịch ranh
 * giới 2 beat kề (n-1/n+1) và KHÔNG realign lại beat này.
 */
export async function confirmManualBeatTimeline(
    shortVideoId: number,
    markId: string,
    range: ConfirmManualBeatTimingRange,
): Promise<ManualBeatResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/confirm-timing',
        shortVideoBody(shortVideoId, {
            mark_id: markId,
            start_token_index: range.startTokenIndex,
            end_token_index: range.endTokenIndex,
            start_sec: range.startSec,
            end_sec: range.endSec,
        }),
    ) as Promise<ManualBeatResponse>;
}

export type ManualBeatAudioResponse = JsonResponse & { beat_audio?: AgentVideoBeatAudioState };

export async function generateManualBeatAudio(
    shortVideoId: number,
    markId = '',
    engine = '',
    force = false,
): Promise<ManualBeatAudioResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/generate-audio',
        shortVideoBody(shortVideoId, {
            mark_id: markId,
            engine,
            force: force ? '1' : '0',
        }),
    ) as Promise<ManualBeatAudioResponse>;
}

export async function mergeManualBeatAudio(shortVideoId: number): Promise<ManualBeatAudioResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/merge-audio',
        shortVideoBody(shortVideoId, {}),
    ) as Promise<ManualBeatAudioResponse>;
}

export async function fetchManualBeatAudio(shortVideoId: number): Promise<ManualBeatAudioResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/get-audio',
        shortVideoBody(shortVideoId, {}),
    ) as Promise<ManualBeatAudioResponse>;
}

export async function uploadManualBeatAudio(
    shortVideoId: number,
    markId: string,
    file: File,
): Promise<ManualBeatAudioResponse> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('mark_id', markId);
    formData.append('audio', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/upload-audio',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json() as ManualBeatAudioResponse;
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload thất bại');
    }
    return result;
}

/** System prompt art-director video 2s (prompts/video-2s/prompt-sinh-image.md). */
export async function fetchManualBeatImagePromptMaster(): Promise<JsonResponse & {
    prompt?: string;
    length?: number;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/get-image-prompt-master',
        {},
    ) as Promise<JsonResponse & { prompt?: string; length?: number }>;
}

/** Copy prompt chia beat AI video 2s (prompts/video-2s/prompt-chia-beat.md + script + whisper). */
export async function fetchManualBeatDivisionPrompt(shortVideoId: number): Promise<JsonResponse & {
    full_prompt?: string;
    prompt?: string;
    content_block?: string;
    title?: string;
    language?: string;
    duration_sec?: number;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/get-beat-division-prompt',
        shortVideoBody(shortVideoId, {}),
    ) as Promise<JsonResponse & {
        full_prompt?: string;
        prompt?: string;
        content_block?: string;
        title?: string;
        language?: string;
        duration_sec?: number;
    }>;
}

/** Nhập kết quả chia beat AI: backend tự tính timing, THAY toàn bộ beat hiện tại. */
export async function importManualBeatAiDivision(
    shortVideoId: number,
    aiOutput: string,
): Promise<ManualBeatResponse & {
    warnings?: string[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/import-ai-division',
        shortVideoBody(shortVideoId, { ai_output: aiOutput }),
    ) as Promise<ManualBeatResponse & { warnings?: string[] }>;
}

export async function saveManualBeatMarkPrompt(
    shortVideoId: number,
    markId: string,
    imagePrompt: string,
    force = false,
): Promise<ManualBeatResponse & {
    duplicate?: boolean;
    duplicate_order?: number;
    similarity?: number;
    filled?: number;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/manual-beat/save-mark-prompt',
        shortVideoBody(shortVideoId, {
            mark_id: markId,
            image_prompt: imagePrompt,
            force: force ? '1' : '0',
        }),
    ) as Promise<ManualBeatResponse & {
        duplicate?: boolean;
        duplicate_order?: number;
        similarity?: number;
        filled?: number;
    }>;
}

export async function fetchScriptCreatePrompt(
    shortVideoId: number,
    contentMode: 'text' | 'file' = 'text',
): Promise<JsonResponse & {
    prompt?: string;
    content?: string;
    content_file_name?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-prompt',
        shortVideoBody(shortVideoId, {
            phase: '1',
            variant: 'chatbot',
            content_mode: contentMode === 'file' ? 'file' : 'inline',
        }),
    ) as Promise<JsonResponse & {
        prompt?: string;
        content?: string;
        content_file_name?: string;
    }>;
}

export async function enqueueGeminiWebAudioScript(
    shortVideoId: number,
    mode: 'create' | 'improve',
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    mode?: string;
    job_ids?: number[];
    gemini_script?: AgentVideoContentResponse['gemini_script'];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/enqueue-gemini-web-audio-script',
        shortVideoBody(shortVideoId, {
            mode,
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        mode?: string;
        job_ids?: number[];
        gemini_script?: AgentVideoContentResponse['gemini_script'];
    }>;
}

export async function enqueueGeminiWebScriptPhonetic(
    shortVideoId: number,
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_ids?: number[];
    gemini_script_phonetic?: AgentVideoContentResponse['gemini_script_phonetic'];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/enqueue-gemini-web-script-phonetic',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_ids?: number[];
        gemini_script_phonetic?: AgentVideoContentResponse['gemini_script_phonetic'];
    }>;
}

export async function saveAdminAudioScript(
    shortVideoId: number,
    audioScript: string,
): Promise<SaveAdminAudioScriptResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-admin-audio-script',
        shortVideoBody(shortVideoId, { audio_script: audioScript }),
    ) as Promise<SaveAdminAudioScriptResponse>;
}

export async function saveAdminAudioScriptTtsReading(
    shortVideoId: number,
    audioScriptTtsReading: string,
): Promise<SaveAdminAudioScriptTtsReadingResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-admin-audio-script-tts-reading',
        shortVideoBody(shortVideoId, { audio_script_tts_reading: audioScriptTtsReading }),
    ) as Promise<SaveAdminAudioScriptTtsReadingResponse>;
}

export type SaveAgentSourceContentResponse = JsonResponse & {
    agent_source_content?: string;
    agent_additional_info?: string;
    agent_github_repo?: string;
    agent_tiktok_url?: string;
    agent_youtube_url?: string;
    agent_source_format?: string;
    agent_source_format_label?: string;
    content_plain_text?: string;
    readme_media?: GithubReadmeMediaItem[];
    topic_research?: TopicResearchBlock;
};

export async function saveAgentSourceContent(
    shortVideoId: number,
    content: string,
    githubRepo?: string,
    sourceFormat?: string,
    additionalInfo?: string,
    tiktokUrl?: string,
    topicResearch?: { topic?: string; urls?: string | string[] },
    youtubeUrl?: string,
): Promise<SaveAgentSourceContentResponse> {
    const extra: Record<string, unknown> = {
        agent_source_content: content,
    };
    if (githubRepo !== undefined) {
        extra.agent_github_repo = githubRepo;
    }
    if (sourceFormat !== undefined) {
        extra.agent_source_format = sourceFormat;
    }
    if (additionalInfo !== undefined) {
        extra.agent_additional_info = additionalInfo;
    }
    if (tiktokUrl !== undefined) {
        extra.agent_tiktok_url = tiktokUrl;
    }
    if (youtubeUrl !== undefined) {
        extra.agent_youtube_url = youtubeUrl;
    }
    if (topicResearch?.topic !== undefined) {
        extra.topic = topicResearch.topic;
    }
    if (topicResearch?.urls !== undefined) {
        extra.urls = topicResearch.urls;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-source-content',
        shortVideoBody(shortVideoId, extra),
    ) as Promise<SaveAgentSourceContentResponse>;
}

export type FetchGithubReadmeResponse = JsonResponse & {
    github_repo?: string;
    agent_github_repo?: string;
    readme?: string;
    source_url?: string;
    default_branch?: string;
    readme_media?: GithubReadmeMediaItem[];
    repo_stats?: {
        stars?: string;
        forks?: string;
        line?: string;
    };
    additional_info_merged?: string;
    partial?: boolean;
};

export async function fetchGithubReadme(
    shortVideoId: number,
    githubRepo: string,
    currentAdditionalInfo?: string,
): Promise<FetchGithubReadmeResponse> {
    const extra: Record<string, unknown> = {
        github_repo: githubRepo,
        agent_github_repo: githubRepo,
    };
    if (currentAdditionalInfo !== undefined) {
        extra.agent_additional_info = currentAdditionalInfo;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/fetch-github-readme',
        shortVideoBody(shortVideoId, extra),
    ) as Promise<FetchGithubReadmeResponse>;
}

export type ExtractVideoScriptMeta = {
    title?: string;
    uploader?: string;
    duration_sec?: number | null;
};

export type ExtractVideoScriptResponse = JsonResponse & {
    platform?: string;
    language?: string;
    meta?: ExtractVideoScriptMeta;
    raw_transcript?: string;
    cleaned_script?: string;
    source?: string;
};

export function isTikTokUrl(raw: string): boolean {
    const url = raw.trim();
    if (!url) return false;
    try {
        const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const host = new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
        return (
            host === 'tiktok.com'
            || host === 'vm.tiktok.com'
            || host === 'vt.tiktok.com'
            || host.endsWith('.tiktok.com')
        );
    } catch {
        return /tiktok\.com/i.test(url);
    }
}

export function isYouTubeUrl(raw: string): boolean {
    const url = raw.trim();
    if (!url) return false;
    try {
        const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const host = new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
        return (
            host === 'youtube.com'
            || host === 'm.youtube.com'
            || host === 'youtu.be'
            || host.endsWith('.youtube.com')
        );
    } catch {
        return /youtube\.com|youtu\.be/i.test(url);
    }
}

export async function extractVideoScript(
    url: string,
    platform: 'tiktok' | 'youtube' = 'tiktok',
): Promise<ExtractVideoScriptResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/extract-video-script',
        {
            url: url.trim(),
            platform,
        },
    ) as Promise<ExtractVideoScriptResponse>;
}

export type TopicResearchFetchResponse = JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_ids?: number[];
    topic_research?: TopicResearchBlock;
};

export async function enqueueTopicResearchFetch(
    shortVideoId: number,
    options?: { topic?: string; urls?: string | string[] },
): Promise<TopicResearchFetchResponse> {
    const extra: Record<string, unknown> = {};
    if (options?.topic !== undefined) {
        extra.topic = options.topic;
    }
    if (options?.urls !== undefined) {
        extra.urls = options.urls;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/topic-research-fetch',
        shortVideoBody(shortVideoId, extra),
    ) as Promise<TopicResearchFetchResponse>;
}

export type TopicResearchSynthesizeResponse = JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_ids?: number[];
    topic_research?: TopicResearchBlock;
    agent_source_content?: string;
};

export async function enqueueTopicResearchSynthesize(
    shortVideoId: number,
): Promise<TopicResearchSynthesizeResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/topic-research-synthesize',
        shortVideoBody(shortVideoId),
    ) as Promise<TopicResearchSynthesizeResponse>;
}

export type RemixSaveTranscriptResponse = JsonResponse & {
    remix?: RemixBlock;
};

export async function saveRemixTranscript(
    shortVideoId: number,
    options: {
        platform: 'tiktok' | 'youtube';
        rawTranscript: string;
        meta?: {
            title?: string;
            uploader?: string;
            duration_sec?: number | null;
        };
    },
): Promise<RemixSaveTranscriptResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/remix-save-transcript',
        shortVideoBody(shortVideoId, {
            platform: options.platform,
            raw_transcript: options.rawTranscript,
            meta: options.meta,
        }),
    ) as Promise<RemixSaveTranscriptResponse>;
}

export type RemixSynthesizeResponse = JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_ids?: number[];
    remix?: RemixBlock;
    agent_source_content?: string;
};

export async function enqueueRemixSynthesize(
    shortVideoId: number,
): Promise<RemixSynthesizeResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/remix-synthesize',
        shortVideoBody(shortVideoId),
    ) as Promise<RemixSynthesizeResponse>;
}

export type ImportGithubReadmeMediaResponse = JsonResponse & {
    imported?: ImportHtmlVisualCatalogItem[];
    skipped?: Array<{ resolved_url?: string; reason?: string }>;
    errors?: Array<{ resolved_url?: string; message?: string }>;
    visual_catalog?: ImportHtmlVisualCatalogItem[];
    import_html?: {
        assets?: ImportHtmlAssets;
    };
};

export async function importGithubReadmeMedia(
    shortVideoId: number,
    items: GithubReadmeMediaItem[],
): Promise<ImportGithubReadmeMediaResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-github-readme-media',
        shortVideoBody(shortVideoId, {
            items: items.map((item) => ({
                id: item.id,
                media_type: item.media_type,
                resolved_url: item.resolved_url,
                origin_path: item.origin_path || '',
                alt: item.alt || '',
                ext: item.ext || '',
            })),
        }),
    ) as Promise<ImportGithubReadmeMediaResponse>;
}

export async function approveAudioScript(shortVideoId: number): Promise<ApproveAudioScriptResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/approve-audio-script',
        shortVideoBody(shortVideoId),
    ) as Promise<ApproveAudioScriptResponse>;
}

export async function regenerateAgentNarrationTts(shortVideoId: number): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/regenerate-agent-narration-tts',
        shortVideoBody(shortVideoId),
    );
}

export async function retryAgentNarrationTts(shortVideoId: number): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/retry-agent-narration-tts',
        shortVideoBody(shortVideoId),
    );
}

export async function transcribeAgentAudio(
    shortVideoId: number,
    options?: { force?: boolean },
): Promise<JsonResponse & {
    status?: string;
    word_count?: number;
    import_html?: ImportHtmlSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/transcribe-agent-audio',
        shortVideoBody(shortVideoId, options?.force ? { force: 1 } : {}),
    );
}

export async function fetchTtsPhoneticDict(): Promise<{
    success?: boolean;
    entries?: TtsPhoneticDictEntry[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-tts-phonetic-dict',
        {},
    );
}

export async function saveTtsPhoneticDict(payload: {
    source_term: string;
    phonetic: string;
    id?: number;
    enabled?: boolean;
    case_sensitive?: boolean;
}): Promise<JsonResponse & {
    entry?: TtsPhoneticDictEntry;
    entries?: TtsPhoneticDictEntry[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-tts-phonetic-dict',
        payload,
    );
}

export type AgentBgmSearchItem = {
    id?: string | number;
    title?: string;
    download_url?: string;
    preview_url?: string;
    duration_sec?: number;
    provider?: string;
};

export async function searchAgentBgm(query: string, limit = 8): Promise<{
    success?: boolean;
    items?: AgentBgmSearchItem[];
    message?: ApiMessage;
    source?: string;
    fallback_note?: string;
    provider?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/search-agent-bgm',
        { query, limit },
    );
}

export type BgmPromptSuggestionItem = {
    id: string;
    label: string;
    prompt: string;
};

export type FetchBgmPromptSuggestionsResponse = JsonResponse & {
    short_video_id?: number;
    title?: string;
    target_sec?: number;
    mood?: string;
    style_id?: number;
    suggestions?: BgmPromptSuggestionItem[];
};

export async function fetchBgmPromptSuggestions(
    shortVideoId: number,
): Promise<FetchBgmPromptSuggestionsResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-bgm-prompt-suggestions',
        shortVideoBody(shortVideoId),
    ) as Promise<FetchBgmPromptSuggestionsResponse>;
}

export type UploadBgmMp3Response = JsonResponse & {
    short_video_id?: number;
    url?: string;
    s3_key?: string;
    duration_sec?: number;
    title?: string;
};

export async function uploadAgentBgmMp3(shortVideoId: number, file: File): Promise<UploadBgmMp3Response> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('audio', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-bgm-mp3',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json() as UploadBgmMp3Response;
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload thất bại');
    }
    return result;
}

export async function startFullAutoPipeline(
    shortVideoId: number,
    mode: 'resume' | 'restart' = 'resume',
    fromStep?: string,
    untilStep?: string,
    opts?: { singleStep?: boolean },
): Promise<JsonResponse & {
    full_auto_pipeline?: FullAutoPipelineSummary;
    mode?: string;
    from_step?: string | null;
    until_step?: string | null;
    single_step?: boolean;
}> {
    const body: Record<string, unknown> = { mode };
    if (mode === 'restart' && fromStep) {
        body.from_step = fromStep;
    }
    if (mode === 'restart' && untilStep && !opts?.singleStep) {
        body.until_step = untilStep;
    }
    if (mode === 'restart' && opts?.singleStep) {
        body.single_step = true;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/start-full-auto-pipeline',
        shortVideoBody(shortVideoId, body),
    ) as Promise<JsonResponse & {
        full_auto_pipeline?: FullAutoPipelineSummary;
        mode?: string;
        from_step?: string | null;
        until_step?: string | null;
        single_step?: boolean;
    }>;
}

export async function cancelFullAutoPipeline(
    shortVideoId: number,
): Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/cancel-full-auto-pipeline',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }>;
}

export async function markBeatDivisionDone(
    shortVideoId: number,
): Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/mark-beat-division-done',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }>;
}

export async function markScriptCreateDone(
    shortVideoId: number,
): Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/mark-script-create-done',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }>;
}

export async function markScriptPhoneticDone(
    shortVideoId: number,
): Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/mark-script-phonetic-done',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }>;
}

export async function requestAgentHeadlessNewChat(
    shortVideoId: number,
    sessionId?: string,
): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/request-agent-headless-new-chat',
        shortVideoBody(shortVideoId, sessionId ? { session_id: sessionId } : {}),
    ) as Promise<JsonResponse>;
}

export async function requestAgentHeadlessNewSection(
    shortVideoId: number,
    sessionId?: string,
): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/request-agent-headless-new-section',
        shortVideoBody(shortVideoId, sessionId ? { session_id: sessionId } : {}),
    ) as Promise<JsonResponse>;
}

export async function getAgentHeadlessPreviewAccess(
    shortVideoId: number,
): Promise<AgentHeadlessPreviewAccessResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-headless-preview-access',
        shortVideoBody(shortVideoId),
    ) as Promise<AgentHeadlessPreviewAccessResponse>;
}

export type HeadlessPrerequisitesStatusResponse = JsonResponse & {
    checked_at?: string;
    ready_for_headless?: boolean;
    summary?: string;
    worker?: {
        ok?: boolean;
        running?: boolean;
        pids?: number[];
        detail?: string;
    };
    preview_relay?: {
        ok?: boolean;
        running?: boolean;
        optional?: boolean;
        url?: string;
        sessions?: number;
        detail?: string;
    };
    gemini_profile?: {
        ok?: boolean;
        configured?: boolean;
        exists?: boolean;
        has_cookie_file?: boolean;
        path?: string;
        detail?: string;
    };
};

export async function getHeadlessPrerequisitesStatus(): Promise<HeadlessPrerequisitesStatusResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-headless-prerequisites-status',
        {},
    ) as Promise<HeadlessPrerequisitesStatusResponse>;
}

export async function saveAgentImportHtml(
    shortVideoId: number,
    payload: {
        renderMode?: AgentRenderMode;
        html?: string;
        beatMap?: import('./agentVideoBeatMap').BeatMap;
        beatId?: string;
        beatHtml?: string;
        beatImageUrl?: string;
        beatImagePrompt?: string;
        creativePrompt?: string;
        qaStatus?: import('./agentVideoBeatMap').BeatQaStatus;
        qaRefineNote?: string;
        saveBeatVersion?: boolean;
        restoreBeatVersion?: boolean;
        versionId?: string;
        thumbnailHtml?: string;
        thumbnailCreativePrompt?: string;
        thumbnailQaStatus?: ThumbnailQaStatus;
        thumbnailQaNote?: string;
        thumbnailApproved?: boolean;
        bgmSegments?: ImportHtmlBgmSegment[];
        bgmLoop?: boolean;
        sfxBeatTransition?: boolean;
        sfxHook?: boolean;
        visualCatalog?: ImportHtmlVisualCatalogItem[];
        visualSearchQueries?: string[];
        githubImageShots?: ImportHtmlGithubImageShot[];
        readmeMedia?: GithubReadmeMediaItem[];
    },
): Promise<JsonResponse & {
    render_mode?: AgentRenderMode;
    import_html?: ImportHtmlSummary;
    beat_version?: {
        beat_id?: string;
        version_id?: string;
        version_label?: string;
        restored?: boolean;
    } | null;
}> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (payload.renderMode !== undefined) {
        body.render_mode = payload.renderMode;
    }
    if (payload.html !== undefined) {
        body.html = payload.html;
    }
    if (payload.beatMap !== undefined) {
        body.beat_map = payload.beatMap;
    }
    if (payload.beatId !== undefined && (
        payload.beatHtml !== undefined
        || payload.beatImageUrl !== undefined
        || payload.beatImagePrompt !== undefined
        || payload.creativePrompt !== undefined
        || payload.qaStatus !== undefined
        || payload.qaRefineNote !== undefined
        || payload.saveBeatVersion === true
        || payload.restoreBeatVersion === true
    )) {
        body.beat_id = payload.beatId;
        if (payload.beatHtml !== undefined) {
            body.beat_html = payload.beatHtml;
        }
        if (payload.beatImageUrl !== undefined) {
            body.beat_image_url = payload.beatImageUrl;
        }
        if (payload.beatImagePrompt !== undefined) {
            body.beat_image_prompt = payload.beatImagePrompt;
        }
        if (payload.creativePrompt !== undefined) {
            body.creative_prompt = payload.creativePrompt;
        }
        if (payload.qaStatus !== undefined) {
            body.qa_status = payload.qaStatus;
        }
        if (payload.qaRefineNote !== undefined) {
            body.qa_refine_note = payload.qaRefineNote;
        }
        if (payload.saveBeatVersion === true) {
            body.save_beat_version = true;
        }
        if (payload.restoreBeatVersion === true) {
            body.restore_beat_version = true;
            if (payload.versionId !== undefined) {
                body.version_id = payload.versionId;
            }
        }
    }
    if (payload.thumbnailHtml !== undefined) {
        body.thumbnail_html = payload.thumbnailHtml;
    }
    if (payload.thumbnailCreativePrompt !== undefined) {
        body.thumbnail_creative_prompt = payload.thumbnailCreativePrompt;
    }
    if (payload.thumbnailQaStatus !== undefined) {
        body.thumbnail_qa_status = payload.thumbnailQaStatus;
    }
    if (payload.thumbnailQaNote !== undefined) {
        body.thumbnail_qa_note = payload.thumbnailQaNote;
    }
    if (payload.thumbnailApproved !== undefined) {
        body.thumbnail_approved = payload.thumbnailApproved;
    }
    if (payload.bgmSegments !== undefined) {
        body.bgm_segments = payload.bgmSegments;
    }
    if (payload.bgmLoop !== undefined) {
        body.bgm_loop = payload.bgmLoop;
    }
    if (payload.sfxBeatTransition !== undefined) {
        body.sfx_beat_transition = payload.sfxBeatTransition;
    }
    if (payload.sfxHook !== undefined) {
        body.sfx_hook = payload.sfxHook;
    }
    if (payload.visualCatalog !== undefined) {
        body.visual_catalog = payload.visualCatalog;
    }
    if (payload.visualSearchQueries !== undefined) {
        body.visual_search_queries = payload.visualSearchQueries;
    }
    if (payload.githubImageShots !== undefined) {
        body.github_image_shots = payload.githubImageShots;
    }
    if (payload.readmeMedia !== undefined) {
        body.readme_media = payload.readmeMedia;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-import-html',
        body,
    );
}

export async function saveAgentCaptionAlignments(
    shortVideoId: number,
    payload: {
        words: Array<{ text: string; start: number; end: number }>;
        overrides?: CaptionAlignOverride[];
        captionSync?: CaptionSyncSummary;
    },
): Promise<JsonResponse & { import_html?: ImportHtmlSummary }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-caption-alignments',
        {
            ...shortVideoBody(shortVideoId),
            words: payload.words,
            overrides: payload.overrides ?? [],
            caption_sync: payload.captionSync ?? {},
        },
    );
}

export async function saveAgentScriptStyle(
    shortVideoId: number,
    styleId: number | null,
): Promise<JsonResponse & { audio_script_style_id?: number | null }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-script-style',
        shortVideoBody(shortVideoId, {
            audio_script_style_id: styleId ?? 0,
        }),
    ) as Promise<JsonResponse & { audio_script_style_id?: number | null }>;
}

export async function saveAgentDesiredScriptDuration(
    shortVideoId: number,
    durationSec: number | null,
): Promise<JsonResponse & { desired_script_duration_sec?: number | null }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-desired-script-duration',
        shortVideoBody(shortVideoId, {
            desired_script_duration_sec: durationSec ?? '',
        }),
    ) as Promise<JsonResponse & { desired_script_duration_sec?: number | null }>;
}

/** Lưu vị trí timeline (giây) — không gọi khi đang play; FE debounce ~1.5s. */
export async function saveAgentTimelinePosition(
    shortVideoId: number,
    timelineSec: number,
): Promise<JsonResponse & { last_timeline_sec?: number | null }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-timeline-position',
        shortVideoBody(shortVideoId, {
            last_timeline_sec: timelineSec,
        }),
    ) as Promise<JsonResponse & { last_timeline_sec?: number | null }>;
}

export async function saveAgentCapcutConfig(
    shortVideoId: number,
    payload: { projectName: string; projectPath: string },
): Promise<JsonResponse & {
    project_name?: string;
    project_path?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-capcut-config',
        shortVideoBody(shortVideoId, {
            capcut_project_name: payload.projectName,
            capcut_project_path: payload.projectPath,
        }),
    ) as Promise<JsonResponse & {
        project_name?: string;
        project_path?: string;
    }>;
}

export async function addAudioToCapcut(
    shortVideoId: number,
): Promise<JsonResponse & {
    project_name?: string;
    project_path?: string;
    created_project?: boolean;
    capcut_last_sync_json?: Record<string, unknown>;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/add-audio-to-capcut',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & {
        project_name?: string;
        project_path?: string;
        created_project?: boolean;
        capcut_last_sync_json?: Record<string, unknown>;
    }>;
}

export type CapcutUploadBeatEntry = {
    beat_id?: string;
    start_sec?: number;
    duration_sec?: number;
    media?: 'image' | 'video' | string;
};

export type CapcutUploadFailedBeat = {
    beat_id?: string;
    reason?: string;
};

export async function uploadAllToCapcut(
    shortVideoId: number,
): Promise<JsonResponse & {
    project_name?: string;
    project_path?: string;
    created_project?: boolean;
    added_audio?: boolean;
    audio_error?: string;
    added_beats?: CapcutUploadBeatEntry[];
    failed_beats?: CapcutUploadFailedBeat[];
    assets_mode?: boolean;
    capcut_last_sync_json?: Record<string, unknown>;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-all-to-capcut',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & {
        project_name?: string;
        project_path?: string;
        created_project?: boolean;
        added_audio?: boolean;
        audio_error?: string;
        added_beats?: CapcutUploadBeatEntry[];
        failed_beats?: CapcutUploadFailedBeat[];
        assets_mode?: boolean;
        capcut_last_sync_json?: Record<string, unknown>;
    }>;
}

export async function renderWhiteboardAgentBeat(
    shortVideoId: number,
    beatId: string,
): Promise<JsonResponse & {
    queued?: boolean;
    job_id?: number;
    beat_id?: string;
    skipped_active?: number;
    whiteboard_beat_renders?: Record<string, WhiteboardBeatRenderEntry>;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/render-whiteboard-agent-beat',
        shortVideoBody(shortVideoId, { beat_id: beatId }),
    ) as Promise<JsonResponse & {
        queued?: boolean;
        job_id?: number;
        beat_id?: string;
        skipped_active?: number;
        whiteboard_beat_renders?: Record<string, WhiteboardBeatRenderEntry>;
    }>;
}

/**
 * Lấy riêng whiteboard_beat_renders (endpoint nhẹ) — poll trạng thái render
 * video beat không phụ thuộc get-agent-audio-content (payload nặng).
 */
export async function getWhiteboardBeatRenders(
    shortVideoId: number,
): Promise<JsonResponse & {
    whiteboard_beat_renders?: Record<string, WhiteboardBeatRenderEntry>;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-whiteboard-beat-renders',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & {
        whiteboard_beat_renders?: Record<string, WhiteboardBeatRenderEntry>;
    }>;
}

export async function addBeatVideoToCapcut(
    shortVideoId: number,
    beatId: string,
): Promise<JsonResponse & {
    project_name?: string;
    project_path?: string;
    created_project?: boolean;
    beat_id?: string;
    start_sec?: number;
    video_path?: string;
    capcut_last_sync_json?: Record<string, unknown>;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/add-beat-video-to-capcut',
        shortVideoBody(shortVideoId, { beat_id: beatId }),
    ) as Promise<JsonResponse & {
        project_name?: string;
        project_path?: string;
        created_project?: boolean;
        beat_id?: string;
        start_sec?: number;
        video_path?: string;
        capcut_last_sync_json?: Record<string, unknown>;
    }>;
}

export type AudioScriptStyleItem = {
    id: number;
    title: string;
    channel: string;
    status: string;
};

export async function listAudioScriptStyles(): Promise<JsonResponse & { styles?: AudioScriptStyleItem[] }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-audio-script-styles',
        {},
    ) as Promise<JsonResponse & { styles?: AudioScriptStyleItem[] }>;
}

export async function fetchImportHtmlContext(shortVideoId: number) {
    const token = getAccessToken() ?? '';
    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-import-html-context',
        ),
        {
            method: 'POST',
            credentials: 'include',
            headers: authHeaders(),
            body: JSON.stringify(shortVideoBody(shortVideoId, { access_token: token })),
        },
    );
    return response.json();
}
