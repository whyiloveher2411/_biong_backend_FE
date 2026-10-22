import { ajax } from 'hook/useApi';
import { fetchWorkflowDefinitions } from './marketingWorkflowPrompts';

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
