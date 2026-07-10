import { buildScriptLinesWithTokens } from './agentVideoWhisperScriptLayout';
import { buildCaptionAlignResult } from './agentVideoCaptionScriptAlign';

describe('agentVideoWhisperScriptLayout', () => {
    it('preserves line breaks from script', () => {
        const script = 'Con cá lớn\nThật hay';
        const whisper = [
            { text: 'Con', start: 0, end: 0.3 },
            { text: 'ca', start: 0.3, end: 0.6 },
            { text: 'lớn', start: 0.6, end: 0.9 },
            { text: 'Thật', start: 1, end: 1.3 },
            { text: 'hay', start: 1.3, end: 1.6 },
        ];
        const result = buildCaptionAlignResult(script, whisper);
        const lines = buildScriptLinesWithTokens(script, result.tokens);

        expect(lines).toHaveLength(2);
        expect(lines[0].tokens).toHaveLength(3);
        expect(lines[1].tokens).toHaveLength(2);
    });
});
