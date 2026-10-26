import fs from 'fs';
import path from 'path';
import { fireEvent, screen, waitFor } from '@testing-library/react';

const source = fs.readFileSync(path.resolve(process.cwd(), '../_biong_backend/resources/views/plugins/vn4-e-learning/inc/marketing-ai/scripts/deepseek-video-image-session.mjs'), 'utf8');
const overlay = source.slice(source.indexOf('function installControlOverlay(config)'), source.indexOf('\nasync function main()'));
const install = new Function('config', `${overlay}; return installControlOverlay(config);`);
const bridge = jest.fn();
beforeEach(() => {
    jest.useFakeTimers();
    delete (window as any).__deepseekViOverlayInstalled;
    (window as any).__deepseekViBridge = bridge;
    bridge.mockReset().mockResolvedValue({ success: true, message: 'Đã gửi' });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); document.body.innerHTML = ''; });

test('real headless overlay lists editorial actions in the right order before beat splitting', async () => {
    install({ shortVideoId: 67, updateBox: ['title', 'audio', 'idea-thumbnail'], prompts: { generate: 'draft', review_story: 'story edit', review_language: 'spoken edit', beat: 'beats', translate: 'translation' } });
    const ordered = screen.getAllByRole('button').map((b) => b.textContent).filter((s) => /^\d\./.test(s || ''));
    expect(ordered.map((s) => s?.slice(0, 2))).toEqual(['1.', '2.', '3.', '4.', '5.', '6.']);
    fireEvent.click(screen.getByText('2. Rà soát và biên tập kịch bản'));
    await waitFor(() => expect(bridge).toHaveBeenCalledWith('review_story'));
    expect(screen.getByText('3. Biên tập lời kể (sau bước 2)')).toBeTruthy();
    fireEvent.click(screen.getByText('4. Dán/lưu JSON giọng đã có ở bước 3'));
    expect(bridge).not.toHaveBeenCalledWith('voice_manifest');
    const textarea = screen.getByPlaceholderText('{"voices":[{"id":"giong-dan-truyen","description":"Mô tả giọng của ai"}]}');
    fireEvent.change(textarea, { target: { value: '{"voices":[]}' } });
    fireEvent.click(screen.getByText('Lưu danh sách giọng JSON'));
    await waitFor(() => expect(bridge).toHaveBeenCalledWith('save_voice_manifest', { text: '{"voices":[]}' }));
});
