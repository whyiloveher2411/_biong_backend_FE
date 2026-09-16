import fs from 'fs';
import path from 'path';
import { parseYoutubeTitleResponse, isYoutubeTitleResponse } from './shortVideoYoutubeTitleResponse';

const SAMPLE = `### Audience Insight

* **Target Audience:** History fans and science communicators.
* **Primary Motivation:** Understand human behavior.
* **Primary Reason They Would Click:** Curiosity plus emotion.

---

### Top 10 Titles Ranked

**Rank: #1**  
**Title:** The First Time Humans Said Goodbye  
**Viral Score:** 9.0/10 *(Curiosity: 8, Emotional Impact: 10, Clarity: 9, Viral Potential: 9, CTR Potential: 9)*  
**Why it works:**  
* **Emotional Hook:** It humanizes prehistoric people.  
* **Shareability:** Viewers will want to share it.

**Rank: #2**  
**Title:** The Real Reason Early Humans Buried Their Dead  
**Viral Score:** 8.8/10 *(Curiosity: 9, Emotional Impact: 7, Clarity: 10, Viral Potential: 9, CTR Potential: 9)*  
**Why it works:**  
* **Proven YouTube Meta:** "The Real Reason" is validated.

---

### Winner

**The First Time Humans Said Goodbye**

**Why it is the strongest option:**  
It is a breakout hit.

**Psychological Triggers Used:**  
* **Empathy:** Projects grief onto ancestors.

---

### Packaging Suggestions

#### 5 Thumbnail Concepts
1. **The Cinematic Dawn:** A dramatic illustration of early humans.
2. **The Contrast Split:** Cold landscape versus warm burial.

#### Thumbnail Text Options (Maximum 3 Words)
* THE FIRST GOODBYE
* THE REAL REASON

#### Best Title + Thumbnail Combinations
* **Combination A (Emotional/Viral):**  
  *Title:* The First Time Humans Said Goodbye  
  *Thumbnail:* Concept 1

#### Title Refinements for A/B Testing
* Test "The Real Reason" against "Why We Really Started".
`;

