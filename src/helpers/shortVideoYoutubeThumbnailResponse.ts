/**
 * Parse response chatbot của prompt generate-thumbnail-youtube.md thành list có cấu trúc.
 *
 * Format chuẩn hiện tại = JSON array (xem prompts/generate-thumbnail-youtube-response.md):
 *   [
 *     {
 *       "rank": 1,
 *       "concept_id": 1,
 *       "concept_name": "The First Tear",
 *       "hook_type": "Strong Emotional Expression",
 *       "hook": "...",
 *       "thumbnail_text": "THE FIRST TEAR?",
 *       "viral_score": 95,
 *       "score_breakdown": {
 *         "curiosity_gap": 23, "emotional_impact": 20, "visual_clarity": 19,
 *         "title_thumbnail_synergy": 19, "visual_distinctiveness": 14
 *       },
 *       "image_generation_prompt": "...",
 *       "why_it_could_work": "..."
 *     }
 *   ]
 *
 * Vẫn hỗ trợ fallback markdown cũ (Step1/Step2/Step3/Winner/Packaging Advice).
 */

export type YoutubeThumbnailPoint = {
    label: string;
    text: string;
};

export type YoutubeThumbnailScoreBreakdownItem = {
    key: string;
    label: string;
    value: number | null;
};

export type YoutubeThumbnailConcept = {
    rank: number;
    viralScore: string;
    viralScoreValue: number | null;
    scoreBreakdown: YoutubeThumbnailScoreBreakdownItem[];
    conceptName: string;
    hookType: string;
    hook: string;
    why: YoutubeThumbnailPoint[];
    visualComposition: YoutubeThumbnailPoint[];
    thumbnailText: string;
    imagePrompt: string;
};

export type YoutubeThumbnailWinner = {
    raw: string;
    points: YoutubeThumbnailPoint[];
};

export type YoutubeThumbnailPackagingAdvice = {
    name: string;
    points: YoutubeThumbnailPoint[];
};

export type YoutubeThumbnailParseResult = {
    videoAnalysis: YoutubeThumbnailPoint[];
    strategyTriggers: YoutubeThumbnailPoint[];
    concepts: YoutubeThumbnailConcept[];
    winner: YoutubeThumbnailWinner | null;
    packagingAdvice: YoutubeThumbnailPackagingAdvice[];
};

const BULLET_PREFIX_RE = /^\s*[-*]\s+/;

/**
 * Response chuẩn mới của prompt generate-thumbnail-youtube là JSON array — có thể
 * được bọc trong ```json fence``` hoặc có text thường trước/sau. Extract JSON hợp lệ từ text.
 */
function extractJsonArray(text: string): unknown | null {
    const raw = String(text || '').trim();
    if (!raw || !raw.includes('[')) {
        return null;
    }

    const candidates: string[] = [];
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        candidates.push(fenced[1]);
    }
    candidates.push(raw);

    for (const candidate of candidates) {
        const start = candidate.indexOf('[');
        const end = candidate.lastIndexOf(']');
        if (start === -1 || end <= start) {
            continue;
        }
        try {
            return JSON.parse(candidate.slice(start, end + 1));
        } catch {
            continue;
        }
    }

    return null;
}

