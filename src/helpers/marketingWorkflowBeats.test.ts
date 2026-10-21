import { formatWorkflowBeatScript, splitWorkflowBeats } from './marketingWorkflowBeats';
import { buildWorkflowBreakdownPlan, replaceWorkflowPromptKeys } from './marketingWorkflowPrompts';

describe('splitWorkflowBeats', () => {
    it('treats each non-empty line as one beat', () => {
        expect(splitWorkflowBeats('One.\nTwo.\n\nThree.')).toEqual(['One.', 'Two.', 'Three.']);
    });

    it('keeps multi-line paragraphs as one beat when blank lines separate beats', () => {
        const text = 'First line.\nSecond line.\n\nThird line.\nFourth line.';
        expect(splitWorkflowBeats(text)).toEqual([
            'First line.\nSecond line.',
            'Third line.\nFourth line.',
        ]);
    });

    it('respects explicit BEAT headers', () => {
        const text = 'BEAT 01: One.\ncontinued.\n\nBEAT 02: Two.\ncontinued.';
        expect(splitWorkflowBeats(text)).toEqual(['One.\ncontinued.', 'Two.\ncontinued.']);
    });
});

describe('formatWorkflowBeatScript', () => {
    it('numbers beats from 01 and keeps multi-line content', () => {
        const text = formatWorkflowBeatScript(['One.\nLine 2.', 'Two.'], 1);
        expect(text).toBe('BEAT 01: One.\nLine 2.\n\nBEAT 02: Two.');
        expect(splitWorkflowBeats(text)).toEqual(['One.\nLine 2.', 'Two.']);
    });
});

describe('buildWorkflowBreakdownPlan', () => {
    it('adds structured BEAT blocks to each chunk context', () => {
        const plan = buildWorkflowBreakdownPlan('One.\nTwo.\nThree.\nFour.', 2);
        expect(plan).not.toBeNull();
        expect(plan?.chunks[0].beats).toEqual(['One.', 'Two.']);
        expect(plan?.chunks[0].context['AUDIO-SCRIPT-BEATS']).toBe('BEAT 01: One.\n\nBEAT 02: Two.');
        expect(plan?.chunks[1].context['AUDIO-SCRIPT-BEATS']).toBe('BEAT 01: Three.\n\nBEAT 02: Four.');
    });
});

describe('replaceWorkflowPromptKeys', () => {
    it('replaces AUDIO-SCRIPT-BEATS without touching AUDIO-SCRIPT', () => {
        const text = 'beats=[AUDIO-SCRIPT-BEATS] raw=[AUDIO-SCRIPT]';
        const result = replaceWorkflowPromptKeys(text, {
            'AUDIO-SCRIPT': 'RAW',
            'AUDIO-SCRIPT-BEATS': 'BEAT 01: One.',
        });
        expect(result.content).toBe('beats=BEAT 01: One. raw=RAW');
    });
});
