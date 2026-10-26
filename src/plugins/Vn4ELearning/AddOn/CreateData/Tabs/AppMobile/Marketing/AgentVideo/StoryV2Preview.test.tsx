import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import StoryV2Preview from './StoryV2Preview';
import {storyV2Request} from './agentVideoApi';
jest.mock('./agentVideoApi', () => ({storyV2Request: jest.fn()}));
const mockPlayer = {getCurrentFrame: jest.fn(() => 0), isPlaying: jest.fn(() => false), seekTo: jest.fn(), play: jest.fn(), pause: jest.fn(), addEventListener: jest.fn<void, [string, () => void]>(), removeEventListener: jest.fn()};
type MockPreviewProps = {manifest: {speech_clips: {speaker_id?: string}[]}; playerRef: React.MutableRefObject<typeof mockPlayer | null>; onPlayerReady: (player: typeof mockPlayer) => void};
jest.mock('../ShortVideoRemotionPlayer', () => ({
    ShortVideoRemotionPreview: ({manifest, playerRef, onPlayerReady}: MockPreviewProps) => {
        const React = jest.requireActual<typeof import('react')>('react');
        React.useEffect(() => {playerRef.current = mockPlayer; onPlayerReady(mockPlayer);}, [playerRef, onPlayerReady]);
        return <div data-testid="shared-video-player" data-speakers={manifest.speech_clips.map((clip) => clip.speaker_id).join(',')} />;
    },
    ShortVideoRemotionTimelineBar: () => <div data-testid="one-playback-bar" />,
}));
const manifest = {schema_version: 'short_video_render_manifest_v1', fps: 30, width: 1080, height: 1920, duration_sec: 8,
    scenes: [{id: 'beat_1', start_offset_sec: 0, duration_sec: 8}], warnings: [], pending_utterances: [],
    speech_clips: [{id: 'a', speaker_id: 'narrator', speaker_name: 'Người kể', kind: 'narration', text: 'Một ngày có 48 giờ.', beat_id: 'beat_1', start_sec: 0, duration_sec: 2, audio_url: '/n.mp3'}, {id: 'b', speaker_id: 'hero', speaker_name: 'Minh', kind: 'dialogue', text: 'Tôi vẫn chưa ngủ đủ!', beat_id: 'beat_1', start_sec: 2.15, duration_sec: 2, audio_url: '/h.mp3'}, {id: 'c', speaker_id: 'friend', start_sec: 4.3, duration_sec: 2, audio_url: '/f.mp3'}]};
beforeEach(() => {(storyV2Request as jest.Mock).mockReset().mockResolvedValue({success: true, manifest});});
test('one player contains all voices and one playback bar for the whole video', async () => {
    render(<StoryV2Preview shortVideoId={67} />);
    expect(await screen.findByTestId('shared-video-player')).toHaveAttribute('data-speakers', 'narrator,hero,friend');
    expect(screen.getAllByTestId('shared-video-player')).toHaveLength(1);
    expect(screen.getAllByTestId('one-playback-bar')).toHaveLength(1);
    expect(storyV2Request).toHaveBeenCalledWith(67, 'preview', undefined, undefined, undefined);
});
test('beat preview and whole preview use the same endpoint with canonical beat ID', async () => {
    render(<StoryV2Preview shortVideoId={67} beatId="beat_2" />);
    await screen.findByTestId('shared-video-player');
    expect(storyV2Request).toHaveBeenCalledWith(67, 'preview', undefined, undefined, 'beat_2');
    fireEvent.click(screen.getByRole('button', {name: 'Nghe / xem toàn video'}));
    await waitFor(() => expect(storyV2Request).toHaveBeenLastCalledWith(67, 'preview', undefined, undefined, undefined));
});
test('audio generation refreshes player data, without polling or affecting a different video', async () => {
    render(<StoryV2Preview shortVideoId={67} />); await screen.findByTestId('shared-video-player');
    expect(storyV2Request).toHaveBeenCalledTimes(1);
    fireEvent(window, new CustomEvent('whatif-audio-updated', {detail: {shortVideoId: 99}}));
    expect(storyV2Request).toHaveBeenCalledTimes(1);
    fireEvent(window, new CustomEvent('whatif-audio-updated', {detail: {shortVideoId: 67}}));
    await waitFor(() => expect(storyV2Request).toHaveBeenCalledTimes(2));
});
test('missing audio reports pending lines while playable speech remains visible', async () => {
    (storyV2Request as jest.Mock).mockResolvedValue({success: true, manifest: {...manifest, pending_utterances: ['missing']}});
    render(<StoryV2Preview shortVideoId={67} />);
    await screen.findByText(/Còn 1 câu chưa có audio/);
    expect(screen.getByTestId('shared-video-player')).toHaveAttribute('data-speakers', 'narrator,hero,friend');
});

test('shows speaker names, full dialogue and timing in audio-only beat preview', async () => {
    render(<StoryV2Preview shortVideoId={67} beatId="beat_1" audioOnly />);
    expect(await screen.findByText('Một ngày có 48 giờ.')).toBeVisible();
    expect(screen.getByText('Người dẫn · Người kể')).toBeVisible();
    expect(screen.getByText('Minh')).toBeVisible();
    expect(screen.getByText('Tôi vẫn chưa ngủ đủ!')).toBeVisible();
    expect(screen.getByText(/Thoại nhân vật · beat_1 · 0:02.1/)).toBeVisible();
    expect(screen.getAllByRole('button', {name: 'Nghe từ câu này'})).toHaveLength(3);
});

test('listen from a line seeks and plays the same timeline and highlights current speaker', async () => {
    render(<StoryV2Preview shortVideoId={67} audioOnly />);
    const buttons = await screen.findAllByRole('button', {name: 'Nghe từ câu này'});
    await waitFor(() => expect(buttons[1]).toBeEnabled());
    fireEvent.click(buttons[1]);
    expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(64);
    expect(mockPlayer.play).toHaveBeenCalled();
    mockPlayer.getCurrentFrame.mockReturnValue(90);
    const sync = mockPlayer.addEventListener.mock.calls.find((call) => call[0] === 'frameupdate');
    if (!sync) throw new Error('Missing frameupdate listener');
    act(() => sync[1]());
    expect(screen.getByText('Minh').closest('[role="listitem"]')).toHaveAttribute('aria-current', 'true');
    mockPlayer.getCurrentFrame.mockReturnValue(0);
});

test('audio frame updates notify the visible motion preview with local time', async () => {
    const onTime = jest.fn();
    render(<StoryV2Preview shortVideoId={67} beatId="beat_1" audioOnly onTime={onTime} />);
    await screen.findByRole('list', {name: 'Danh sách lời dẫn và thoại'});
    mockPlayer.getCurrentFrame.mockReturnValue(150);
    mockPlayer.isPlaying.mockReturnValue(true);
    const calls = mockPlayer.addEventListener.mock.calls;
    const sync = calls.filter((call) => call[0] === 'frameupdate').pop();
    if (!sync) throw new Error('Missing frameupdate listener');
    act(() => sync[1]());
    expect(onTime).toHaveBeenLastCalledWith(5, true);
    mockPlayer.getCurrentFrame.mockReturnValue(0);
    mockPlayer.isPlaying.mockReturnValue(false);
});
