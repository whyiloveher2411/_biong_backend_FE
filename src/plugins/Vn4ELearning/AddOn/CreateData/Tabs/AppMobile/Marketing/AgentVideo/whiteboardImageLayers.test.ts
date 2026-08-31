import type { BeatRegion } from './agentVideoApi';
import {
    WHITEBOARD_PRIMARY_LAYER_ID,
    activeLayerAt,
    beatImageEntryUrls,
    buildEvenLayerSlots,
    clampRegionToLayerSlot,
    normalizeBeatImageLayers,
    normalizeLayerSlotChain,
    redistributeLayerSlots,
    regionsForLayer,
    requiresSharedBackground,
    resolveBeatImageLayers,
    resolveLayerIdForItem,
} from './whiteboardImageLayers';

describe('whiteboardImageLayers — lazy migration', () => {
    it('beat cũ 1 ảnh, không có image_layers → 1 lớp layer_0 phủ hết beat', () => {
        const layers = resolveBeatImageLayers({
            override: null,
            beatImageEntry: { image_url: 'https://cdn/a.png' } as never,
            beatWindowSec: 8,
        });
        expect(layers).toHaveLength(1);
        expect(layers[0].id).toBe(WHITEBOARD_PRIMARY_LAYER_ID);
        expect(layers[0].start_sec).toBe(0);
        expect(layers[0].end_sec).toBeCloseTo(8, 3);
    });

    it('extra_image_urls → nhiều lớp, slot chia đều', () => {
        const layers = resolveBeatImageLayers({
            override: null,
            beatImageEntry: {
                image_url: 'https://cdn/a.png',
                extra_image_urls: ['https://cdn/b.png', 'https://cdn/a.png'],
            } as never,
            beatWindowSec: 6,
        });
        expect(layers.map((layer) => layer.image_url)).toEqual([
            'https://cdn/a.png',
            'https://cdn/b.png',
        ]);
        expect(layers[0].end_sec).toBeCloseTo(3, 3);
        expect(layers[1].start_sec).toBeCloseTo(3, 3);
        expect(layers[1].end_sec).toBeCloseTo(6, 3);
    });

    it('override.image_layers được ưu tiên hơn beat_image', () => {
        const layers = resolveBeatImageLayers({
            override: {
                image_layers: [
                    { id: 'l0', image_url: 'https://cdn/x.png', start_sec: 0, end_sec: 2 },
                    { id: 'l1', image_url: 'https://cdn/y.png', start_sec: 2, end_sec: 5 },
                ],
            } as never,
            beatImageEntry: { image_url: 'https://cdn/a.png' } as never,
            beatWindowSec: 5,
        });
        expect(layers.map((layer) => layer.id)).toEqual(['l0', 'l1']);
    });

    it('beatImageEntryUrls bỏ url rỗng và trùng', () => {
        expect(
            beatImageEntryUrls({
                image_url: ' https://cdn/a.png ',
                extra_image_urls: ['', 'https://cdn/a.png', 'https://cdn/b.png'],
            } as never),
        ).toEqual(['https://cdn/a.png', 'https://cdn/b.png']);
    });

    it('normalizeBeatImageLayers bỏ lớp thiếu image_url và đánh lại order', () => {
        const layers = normalizeBeatImageLayers([
            { id: 'b', image_url: 'https://cdn/b.png', order: 3 },
            { id: 'a', image_url: 'https://cdn/a.png', order: 1 },
            { id: 'c', image_url: '' },
        ]);
        expect(layers.map((layer) => layer.id)).toEqual(['a', 'b']);
        expect(layers.map((layer) => layer.order)).toEqual([0, 1]);
    });
});

describe('whiteboardImageLayers — slot & clamp', () => {
    const layers = [
        { id: 'l0', image_url: 'a', start_sec: 0, end_sec: 3, order: 0 },
        { id: 'l1', image_url: 'b', start_sec: 3, end_sec: 6, order: 1 },
    ];

    it('buildEvenLayerSlots liên tiếp, lấp kín window', () => {
        const slots = buildEvenLayerSlots(3, 9);
        expect(slots).toHaveLength(3);
        expect(slots[0]).toEqual({ start_sec: 0, end_sec: 3 });
        expect(slots[2].end_sec).toBeCloseTo(9, 3);
    });

    it('activeLayerAt chọn lớp theo playhead, quá cuối → lớp cuối', () => {
        expect(activeLayerAt(layers, 1)?.id).toBe('l0');
        expect(activeLayerAt(layers, 3)?.id).toBe('l1');
        expect(activeLayerAt(layers, 99)?.id).toBe('l1');
    });

    it('clampRegionToLayerSlot ép timing vùng về trong slot của lớp', () => {
        const region = {
            id: 'r1',
            layer_id: 'l1',
            start_sec: 0.5,
            end_sec: 9,
            attention_start_sec: 0,
            attention_end_sec: 10,
        } as unknown as BeatRegion;
        const clamped = clampRegionToLayerSlot(region, layers[1], 6);
        expect(clamped.start_sec).toBeCloseTo(3, 3);
        expect(clamped.end_sec).toBeCloseTo(6, 3);
        expect(clamped.attention_start_sec).toBeCloseTo(3, 3);
        expect(clamped.attention_end_sec).toBeCloseTo(6, 3);
    });

    it('normalizeLayerSlotChain chia đều lại khi chuỗi slot bị hở', () => {
        const broken = [
            { id: 'l0', image_url: 'a', start_sec: 0, end_sec: 2, order: 0 },
            { id: 'l1', image_url: 'b', start_sec: 4, end_sec: 6, order: 1 },
        ];
        const fixed = normalizeLayerSlotChain(broken, 6);
        expect(fixed[0].end_sec).toBeCloseTo(3, 3);
        expect(fixed[1].start_sec).toBeCloseTo(3, 3);
    });

    it('redistributeLayerSlots giữ thứ tự và lấp kín window', () => {
        const next = redistributeLayerSlots(layers, 8);
        expect(next[0].end_sec).toBeCloseTo(4, 3);
        expect(next[1].end_sec).toBeCloseTo(8, 3);
        expect(next.map((layer) => layer.order)).toEqual([0, 1]);
    });

    it('layer_id rỗng hoặc lạ → thuộc lớp đầu tiên', () => {
        expect(resolveLayerIdForItem({ layer_id: '' }, layers)).toBe('l0');
        expect(resolveLayerIdForItem({ layer_id: 'khong-ton-tai' }, layers)).toBe('l0');
        expect(resolveLayerIdForItem({ layer_id: 'l1' }, layers)).toBe('l1');
    });

    it('regionsForLayer gom vùng cũ (không layer_id) vào lớp đầu', () => {
        const regions = [
            { id: 'r0' },
            { id: 'r1', layer_id: 'l1' },
        ] as unknown as BeatRegion[];
        expect(regionsForLayer(regions, 'l0', layers).map((r) => r.id)).toEqual(['r0']);
        expect(regionsForLayer(regions, 'l1', layers).map((r) => r.id)).toEqual(['r1']);
    });

    it('requiresSharedBackground chỉ bật khi > 1 lớp', () => {
        expect(requiresSharedBackground(layers)).toBe(true);
        expect(requiresSharedBackground([layers[0]])).toBe(false);
    });
});