function normalizeJsonConcept(data: unknown, index: number): YoutubeThumbnailConcept | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return null;
    }
    const obj = data as Record<string, ANY>;
    const pick = (...keys: string[]): string => {
        for (const key of keys) {
            const value = obj[key];
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
                return String(value);
            }
        }
        return '';
    };

    const rankRaw = Number(obj.rank ?? obj.concept_id ?? obj.id ?? 0);
    const rank = Number.isFinite(rankRaw) && rankRaw > 0 ? rankRaw : index + 1;
    const conceptName = pick('concept_name', 'conceptName', 'name');
    const thumbnailText = pick('thumbnail_text', 'thumbnailText', 'text');
    const imagePrompt = pick('image_generation_prompt', 'imageGenerationPrompt', 'image_prompt', 'imagePrompt', 'prompt');
    const hookType = pick('hook_type', 'hookType');
    const hook = pick('hook');
    const whyItWorks = pick('why_it_could_work', 'whyItCouldWork', 'why_it_works');

    if (!conceptName && !imagePrompt && !thumbnailText) {
        return null;
    }

    // viral_score: số (thang 100) hoặc chuỗi "9.5/10".
    const rawScore = obj.viral_score ?? obj.viralScore;
    let viralScore = '';
    let viralScoreValue: number | null = null;
    if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
        viralScoreValue = rawScore;
        viralScore = `${rawScore}/100`;
    } else if (typeof rawScore === 'string' && rawScore.trim()) {
        viralScore = rawScore.trim();
        const numeric = viralScore.match(/([\d.]+)/);
        viralScoreValue = numeric ? Number(numeric[1]) : null;
    }

    // score_breakdown: object key → number (thang điểm tự do, UI suy ra tổng nếu cần).
    const scoreBreakdown: YoutubeThumbnailScoreBreakdownItem[] = [];
    const rawBreakdown = obj.score_breakdown ?? obj.scoreBreakdown;
    if (rawBreakdown && typeof rawBreakdown === 'object' && !Array.isArray(rawBreakdown)) {
        Object.entries(rawBreakdown as Record<string, unknown>).forEach(([key, value]) => {
            const numeric = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(numeric)) {
                return;
            }
            scoreBreakdown.push({
                key,
                label: key,
                value: numeric,
            });
        });
    }

    const why: YoutubeThumbnailPoint[] = [];
    if (whyItWorks) {
        why.push({ label: 'why it could work', text: whyItWorks });
    } else if (hook) {
        why.push({ label: 'hook', text: hook });
    }

    return {
        rank,
        viralScore,
        viralScoreValue,
        scoreBreakdown,
        conceptName,
        hookType,
        hook,
        why,
        visualComposition: [],
        thumbnailText,
        imagePrompt,
    };
}

function normalizeJsonConcepts(data: unknown): YoutubeThumbnailConcept[] | null {
    let list: unknown[] | null = null;
    if (Array.isArray(data)) {
        list = data;
    } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, ANY>).concepts)) {
        list = (data as Record<string, unknown>).concepts as unknown[];
    }
    if (!list) {
        return null;
    }

    const concepts = list
        .map((item, index) => normalizeJsonConcept(item, index))
        .filter(Boolean) as YoutubeThumbnailConcept[];

    return concepts.length > 0 ? concepts : null;
}

