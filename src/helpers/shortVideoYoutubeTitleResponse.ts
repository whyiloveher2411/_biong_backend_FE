/**
 * Parse response chatbot của prompt generate-title-youtube.md thành list có cấu trúc.
 *
 * Format tham chiếu (xem prompts/generate-title-youtube-response.md):
 *   ### Audience Insight
 *   * **Target Audience:** ...
 *   ### Top 10 Titles Ranked
 *   **Rank: #1**
 *   **Title:** ...
 *   **Viral Score:** 9.0/10 *(Curiosity: 8, Emotional Impact: 10, ...)*
 *   **Why it works:**
 *   * **Emotional Hook:** ...
 *   ### Winner
 *   **The First Time ...**
 *   **Why it is the strongest option:** ...
 *   ### Packaging Suggestions
 *   #### 5 Thumbnail Concepts
 *   1. **Name:** description
 *   #### Thumbnail Text Options (Maximum 3 Words)
 *   * TEXT
 *   #### Best Title + Thumbnail Combinations
 *   * **Combination A:** ...
 *   #### Title Refinements for A/B Testing
 *   * ...
 */

export type YoutubeTitleSubScore = {
    label: string;
    value: string;
};

export type YoutubeTitleWhyPoint = {
    label: string;
    text: string;
};

export type YoutubeTitleItem = {
    rankNumber: number;
    rankLabel: string;
    title: string;
    viralScore: string;
    viralScoreValue: number | null;
    subScores: YoutubeTitleSubScore[];
    why: YoutubeTitleWhyPoint[];
};

export type YoutubeWinnerSection = {
    heading: string;
    lines: string[];
};

export type YoutubeTitleWinner = {
    title: string;
    sections: YoutubeWinnerSection[];
};

export type YoutubeThumbnailConcept = {
    name: string;
    description: string;
};

export type YoutubePackageCombination = {
    name: string;
    lines: string[];
};

export type YoutubeTitlePackaging = {
    concepts: YoutubeThumbnailConcept[];
    textOptions: string[];
    combinations: YoutubePackageCombination[];
    refinements: string[];
    other: string[];
};

export type YoutubeTitleParseResult = {
    audienceInsight: YoutubeTitleSubScore[];
    items: YoutubeTitleItem[];
    winner: YoutubeTitleWinner | null;
    packaging: YoutubeTitlePackaging | null;
};

const BULLET_PREFIX_RE = /^\s*[-*]\s+/;
const EMPTY_RESULT: YoutubeTitleParseResult = {
    audienceInsight: [],
    items: [],
    winner: null,
    packaging: null,
};

function stripEmphasis(text: string): string {
    return String(text || '')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchBoldKeyValue(line: string): { key: string; value: string } | null {
    const match = String(line || '').trim().match(/^\*\*(.+?):\*\*\s*(.*)$/);
    if (!match) {
        return null;
    }
    return {
        key: stripEmphasis(match[1]).replace(/:\s*$/, '').trim(),
        value: stripEmphasis(match[2]),
    };
}

function parseSubScores(raw: string): {
    viralScore: string;
    viralScoreValue: number | null;
    subScores: YoutubeTitleSubScore[];
} {
    const cleaned = stripEmphasis(raw);
    const scoreMatch = cleaned.match(/([\d.]+)\s*\/\s*10/);
    const viralScore = scoreMatch ? scoreMatch[0] : '';
    const viralScoreValue = scoreMatch ? Number(scoreMatch[1]) : null;

    const subScores: YoutubeTitleSubScore[] = [];
    const paren = cleaned.match(/\(([^)]*)\)/);
    if (paren) {
        paren[1].split(',').forEach((part) => {
            const separator = part.indexOf(':');
            if (separator <= 0) {
                return;
            }
            const label = part.slice(0, separator).trim();
            const value = part.slice(separator + 1).trim();
            if (label && value) {
                subScores.push({ label, value });
            }
        });
    }

    return { viralScore, viralScoreValue, subScores };
}

function parseWhyPoint(raw: string): YoutubeTitleWhyPoint {
    const stripped = String(raw || '').replace(BULLET_PREFIX_RE, '').trim();
    const match = stripped.match(/^\*\*(.+?):?\*\*\s*(.*)$/);
    if (match) {
        return {
            label: stripEmphasis(match[1]).replace(/:\s*$/, '').trim(),
            text: stripEmphasis(match[2]),
        };
    }
    return { label: '', text: stripEmphasis(stripped) };
}

