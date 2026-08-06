import {
    parseBeatMapJson,
    validateBeatImagePrompt,
    validateBeatMap,
    type BeatMap,
} from './agentVideoBeatMap';

const JSON_IMAGE_PROMPT = JSON.stringify({
    purpose: "Visual hook proving the beat's main idea: the 3-ingredient rule for handling unwanted tasks.",
    context: 'A tired young adult lies in bed at dawn beside a loud black alarm clock; narration lists three task groups to handle.',
    subject: 'Young adult photorealistic cutout lying in bed beside a large black alarm clock',
    action: 'Exhausted, staring at floating task papers scattered around',
    scene: 'Clean bright bedroom, pure white background, hybrid whiteboard collage',
    text_overlay:
        "'3 NGUYÊN LIỆU' + labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần'",
    mood: 'Slightly stressful self-help, high thumbnail energy',
    composition: 'One clear left-to-right flow, strong hierarchy, bright red accents on 1-2 keywords only',
    must_avoid: 'watermark, logo, dense text blocks, generic placeholders, neon glow UI',
}, null, 2);

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

    it('accepts image_prompt JSON object in schema v2 sections', () => {
        const { map, errors } = parseBeatMapJson(JSON.stringify({
            schema_version: 2,
            totalVideoSec: 10,
            sections: [{ ...baseSection, image_prompt: JSON_IMAGE_PROMPT }],
        }), { requireImagePrompt: true });

        expect(errors).toEqual([]);
        expect(map?.sections[0]?.image_prompt).toBe(JSON_IMAGE_PROMPT);
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

    it('validateBeatImagePrompt accepts full 9-key JSON with Vietnamese label quotes', () => {
        expect(validateBeatImagePrompt(JSON_IMAGE_PROMPT)).toBe(JSON_IMAGE_PROMPT);
    });

    it('validateBeatImagePrompt rejects plain English text (no JSON anymore)', () => {
        const prompt =
            "High-impact hybrid whiteboard collage of a tired young adult photorealistic cutout lying in bed beside a large black alarm clock, bold Vietnamese headline '3 NGUYÊN LIỆU', labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', thick marker arrows, selective red accents, no watermark";
        expect(validateBeatImagePrompt(prompt)).toBeNull();
    });

    it('validateBeatImagePrompt rejects JSON missing keys', () => {
        const missing = JSON.stringify({
            purpose: 'p',
            context: 'c',
            subject: 's',
            action: 'a',
            scene: 's',
            text_overlay: 't',
            mood: 'm',
            composition: 'c',
        });
        expect(validateBeatImagePrompt(missing)).toBeNull();
    });

    it('validateBeatImagePrompt rejects JSON with extra keys', () => {
        const extra = JSON.stringify({
            ...JSON.parse(JSON_IMAGE_PROMPT),
            extra_key: 'nope',
        });
        expect(validateBeatImagePrompt(extra)).toBeNull();
    });

    it('validateBeatImagePrompt rejects malformed JSON', () => {
        expect(validateBeatImagePrompt('{"purpose": "broken"')).toBeNull();
    });

    it('validateBeatImagePrompt rejects empty field values', () => {
        const emptyValue = JSON.stringify({
            purpose: '',
            context: 'c',
            subject: 's',
            action: 'a',
            scene: 's',
            text_overlay: 't',
            mood: 'm',
            composition: 'c',
            must_avoid: 'm',
        });
        expect(validateBeatImagePrompt(emptyValue)).toBeNull();
    });

    it('validateBeatImagePrompt rejects over-2000-char prompt', () => {
        const tooLong = JSON.stringify({
            purpose: 'x'.repeat(300),
            context: 'x'.repeat(300),
            subject: 'x'.repeat(300),
            action: 'x'.repeat(300),
            scene: 'x'.repeat(300),
            text_overlay: 'x'.repeat(300),
            mood: 'x'.repeat(300),
            composition: 'x'.repeat(300),
            must_avoid: 'x'.repeat(300),
        });
        expect(validateBeatImagePrompt(tooLong)).toBeNull();
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
