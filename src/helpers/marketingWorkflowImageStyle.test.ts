import { ajax } from 'hook/useApi';
import { fetchWorkflowDefinitions, fetchWorkflowPromptContent, fetchWorkflowPromptText } from './marketingWorkflowPrompts';

jest.mock('hook/useApi', () => ({ ajax: jest.fn() }));

test('workflow definitions distinguish file styles, empty files and absent files', async () => {
    (ajax as jest.Mock).mockResolvedValue({ workflows: [
        { key: 'file', title: 'File', has_workflow_image_style: true, image_style_prompt: 'FILE STYLE', steps: [] },
        { key: 'empty', title: 'Empty', has_workflow_image_style: true, image_style_prompt: '', steps: [] },
        { key: 'db', title: 'DB fallback', steps: [] },
    ] });
    const workflows = await fetchWorkflowDefinitions(true);
    expect(workflows.map((w) => w.workflowImageStylePrompt)).toEqual(['FILE STYLE', '', undefined]);
});

test('prompt requests carry video ID so server resolves current saved language', async () => {
    (ajax as jest.Mock).mockResolvedValue({ success: true, content: 'Saved video content language: en' });
    await fetchWorkflowPromptContent('video-html', 'tim-chu-de-whatif.md', 66);
    expect(ajax).toHaveBeenLastCalledWith(expect.objectContaining({ data: { workflow: 'video-html', file: 'tim-chu-de-whatif.md', short_video_id: 66 } }));
    const result = await fetchWorkflowPromptText('video-html', 'tim-chu-de-whatif.md', { 'SHORT-VIDEO-ID': '66' });
    expect(result.text).toContain('language: en');
    expect(ajax).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ short_video_id: 66 }) }));
});