describe('parseYoutubeTitleResponse', () => {
    it('parses audience insight, ranked titles, winner and packaging', () => {
        const parsed = parseYoutubeTitleResponse(SAMPLE);

        expect(parsed.audienceInsight).toHaveLength(3);
        expect(parsed.audienceInsight[0]).toEqual({
            label: 'Target Audience',
            value: 'History fans and science communicators.',
        });

        expect(parsed.items).toHaveLength(2);
        expect(parsed.items[0].title).toBe('The First Time Humans Said Goodbye');
        expect(parsed.items[0].rankLabel).toBe('#1');
        expect(parsed.items[0].viralScore).toBe('9.0/10');
        expect(parsed.items[0].viralScoreValue).toBe(9);
        expect(parsed.items[0].subScores).toContainEqual({ label: 'Emotional Impact', value: '10' });
        expect(parsed.items[0].why[0]).toEqual({
            label: 'Emotional Hook',
            text: 'It humanizes prehistoric people.',
        });

        expect(parsed.winner?.title).toBe('The First Time Humans Said Goodbye');
        expect(parsed.winner?.sections.map((s) => s.heading)).toContain('Psychological Triggers Used');

        expect(parsed.packaging?.concepts).toHaveLength(2);
        expect(parsed.packaging?.concepts[0].name).toBe('The Cinematic Dawn');
        expect(parsed.packaging?.textOptions).toEqual(['THE FIRST GOODBYE', 'THE REAL REASON']);
        expect(parsed.packaging?.combinations).toHaveLength(1);
        expect(parsed.packaging?.combinations[0].name).toBe('Combination A (Emotional/Viral)');
        expect(parsed.packaging?.refinements).toHaveLength(1);
    });

    it('returns empty result for empty input', () => {
        const parsed = parseYoutubeTitleResponse('');
        expect(parsed.items).toHaveLength(0);
        expect(parsed.winner).toBeNull();
        expect(parsed.packaging).toBeNull();
    });

    it('parses the real chatbot response file when available', () => {
        const filePath = path.resolve(
            __dirname,
            '../../../_biong_backend/prompts/generate-title-youtube-response.md',
        );
        if (!fs.existsSync(filePath)) {
            return;
        }
        const parsed = parseYoutubeTitleResponse(fs.readFileSync(filePath, 'utf8'));
        expect(parsed.items.length).toBeGreaterThanOrEqual(10);
        expect(parsed.items[0].title).toBe('The First Time Humans Said Goodbye');
        expect(parsed.items[0].subScores).toContainEqual({ label: 'emotional impact', value: '10' });
        expect(parsed.items[0].why.length).toBeGreaterThan(0);
        expect(parsed.audienceInsight.length).toBeGreaterThanOrEqual(3);
        expect(parsed.winner?.title).toBe('The First Time Humans Said Goodbye');
        expect(parsed.packaging?.concepts.length).toBe(5);
        expect(parsed.packaging?.textOptions.length).toBe(5);
        // Field mới: description + hashtags + tags + SEO score.
        expect(parsed.description.length).toBeGreaterThan(0);
        expect(parsed.description).toContain('#prehistory');
        expect(parsed.hashtags.length).toBeGreaterThanOrEqual(3);
        expect(parsed.tags.length).toBeGreaterThanOrEqual(10);
        expect(parsed.seo.title?.score).toBe(88);
        expect(parsed.seo.title?.notes.length).toBeGreaterThan(0);
        expect(parsed.seo.description?.score).toBe(84);
    });

    it('parses JSON response wrapped in a code fence', () => {
        const wrapped = '```json\n' + JSON.stringify({
            audience_insight: {
                target_audience: 'Gen Z viewers',
                primary_motivation: 'Entertainment',
                primary_reason_to_click: 'Curiosity',
            },
            titles: [
                {
                    rank: 1,
                    title: 'Sample Title',
                    viral_score: 9.2,
                    score_breakdown: { curiosity: 9, emotional_impact: 9, clarity: 9, viral_potential: 9, ctr_potential: 10 },
                    why_it_works: ['Reason A', 'Reason B'],
                },
            ],
            winner: {
                title: 'Sample Title',
                why_strongest: 'Strongest hook.',
                psychological_triggers: ['Curiosity gap'],
                audience_segment: 'Gen Z',
            },
            description: 'Sample description\n\n#tag1 #tag2 #tag3',
            first_comment: 'What would you have done differently?',
            hashtags: ['#tag1', '#tag2', '#tag3'],
            tags: ['tag one', 'tag two'],
            seo_score: {
                title: { score: 90, notes: ['Good keyword placement'] },
                description: { score: 75, notes: ['Add more keywords'] },
            },
        }) + '\n```';

        const parsed = parseYoutubeTitleResponse(wrapped);
        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0].title).toBe('Sample Title');
        expect(parsed.items[0].viralScore).toBe('9.2/10');
        expect(parsed.items[0].subScores).toContainEqual({ label: 'ctr potential', value: '10' });
        expect(parsed.audienceInsight).toContainEqual({ label: 'Target Audience', value: 'Gen Z viewers' });
        expect(parsed.winner?.sections.map((s) => s.heading)).toEqual([
            'Why it is the strongest option',
            'Psychological Triggers Used',
            'Audience Segment It Will Attract',
        ]);
        expect(parsed.description).toContain('#tag1');
        expect(parsed.firstComment).toBe('What would you have done differently?');
        expect(parsed.hashtags).toEqual(['#tag1', '#tag2', '#tag3']);
        expect(parsed.tags).toEqual(['tag one', 'tag two']);
        expect(parsed.seo.title).toEqual({ score: 90, scoreLabel: '90/100', notes: ['Good keyword placement'] });
        expect(parsed.seo.description?.score).toBe(75);
    });
});

describe('isYoutubeTitleResponse', () => {
    it('accepts a valid JSON title response', () => {
        expect(isYoutubeTitleResponse(JSON.stringify({
            titles: [{ rank: 1, title: 'A real title' }],
            description: 'desc',
        }))).toBe(true);
    });

    it('accepts the legacy markdown title response', () => {
        expect(isYoutubeTitleResponse(SAMPLE)).toBe(true);
    });

    it('rejects empty, plain text and thumbnail-like content', () => {
        expect(isYoutubeTitleResponse('')).toBe(false);
        expect(isYoutubeTitleResponse('just some random clipboard text')).toBe(false);
        expect(isYoutubeTitleResponse(JSON.stringify([{
            rank: 1,
            concept_name: 'The First Tear',
            thumbnail_text: 'X',
            image_generation_prompt: 'prompt',
        }]))).toBe(false);
    });
});
