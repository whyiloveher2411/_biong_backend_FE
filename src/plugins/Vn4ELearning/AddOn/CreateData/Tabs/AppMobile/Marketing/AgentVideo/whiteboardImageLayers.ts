/**
 * LỚP ẢNH TRONG BEAT (mode Image / whiteboard).
 *
 * 1 beat = N ảnh object full-frame + 1 custom background dùng chung. Các lớp ảnh
 * thay nhau theo slot thời gian (semantics REPLACE), background giữ nguyên nên
 * nền không nháy khi đổi ảnh. Vùng (BeatRegion) và ảnh thêm (BeatImageOverlay)
 * thuộc về đúng 1 lớp qua `layer_id`.
 *
 * Tương thích ngược: beat cũ chỉ có `beat_image[beatId].image_url` và regions
 * không có `layer_id` → resolve lazy thành đúng 1 lớp id `layer_0`, dữ liệu đã
 * lưu không bị ghi lại.
 */

import type {
    AgentWhiteboardBeatOverride,
    BeatImageLayer,
    BeatImageOverlay,
    BeatRegion,
} from './agentVideoApi';
import type { BeatImageEntry } from './agentVideoBeatMap';

/**
 * Trần AN TOÀN số lớp ảnh mỗi beat (chống payload rác), không phải giới hạn
 * nghiệp vụ: số ảnh trong beat do JSON chia beat quyết định. Render tăng gần
 * tuyến tính theo số lớp nên beat nhiều lớp sẽ render lâu hơn.
 */
export const WHITEBOARD_MAX_IMAGE_LAYERS = 64;

/** Slot ngắn hơn mức này không đủ cho intro + animation vùng. */
export const WHITEBOARD_MIN_LAYER_SLOT_SEC = 0.6;

/** Cross-fade ở ranh giới 2 slot để đổi ảnh không giật. */
export const WHITEBOARD_LAYER_CROSSFADE_SEC = 0.2;

/** Id lớp đầu tiên khi migrate lazy beat 1 ảnh. */
export const WHITEBOARD_PRIMARY_LAYER_ID = 'layer_0';

export function whiteboardLayerIdAt(index: number): string {
    return `layer_${Math.max(0, Math.floor(index))}`;
}

function toFiniteNumber(raw: unknown): number | null {
    const num = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(num) ? num : null;
}

/** Chia đều beat window thành `count` slot liên tiếp. */
export function buildEvenLayerSlots(
    count: number,
    beatWindowSec: number,
): Array<{ start_sec: number; end_sec: number }> {
    const total = Math.max(1, Math.floor(count));
    const window = Math.max(WHITEBOARD_MIN_LAYER_SLOT_SEC * total, Number(beatWindowSec) || 0);
    const step = window / total;
    const slots: Array<{ start_sec: number; end_sec: number }> = [];
    for (let i = 0; i < total; i += 1) {
        slots.push({
            start_sec: Number((i * step).toFixed(3)),
            end_sec: Number(((i + 1) * step).toFixed(3)),
        });
    }
    return slots;
}

export function normalizeBeatImageLayer(raw: unknown, index: number): BeatImageLayer | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const item = raw as Record<string, unknown>;
    const imageUrl = String(item.image_url || '').trim();
    if (!imageUrl) {
        return null;
    }
    const id = String(item.id || '').trim() || whiteboardLayerIdAt(index);
    const start = toFiniteNumber(item.start_sec);
    const end = toFiniteNumber(item.end_sec);
    const order = toFiniteNumber(item.order);
    const placeMode = String(item.photo_place_mode || '').trim();
    return {
        id,
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : undefined,
        image_url: imageUrl,
        start_sec: start != null ? Math.max(0, start) : 0,
        end_sec: end != null ? Math.max(0, end) : 0,
        order: order != null ? Math.max(0, Math.floor(order)) : index,
        photo_place_mode: placeMode || undefined,
    };
}

export function normalizeBeatImageLayers(raw: unknown): BeatImageLayer[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const seen = new Set<string>();
    const out: BeatImageLayer[] = [];
    raw.forEach((item, index) => {
        const layer = normalizeBeatImageLayer(item, index);
        if (!layer || seen.has(layer.id)) {
            return;
        }
        seen.add(layer.id);
        out.push(layer);
    });
    return out
        .sort((a, b) => {
            const orderDiff = (a.order ?? 0) - (b.order ?? 0);
            if (orderDiff !== 0) {
                return orderDiff;
            }
            return a.start_sec - b.start_sec;
        })
        .slice(0, WHITEBOARD_MAX_IMAGE_LAYERS)
        .map((layer, index) => ({ ...layer, order: index }));
}

