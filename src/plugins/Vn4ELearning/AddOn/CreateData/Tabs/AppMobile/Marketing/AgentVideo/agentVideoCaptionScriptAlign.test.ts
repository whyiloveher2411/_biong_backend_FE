import {
    alignScriptToWhisper,
    buildCaptionAlignResult,
    extractOrphanWhisperWords,
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

    it('resolveTokenTier: phonetic-dict-exact is green even when script differs from whisper', () => {
        expect(resolveTokenTier('phonetic-dict-exact', 'Ê sơ ai', 'AI')).toBe('green');
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

    it('phonetic dict: AI + Whisper Ê sơ ai → xanh, không orphan', () => {
        const script = 'AI là gì?';
        const whisper = tw(['Ê', 'sơ', 'ai', 'là', 'gì']);
        const dict = [{ source_term: 'AI', phonetic: 'Ây ai', phonetic_tokens: ['Ây', 'ai'] }];
        const result = buildCaptionAlignResult(script, whisper, undefined, dict);

        expect(result.tokens[0].text).toBe('AI');
        expect(result.tokens[0].matchType).toBe('phonetic-dict-exact');
        expect(result.tokens[0].tier).toBe('green');
        expect(result.tokens[0].transcriptIndexes).toEqual([0, 1, 2]);

        const orphans = extractOrphanWhisperWords(result.tokens, whisper);
        expect(orphans.map((word) => word.text)).not.toContain('Ê');
        expect(orphans.map((word) => word.text)).not.toContain('sơ');
        expect(orphans.map((word) => word.text)).not.toContain('ai');
        expect(result.orphans.map((word) => word.text)).not.toContain('Ê');
    });

    it('phonetic dict: Whisper A.I. khớp gốc — không gom là gì vào AI', () => {
        const script = 'AI là gì?';
        const whisper = tw(['A.I.', 'là', 'gì']);
        const dict = [{ source_term: 'AI', phonetic: 'Ây ai', phonetic_tokens: ['Ây', 'ai'] }];
        const result = buildCaptionAlignResult(script, whisper, undefined, dict);

        expect(result.tokens[0].text).toBe('AI');
        expect(result.tokens[0].matchType).toBe('phonetic-dict-exact');
        expect(result.tokens[0].tier).toBe('green');
        expect(result.tokens[0].transcriptIndexes).toEqual([0]);
        expect(result.tokens[0].whisperText).toBe('A.I.');
        expect(result.tokens[1].text).toBe('là');
        expect(result.tokens[1].tier).toBe('green');
        expect(result.tokens[1].whisperText).toBe('là');
        expect(result.tokens[2].tier).toBe('green');
    });
});
