import fs from 'fs';
import path from 'path';
import { parseYoutubeTitleResponse } from './shortVideoYoutubeTitleResponse';

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
        expect(parsed.items[0].subScores).toContainEqual({ label: 'Emotional Impact', value: '10' });
        expect(parsed.items[0].why.length).toBeGreaterThan(0);
        expect(parsed.items[0].why[0].label).toBe('Emotional Hook');
        expect(parsed.audienceInsight.length).toBeGreaterThanOrEqual(3);
        expect(parsed.winner?.title).toBe('The First Time Humans Said Goodbye');
        expect(parsed.packaging?.concepts.length).toBe(5);
        expect(parsed.packaging?.textOptions.length).toBe(5);
    });
});
