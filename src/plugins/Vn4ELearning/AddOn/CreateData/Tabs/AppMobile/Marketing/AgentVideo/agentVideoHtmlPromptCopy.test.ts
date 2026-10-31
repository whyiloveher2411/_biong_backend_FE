import {beatHtmlPromptCopyPart, loadImportHtmlBeatHtmlTemplate} from './agentVideoImportHtmlPrompt';

const prepare = 'THREEJS_SKILL_CONTEXT r186 — FREE ASSET MODE\nSource and skills\nReply THREEJS_SKILLS_READY only. Wait for the next user message containing the task.\n\n';
const task = 'Generate beat_2 with these measured narration words and visual direction.';
test('copies generation task separately from the skill handshake', () => {
    expect(beatHtmlPromptCopyPart(prepare + task)).toBe(task);
    expect(beatHtmlPromptCopyPart(prepare + task, 'prepare')).toBe(prepare.trim());
});
test('ordinary workflows need only a task while malformed skill envelopes fail clearly', () => {
    expect(beatHtmlPromptCopyPart(task)).toBe(task);
    expect(beatHtmlPromptCopyPart(task, 'prepare')).toBe('');
    expect(() => beatHtmlPromptCopyPart('THREEJS_SKILL_CONTEXT r186 missing delimiter')).toThrow('thiếu ranh giới');
});


jest.mock('helpers/marketingWorkflowPrompts', () => ({
    fetchWorkflowPromptContent: jest.fn(),
}));
import {fetchWorkflowPromptContent} from 'helpers/marketingWorkflowPrompts';

test('video-bound template requests resolve the saved style again after mode changes', async () => {
    const fetchPrompt = fetchWorkflowPromptContent as jest.Mock;
    fetchPrompt.mockResolvedValueOnce({ok: true, content: 'complete historical free style'})
        .mockResolvedValueOnce({ok: true, content: 'updated saved style'});
    const file = 'beat-html-prompt-free-threejs.md';
    expect(await loadImportHtmlBeatHtmlTemplate('video-html', file, 67)).toBe('complete historical free style');
    expect(await loadImportHtmlBeatHtmlTemplate('video-html', file, 67)).toBe('updated saved style');
    expect(fetchPrompt).toHaveBeenNthCalledWith(1, 'video-html', file, 67);
    expect(fetchPrompt).toHaveBeenNthCalledWith(2, 'video-html', file, 67);
});
