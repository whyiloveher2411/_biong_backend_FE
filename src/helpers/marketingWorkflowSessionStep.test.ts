import { workflowSessionStepId, replaceWorkflowPromptKeys } from './marketingWorkflowPrompts';

jest.mock('hook/useApi', () => ({ ajax: jest.fn() }));

test('new 3D beat division gets a separate chat while existing steps keep their chat keys', () => {
    expect([0, 1, 2, 3, 4].map((index) => workflowSessionStepId('video-html', index)))
        .toEqual(['0', 'beat-division-v1', '1', '2', '3']);
    for (const workflow of ['video-html-2d', 'video-image']) {
        expect([0, 1, 2].map((index) => workflowSessionStepId(workflow, index))).toEqual(['0', '1', '2']);
    }
});

test('independent division receives saved title and original narration instead of divided audio', () => {
    const result = replaceWorkflowPromptKeys('<TITLE>[topic]</TITLE>\n<AUDIO-ORIGINAL>[PASTE ORIGINAL AUDIO HERE]</AUDIO-ORIGINAL>', {
        topic: 'Saved title',
        'PASTE ORIGINAL AUDIO HERE': '<voice id="hero">Approved original.</voice>',
        'AUDIO-SCRIPT': '1. Old beat.\n2. Old boundary.',
    });
    expect(result.content).toBe('<TITLE>Saved title</TITLE>\n<AUDIO-ORIGINAL><voice id="hero">Approved original.</voice></AUDIO-ORIGINAL>');
});
