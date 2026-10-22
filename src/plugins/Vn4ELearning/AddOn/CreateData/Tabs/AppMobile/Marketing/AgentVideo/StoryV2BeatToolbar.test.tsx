import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import StoryV2BeatToolbar from './StoryV2BeatToolbar';
jest.mock('./ShortVideoAgentVideoSettingsDialog', () => () => null);
const makeState = () => ({workflowActive: 'video-html-2d', beatHtml: {}, openingBeatDeepSeekChatBeatIds: [], generatingBeatAudio: null, handleOpenBeatDeepSeekChat: jest.fn(), handleOpenBeatDeepSeekSavedChat: jest.fn(), handleGenerateBeatAudio: jest.fn()});
test('new HTML chat is accessible without a saved URL and uses current beat', () => {
    const state = makeState(); render(<StoryV2BeatToolbar state={state as any} beatId="beat_2" />);
    fireEvent.click(screen.getByRole('button', {name: 'Tạo HTML motion bằng DeepSeek'}));
    expect(state.handleOpenBeatDeepSeekChat).toHaveBeenCalledWith('beat_2', 'new');
    fireEvent.click(screen.getByRole('button', {name: /Tạo audio beat/i}));
    expect(state.handleGenerateBeatAudio).toHaveBeenCalledWith('beat_2');
});
test('saved chat is a separate action', () => {
    const state = {...makeState(), beatHtml: {beat_2: {chat_url: 'https://chat.deepseek.com/a/chat/test'}}};
    render(<StoryV2BeatToolbar state={state as any} beatId="beat_2" />);
    fireEvent.click(screen.getByRole('button', {name: 'Mở lại chat HTML đã lưu'}));
    expect(state.handleOpenBeatDeepSeekSavedChat).toHaveBeenCalledWith('beat_2');
});