export function parseYoutubeTitleResponse(raw: string): YoutubeTitleParseResult {
    const text = String(raw || '').replace(/\r\n?/g, '\n');
    if (!text.trim()) {
        return EMPTY_RESULT;
    }

    const result: YoutubeTitleParseResult = {
        audienceInsight: [],
        items: [],
        winner: null,
        packaging: null,
    };
    const packaging: YoutubeTitlePackaging = {
        concepts: [],
        textOptions: [],
        combinations: [],
        refinements: [],
        other: [],
    };

    let section = '';
    let current: YoutubeTitleItem | null = null;
    let inWhy = false;
    let winnerTitle = '';
    const winnerSections: YoutubeWinnerSection[] = [];
    let currentWinnerSection: YoutubeWinnerSection | null = null;
    let currentCombination: YoutubePackageCombination | null = null;
    let pkgSub = '';
    let sawPackaging = false;

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();

        const heading = line.match(/^#{2,3}\s+(.*)$/);
        if (heading) {
            const headingText = heading[1].toLowerCase();
            inWhy = false;
            if (headingText.includes('audience')) {
                section = 'audience';
            } else if (headingText.includes('winner')) {
                section = 'winner';
            } else if (headingText.includes('packaging') || headingText.includes('thumbnail concept')) {
                section = 'packaging';
                sawPackaging = true;
            } else if (headingText.includes('title') || headingText.includes('rank')) {
                section = 'titles';
            } else {
                section = 'other';
            }
            continue;
        }

        const subHeading = line.match(/^#{4,6}\s+(.*)$/);
        if (subHeading) {
            if (section === 'packaging') {
                pkgSub = subHeading[1].toLowerCase();
            }
            currentCombination = null;
            continue;
        }

        if (!line || /^-{3,}$/.test(line)) {
            continue;
        }

        const rankMatch = line.match(/^\*\*Rank:\s*#?\s*(\d+)\*\*/i)
            || line.match(/^#+\s*Rank\s*#?\s*(\d+)/i)
            || line.match(/^Rank:\s*#?\s*(\d+)/i);
        if (rankMatch) {
            const rankNumber = Number(rankMatch[1]);
            current = {
                rankNumber,
                rankLabel: `#${rankNumber}`,
                title: '',
                viralScore: '',
                viralScoreValue: null,
                subScores: [],
                why: [],
            };
            result.items.push(current);
            inWhy = false;
            continue;
        }

        if (section === 'audience') {
            const kv = matchBoldKeyValue(line.replace(BULLET_PREFIX_RE, ''));
            if (kv) {
                result.audienceInsight.push({ label: kv.key, value: kv.value });
            }
            continue;
        }

        if (section === 'winner') {
            const boldOnly = line.match(/^\*\*(.+?)\*\*\s*$/);
            if (boldOnly && !/:\s*$/.test(boldOnly[1]) && !winnerTitle) {
                winnerTitle = stripEmphasis(boldOnly[1]);
                currentWinnerSection = null;
                continue;
            }
            const kv = matchBoldKeyValue(line);
            if (kv && !kv.value) {
                currentWinnerSection = { heading: kv.key, lines: [] };
                winnerSections.push(currentWinnerSection);
                continue;
            }
            if (currentWinnerSection) {
                const content = kv
                    ? stripEmphasis(line)
                    : stripEmphasis(line.replace(BULLET_PREFIX_RE, ''));
                if (content) {
                    currentWinnerSection.lines.push(content);
                }
            }
            continue;
        }

        if (section === 'packaging') {
            if (pkgSub.includes('concept')) {
                const ordered = line.match(/^\d+\.\s*(.*)$/);
                const content = ordered ? ordered[1] : line.replace(BULLET_PREFIX_RE, '');
                const kv = matchBoldKeyValue(content);
                if (kv) {
                    packaging.concepts.push({ name: kv.key, description: kv.value });
                } else {
                    const plain = stripEmphasis(content);
                    if (plain) {
                        packaging.concepts.push({ name: plain, description: '' });
                    }
                }
                continue;
            }
            if (pkgSub.includes('text')) {
                const option = stripEmphasis(line.replace(BULLET_PREFIX_RE, ''));
                if (option) {
                    packaging.textOptions.push(option);
                }
                continue;
            }
            if (pkgSub.includes('combination') || pkgSub.includes('best title')) {
                const stripped = line.replace(BULLET_PREFIX_RE, '');
                const kv = matchBoldKeyValue(stripped);
                if (kv) {
                    currentCombination = { name: kv.key, lines: kv.value ? [kv.value] : [] };
                    packaging.combinations.push(currentCombination);
                } else if (currentCombination) {
                    const content = stripEmphasis(stripped);
                    if (content) {
                        currentCombination.lines.push(content);
                    }
                } else {
                    const content = stripEmphasis(stripped);
                    if (content) {
                        packaging.other.push(content);
                    }
                }
                continue;
            }
            if (pkgSub.includes('refinement') || pkgSub.includes('a/b') || pkgSub.includes('ab test')) {
                const content = stripEmphasis(line.replace(BULLET_PREFIX_RE, ''));
                if (content) {
                    packaging.refinements.push(content);
                }
                continue;
            }
            const other = stripEmphasis(line.replace(BULLET_PREFIX_RE, ''));
            if (other) {
                packaging.other.push(other);
            }
            continue;
        }

        if (current) {
            const kv = matchBoldKeyValue(line);
            if (kv) {
                const key = kv.key.toLowerCase();
                if (key.startsWith('title')) {
                    current.title = kv.value;
                    inWhy = false;
                    continue;
                }
                if (key.includes('viral score') || key.includes('score')) {
                    const parsed = parseSubScores(kv.value);
                    current.viralScore = parsed.viralScore;
                    current.viralScoreValue = parsed.viralScoreValue;
                    current.subScores = parsed.subScores;
                    inWhy = false;
                    continue;
                }
                if (key.startsWith('why')) {
                    inWhy = true;
                    if (kv.value) {
                        current.why.push(parseWhyPoint(kv.value));
                    }
                    continue;
                }
            }
            if (inWhy) {
                const point = parseWhyPoint(line);
                if (point.text || point.label) {
                    current.why.push(point);
                }
                continue;
            }
        }
    }

    result.items = result.items.filter(
        (item) => item.title || item.why.length > 0 || item.viralScore,
    );

    if (winnerTitle || winnerSections.length > 0) {
        result.winner = { title: winnerTitle, sections: winnerSections };
    }

    const hasPackaging = sawPackaging
        || packaging.concepts.length > 0
        || packaging.textOptions.length > 0
        || packaging.combinations.length > 0
        || packaging.refinements.length > 0;
    if (hasPackaging) {
        result.packaging = packaging;
    }

    return result;
}
