import { buildBeatTranslationListText } from './agentVideoBeatTranslation';
import type { ManualBeatMark } from './agentVideoManualBeats';

function mark(order: number, content: string): ManualBeatMark {
    return {
        id: `mark-${order}`,
        order,
        startTokenIndex: order * 10,
        endTokenIndex: order * 10 + 9,
        content,
        imagePrompt: '',
        startSec: order,
        endSec: order + 2,
        durationSec: 2,
    };
}

describe('buildBeatTranslationListText', () => {
    it('mỗi dòng là bản dịch đúng thứ tự beat', () => {
        const marks = [mark(1, 'hello world'), mark(2, 'second beat')];
        expect(buildBeatTranslationListText(marks, {
            '1': 'xin chào thế giới',
            '2': 'beat thứ hai',
        })).toBe('xin chào thế giới\nbeat thứ hai');
    });

    it('beat chưa dịch giữ nguyên văn kèm tiền tố để không lệch dòng', () => {
        const marks = [mark(1, 'hello world'), mark(2, 'second beat')];
        expect(buildBeatTranslationListText(marks, {
            '1': 'xin chào thế giới',
        })).toBe('xin chào thế giới\n[chưa dịch] second beat');
    });

    it('bỏ khoảng trắng thừa và bỏ qua bản dịch rỗng', () => {
        const marks = [mark(1, 'hello world'), mark(2, 'second beat')];
        expect(buildBeatTranslationListText(marks, {
            '1': '  xin chào  ',
            '2': '   ',
        })).toBe('xin chào\n[chưa dịch] second beat');
    });
});
