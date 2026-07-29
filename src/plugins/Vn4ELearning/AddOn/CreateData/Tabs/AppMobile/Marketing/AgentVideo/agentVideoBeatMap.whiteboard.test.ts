import {
    parseBeatMapJson,
    validateBeatImagePrompt,
    validateBeatMap,
    type BeatMap,
} from './agentVideoBeatMap';

describe('beat map whiteboard image_prompt', () => {
    const baseSection = {
        id: 'beat_1',
        beat_id: 'beat_1',
        startSec: 0,
        endSec: 10,
        durationSec: 10,
        phrase_anchor: 'Hello world example phrase anchor text.',
        visual_description: 'A simple educational diagram showing two nodes exchanging data packets through a visible connection path with clear cause and effect.',
        background: 'Plain white board texture with soft pencil grain and minimal shadow',
    };

    it('accepts image_prompt in schema v2 sections', () => {
        const imagePrompt =
            "Whiteboard marker line art of two computers linked by curved arrows and packet icons with Vietnamese label 'Gói tin', thin black ink on pure white, outline only no fills, simple educational diagram, no watermark";
        const { map, errors } = parseBeatMapJson(JSON.stringify({
            schema_version: 2,
            totalVideoSec: 10,
            sections: [{ ...baseSection, image_prompt: imagePrompt }],
        }), { requireImagePrompt: true });

        expect(errors).toEqual([]);
        expect(map?.sections[0]?.image_prompt).toBe(imagePrompt);
    });

    it('requires image_prompt when whiteboard validation enabled', () => {
        const { map, errors } = parseBeatMapJson(JSON.stringify({
            schema_version: 2,
            totalVideoSec: 10,
            sections: [baseSection],
        }), { requireImagePrompt: true });

        expect(map).toBeNull();
        expect(errors.some((e) => e.includes('image_prompt'))).toBe(true);
    });

    it('validateBeatImagePrompt accepts English with Vietnamese label quotes', () => {
        const prompt =
            "Whiteboard marker line art of a tired person in bed above three outline boxes with Vietnamese labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần' and title '3 NGUYÊN LIỆU', thin black ink on pure white, outline only no fills, no watermark";
        expect(validateBeatImagePrompt(prompt)).toBe(prompt);
    });

    it('validateBeatImagePrompt rejects too-short prompt', () => {
        expect(validateBeatImagePrompt('Too short')).toBeNull();
    });

    it('validateBeatMap enforces image_prompt in whiteboard mode', () => {
        const map: BeatMap = {
            schema_version: 2,
            totalVideoSec: 10,
            sections: [{
                ...baseSection,
                image_prompt: undefined,
            }],
        };
        const result = validateBeatMap(map, 10, { requireImagePrompt: true });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('image_prompt'))).toBe(true);
    });
});