/** URL ảnh AI sinh cho beat: ảnh 1 (image_url) + ảnh 2..N (extra_image_urls). */
export function beatImageEntryUrls(entry: BeatImageEntry | null | undefined): string[] {
    const urls: string[] = [];
    const primary = String(entry?.image_url || '').trim();
    if (primary) {
        urls.push(primary);
    }
    (entry?.extra_image_urls || []).forEach((raw) => {
        const url = String(raw || '').trim();
        if (url && !urls.includes(url)) {
            urls.push(url);
        }
    });
    return urls.slice(0, WHITEBOARD_MAX_IMAGE_LAYERS);
}

/**
 * Luôn trả về danh sách lớp ảnh của beat (>= 0 phần tử).
 * - Có `override.image_layers` → dùng, vá slot thiếu bằng chia đều.
 * - Không có → migrate lazy từ `beat_image[beatId]` (ảnh 1 + extra_image_urls).
 */
export function resolveBeatImageLayers(params: {
    override?: AgentWhiteboardBeatOverride | null;
    beatImageEntry?: BeatImageEntry | null;
    beatWindowSec: number;
}): BeatImageLayer[] {
    const { override, beatImageEntry, beatWindowSec } = params;
    const saved = normalizeBeatImageLayers(override?.image_layers);
    const urls = beatImageEntryUrls(beatImageEntry);

    let layers: BeatImageLayer[];
    if (saved.length) {
        layers = saved;
    } else {
        layers = urls.map((url, index) => ({
            id: whiteboardLayerIdAt(index),
            image_url: url,
            start_sec: 0,
            end_sec: 0,
            order: index,
        }));
    }
    if (!layers.length) {
        return [];
    }

    // Slot chưa hợp lệ (end <= start) → ưu tiên kế hoạch slot theo lời thoại con
    // (chia beat từ JSON), không có thì chia đều toàn beat window.
    const needsSlots = layers.some((layer) => !(layer.end_sec > layer.start_sec));
    if (needsSlots) {
        const plan = normalizeImageLayerSlots(override?.image_layer_slots);
        const slots = plan.length === layers.length
            ? plan
            : buildEvenLayerSlots(layers.length, beatWindowSec);
        layers = layers.map((layer, index) => ({ ...layer, ...slots[index] }));
    }
    return layers;
}

/** Chuẩn hóa kế hoạch slot (beat-relative): bỏ slot lỗi, sắp theo thời gian. */
export function normalizeImageLayerSlots(
    raw: unknown,
): Array<{ start_sec: number; end_sec: number }> {
    if (!Array.isArray(raw)) {
        return [];
    }
    const out: Array<{ start_sec: number; end_sec: number }> = [];
    raw.forEach((item) => {
        if (!item || typeof item !== 'object') {
            return;
        }
        const record = item as Record<string, unknown>;
        const start = toFiniteNumber(record.start_sec);
        const end = toFiniteNumber(record.end_sec);
        if (start == null || end == null || end <= start) {
            return;
        }
        out.push({
            start_sec: Number(Math.max(0, start).toFixed(3)),
            end_sec: Number(Math.max(0, end).toFixed(3)),
        });
    });
    return out.sort((a, b) => a.start_sec - b.start_sec).slice(0, WHITEBOARD_MAX_IMAGE_LAYERS);
}

/** Lớp ảnh mà vùng/overlay thuộc về — rỗng = lớp đầu tiên (beat cũ). */
export function resolveLayerIdForItem(
    item: { layer_id?: string | null } | null | undefined,
    layers: BeatImageLayer[],
): string {
    const raw = String(item?.layer_id || '').trim();
    if (raw && layers.some((layer) => layer.id === raw)) {
        return raw;
    }
    return layers[0]?.id || WHITEBOARD_PRIMARY_LAYER_ID;
}

export function regionsForLayer(
    regions: BeatRegion[] | null | undefined,
    layerId: string,
    layers: BeatImageLayer[],
): BeatRegion[] {
    return (regions || []).filter((region) => resolveLayerIdForItem(region, layers) === layerId);
}

export function overlaysForLayer(
    overlays: BeatImageOverlay[] | null | undefined,
    layerId: string,
    layers: BeatImageLayer[],
): BeatImageOverlay[] {
    return (overlays || []).filter((overlay) => resolveLayerIdForItem(overlay, layers) === layerId);
}

