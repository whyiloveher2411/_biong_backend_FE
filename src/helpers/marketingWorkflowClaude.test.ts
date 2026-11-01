import { ajax } from 'hook/useApi';
import { startDeepseekStep2Chunk } from './marketingDeepseekVideoImage';

jest.mock('hook/useApi', () => ({ ajax: jest.fn() }));

test.each(['claude', 'deepseek'] as const)('visual chunk sends %s with the exact partial-import range', async (provider) => {
    (ajax as jest.Mock).mockResolvedValue({ success: true });
    await startDeepseekStep2Chunk({ shortVideoId: 67, index: 0, startOrder: 1, beatCount: 20, prompt: 'Exact resolved prompt', provider });
    expect(ajax).toHaveBeenLastCalledWith(expect.objectContaining({
        data: expect.objectContaining({ short_video_id: 67, index: 0, start_order: 1, beat_count: 20, prompt: 'Exact resolved prompt', provider }),
    }));
});
