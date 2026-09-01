import { buildSentenceBeatMarks, isSentenceEndToken, normalizeManualBeatMarks } from './agentVideoManualBeats';
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
