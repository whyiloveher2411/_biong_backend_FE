import {
    parseBeatMapJson,
    parseBeatVisualChunkJson,
    validateBeatImagePrompt,
    validateBeatMap,
    type BeatMap,
} from './agentVideoBeatMap';

const IMAGE_PROMPT_OBJECT = {
    subject: 'Young adult photorealistic cutout lying in bed beside a large black alarm clock',
    action: 'Exhausted, staring at floating task papers scattered around',
    scene: 'Clean bright bedroom, pure white background, hybrid whiteboard collage',
    text_overlay:
        "'3 NGUYÊN LIỆU' + labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần'",
    composition: 'One clear left-to-right flow, strong hierarchy, bright red accents on 1-2 keywords only',
    must_avoid: 'watermark, logo, dense text blocks, generic placeholders, neon glow UI',
};
const JSON_IMAGE_PROMPT = JSON.stringify(IMAGE_PROMPT_OBJECT);

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

    it('accepts image_prompt JSON object thật trong schema v2 sections', () => {
        const { map, errors } = parseBeatMapJson(JSON.stringify({
            schema_version: 2,
            totalVideoSec: 10,
            sections: [{ ...baseSection, image_prompt: IMAGE_PROMPT_OBJECT }],
        }), { requireImagePrompt: true });

        expect(errors).toEqual([]);
        expect(map?.sections[0]?.image_prompt).toEqual(IMAGE_PROMPT_OBJECT);
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

    it('validateBeatImagePrompt accepts object thật và string escaped cũ', () => {
        expect(validateBeatImagePrompt(IMAGE_PROMPT_OBJECT)).toBe(JSON_IMAGE_PROMPT);
        expect(validateBeatImagePrompt(JSON_IMAGE_PROMPT)).toBe(JSON_IMAGE_PROMPT);
    });

    it('validateBeatImagePrompt rejects plain English text (no JSON anymore)', () => {
        const prompt =
            "High-impact hybrid whiteboard collage of a tired young adult photorealistic cutout lying in bed beside a large black alarm clock, bold Vietnamese headline '3 NGUYÊN LIỆU', labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', thick marker arrows, selective red accents, no watermark";
        expect(validateBeatImagePrompt(prompt)).toBeNull();
    });

    it('validateBeatImagePrompt rejects JSON missing keys', () => {
        const missing = JSON.stringify({
            subject: 's',
            action: 'a',
            scene: 's',
            text_overlay: 't',
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

    it('validateBeatImagePrompt rejects legacy 9-key JSON (purpose/context/mood)', () => {
        const legacy = JSON.stringify({
            purpose: "Visual hook proving the beat's main idea.",
            context: 'A tired young adult lies in bed beside an alarm clock.',
            subject: 'Young adult photorealistic cutout lying in bed beside a large black alarm clock',
            action: 'Exhausted, staring at floating task papers scattered around',
            scene: 'Clean bright bedroom, pure white background, hybrid whiteboard collage',
            text_overlay: "'3 NGUYÊN LIỆU' + labels 'những điều bạn muốn làm'",
            mood: 'Slightly stressful self-help, high thumbnail energy',
            composition: 'One clear left-to-right flow, strong hierarchy, bright red accents on 1-2 keywords only',
            must_avoid: 'watermark, logo, dense text blocks, generic placeholders, neon glow UI',
        }, null, 2);
        expect(validateBeatImagePrompt(legacy)).toBeNull();
    });

    it('validateBeatImagePrompt rejects malformed JSON', () => {
        expect(validateBeatImagePrompt('{"subject": "broken"')).toBeNull();
    });

    it('validateBeatImagePrompt rejects empty field values', () => {
        const emptyValue = JSON.stringify({
            subject: '',
            action: 'a',
            scene: 's',
            text_overlay: 't',
            composition: 'c',
            must_avoid: 'm',
        });
        expect(validateBeatImagePrompt(emptyValue)).toBeNull();
    });

    it('validateBeatImagePrompt rejects over-2000-char prompt', () => {
        const tooLong = JSON.stringify({
            subject: 'x'.repeat(400),
            action: 'x'.repeat(400),
            scene: 'x'.repeat(400),
            text_overlay: 'x'.repeat(400),
            composition: 'x'.repeat(400),
            must_avoid: 'x'.repeat(400),
        });
        expect(validateBeatImagePrompt(tooLong)).toBeNull();
    });

    it('validateBeatImagePrompt rejects single-letter placeholder fields', () => {
        const placeholder = JSON.stringify({
            subject: 'microbe',
            action: 'attacking',
            scene: 'B',
            text_overlay: 'Mục',
            composition: 'C',
            must_avoid: 'M',
        });
        expect(validateBeatImagePrompt(placeholder)).toBeNull();
    });

    it('validateBeatImagePrompt accepts short-but-meaningful fields', () => {
        const ok = JSON.stringify({
            subject: 'microbe cutout attacking rival organism',
            action: 'attacking competing microorganisms',
            scene: 'clean light explainer board',
            text_overlay: 'tiêu diệt vi sinh vật đối thủ',
            composition: 'one clear focal subject with a single arrow',
            must_avoid: 'watermark, logo, dense text, gore',
        });
        expect(validateBeatImagePrompt(ok)).toBe(ok);
    });

    it('validateBeatImagePrompt accepts empty text_overlay (AI bỏ trống vẫn chấp nhận)', () => {
        const ok = JSON.stringify({
            subject: 'microbe cutout attacking rival organism',
            action: 'attacking competing microorganisms',
            scene: 'clean light explainer board',
            text_overlay: '',
            composition: 'one clear focal subject with a single arrow',
            must_avoid: 'watermark, logo, dense text, gore',
        });
        expect(validateBeatImagePrompt(ok)).toBe(ok);
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

    it('parseBeatVisualChunkJson nhận output giai đoạn 2 (id + visual_description + image_prompt)', () => {
        const ok = parseBeatVisualChunkJson(
            '###IMPORT_HTML_BEAT_MAP:RESULT:BEGIN###\n'
            + '{ "sections": [ { "id": "beat_1", "visual_description": "Acetaldehyde damages the DNA strand.", "image_prompt": { "subject": "damaged DNA strand", "action": "strand breaking apart", "scene": "neutral explainer board", "text_overlay": "DNA HỎNG", "composition": "single focal object, clean background", "must_avoid": "watermark, logo, dense text, grid, chart, blood, gore" } } ] }'
            + '\n###IMPORT_HTML_BEAT_MAP:RESULT:END###',
            ['beat_1'],
        );
        expect(ok.errors).toEqual([]);
        expect(ok.imagePrompts.beat_1?.subject).toContain('DNA');
        expect(ok.visualDescriptions.beat_1).toContain('Acetaldehyde');
    });

    it('parseBeatVisualChunkJson báo lỗi thiếu beat / sai id / thiếu visual_description', () => {
        const missing = parseBeatVisualChunkJson(
            '{ "sections": [ { "id": "beat_1", "visual_description": "DNA strand is damaged.", "image_prompt": { "subject": "x", "action": "x", "scene": "x", "text_overlay": "", "composition": "x", "must_avoid": "x" } } ] }',
            ['beat_1', 'beat_2'],
        );
        expect(missing.errors.some((e) => e.includes('beat_2'))).toBe(true);

        const wrongId = parseBeatVisualChunkJson(
            '{ "sections": [ { "id": "beat_9", "visual_description": "DNA strand is damaged.", "image_prompt": { "subject": "x", "action": "x", "scene": "x", "text_overlay": "", "composition": "x", "must_avoid": "x" } } ] }',
            ['beat_1'],
        );
        expect(wrongId.errors.some((e) => e.includes('ngoài danh sách'))).toBe(true);

        const noVisualDescription = parseBeatVisualChunkJson(
            '{ "sections": [ { "id": "beat_1", "image_prompt": { "subject": "x", "action": "x", "scene": "x", "text_overlay": "", "composition": "x", "must_avoid": "x" } } ] }',
            ['beat_1'],
        );
        expect(noVisualDescription.errors.some((e) => e.includes('visual_description'))).toBe(true);

        const noImagePrompt = parseBeatVisualChunkJson(
            '{ "sections": [ { "id": "beat_1", "visual_description": "DNA strand is damaged." } ] }',
            ['beat_1'],
        );
        expect(noImagePrompt.errors.some((e) => e.includes('image_prompt'))).toBe(true);
    });

    it('parseBeatVisualChunkJson chặn image_prompt thiếu key / field ngắn', () => {
        const missingKey = parseBeatVisualChunkJson(
            '{ "sections": [ { "id": "beat_1", "visual_description": "DNA strand is damaged.", "image_prompt": { "subject": "x", "action": "x", "scene": "x", "text_overlay": "", "composition": "x" } } ] }',
            ['beat_1'],
        );
        expect(missingKey.errors.some((e) => e.includes('thiếu key: must_avoid'))).toBe(true);

        const extraKey = parseBeatVisualChunkJson(
            '{ "sections": [ { "id": "beat_1", "visual_description": "DNA strand is damaged.", "image_prompt": { "subject": "damaged DNA", "action": "breaking", "scene": "layered editorial", "text_overlay": "", "composition": "hierarchy", "must_avoid": "watermark", "style": "vox" } } ] }',
            ['beat_1'],
        );
        expect(extraKey.errors.some((e) => e.includes('key thừa'))).toBe(true);

        const shortField = parseBeatVisualChunkJson(
            '{ "sections": [ { "id": "beat_1", "visual_description": "DNA strand is damaged.", "image_prompt": { "subject": "x", "action": "breaking", "scene": "layered editorial", "text_overlay": "", "composition": "hierarchy", "must_avoid": "watermark" } } ] }',
            ['beat_1'],
        );
        expect(shortField.errors.some((e) => e.includes('subject'))).toBe(true);
    });
});
