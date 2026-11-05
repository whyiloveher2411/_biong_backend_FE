import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WhiteboardBeatHtmlChatControl from './WhiteboardBeatHtmlChatControl';
import { fetchDeepseekHtmlBeatSessionStatus } from './agentVideoApi';
jest.mock('./agentVideoApi', () => ({ fetchDeepseekHtmlBeatSessionStatus: jest.fn() }));
jest.mock('./ShortVideoAgentVideoSettingsDialog', () => () => null);

test('pending Claude job displays progress and can reopen detail chat before HTML is saved', async () => {
    (fetchDeepseekHtmlBeatSessionStatus as jest.Mock).mockResolvedValue({ success: true,
        chat_url: 'https://claude.ai/chat/pending', html_generation: { status: 'waiting_response', poll_count: 2 } });
    const reopen = jest.fn();
    const state = { shortVideoId: 67, beatHtml: {}, beatHtmlMediaReadiness: {},
        handleOpenBeatDeepSeekSavedChat: reopen } as any;
    render(<WhiteboardBeatHtmlChatControl state={state} beatId="beat_7" />);
    await waitFor(() => expect(screen.getByText('Claude: đang chờ phản hồi trên browser')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Mở chatbot' }));
    expect(reopen).toHaveBeenCalledWith('beat_7');
});
