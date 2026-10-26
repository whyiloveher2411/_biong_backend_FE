import React from 'react';
import { render, screen, act } from '@testing-library/react';
import BeatVoiceSummary from './BeatVoiceSummary';
import { saydiVoiceCastRequest } from './agentVideoApi';

jest.mock('./agentVideoApi', () => ({ saydiVoiceCastRequest: jest.fn() }));
const request = saydiVoiceCastRequest as jest.Mock;
const roles = { narrator: {}, rosa: {}, daniel: {} };
const rosa = { id: 'rosa', name: 'Rosa', description: 'Người chủ tiệm', voice_sample: 'sample-f' };
const narrator = { id: 'narrator', name: 'Người dẫn', description: 'Giọng ngoài hình', voice_sample: '' };
beforeEach(() => request.mockReset());

test('shows actual speaking roles including narrator; maintains distinct video-wide colors across beats', async () => {
    request.mockResolvedValueOnce({ success: true, config: { speakers: roles }, beat_voices: [narrator, rosa] })
        .mockResolvedValueOnce({ success: true, config: { speakers: roles }, beat_voices: [rosa] });
    const view = render(<BeatVoiceSummary shortVideoId={67} beatId="beat_1" />);
    const first = await screen.findByLabelText('Giọng đọc: Rosa (rosa)');
    const color = first.getAttribute('data-voice-color');
    expect(screen.getByLabelText('Giọng đọc: Người dẫn (narrator)').getAttribute('data-voice-color')).not.toBe(color);
    expect(request).toHaveBeenCalledWith(67, undefined, 'beat_1');
    view.rerender(<BeatVoiceSummary shortVideoId={67} beatId="beat_2" />);
    const second = await screen.findByLabelText('Giọng đọc: Rosa (rosa)');
    expect(second.getAttribute('data-voice-color')).toBe(color);
    expect(screen.queryByLabelText('Giọng đọc: Người dẫn (narrator)')).toBeNull();
});

test('switching beat rejects stale voice responses instead of showing previous beat speakers', async () => {
    let old: (r: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((r) => { old = r; }))
        .mockResolvedValueOnce({ success: true, config: { speakers: roles }, beat_voices: [rosa] });
    const view = render(<BeatVoiceSummary shortVideoId={67} beatId="beat_1" compact />);
    view.rerender(<BeatVoiceSummary shortVideoId={67} beatId="beat_2" compact />);
    await screen.findByLabelText('Giọng đọc: Rosa (rosa)');
    await act(async () => old({ success: true, config: { speakers: roles }, beat_voices: [narrator] }));
    expect(screen.queryByLabelText('Giọng đọc: Người dẫn (narrator)')).toBeNull();
});

test('does not imply no voices are used when loading fails', async () => {
    request.mockRejectedValue(new Error('Không tải được giọng'));
    render(<BeatVoiceSummary shortVideoId={67} beatId="beat_1" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Không tải được giọng');
    expect(screen.queryByText('Beat chưa có ID giọng đọc.')).toBeNull();
});
