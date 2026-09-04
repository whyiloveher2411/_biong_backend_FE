import {
    normalizeManualBeatMarks,
    resolveVideo2sPlainImagePrompt,
    type ManualBeatMark,
} from './agentVideoManualBeats';

function mark(overrides: Partial<ManualBeatMark>): Record<string, unknown> {
    return {
        id: overrides.id || '',
        order: overrides.order || 1,
        startTokenIndex: overrides.startTokenIndex ?? 0,
        endTokenIndex: overrides.endTokenIndex ?? 1,
        content: overrides.content ?? '',
        image_prompt: overrides.imagePrompt ?? '',
        startSec: overrides.startSec ?? 0,
        endSec: overrides.endSec ?? 2,
        durationSec: overrides.durationSec ?? 2,
    };
}

describe('resolveVideo2sPlainImagePrompt', () => {
    const marks = normalizeManualBeatMarks([
        mark({ id: 'm1', order: 1, imagePrompt: 'PLAIN PROMPT A' }),
        mark({ id: 'm2', order: 2, startTokenIndex: 2, endTokenIndex: 3, imagePrompt: 'PLAIN PROMPT B' }),
    ]);

    it('maps beat_N → NGUYÊN VĂN image_prompt string của mark thứ N', () => {
        expect(resolveVideo2sPlainImagePrompt(marks, 'beat_1')).toBe('PLAIN PROMPT A');
        expect(resolveVideo2sPlainImagePrompt(marks, 'beat_2')).toBe('PLAIN PROMPT B');
    });

    it('trả rỗng cho beat chưa có / beat_id lạ', () => {
        expect(resolveVideo2sPlainImagePrompt(marks, 'beat_99')).toBe('');
        expect(resolveVideo2sPlainImagePrompt(marks, '')).toBe('');
        expect(resolveVideo2sPlainImagePrompt(marks, 'section-1')).toBe('');
        expect(resolveVideo2sPlainImagePrompt([], 'beat_1')).toBe('');
    });

    it('không trả JSON beat_map — prompt phải là string plain', () => {
        const prompt = resolveVideo2sPlainImagePrompt(marks, 'beat_1');
        expect(prompt).not.toMatch(/^\s*\{/);
        expect(() => JSON.parse(prompt)).toThrow();
    });
});
