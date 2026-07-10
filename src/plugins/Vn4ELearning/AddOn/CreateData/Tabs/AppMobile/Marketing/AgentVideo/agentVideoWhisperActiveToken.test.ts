import type { CaptionAlignToken } from './agentVideoCaptionScriptAlign';
import { resolveActiveTokenIndex } from './agentVideoWhisperActiveToken';

function token(index: number, start: number, end: number): CaptionAlignToken {
    return {
        index,
        text: `w${index}`,
        start,
        end,
        matchType: 'exact',
        tier: 'green',
    };
}

describe('agentVideoWhisperActiveToken', () => {
    const tokens = [
        token(0, 0, 0.5),
        token(1, 0.6, 1.0),
        token(2, 1.5, 2.0),
    ];

    it('returns null for empty tokens', () => {
        expect(resolveActiveTokenIndex([], 0.3)).toBeNull();
    });

    it('returns token when time is inside interval', () => {
        expect(resolveActiveTokenIndex(tokens, 0.3)).toBe(0);
        expect(resolveActiveTokenIndex(tokens, 0.8)).toBe(1);
    });

    it('returns token at end boundary with small pad', () => {
        expect(resolveActiveTokenIndex(tokens, 1.0)).toBe(1);
    });

    it('falls back to last started token in gap', () => {
        expect(resolveActiveTokenIndex(tokens, 1.2)).toBe(1);
    });

    it('returns last token when time is after all tokens', () => {
        expect(resolveActiveTokenIndex(tokens, 5)).toBe(2);
    });
});
