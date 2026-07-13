import {
    buildPhoneticMarkedSegments,
    resolvePhoneticPhraseMarks,
} from './agentVideoPhoneticMarkUi';
import {
    compareDictEntryPriority,
    mergeTtsPhoneticDictEntries,
    normalizePhoneticSourceTerm,
    sortDictEntriesLongestFirst,
} from './agentVideoPhoneticDictUi';

const OVERLAP_DICT = [
    { source_term: 'AI', phonetic: 'Ây ai', case_sensitive: true },
    { source_term: 'AI Agent', phonetic: 'Ây-ai Êi-gừnt', case_sensitive: true },
];

describe('phonetic longest-match', () => {
    it('normalize gộp khoảng trắng', () => {
        expect(normalizePhoneticSourceTerm('AI  Agent')).toBe('AI Agent');
    });

    it('sort: AI Agent trước AI (nhiều token hơn)', () => {
        const sorted = sortDictEntriesLongestFirst(OVERLAP_DICT);
        expect(sorted[0].source_term).toBe('AI Agent');
        expect(sorted[1].source_term).toBe('AI');
        expect(compareDictEntryPriority(
            { source_term: 'AI Agent' },
            { source_term: 'AI' },
        )).toBeLessThan(0);
    });

    it('mark: AI Agent thắng AI trong cùng câu', () => {
        const segments = buildPhoneticMarkedSegments('về AI Agent nhé', OVERLAP_DICT);
        const marked = segments.filter((segment) => segment.phonetic);
        expect(marked).toHaveLength(1);
        expect(marked[0].text).toBe('AI Agent');
        expect(marked[0].phonetic).toBe('Ây-ai Êi-gừnt');
    });

    it('mark: AI đứng một mình vẫn khớp ngắn', () => {
        const segments = buildPhoneticMarkedSegments('về AI nhé', OVERLAP_DICT);
        const marked = segments.filter((segment) => segment.phonetic);
        expect(marked).toHaveLength(1);
        expect(marked[0].text).toBe('AI');
        expect(marked[0].phonetic).toBe('Ây ai');
    });

    it('mark: double-space AI  Agent vẫn khớp cụm dài', () => {
        const segments = buildPhoneticMarkedSegments('về AI  Agent nhé', OVERLAP_DICT);
        const marked = segments.filter((segment) => segment.phonetic);
        expect(marked).toHaveLength(1);
        expect(marked[0].phonetic).toBe('Ây-ai Êi-gừnt');
        expect(marked[0].text.replace(/\s+/g, ' ')).toBe('AI Agent');
    });

    it('mark: machine learning thắng learning', () => {
        const dict = [
            { source_term: 'learning', phonetic: 'lớ-ning' },
            { source_term: 'machine learning', phonetic: 'mơ-sin lớ-ning' },
        ];
        const segments = buildPhoneticMarkedSegments('dùng machine learning rate', dict);
        const marked = segments.filter((segment) => segment.phonetic);
        expect(marked.map((segment) => segment.text)).toEqual(['machine learning']);
        expect(marked[0].phonetic).toBe('mơ-sin lớ-ning');
    });

    it('phrase marks: AI+Agent = 1 start span', () => {
        const marks = resolvePhoneticPhraseMarks(['AI', 'Agent', 'nhé'], OVERLAP_DICT);
        expect(marks[0]).toEqual({
            kind: 'start',
            phonetic: 'Ây-ai Êi-gừnt',
            sourceTerm: 'AI Agent',
            tokenCount: 2,
        });
        expect(marks[1]).toEqual({ kind: 'covered' });
        expect(marks[2]).toBeNull();
    });

    it('phrase marks: token collapse "AI Agent" vẫn mark cụm dài (không chỉ AI)', () => {
        // Sau collapsePhoneticAlignToOriginal, display text = "AI Agent" (1 token)
        const marks = resolvePhoneticPhraseMarks(
            ['AI', 'là', 'gì?', 'AI Agent'],
            OVERLAP_DICT,
        );
        expect(marks[0]).toEqual({
            kind: 'start',
            phonetic: 'Ây ai',
            sourceTerm: 'AI',
            tokenCount: 1,
        });
        expect(marks[1]).toBeNull();
        expect(marks[2]).toBeNull();
        expect(marks[3]).toEqual({
            kind: 'start',
            phonetic: 'Ây-ai Êi-gừnt',
            sourceTerm: 'AI Agent',
            tokenCount: 1,
        });
    });

    it('mark: AI là gì?, AI Agent — cụm dài vẫn được mark', () => {
        const segments = buildPhoneticMarkedSegments('AI là gì?, AI Agent', OVERLAP_DICT);
        const marked = segments.filter((segment) => segment.phonetic);
        expect(marked.map((segment) => segment.text)).toEqual(['AI', 'AI Agent']);
        expect(marked[1].phonetic).toBe('Ây-ai Êi-gừnt');
    });

    it('merge: chỉ lấy data từ API, không seed', () => {
        const merged = mergeTtsPhoneticDictEntries([
            { source_term: 'HyperFrames', phonetic: 'Hai-pơ-phờ-reim' },
        ]);
        expect(merged.map((entry) => entry.source_term)).toEqual(['HyperFrames']);
    });

    it('merge: API trống thì dict trống', () => {
        expect(mergeTtsPhoneticDictEntries([])).toEqual([]);
        expect(mergeTtsPhoneticDictEntries(undefined)).toEqual([]);
    });

    it('case_sensitive: AI ≠ ai', () => {
        const segments = buildPhoneticMarkedSegments('có ai biết AI không', OVERLAP_DICT);
        const marked = segments.filter((segment) => segment.phonetic);
        expect(marked).toHaveLength(1);
        expect(marked[0].text).toBe('AI');
        expect(marked[0].phonetic).toBe('Ây ai');
    });
});
