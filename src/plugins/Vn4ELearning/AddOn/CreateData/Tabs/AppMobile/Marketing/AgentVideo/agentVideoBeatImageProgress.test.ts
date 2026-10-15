import {
    beatImageProgressLabel,
    beatImageProgressSubtitle,
    deriveBeatImageProgress,
} from './agentVideoBeatImageProgress';

describe('deriveBeatImageProgress', () => {
    it('đang chạy beat_image_fill → percent từ current/total', () => {
        const progress = deriveBeatImageProgress({
            progress: { current: 3, total: 12, beatId: 'beat_4', succeeded: 2, failed: [] },
            status: 'processing',
            pipelineStep: 'beat_image_fill',
            pipelineStatus: 'running',
        });
        expect(progress.total).toBe(12);
        expect(progress.completed).toBe(3);
        expect(progress.percent).toBe(25);
        expect(progress.activeBeatId).toBe('beat_4');
        expect(progress.phase).toBe('generating');
        expect(progress.active).toBe(true);
        expect(beatImageProgressLabel(progress)).toContain('3/12 (25%)');
    });

    it('dùng succeeded khi current chưa cập nhật', () => {
        const progress = deriveBeatImageProgress({
            progress: { current: 0, total: 8, succeeded: 2 },
            status: 'queued',
            pipelineStep: 'beat_image_fill',
            pipelineStatus: 'running',
        });
        expect(progress.completed).toBe(2);
        expect(progress.percent).toBe(25);
    });

    it('fallback totalBeats khi progress chưa có total', () => {
        const progress = deriveBeatImageProgress({
            progress: { current: 1, beatId: 'beat_1' },
            status: 'processing',
            pipelineStep: 'beat_image_fill',
            pipelineStatus: 'running',
            totalBeats: 5,
        });
        expect(progress.total).toBe(5);
        expect(progress.percent).toBe(20);
        expect(progress.phase).toBe('generating');
    });

    it('beat lỗi được liệt kê riêng', () => {
        const progress = deriveBeatImageProgress({
            progress: { current: 2, total: 4, failed: ['beat_3'] },
            status: 'processing',
            pipelineStep: 'beat_image_fill',
            pipelineStatus: 'running',
        });
        expect(progress.failed).toEqual(['beat_3']);
        expect(beatImageProgressSubtitle(progress)).toBe('1 beat lỗi');
    });

    it('idle khi không có progress và không chạy', () => {
        const progress = deriveBeatImageProgress({});
        expect(progress.total).toBe(0);
        expect(progress.phase).toBe('idle');
        expect(progress.active).toBe(false);
        expect(beatImageProgressLabel(progress)).toBe('');
    });
});
