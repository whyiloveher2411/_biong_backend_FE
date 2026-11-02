import { workflowSessionStepId, workflowChatSessionKey, replaceWorkflowPromptKeys } from './marketingWorkflowPrompts';

jest.mock('hook/useApi', () => ({ ajax: jest.fn() }));

test('3D steps keep their chat keys after removing the SFX step', () => {
    expect([0, 1, 2, 3].map((index) => workflowSessionStepId('video-html', index)))
        .toEqual(['0', 'beat-division-v1', '1', '3']);
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

test('asset mode shares topic and beat division sessions for every chat provider', () => {
    for (const suffix of ['', '::claude', '::chatgpt']) {
        for (const index of [0, 1]) {
            expect(workflowChatSessionKey('video-html', index, 'free', suffix))
                .toBe(workflowChatSessionKey('video-html', index, 'shared', suffix));
        }
        expect(workflowChatSessionKey('video-html', 3, 'free', suffix)).toBe('video-html#free-3');
    }
    expect(workflowChatSessionKey('video-html-2d', 0, 'free')).toBe('video-html-2d#handoff-v2-0');
});

test('provider buttons address one conversation per step', () => {
    expect(workflowChatSessionKey('video-html', 0, 'shared', '::claude')).toBe('video-html#0');
    expect(workflowChatSessionKey('video-image', 1, 'shared', '::chatgpt')).toBe('video-image#1');
});
