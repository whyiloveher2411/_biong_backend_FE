import { analyzeImportJson } from './ShortVideoAgentBeatDivisionManualDrawer';
import {
    isWhiteboardObjectLayerPromptKey,
    whiteboardMultiLayerOutputRule,
    whiteboardObjectLayerCountFromPrompt,
    whiteboardObjectLayerPromptKey,
    whiteboardOutputRuleForPrompt,
    whiteboardSafeAreaRuleForPrompt,
} from './agentVideoBeatDivisionWhiteboard';

describe('analyzeImportJson — JSON chia beat nhiều ảnh', () => {
    const validBeat = {
        content: 'câu một. câu hai.',
        image_prompts: [
            { content: 'câu một.', image_prompt: 'mô tả ảnh 1' },
            { content: 'câu hai.', image_prompt: 'mô tả ảnh 2' },
        ],
        background_prompt: 'nền dùng chung',
    };

    it('đọc được số beat và tổng số ảnh', () => {
        const result = analyzeImportJson(JSON.stringify([validBeat, validBeat]));
        expect(result.errors).toEqual([]);
        expect(result.beatCount).toBe(2);
        expect(result.imageCount).toBe(4);
    });

    it('nhận JSON bọc code fence và object { beats: [...] }', () => {
        const result = analyzeImportJson('```json\n' + JSON.stringify({ beats: [validBeat] }) + '\n```');
        expect(result.errors).toEqual([]);
        expect(result.beatCount).toBe(1);
    });

    it('không giới hạn số ảnh trong 1 beat', () => {
        const manyLayers = {
            ...validBeat,
            image_prompts: Array.from({ length: 9 }, (_, i) => ({
                content: `câu ${i + 1}`,
                image_prompt: `mô tả ảnh ${i + 1}`,
            })),
        };
        const result = analyzeImportJson(JSON.stringify([manyLayers]));
        expect(result.errors).toEqual([]);
        expect(result.imageCount).toBe(9);
    });

    it('báo lỗi khi thiếu image_prompts[] (JSON dạng cũ)', () => {
        const result = analyzeImportJson(
            JSON.stringify([{ content: 'a', image_prompt: 'b', background_prompt: 'c' }]),
        );
        expect(result.errors.some((err) => err.includes('image_prompts[]'))).toBe(true);
    });

    it('báo lỗi khi thiếu background_prompt', () => {
        const { background_prompt: _omitted, ...noBackground } = validBeat;
        const result = analyzeImportJson(JSON.stringify([noBackground]));
        expect(result.errors.some((err) => err.includes('background_prompt'))).toBe(true);
    });

    it('báo lỗi từng ảnh thiếu content hoặc image_prompt', () => {
        const result = analyzeImportJson(
            JSON.stringify([
                {
                    ...validBeat,
                    image_prompts: [{ content: '', image_prompt: 'x' }, { content: 'y', image_prompt: '' }],
                },
            ]),
        );
        expect(result.errors).toContain('Beat #1 ảnh #1: thiếu content');
        expect(result.errors).toContain('Beat #1 ảnh #2: thiếu image_prompt');
    });
});

describe('object_prompt_N — không giới hạn số lớp', () => {
    it('sinh key theo chỉ số lớp', () => {
        expect(whiteboardObjectLayerPromptKey(1)).toBe('object_prompt_2');
        expect(whiteboardObjectLayerPromptKey(8)).toBe('object_prompt_9');
    });

    it('nhận mọi object_prompt_N với N >= 2', () => {
        expect(isWhiteboardObjectLayerPromptKey('object_prompt_2')).toBe(true);
        expect(isWhiteboardObjectLayerPromptKey('object_prompt_12')).toBe(true);
        expect(isWhiteboardObjectLayerPromptKey('object_prompt_1')).toBe(false);
        expect(isWhiteboardObjectLayerPromptKey('subject')).toBe(false);
    });

    it('đếm lớp bỏ qua key rỗng', () => {
        expect(
            whiteboardObjectLayerCountFromPrompt({
                subject: 's',
                object_prompt_2: 'l2',
                object_prompt_3: '  ',
            }),
        ).toBe(2);
    });

    it('rule output yêu cầu N + 1 ảnh và map tới lớp cuối', () => {
        const rule = whiteboardMultiLayerOutputRule(5);
        expect(rule).toContain('OUTPUT EXACTLY 6 SEPARATE IMAGES');
        expect(rule).toContain('IMAGE 5 follows "object_prompt_5"');
        expect(rule).toContain('IMAGE 6 (background layer)');
    });

    it('prompt gửi sang extension chọn rule theo số lớp thật', () => {
        expect(
            whiteboardOutputRuleForPrompt({ subject: 's', object_prompt_2: 'l2', object_prompt_3: 'l3' }),
        ).toContain('OUTPUT EXACTLY 4 SEPARATE IMAGES');
        expect(whiteboardOutputRuleForPrompt({ subject: 's' })).toContain('OUTPUT EXACTLY 2 SEPARATE IMAGES');
    });

    it('safe_area nói đúng số ảnh của beat', () => {
        expect(
            whiteboardSafeAreaRuleForPrompt({ subject: 's', object_prompt_2: 'l2' }),
        ).toContain('applies to ALL 3 images');
        expect(whiteboardSafeAreaRuleForPrompt({ subject: 's' })).toContain('applies to BOTH images');
    });
});
