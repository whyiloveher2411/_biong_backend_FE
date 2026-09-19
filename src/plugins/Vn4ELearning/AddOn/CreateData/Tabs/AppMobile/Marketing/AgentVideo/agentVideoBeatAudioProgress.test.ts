import {
    beatAudioProgressLabel,
    beatAudioProgressSubtitle,
    deriveBeatAudioProgress,
} from './agentVideoBeatAudioProgress';
import type { AgentVideoBeatAudioItem } from './agentVideoApi';

function item(
    order: number,
    status: string,
    markId = `mark_${order}`,
): AgentVideoBeatAudioItem {
    return {
        mark_id: markId,
        order,
        status,
        source: 'tts',
        duration_sec: 0,
    };
}

describe('deriveBeatAudioProgress', () => {
    it('đang chạy beat_audio → active beat generating + đếm ready', () => {
        const progress = deriveBeatAudioProgress({
            items: [
                item(1, 'ready'),
                item(2, 'generating'),
                item(3, 'pending'),
            ],
            totalBeats: 3,
            pipelineStep: 'beat_audio',
            pipelineStatus: 'running',
        });
        expect(progress.total).toBe(3);
        expect(progress.completed).toBe(1);
        expect(progress.percent).toBe(33);
        expect(progress.activeBeatId).toBe('beat_2');
        expect(progress.phase).toBe('generating');
        expect(progress.active).toBe(true);
    });

    it('tất cả ready khi beat_audio đang chạy → phase ghép audio', () => {
        const progress = deriveBeatAudioProgress({
            items: [item(1, 'ready'), item(2, 'ready')],
            totalBeats: 2,
            pipelineStep: 'beat_audio',
            pipelineStatus: 'running',
        });
        expect(progress.phase).toBe('merging');
        expect(progress.percent).toBe(100);
        expect(beatAudioProgressLabel(progress)).toContain('Ghép audio');
    });

    it('chưa có item nhưng biết tổng beat → suy ra beat kế tiếp', () => {
        const progress = deriveBeatAudioProgress({
            items: [],
            totalBeats: 5,
            pipelineStep: 'beat_audio',
            pipelineStatus: 'running',
        });
        expect(progress.total).toBe(5);
        expect(progress.phase).toBe('generating');
        expect(progress.activeBeatId).toBe('beat_1');
        expect(progress.active).toBe(true);
    });

    it('dùng queue.progress khi items chưa cập nhật', () => {
        const progress = deriveBeatAudioProgress({
            items: [],
            stateTotal: 8,
            stateReady: 3,
            queueProgress: { current: 3, total: 8, beat_id: 'beat_4', succeeded: 3, failed: [] },
            pipelineStep: 'beat_audio',
            pipelineStatus: 'running',
        });
        expect(progress.total).toBe(8);
        expect(progress.completed).toBe(3);
        expect(progress.activeBeatId).toBe('beat_4');
        expect(progress.phase).toBe('generating');
        expect(progress.percent).toBe(38);
    });

    it('item lỗi được liệt kê riêng', () => {
        const progress = deriveBeatAudioProgress({
            items: [item(1, 'ready'), item(2, 'error')],
            totalBeats: 2,
            pipelineStep: 'beat_audio',
            pipelineStatus: 'running',
        });
        expect(progress.failed).toEqual(['beat_2']);
        expect(progress.phase).toBe('generating');
        expect(beatAudioProgressSubtitle(progress)).toBe('1 beat lỗi');
    });

    it('idle khi không có item và không chạy', () => {
        const progress = deriveBeatAudioProgress({});
        expect(progress.total).toBe(0);
        expect(progress.phase).toBe('idle');
        expect(progress.active).toBe(false);
        expect(beatAudioProgressLabel(progress)).toBe('');
    });
});
