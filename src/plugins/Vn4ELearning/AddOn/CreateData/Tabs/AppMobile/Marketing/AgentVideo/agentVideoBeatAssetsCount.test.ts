import {
    countBeatsWithPendingAudio,
    countMissingBeatImagePrompt,
    listBeatsWithPendingAudio,
    listMissingBeatImagePromptIds,
    type BeatMap,
    type BeatMapSection,
} from './agentVideoBeatMap';

function section(id: string, imagePrompt?: Record<string, unknown> | string): BeatMapSection {
    return {
        id,
        beat_id: id,
        startSec: 0,
        endSec: 2,
        durationSec: 2,
        phrase_anchor: `anchor ${id}`,
        visual_description: 'visual description',
        image_prompt: imagePrompt,
        background: 'deep charcoal void',
    };
}

function map(sections: BeatMapSection[]): BeatMap {
    return { schema_version: 2, totalVideoSec: sections.length * 2, sections };
}

describe('countMissingBeatImagePrompt', () => {
    it('đếm beat không có image_prompt', () => {
        const beatMap = map([
            section('beat_1', { subject: 'a' }),
            section('beat_2'),
            section('beat_3', ''),
            section('beat_4', { subject: 'b' }),
        ]);
        expect(listMissingBeatImagePromptIds(beatMap)).toEqual(['beat_2', 'beat_3']);
        expect(countMissingBeatImagePrompt(beatMap)).toBe(2);
    });

    it('coi prompt lưu ở beat_image block là có prompt', () => {
        const beatMap = map([section('beat_1'), section('beat_2')]);
        const beatImage = {
            beat_1: { image_url: '', image_prompt: '{"subject":"x"}' },
        };
        expect(listMissingBeatImagePromptIds(beatMap, beatImage)).toEqual(['beat_2']);
    });

    it('prompt rỗng ở cả section và beat_image → vẫn thiếu', () => {
        const beatMap = map([section('beat_1')]);
        const beatImage = { beat_1: { image_url: '', image_prompt: '   ' } };
        expect(countMissingBeatImagePrompt(beatMap, beatImage)).toBe(1);
    });

    it('map null → 0', () => {
        expect(countMissingBeatImagePrompt(null)).toBe(0);
    });
});

describe('listBeatsWithPendingAudio / countBeatsWithPendingAudio', () => {
    it('chỉ đếm item có status != ready', () => {
        const items = {
            beat_1: { status: 'ready' },
            beat_2: { status: 'generating' },
            beat_3: { status: 'error' },
            beat_4: { status: 'pending' },
        };
        expect(listBeatsWithPendingAudio(items)).toEqual(['beat_2', 'beat_3', 'beat_4']);
        expect(countBeatsWithPendingAudio(items)).toBe(3);
    });

    it('beat chưa từng tạo audio (không có item) không tính', () => {
        expect(countBeatsWithPendingAudio({ beat_1: { status: 'ready' } })).toBe(0);
        expect(countBeatsWithPendingAudio({})).toBe(0);
        expect(countBeatsWithPendingAudio(null)).toBe(0);
        expect(countBeatsWithPendingAudio(undefined)).toBe(0);
    });
});