/** Lớp ảnh đang hiển thị tại thời điểm `sec` (scene-relative trong beat). */
export function activeLayerAt(
    layers: BeatImageLayer[],
    sec: number,
): BeatImageLayer | null {
    if (!layers.length) {
        return null;
    }
    const t = Number.isFinite(sec) ? Number(sec) : 0;
    for (let i = 0; i < layers.length; i += 1) {
        const layer = layers[i];
        const isLast = i === layers.length - 1;
        if (t >= layer.start_sec && (t < layer.end_sec || isLast)) {
            return layer;
        }
    }
    return t < layers[0].start_sec ? layers[0] : layers[layers.length - 1];
}

/** Cửa sổ hợp lệ cho region/overlay của 1 lớp (dùng clamp khi kéo timeline). */
export function layerSlotBounds(
    layer: BeatImageLayer | null | undefined,
    beatWindowSec: number,
): { start: number; end: number } {
    const window = Math.max(0, Number(beatWindowSec) || 0);
    if (!layer) {
        return { start: 0, end: window };
    }
    const start = Math.max(0, layer.start_sec);
    const end = layer.end_sec > start ? Math.min(window || layer.end_sec, layer.end_sec) : window;
    return { start, end };
}

/** Clamp timing 1 vùng vào slot của lớp chứa nó. */
export function clampRegionToLayerSlot(
    region: BeatRegion,
    layer: BeatImageLayer | null | undefined,
    beatWindowSec: number,
): BeatRegion {
    const { start, end } = layerSlotBounds(layer, beatWindowSec);
    if (!(end > start)) {
        return region;
    }
    const clamp = (value: number | null | undefined): number | null | undefined => {
        if (value == null || !Number.isFinite(value)) {
            return value;
        }
        return Math.max(start, Math.min(end, value));
    };
    const next: BeatRegion = { ...region };
    next.start_sec = clamp(region.start_sec) as number | null | undefined;
    next.end_sec = clamp(region.end_sec) as number | null | undefined;
    if (region.attention_start_sec != null) {
        next.attention_start_sec = clamp(region.attention_start_sec) as number | null;
    }
    if (region.attention_end_sec != null) {
        next.attention_end_sec = clamp(region.attention_end_sec) as number | null;
    }
    return next;
}

/**
 * Ghi lại slot sau khi thêm/xóa/đổi thứ tự lớp: giữ tỷ lệ tương đối nếu đã có
 * slot hợp lệ, còn lại chia đều.
 */
export function redistributeLayerSlots(
    layers: BeatImageLayer[],
    beatWindowSec: number,
): BeatImageLayer[] {
    const slots = buildEvenLayerSlots(layers.length, beatWindowSec);
    return layers.map((layer, index) => ({
        ...layer,
        order: index,
        ...slots[index],
    }));
}

/**
 * Chuẩn hóa chuỗi slot đã do user kéo: liên tiếp, lấp kín beat window, mỗi slot
 * >= WHITEBOARD_MIN_LAYER_SLOT_SEC. Slot không hợp lệ → chia đều lại.
 */
export function normalizeLayerSlotChain(
    layers: BeatImageLayer[],
    beatWindowSec: number,
): BeatImageLayer[] {
    if (!layers.length) {
        return [];
    }
    const window = Math.max(WHITEBOARD_MIN_LAYER_SLOT_SEC * layers.length, Number(beatWindowSec) || 0);
    const invalid = layers.some((layer, index) => {
        if (!(layer.end_sec - layer.start_sec >= WHITEBOARD_MIN_LAYER_SLOT_SEC - 0.001)) {
            return true;
        }
        if (index > 0 && Math.abs(layer.start_sec - layers[index - 1].end_sec) > 0.01) {
            return true;
        }
        return false;
    });
    if (invalid) {
        return redistributeLayerSlots(layers, window);
    }
    return layers.map((layer, index) => ({
        ...layer,
        order: index,
        start_sec: index === 0 ? 0 : Number(layer.start_sec.toFixed(3)),
        end_sec: index === layers.length - 1 ? Number(window.toFixed(3)) : Number(layer.end_sec.toFixed(3)),
    }));
}

/** Nhiều lớp ảnh cần background dùng chung, thiếu sẽ nháy nền trắng khi đổi ảnh. */
export function requiresSharedBackground(layers: BeatImageLayer[]): boolean {
    return layers.length > 1;
}
