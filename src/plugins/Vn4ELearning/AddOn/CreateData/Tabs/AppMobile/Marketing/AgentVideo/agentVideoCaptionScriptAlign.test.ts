import {
    alignScriptToWhisper,
    buildCaptionAlignResult,
    resolveTokenTier,
    tokenizeScript,
} from './agentVideoCaptionScriptAlign';

function tw(words: Array<string | { text: string; start: number; end: number }>) {
    return words.map((item, i) => {
        if (typeof item === 'string') {
            return { text: item, start: i * 0.4, end: i * 0.4 + 0.35 };
        }
        return item;
    });
}

describe('agentVideoCaptionScriptAlign', () => {
    it('resolveTokenTier: exact is green', () => {
        expect(resolveTokenTier('exact', 'Con', 'Con')).toBe('green');
    });

    it('resolveTokenTier: interpolate is red', () => {
        expect(resolveTokenTier('interpolate')).toBe('red');
    });

    it('resolveTokenTier: fuzzy is yellow', () => {
        expect(resolveTokenTier('fuzzy', 'ca', 'cá')).toBe('yellow');
    });

    it('resolveTokenTier: exact with different whisper text is yellow', () => {
        expect(resolveTokenTier('exact', 'ca', 'cá')).toBe('yellow');
    });

    it('resolveTokenTier: exact with punctuation-only diff is green', () => {
        expect(resolveTokenTier('exact', 'độn', 'độn,')).toBe('green');
        expect(resolveTokenTier('exact', 'tích', 'tích.')).toBe('green');
    });

    it('resolveTokenTier: exact with case-only diff is green', () => {
        expect(resolveTokenTier('exact', 'và', 'Và')).toBe('green');
        expect(resolveTokenTier('exact', 'Nhưng', 'nhưng')).toBe('green');
    });

    it('exact diacritic: script text preserved', () => {
        const script = ['Con', 'cá', 'lớn'];
        const transcript = tw(['Con', 'ca', 'lớn']);
        const { mapped } = alignScriptToWhisper(script, transcript);

        expect(mapped[1].text).toBe('cá');
        expect(mapped[1].matchType).toBe('exact');
    });

    it('skips whisper filler via lookahead', () => {
        const script = ['Con', 'cá', 'lớn'];
        const transcript = tw(['Con', 'ừm', 'ca', 'lớn']);
        const { mapped } = alignScriptToWhisper(script, transcript);

        expect(mapped.map((w) => w.text)).toEqual(['Con', 'cá', 'lớn']);
        expect(mapped[1].whisperText).toBe('ca');
    });

    it('interpolate when whisper word unrelated', () => {
        const script = ['Con', 'cá', 'lớn', 'quá'];
        const transcript = tw(['Con', 'xyz', 'abc', 'quá']);
        const { mapped, interpolatedCount } = alignScriptToWhisper(script, transcript);

        expect(mapped[1].matchType).toBe('interpolate');
        expect(interpolatedCount).toBeGreaterThanOrEqual(1);
    });

    it('buildCaptionAlignResult aggregates stats', () => {
        const script = 'Con cá lớn';
        const whisper = tw(['Con', 'ca', 'lớn']);
        const result = buildCaptionAlignResult(script, whisper);

        expect(result.tokens).toHaveLength(3);
        expect(result.stats.total).toBe(3);
        expect(result.stats.green + result.stats.yellow + result.stats.red).toBe(3);
        expect(tokenizeScript(script)).toEqual(['Con', 'cá', 'lớn']);
    });
});
