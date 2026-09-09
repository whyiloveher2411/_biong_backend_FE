import {
    joinPlainImagePromptSections,
    splitPlainImagePromptSections,
} from './agentVideoManualBeats';

describe('splitPlainImagePromptSections', () => {
    it('tách các SECTION IN HOA thành từng mục', () => {
        const plain = [
            'SCRIPT SENTENCE:',
            'A morning one hundred thousand years ago.',
            '',
            'IMAGE PROMPT:',
            'Cave entrance at dawn, warm light.',
            '',
            'NEGATIVE PROMPT:',
            'No modern objects.',
        ].join('\n');
        const sections = splitPlainImagePromptSections(plain);
        expect(sections.map((s) => s.key)).toEqual(['SCRIPT SENTENCE', 'IMAGE PROMPT', 'NEGATIVE PROMPT']);
        expect(sections[0].value).toBe('A morning one hundred thousand years ago.');
        expect(sections[1].value).toBe('Cave entrance at dawn, warm light.');
        expect(sections[2].value).toBe('No modern objects.');
    });

    it('văn bản trước section đầu tiên gom vào mục ẩn danh (key "")', () => {
        const sections = splitPlainImagePromptSections('Lead-in text\n\nIMAGE PROMPT:\nBody');
        expect(sections).toHaveLength(2);
        expect(sections[0]).toEqual({ key: '', value: 'Lead-in text' });
        expect(sections[1]).toEqual({ key: 'IMAGE PROMPT', value: 'Body' });
    });

    it('tự thêm field mới (mục lạ, không whitelist) — cơ chế auto-add field', () => {
        const plain = 'IMAGE PROMPT:\nBody\n\nNEW FIELD LATER:\nExtra value';
        const sections = splitPlainImagePromptSections(plain);
        expect(sections.map((s) => s.key)).toContain('NEW FIELD LATER');
        expect(sections[1].value).toBe('Extra value');
    });

    it('tách được field có dấu ngoặc trong tên (CHARACTER ID(S))', () => {
        const plain = [
            'CHARACTER USED:',
            'No',
            '',
            'CHARACTER ID(S):',
            'None',
            '',
            'IMAGE PROMPT:',
            'Body',
        ].join('\n');
        const sections = splitPlainImagePromptSections(plain);
        expect(sections.map((s) => s.key)).toEqual(['CHARACTER USED', 'CHARACTER ID(S)', 'IMAGE PROMPT']);
        expect(sections[0].value).toBe('No');
        expect(sections[1].value).toBe('None');
        expect(sections[2].value).toBe('Body');
    });

    it('không coi dòng "If YES:" hay text thường là section (chỉ IN HOA)', () => {
        const plain = [
            'IMAGE PROMPT:',
            'If YES: keep character.',
            'Normal sentence here.',
        ].join('\n');
        const sections = splitPlainImagePromptSections(plain);
        expect(sections).toHaveLength(1);
        expect(sections[0].value).toContain('If YES: keep character.');
        expect(sections[0].value).toContain('Normal sentence here.');
    });

    it('prompt rỗng/trống → rỗng', () => {
        expect(splitPlainImagePromptSections('')).toEqual([]);
        expect(splitPlainImagePromptSections('   \n  ')).toEqual([]);
    });
});

describe('joinPlainImagePromptSections', () => {
    it('round-trip giữ nguyên cấu trúc section', () => {
        const plain = 'IMAGE PROMPT:\nCave at dawn.\n\nNEGATIVE PROMPT:\nNo modern objects.';
        const sections = splitPlainImagePromptSections(plain);
        expect(joinPlainImagePromptSections(sections)).toBe(plain);
    });

    it('ghép section mới thêm đúng vị trí', () => {
        const joined = joinPlainImagePromptSections([
            { key: 'IMAGE PROMPT', value: 'Cave at dawn.' },
            { key: 'NEW FIELD LATER', value: 'Extra value' },
        ]);
        expect(joined).toBe('IMAGE PROMPT:\nCave at dawn.\n\nNEW FIELD LATER:\nExtra value');
    });

    it('section có tên giữ lại kể cả value rỗng; mục ẩn danh rỗng bị bỏ', () => {
        const joined = joinPlainImagePromptSections([
            { key: 'IMAGE PROMPT', value: 'Cave at dawn.' },
            { key: 'NEGATIVE PROMPT', value: '' },
        ]);
        expect(joined).toBe('IMAGE PROMPT:\nCave at dawn.\n\nNEGATIVE PROMPT:');
        expect(joinPlainImagePromptSections([
            { key: '', value: '   ' },
            { key: 'IMAGE PROMPT', value: 'Cave at dawn.' },
        ])).toBe('IMAGE PROMPT:\nCave at dawn.');
    });
});
