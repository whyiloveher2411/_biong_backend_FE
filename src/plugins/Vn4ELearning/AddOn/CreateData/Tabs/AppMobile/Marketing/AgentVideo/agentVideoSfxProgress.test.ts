import {
    deriveSfxProgress,
    sfxProgressLabel,
    sfxProgressSubtitle,
} from './agentVideoSfxProgress';
import type { AgentVideoSfxCue } from './agentVideoApi';

function cue(cueId: string, beatId: string, status: string): AgentVideoSfxCue {
    return { cue_id: cueId, beat_id: beatId, status };
}

describe('deriveSfxProgress', () => {
    it('đang chạy sfx → đếm ready/skipped, active cue còn pending', () => {
        const progress = deriveSfxProgress({
            summary: {
                cue_count: 4,
                ready_count: 1,
                skipped_count: 1,
                items: [
                    cue('cue_1', 'beat_1', 'ready'),
                    cue('cue_2', 'beat_2', 'skipped'),
                    cue('cue_3', 'beat_3', 'generating'),
                    cue('cue_4', 'beat_4', 'pending'),
                ],
            },
            pipelineStep: 'sfx',
            pipelineStatus: 'running',
        });
        expect(progress.total).toBe(4);
        expect(progress.completed).toBe(2);
        expect(progress.percent).toBe(50);
        expect(progress.activeCueId).toBe('beat_3');
        expect(progress.phase).toBe('generating');
        expect(progress.active).toBe(true);
        expect(sfxProgressLabel(progress)).toContain('2/4 (50%)');
    });

    it('tất cả cue xong khi sfx chạy → 100% nhưng vẫn active', () => {
        const progress = deriveSfxProgress({
            summary: {
                cue_count: 2,
                ready_count: 1,
                skipped_count: 1,
                items: [cue('cue_1', 'beat_1', 'ready'), cue('cue_2', 'beat_2', 'skipped')],
            },
            pipelineStep: 'sfx',
            pipelineStatus: 'running',
        });
        expect(progress.percent).toBe(100);
        expect(progress.phase).toBe('generating');
        expect(progress.active).toBe(true);
    });

    it('dùng cue_count để làm mẫu số khi items chưa cập nhật', () => {
        const progress = deriveSfxProgress({
            summary: { cue_count: 6, ready_count: 2 },
            pipelineStep: 'sfx',
            pipelineStatus: 'running',
        });
        expect(progress.total).toBe(6);
        expect(progress.completed).toBe(2);
        expect(progress.percent).toBe(33);
        expect(progress.phase).toBe('generating');
    });

    it('cue lỗi được liệt kê riêng', () => {
        const progress = deriveSfxProgress({
            summary: {
                cue_count: 2,
                ready_count: 1,
                error_count: 1,
                items: [cue('cue_1', 'beat_1', 'ready'), cue('cue_2', 'beat_2', 'error')],
            },
            pipelineStep: 'sfx',
            pipelineStatus: 'running',
        });
        expect(progress.failed).toEqual(['beat_2']);
        expect(sfxProgressSubtitle(progress)).toBe('1 cue lỗi');
    });

    it('idle khi không có cue và không chạy', () => {
        const progress = deriveSfxProgress({});
        expect(progress.total).toBe(0);
        expect(progress.phase).toBe('idle');
        expect(progress.active).toBe(false);
        expect(sfxProgressLabel(progress)).toBe('');
    });
});
