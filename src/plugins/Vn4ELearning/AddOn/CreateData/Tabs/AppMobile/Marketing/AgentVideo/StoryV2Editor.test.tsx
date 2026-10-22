import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import StoryV2Editor from './StoryV2Editor';
import {fetchSaydiVoiceSamples, storyV2Request} from './agentVideoApi';

import type {StoryV2} from './storyV2';
jest.mock('./agentVideoApi', () => ({storyV2Request: jest.fn(), fetchSaydiVoiceSamples: jest.fn(), resolveSaydiVoicePreviewUrl: () => '/mock-voice.mp3'}));
jest.mock('./StoryV2Preview', () => () => null);
jest.mock('../ShortVideoRemotionPlayer', () => () => null);
jest.mock('helpers/marketingShortVideoManifestApi', () => ({buildShortVideoRenderManifest: jest.fn()}));
const fixture = (): StoryV2 => ({schema_version: 'whatif_2d_story_v2', language: 'vi', speakers: {narrator: {name: 'Người dẫn', voice: null}, minh: {name: 'Minh', voice: null}}, beats: Array.from({length: 16}, (_, n) => ({id: `beat_${n+1}`, duration_hint_sec: 20, visual_description: `Shot ${n+1}`, items: Array.from({length: 6}, (_, j) => ({id: `b${n+1}_item_${j}`, type: j === 0 ? 'narration' as const : 'action' as const, speaker_id: j === 0 ? 'narrator' : undefined, text: `Beat ${n+1} item ${j}. A character walks towards the table and sits down.`}))}))});
beforeEach(() => {
    jest.clearAllMocks();
    (storyV2Request as jest.Mock).mockResolvedValue({success: true, story_timeline: {duration_sec: 320, pending_utterances: [], speech_clips: []}});
    (fetchSaydiVoiceSamples as jest.Mock).mockResolvedValue({success: true, samples: [{name: 'fixture_male', display_name: 'Nam mẫu', language: 'vi'}, {name: 'fixture_female', display_name: 'Nữ mẫu', language: 'vi'}]});
});
test('long story mounts a bounded number of editor fields', async () => {
    const start = performance.now();
    const view = render(<StoryV2Editor shortVideoId={67} initialScript={JSON.stringify(fixture())} onSaved={() => {}} />);
    await screen.findByText(/Timeline: 320/);
    const count = view.container.querySelectorAll('input, textarea, [role="combobox"]').length;
    console.log(`Story editor mount: ${Math.round(performance.now()-start)}ms, ${count} input/textarea/combobox elements`);
    expect(count).toBeLessThan(150);
});
async function choose(label: string, option: string, index?: number) {
    const field = index === undefined ? screen.getByLabelText(label) : screen.getAllByLabelText(label)[index];
    fireEvent.mouseDown(field);
    fireEvent.click(await screen.findByRole('option', {name: option}));
}
test('casts narrator and character to separate Saydi voices and preserves all beats on save', async () => {
    render(<StoryV2Editor shortVideoId={67} initialScript={JSON.stringify(fixture())} onSaved={() => {}} />);
    await screen.findByText(/Timeline: 320/);
    await choose('Dịch vụ giọng', 'Saydi', 0);
    await choose('Giọng Saydi cho Người dẫn', 'Nam mẫu');
    await choose('Dịch vụ giọng', 'Saydi', 1);
    await choose('Giọng Saydi cho Minh', 'Nữ mẫu');
    fireEvent.click(screen.getByRole('button', {name: 'Lưu giọng và kịch bản'}));
    await waitFor(() => expect(storyV2Request).toHaveBeenCalledWith(67, 'save', expect.objectContaining({speakers: {
        narrator: expect.objectContaining({voice: expect.objectContaining({provider: 'saydi', voice_sample: 'fixture_male'})}),
        minh: expect.objectContaining({voice: expect.objectContaining({provider: 'saydi', voice_sample: 'fixture_female'})}),
    }}), undefined));
    const saved = (storyV2Request as jest.Mock).mock.calls.find((call) => call[1] === 'save')[2];
    expect(saved.beats).toHaveLength(16);
    expect(saved.beats[15].items).toEqual(fixture().beats[15].items);
    expect(fetchSaydiVoiceSamples).toHaveBeenCalledTimes(1);
});
test('switching beats keeps edits and does not mount all other editors', async () => {
    const story = fixture();
    const {container} = render(<StoryV2Editor shortVideoId={67} initialScript={JSON.stringify(story)} onSaved={() => {}} />);
    await screen.findByText(/Timeline: 320/);
    fireEvent.change(screen.getByLabelText('Visual: bối cảnh, nhân vật, diễn biến và kết thúc'), {target: {value: 'Edited first shot'}});
    fireEvent.mouseDown(screen.getByLabelText('Beat đang chỉnh'));
    fireEvent.click(await screen.findByRole('option', {name: /^2\. beat_2 /}));
    expect(screen.getByLabelText('Visual: bối cảnh, nhân vật, diễn biến và kết thúc')).toHaveValue('Shot 2');
    expect(screen.queryByDisplayValue('Edited first shot')).not.toBeInTheDocument();
    expect(container.querySelectorAll('input, textarea, [role="combobox"]').length).toBeLessThan(150);
    fireEvent.click(screen.getByRole('button', {name: 'Lưu giọng và kịch bản'}));
    await waitFor(() => expect((storyV2Request as jest.Mock).mock.calls.some((call) => call[1] === 'save')).toBe(true));
    const saved = (storyV2Request as jest.Mock).mock.calls.find((call) => call[1] === 'save')[2];
    expect(saved.beats[0].visual_description).toBe('Edited first shot');
    expect(saved.beats[1]).toEqual(story.beats[1]);
});
test('catalog failure reports an error and does not retry in a render loop', async () => {
    (fetchSaydiVoiceSamples as jest.Mock).mockRejectedValue(new Error('Catalog unavailable'));
    render(<StoryV2Editor shortVideoId={67} initialScript={JSON.stringify(fixture())} onSaved={() => {}} />);
    await screen.findByText(/Catalog unavailable/);
    expect(fetchSaydiVoiceSamples).toHaveBeenCalledTimes(1);
});