const EMPTY_RESULT: YoutubeThumbnailParseResult = {
    videoAnalysis: [],
    strategyTriggers: [],
    concepts: [],
    winner: null,
    packagingAdvice: [],
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

function parsePoint(raw: string): YoutubeThumbnailPoint {
    const stripped = String(raw || '').replace(BULLET_PREFIX_RE, '').trim();
    const kv = matchBoldKeyValue(stripped);
    if (kv) {
        return { label: kv.key, text: kv.value };
    }
    return { label: '', text: stripEmphasis(stripped) };
}

function isBullet(line: string): boolean {
    return BULLET_PREFIX_RE.test(line);
}

export function parseYoutubeThumbnailResponse(raw: string): YoutubeThumbnailParseResult {
    const text = String(raw || '').replace(/\r\n?/g, '\n');
    if (!text.trim()) {
        return EMPTY_RESULT;
    }

    // Response chuẩn mới = JSON array — ưu tiên parse JSON, fallback về markdown cũ.
    const jsonConcepts = normalizeJsonConcepts(extractJsonArray(text));
    if (jsonConcepts) {
        return {
            ...EMPTY_RESULT,
            concepts: jsonConcepts,
        };
    }

    const result: YoutubeThumbnailParseResult = {
        videoAnalysis: [],
        strategyTriggers: [],
        concepts: [],
        winner: null,
        packagingAdvice: [],
    };

    let section = '';
    let concept: YoutubeThumbnailConcept | null = null;
    let conceptSub: 'why' | 'visual' | 'text' | 'prompt' | '' = '';
    let winnerRaw = '';
    const winnerPoints: YoutubeThumbnailPoint[] = [];
    let advice: YoutubeThumbnailPackagingAdvice | null = null;

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();

        const h2 = line.match(/^##\s+(.+)$/);
        if (h2) {
            const heading = h2[1].toLowerCase();
            conceptSub = '';
            // Lưu ý: tiêu đề Winner/Packaging có thể chứa chữ "Concept" → xét winner/packaging trước.
            if (heading.includes('video analysis')) {
                section = 'step1';
            } else if (heading.includes('strategy')) {
                section = 'step2';
            } else if (heading.includes('winner')) {
                section = 'winner';
            } else if (heading.includes('packaging')) {
                section = 'packaging';
            } else if (heading.includes('concept')) {
                section = 'step3';
            } else {
                section = 'other';
            }
            continue;
        }

        const h3 = line.match(/^###\s+(.+)$/);
        if (h3) {
            const heading = h3[1].trim();
            const lower = heading.toLowerCase();

            if (section === 'step3') {
                const rankMatch = lower.match(/^rank\s*:?\s*#?\s*(\d+)/);
                if (rankMatch) {
                    concept = {
                        rank: Number(rankMatch[1]),
                        viralScore: '',
                        viralScoreValue: null,
                        scoreBreakdown: [],
                        conceptName: '',
                        hookType: '',
                        hook: '',
                        why: [],
                        visualComposition: [],
                        thumbnailText: '',
                        imagePrompt: '',
                    };
                    result.concepts.push(concept);
                    conceptSub = '';
                    continue;
                }
                if (concept) {
                    const scoreMatch = lower.match(/^viral score\s*:?\s*(.*)$/);
                    if (scoreMatch) {
                        const value = heading.replace(/^viral score\s*:?\s*/i, '').trim();
                        concept.viralScore = value;
                        const numeric = value.match(/([\d.]+)/);
                        concept.viralScoreValue = numeric ? Number(numeric[1]) : null;
                        conceptSub = '';
                        continue;
                    }
                    if (/^concept name\s*:?/i.test(heading)) {
                        concept.conceptName = heading.replace(/^concept name\s*:?\s*/i, '').trim();
                        conceptSub = '';
                        continue;
                    }
                    if (/why it could go viral/i.test(heading)) {
                        conceptSub = 'why';
                        continue;
                    }
                    if (/visual composition/i.test(heading)) {
                        conceptSub = 'visual';
                        continue;
                    }
                    if (/thumbnail text/i.test(heading)) {
                        conceptSub = 'text';
                        continue;
                    }
                    if (/ai image generation prompt/i.test(heading)) {
                        conceptSub = 'prompt';
                        continue;
                    }
                }
                continue;
            }

            if (section === 'packaging') {
                const name = heading.replace(/^\d+\.\s*/, '').trim();
                advice = { name, points: [] };
                result.packagingAdvice.push(advice);
                continue;
            }
            continue;
        }

        if (!line || /^-{3,}$/.test(line)) {
            continue;
        }

        if (section === 'step1') {
            const ordered = line.match(/^\d+\.\s*(.*)$/);
            if (ordered) {
                const kv = matchBoldKeyValue(ordered[1]);
                if (kv) {
                    result.videoAnalysis.push({ label: kv.key, text: kv.value });
                } else {
                    const plain = stripEmphasis(ordered[1]);
                    if (plain) {
                        result.videoAnalysis.push({ label: '', text: plain });
                    }
                }
            }
            continue;
        }

        if (section === 'step2') {
            if (isBullet(line)) {
                const point = parsePoint(line);
                if (point.label || point.text) {
                    result.strategyTriggers.push(point);
                }
            }
            continue;
        }

        if (section === 'step3' && concept) {
            if (conceptSub === 'why') {
                const point = parsePoint(line);
                if (point.label || point.text) {
                    concept.why.push(point);
                }
                continue;
            }
            if (conceptSub === 'visual') {
                const point = parsePoint(line);
                if (point.label || point.text) {
                    concept.visualComposition.push(point);
                }
                continue;
            }
            if (conceptSub === 'text') {
                if (!concept.thumbnailText) {
                    const value = stripEmphasis(line);
                    if (value) {
                        concept.thumbnailText = value;
                    }
                }
                continue;
            }
            if (conceptSub === 'prompt') {
                const value = stripEmphasis(line.replace(/^>\s?/, ''));
                if (value) {
                    concept.imagePrompt = concept.imagePrompt
                        ? `${concept.imagePrompt} ${value}`
                        : value;
                }
                continue;
            }
            continue;
        }

        if (section === 'winner') {
            const winnerMatch = line.match(/^\*\*Winner:\*\*\s*(.*)$/i);
            if (winnerMatch) {
                winnerRaw = stripEmphasis(winnerMatch[1]);
                continue;
            }
            if (isBullet(line)) {
                const point = parsePoint(line);
                if (point.label || point.text) {
                    winnerPoints.push(point);
                }
            }
            continue;
        }

        if (section === 'packaging' && advice) {
            if (isBullet(line)) {
                const point = parsePoint(line);
                if (point.label || point.text) {
                    advice.points.push(point);
                }
            }
            continue;
        }
    }

    result.concepts = result.concepts.filter(
        (item) => item.conceptName || item.imagePrompt || item.thumbnailText,
    );

    if (winnerRaw || winnerPoints.length > 0) {
        result.winner = { raw: winnerRaw, points: winnerPoints };
    }

    return result;
}
