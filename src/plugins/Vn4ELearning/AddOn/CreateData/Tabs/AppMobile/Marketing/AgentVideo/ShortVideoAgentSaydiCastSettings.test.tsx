import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShortVideoAgentSaydiCastSettings from './ShortVideoAgentSaydiCastSettings';
import { saydiVoiceCastRequest } from './agentVideoApi';

jest.mock('./agentVideoApi', () => ({ saydiVoiceCastRequest: jest.fn() }));
const request = saydiVoiceCastRequest as jest.Mock;
const config = { enabled: true, speakers: { narrator: { name: 'Người dẫn', voice_sample: 'voice-n' }, hero: { name: 'Nhân vật', voice_sample: 'voice-h' } } };
beforeEach(() => request.mockReset());

test('loads per-video cast, shows exact control IDs, saves edited speaker and confirms', async () => {
    request.mockResolvedValueOnce({ success: true, config }).mockResolvedValueOnce({ success: true });
    render(<ShortVideoAgentSaydiCastSettings shortVideoId={67} samples={[]} disabled={false} />);
    await screen.findByText('[giong-doc-id: voice-h]');
    expect(request).toHaveBeenCalledWith(67);
    fireEvent.change(screen.getByLabelText('Tên nhân vật (hero)'), { target: { value: 'Bruno' } });
    fireEvent.click(screen.getByText('Lưu cấu hình nhiều giọng'));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith(67, { ...config, speakers: { ...config.speakers, hero: { ...config.speakers.hero, name: 'Bruno' } } }));
    await screen.findByText(/Đã lưu cho video này/);
});

test('shows backend validation error and does not report success', async () => {
    request.mockResolvedValueOnce({ success: true, config }).mockResolvedValueOnce({ success: false, message: 'Mỗi người nói phải có một giọng khác nhau' });
    render(<ShortVideoAgentSaydiCastSettings shortVideoId={68} samples={[]} disabled={false} />);
    await screen.findByText('[giong-doc-id: voice-h]');
    fireEvent.click(screen.getByText('Lưu cấu hình nhiều giọng'));
    await screen.findByText('Mỗi người nói phải có một giọng khác nhau');
    expect(screen.queryByText(/Đã lưu cho video này/)).toBeNull();
});
