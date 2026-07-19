import {
    parseBeatMapJson,
    validateBeatBackground,
    validateBeatMap,
    validateBeatVisualDescription,
} from './agentVideoBeatMap';

function words(count: number): string {
    return Array.from({ length: count }, (_, i) => `word${i + 1}`).join(' ');
}

describe('beat map background + visual_description limits', () => {
    it('validateBeatVisualDescription accepts 5–150 words', () => {
        expect(validateBeatVisualDescription(words(5))).toBeTruthy();
        expect(validateBeatVisualDescription(words(100))).toBeTruthy();
        expect(validateBeatVisualDescription(words(4))).toBeNull();
        expect(validateBeatVisualDescription(words(151))).toBeNull();
    });

    it('validateBeatBackground requires English 3–60 words', () => {
        expect(validateBeatBackground('Dark navy void soft grain')).toBeTruthy();
        expect(validateBeatBackground('ab')).toBeNull();
        expect(validateBeatBackground('')).toBeNull();
        expect(validateBeatBackground('nền tối grain')).toBeNull();
    });

    it('parseBeatMapJson requires background', () => {
        const withoutBg = {
            schema_version: 2,
            totalVideoSec: 10,
            sections: [{
                id: 'beat_1',
                beat_id: 'beat_1',
                startSec: 0,
                endSec: 10,
                durationSec: 10,
                phrase_anchor: 'intro',
                visual_description: words(12),
            }],
        };
        const failed = parseBeatMapJson(JSON.stringify(withoutBg));
        expect(failed.map).toBeNull();
        expect(failed.errors.join(' ')).toMatch(/background/i);

        const withBg = {
            ...withoutBg,
            sections: [{
                ...withoutBg.sections[0],
                background: 'Deep charcoal void, soft grain, cyan haze',
            }],
        };
        const ok = parseBeatMapJson(JSON.stringify(withBg));
        expect(ok.map).toBeTruthy();
        if (!ok.map) {
            return;
        }
        expect(ok.map.sections[0].background).toContain('charcoal');

        const validation = validateBeatMap(ok.map, 10);
        expect(validation.valid).toBe(true);
    });
});
