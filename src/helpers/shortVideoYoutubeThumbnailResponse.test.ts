import fs from 'fs';
import path from 'path';
import { parseYoutubeThumbnailResponse, isYoutubeThumbnailResponse } from './shortVideoYoutubeThumbnailResponse';

const JSON_SAMPLE = `[{
    "rank": 1,
    "concept_id": 1,
    "concept_name": "The First Tear",
    "hook_type": "Strong Emotional Expression",
    "hook": "Evokes deep empathy about the first expression of grief.",
    "thumbnail_text": "THE FIRST TEAR?",
    "viral_score": 95,
    "score_breakdown": {
      "curiosity_gap": 23,
      "emotional_impact": 20,
      "visual_clarity": 19,
      "title_thumbnail_synergy": 19,
      "visual_distinctiveness": 14
    },
    "image_generation_prompt": "16:9 YouTube thumbnail, 2D digital cartoon illustration. A stylized prehistoric character kneeling beside a pit.",
    "why_it_could_work": "The intense emotional expression creates an immediate empathetic connection."
}]`;

describe('parseYoutubeThumbnailResponse', () => {
    it('returns empty result for empty input', () => {
        const parsed = parseYoutubeThumbnailResponse('');
        expect(parsed.concepts).toHaveLength(0);
        expect(parsed.winner).toBeNull();
        expect(parsed.packagingAdvice).toHaveLength(0);
    });

    it('parses the new JSON response format with scores', () => {
        const parsed = parseYoutubeThumbnailResponse(JSON_SAMPLE);

        expect(parsed.concepts).toHaveLength(1);
        expect(parsed.concepts[0].rank).toBe(1);
        expect(parsed.concepts[0].conceptName).toBe('The First Tear');
        expect(parsed.concepts[0].hookType).toBe('Strong Emotional Expression');
        expect(parsed.concepts[0].thumbnailText).toBe('THE FIRST TEAR?');
        expect(parsed.concepts[0].viralScoreValue).toBe(95);
        expect(parsed.concepts[0].viralScore).toBe('95/100');
        expect(parsed.concepts[0].scoreBreakdown).toContainEqual({
            key: 'curiosity_gap',
            label: 'curiosity_gap',
            value: 23,
        });
        expect(parsed.concepts[0].scoreBreakdown).toHaveLength(5);
        expect(parsed.concepts[0].imagePrompt).toContain('2D digital cartoon illustration');
        expect(parsed.concepts[0].why).toEqual([{
            label: 'why it could work',
            text: 'The intense emotional expression creates an immediate empathetic connection.',
        }]);
    });

    it('parses JSON wrapped in code fence and surrounding text', () => {
        const wrapped = `Here are the concepts:\n\n\`\`\`json\n${JSON_SAMPLE}\n\`\`\`\n\nDone!`;
        const parsed = parseYoutubeThumbnailResponse(wrapped);
        expect(parsed.concepts).toHaveLength(1);
        expect(parsed.concepts[0].conceptName).toBe('The First Tear');
    });

    it('parses the real chatbot response file when available', () => {
        const filePath = path.resolve(
            __dirname,
            '../../../_biong_backend/prompts/generate-thumbnail-youtube-response.md',
        );
        if (!fs.existsSync(filePath)) {
            return;
        }

        const parsed = parseYoutubeThumbnailResponse(fs.readFileSync(filePath, 'utf8'));

        expect(parsed.concepts).toHaveLength(10);
        expect(parsed.concepts.map((c) => c.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(parsed.concepts[0].conceptName).toBe('The First Tear');
        expect(parsed.concepts[0].hookType).toBe('Strong Emotional Expression');
        expect(parsed.concepts[0].thumbnailText).toBe('THE FIRST TEAR?');
        expect(parsed.concepts[0].viralScoreValue).toBe(95);
        expect(parsed.concepts[0].scoreBreakdown).toHaveLength(5);
        expect(parsed.concepts[0].imagePrompt).toContain('2D digital cartoon illustration');
        expect(parsed.concepts[0].why[0].label).toBe('why it could work');
    });
});

describe('isYoutubeThumbnailResponse', () => {
    it('accepts a valid JSON thumbnail response', () => {
        expect(isYoutubeThumbnailResponse(JSON_SAMPLE)).toBe(true);
    });

    it('rejects empty, plain text and title-like content', () => {
        expect(isYoutubeThumbnailResponse('')).toBe(false);
        expect(isYoutubeThumbnailResponse('hello world, this is not a thumbnail response')).toBe(false);
        expect(isYoutubeThumbnailResponse(JSON.stringify({
            titles: [{ rank: 1, title: 'A title' }],
            description: 'a description',
        }))).toBe(false);
    });
});
