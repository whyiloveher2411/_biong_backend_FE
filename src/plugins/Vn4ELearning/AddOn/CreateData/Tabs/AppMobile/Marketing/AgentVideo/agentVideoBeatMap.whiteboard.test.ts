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
            "High-impact hybrid whiteboard collage of two computers as photorealistic cutouts linked by thick black marker arrows with Vietnamese label 'Gói tin', selective red accents, strong hierarchy, pure white background, no watermark";
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
            "High-impact hybrid whiteboard collage of a tired young adult photorealistic cutout lying in bed beside a large black alarm clock, bold Vietnamese headline '3 NGUYÊN LIỆU', labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', thick marker arrows, selective red accents, no watermark";
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
