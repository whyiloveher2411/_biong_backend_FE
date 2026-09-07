import { buildBeatMapFromManualMarks, buildSentenceBeatMarks, isSentenceEndToken, normalizeManualBeatMarks, parseBeatListText } from './agentVideoManualBeats';
import { CaptionAlignToken } from './agentVideoCaptionScriptAlign';

function token(index: number, text: string): CaptionAlignToken {
    return {
        index,
        text,
        start: index,
        end: index + 1,
        matchType: 'exact',
        tier: 'green',
    };
}

describe('isSentenceEndToken', () => {
    it('nhận dấu kết câu ở cuối từ', () => {
        expect(isSentenceEndToken('rồi.')).toBe(true);
        expect(isSentenceEndToken('sao?')).toBe(true);
        expect(isSentenceEndToken('nhé!')).toBe(true);
        expect(isSentenceEndToken('xong."')).toBe(true);
    });

    it('bỏ qua dấu lửng và số', () => {
        expect(isSentenceEndToken('ừm...')).toBe(false);
        expect(isSentenceEndToken('ờ…')).toBe(false);
        expect(isSentenceEndToken('1.')).toBe(false);
        expect(isSentenceEndToken('3.5')).toBe(false);
        expect(isSentenceEndToken('1.000')).toBe(false);
        expect(isSentenceEndToken('T.')).toBe(false);
        expect(isSentenceEndToken('bình thường')).toBe(false);
    });
});

describe('buildSentenceBeatMarks', () => {
    it('tách beat theo từng câu', () => {
        const tokens = ['tôi', 'đi', 'học.', 'bạn', 'ở', 'nhà.'].map((text, i) => token(i, text));
        const marks = buildSentenceBeatMarks(tokens, []);

        expect(marks).toHaveLength(2);
        expect(marks[0].content).toBe('tôi đi học.');
        expect(marks[1].content).toBe('bạn ở nhà.');
    });

    it('không đụng vào vùng đã thuộc beat khác', () => {
        const tokens = ['một', 'hai.', 'ba', 'bốn.'].map((text, i) => token(i, text));
        const existing = normalizeManualBeatMarks([
            { startTokenIndex: 0, endTokenIndex: 1, content: 'một hai.', startSec: 0, endSec: 2 },
        ]);

        const marks = buildSentenceBeatMarks(tokens, existing);

        expect(marks).toHaveLength(1);
        expect(marks[0].content).toBe('ba bốn.');
    });

    it('gom phần đuôi không có dấu chấm thành 1 beat', () => {
        const tokens = ['xin', 'chào.', 'còn', 'nữa'].map((text, i) => token(i, text));
        const marks = buildSentenceBeatMarks(tokens, []);

        expect(marks.map((mark) => mark.content)).toEqual(['xin chào.', 'còn nữa']);
    });
});

describe('parseBeatListText', () => {
    it('mỗi dòng = 1 beat, bỏ số thứ tự và dòng trống', () => {
        const beats = parseBeatListText(
            '1. Try to imagine a morning more than one hundred thousand years ago.\n'
            + '2) The sun has just risen beyond the rock wall.\n'
            + "3: Inside the cave, last night's fire has burned down to a few red coals.\n"
            + '\n',
        );

        expect(beats).toEqual([
            'Try to imagine a morning more than one hundred thousand years ago.',
            'The sun has just risen beyond the rock wall.',
            "Inside the cave, last night's fire has burned down to a few red coals.",
        ]);
    });

    it('hỗ trợ bullet và dòng không số thứ tự, giữ số thập phân', () => {
        const beats = parseBeatListText(
            '- Dòng bullet.\n'
            + '* Dòng sao.\n'
            + 'Dòng không đánh số.\n'
            + '12.5 degrees vẫn nguyên vẹn.\n',
        );

        expect(beats).toEqual([
            'Dòng bullet.',
            'Dòng sao.',
            'Dòng không đánh số.',
            '12.5 degrees vẫn nguyên vẹn.',
        ]);
    });

    it('text rỗng hoặc toàn dòng trống → rỗng', () => {
        expect(parseBeatListText('')).toEqual([]);
        expect(parseBeatListText('   \n  \n')).toEqual([]);
    });
});

describe('buildBeatMapFromManualMarks — timing tạm', () => {
    const zeroMarks = [
        { startTokenIndex: 0, endTokenIndex: 2, content: 'một hai ba.', startSec: 0, endSec: 0 },
        { startTokenIndex: 3, endTokenIndex: 4, content: 'bốn năm.', startSec: 0, endSec: 0 },
        { startTokenIndex: 5, endTokenIndex: 6, content: 'sáu.', startSec: 0, endSec: 0 },
    ];

    it('timing 0 → tự sinh timing tạm liên tục, endSec > startSec, total > 0', () => {
        const beatMap = buildBeatMapFromManualMarks(normalizeManualBeatMarks(zeroMarks), 0);
        if (!beatMap) {
            throw new Error('beatMap phải được build từ marks');
        }
        expect(beatMap.totalVideoSec).toBeGreaterThan(0);
        let cursor = 0;
        beatMap.sections.forEach((section) => {
            expect(section.startSec).toBeCloseTo(cursor, 2);
            expect(section.endSec).toBeGreaterThan(section.startSec);
            expect(section.durationSec).toBeCloseTo(section.endSec - section.startSec, 2);
            cursor = section.endSec;
        });
        expect(beatMap.sections[beatMap.sections.length - 1].endSec).toBeCloseTo(beatMap.totalVideoSec, 2);
    });

    it('timing thật (endSec > startSec) giữ nguyên, không đè timing tạm', () => {
        const realMarks = normalizeManualBeatMarks([
            { startTokenIndex: 0, endTokenIndex: 2, content: 'một hai ba.', startSec: 0, endSec: 2 },
            { startTokenIndex: 3, endTokenIndex: 4, content: 'bốn năm.', startSec: 2, endSec: 4 },
            { startTokenIndex: 5, endTokenIndex: 6, content: 'sáu.', startSec: 4, endSec: 6 },
        ]);
        const beatMap = buildBeatMapFromManualMarks(realMarks, 0);
        if (!beatMap) {
            throw new Error('beatMap phải được build từ marks');
        }
        expect(beatMap.sections.map((s) => [s.startSec, s.endSec])).toEqual([[0, 2], [2, 4], [4, 6]]);
        expect(beatMap.totalVideoSec).toBe(6);
    });

    it('tỉ lệ timing tạm theo số từ: beat nhiều từ dài hơn beat ít từ', () => {
        const beatMap = buildBeatMapFromManualMarks(normalizeManualBeatMarks(zeroMarks), 0);
        if (!beatMap) {
            throw new Error('beatMap phải được build từ marks');
        }
        const durations = beatMap.sections.map((section) => section.durationSec);
        expect(durations[0]).toBeGreaterThan(durations[2]);
    });
});
