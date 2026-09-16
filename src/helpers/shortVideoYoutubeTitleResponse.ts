/**
 * Parse response chatbot của prompt generate-title-youtube.md thành list có cấu trúc.
 *
 * Format chuẩn hiện tại = JSON object (xem prompts/generate-title-youtube-response.md):
 *   {
 *     "audience_insight": { "target_audience": "...", "primary_motivation": "...", "primary_reason_to_click": "..." },
 *     "titles": [{ "rank": 1, "title": "...", "viral_score": 9.0,
 *                  "score_breakdown": { "curiosity": 8, "emotional_impact": 10, ... },
 *                  "why_it_works": ["..."] }],
 *     "winner": { "title": "...", "why_strongest": "...", "psychological_triggers": ["..."], "audience_segment": "..." },
 *     "packaging": { "thumbnail_concepts": [...], "thumbnail_text_options": [...],
 *                    "best_combinations": [...], "title_refinements": [...] },
 *     "description": "...",
 *     "hashtags": ["#..."],
 *     "tags": ["..."],
 *     "seo_score": { "title": { "score": 88, "notes": ["..."] }, "description": { "score": 85, "notes": ["..."] } }
 *   }
 *
 * Vẫn hỗ trợ fallback markdown cũ (Audience Insight / Top Titles Ranked / Winner / Packaging Suggestions).
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
    /** Thiết bị tạo tò mò AI dùng cho tiêu đề này (JSON mới). */
    curiosityDevice: string;
    /** Câu mô tả khoảng trống tò mò cụ thể mà tiêu đề tạo ra (JSON mới). */
    curiosityGap: string;
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

export type YoutubeSeoScore = {
    score: number | null;
    scoreLabel: string;
    notes: string[];
};

export type YoutubeTitleParseResult = {
    audienceInsight: YoutubeTitleSubScore[];
    items: YoutubeTitleItem[];
    winner: YoutubeTitleWinner | null;
    packaging: YoutubeTitlePackaging | null;
    /** Description hoàn chỉnh theo format mẫu của kênh (đã gồm hashtag). */
    description: string;
    /** Nội dung comment đầu tiên (ghim) kênh sẽ đăng dưới video. */
    firstComment: string;
    hashtags: string[];
    tags: string[];
    seo: {
        title: YoutubeSeoScore | null;
        description: YoutubeSeoScore | null;
    };
};

const BULLET_PREFIX_RE = /^\s*[-*]\s+/;
const EMPTY_SEO = { title: null, description: null } as const;
const EMPTY_RESULT: YoutubeTitleParseResult = {
    audienceInsight: [],
    items: [],
    winner: null,
    packaging: null,
    description: '',
    firstComment: '',
    hashtags: [],
    tags: [],
    seo: { title: null, description: null },
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

/* ────────────────────────── JSON parsing ────────────────────────── */

/** Extract JSON object từ response — có thể bọc trong ```json fence``` hoặc text trước/sau. */
function extractJsonObject(text: string): unknown | null {
    const raw = String(text || '').trim();
    if (!raw || !raw.includes('{')) {
        return null;
    }

    const candidates: string[] = [];
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        candidates.push(fenced[1]);
    }
    candidates.push(raw);

    for (const candidate of candidates) {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start === -1 || end <= start) {
            continue;
        }
        try {
            const parsed = JSON.parse(candidate.slice(start, end + 1));
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            continue;
        }
    }

    return null;
}

function pickString(value: unknown): string {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return '';
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim()) {
        const match = value.match(/-?[\d.]+/);
        if (match) {
            const num = Number(match[0]);
            return Number.isFinite(num) ? num : null;
        }
    }
    return null;
}

function toInt(value: unknown, fallback: number): number {
    const num = toNumber(value);
    return num !== null && num > 0 ? Math.round(num) : fallback;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        if (typeof value === 'string' && value.trim()) {
            return [value.trim()];
        }
        return [];
    }
    return value
        .map((item) => pickString(item))
        .filter((item) => item !== '');
}

function humanizeKey(key: string): string {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeJsonBreakdown(value: unknown): YoutubeTitleSubScore[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }
    return Object.entries(value as Record<string, unknown>)
        .map(([key, raw]) => {
            const num = toNumber(raw);
            if (num === null) {
                return null;
            }
            return { label: key.replace(/_/g, ' '), value: String(num) };
        })
        .filter(Boolean) as YoutubeTitleSubScore[];
}

function normalizeJsonTitles(value: unknown): YoutubeTitleItem[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const items: YoutubeTitleItem[] = [];
    value.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return;
        }
        const obj = entry as Record<string, unknown>;
        const title = pickString(obj.title);
        if (!title) {
            return;
        }
        const rankNumber = toInt(obj.rank, index + 1);
        const rawScore = obj.viral_score ?? obj.viralScore;
        const scoreValue = toNumber(rawScore);
        const subScores = normalizeJsonBreakdown(obj.score_breakdown ?? obj.scoreBreakdown);
        const why = normalizeStringArray(obj.why_it_works ?? obj.whyItWorks ?? obj.why)
            .map((text) => ({ label: '', text }));
        const curiosityDevice = pickString(obj.curiosity_device ?? obj.curiosityDevice);
        const curiosityGap = pickString(obj.curiosity_gap ?? obj.curiosityGap);
        items.push({
            rankNumber,
            rankLabel: `#${rankNumber}`,
            title,
            viralScore: scoreValue !== null ? `${scoreValue}/10` : pickString(rawScore),
            viralScoreValue: scoreValue,
            subScores,
            why,
            curiosityDevice,
            curiosityGap,
        });
    });

    // Sắp xếp theo điểm giảm dần (rank giữ nguyên theo dữ liệu AI trả về).
    items.sort((a, b) => (b.viralScoreValue ?? -1) - (a.viralScoreValue ?? -1));
    return items;
}

function normalizeJsonAudience(value: unknown): YoutubeTitleSubScore[] {
    if (Array.isArray(value)) {
        return value
            .map((entry) => {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    return null;
                }
                const obj = entry as Record<string, unknown>;
                const label = pickString(obj.label ?? obj.key ?? obj.name);
                const val = pickString(obj.value ?? obj.text ?? obj.description);
                if (!label && !val) {
                    return null;
                }
                return { label, value: val };
            })
            .filter(Boolean) as YoutubeTitleSubScore[];
    }

    if (value && typeof value === 'object') {
        const labelMap: Record<string, string> = {
            target_audience: 'Target Audience',
            primary_motivation: 'Primary Motivation',
            primary_reason_to_click: 'Primary Reason They Would Click',
            primary_reason_they_would_click: 'Primary Reason They Would Click',
        };
        return Object.entries(value as Record<string, unknown>)
            .map(([key, raw]) => {
                const val = pickString(raw);
                if (!val) {
                    return null;
                }
                return { label: labelMap[key] ?? humanizeKey(key), value: val };
            })
            .filter(Boolean) as YoutubeTitleSubScore[];
    }

    return [];
}

function normalizeJsonWinner(value: unknown): YoutubeTitleWinner | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const obj = value as Record<string, unknown>;
    const title = pickString(obj.title ?? obj.winner_title ?? obj.winnerTitle);
    const sections: YoutubeWinnerSection[] = [];

    const whyStrongest = pickString(
        obj.why_strongest ?? obj.whyStrongest ?? obj.why_it_is_the_strongest_option,
    );
    if (whyStrongest) {
        sections.push({ heading: 'Why it is the strongest option', lines: [whyStrongest] });
    }

    const triggers = normalizeStringArray(
        obj.psychological_triggers ?? obj.psychologicalTriggers ?? obj.triggers,
    );
    if (triggers.length > 0) {
        sections.push({ heading: 'Psychological Triggers Used', lines: triggers });
    }

    const segment = pickString(
        obj.audience_segment ?? obj.audienceSegment ?? obj.audience_segment_it_will_attract,
    );
    if (segment) {
        sections.push({ heading: 'Audience Segment It Will Attract', lines: [segment] });
    }

    if (!title && sections.length === 0) {
        return null;
    }
    return { title, sections };
}

function normalizeJsonPackaging(value: unknown): YoutubeTitlePackaging | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const obj = value as Record<string, unknown>;

    const concepts: YoutubeThumbnailConcept[] = [];
    const rawConcepts = obj.thumbnail_concepts ?? obj.thumbnailConcepts ?? obj.concepts;
    if (Array.isArray(rawConcepts)) {
        rawConcepts.forEach((entry) => {
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                const item = entry as Record<string, unknown>;
                concepts.push({
                    name: pickString(item.name ?? item.title),
                    description: pickString(item.description),
                });
            } else {
                const plain = pickString(entry);
                if (plain) {
                    concepts.push({ name: plain, description: '' });
                }
            }
        });
    }

    const combinations: YoutubePackageCombination[] = [];
    const rawCombos = obj.best_combinations ?? obj.bestCombinations ?? obj.combinations;
    if (Array.isArray(rawCombos)) {
        rawCombos.forEach((entry) => {
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                const item = entry as Record<string, unknown>;
                combinations.push({
                    name: pickString(item.name ?? item.title),
                    lines: normalizeStringArray(item.lines ?? item.items ?? item.details),
                });
            } else {
                const plain = pickString(entry);
                if (plain) {
                    combinations.push({ name: plain, lines: [] });
                }
            }
        });
    }

    const packaging: YoutubeTitlePackaging = {
        concepts,
        textOptions: normalizeStringArray(
            obj.thumbnail_text_options ?? obj.thumbnailTextOptions ?? obj.text_options,
        ),
        combinations,
        refinements: normalizeStringArray(obj.title_refinements ?? obj.titleRefinements ?? obj.refinements),
        other: normalizeStringArray(obj.other),
    };

    const hasAny = packaging.concepts.length > 0
        || packaging.textOptions.length > 0
        || packaging.combinations.length > 0
        || packaging.refinements.length > 0
        || packaging.other.length > 0;
    return hasAny ? packaging : null;
}

function normalizeJsonSeoEntry(value: unknown): YoutubeSeoScore | null {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return { score: value, scoreLabel: `${value}/100`, notes: [] };
    }
    if (typeof value === 'string') {
        const num = toNumber(value);
        return { score: num, scoreLabel: num !== null ? `${num}/100` : value.trim(), notes: [] };
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const obj = value as Record<string, unknown>;
    const score = toNumber(obj.score ?? obj.value ?? obj.points);
    const notes = normalizeStringArray(obj.notes ?? obj.note ?? obj.feedback ?? obj.improvements);
    if (score === null && notes.length === 0) {
        return null;
    }
    return { score, scoreLabel: score !== null ? `${score}/100` : '', notes };
}

function normalizeJsonResult(data: unknown): YoutubeTitleParseResult | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return null;
    }
    const obj = data as Record<string, unknown>;

    const items = normalizeJsonTitles(obj.titles ?? obj.items);
    const audienceInsight = normalizeJsonAudience(obj.audience_insight ?? obj.audienceInsight);
    const winner = normalizeJsonWinner(obj.winner);
    const packaging = normalizeJsonPackaging(obj.packaging);
    const description = pickString(obj.description);
    const firstComment = pickString(obj.first_comment ?? obj.firstComment);
    const hashtags = normalizeStringArray(obj.hashtags);
    const tags = normalizeStringArray(obj.tags);
    const seoRaw = (obj.seo_score ?? obj.seoScore) as Record<string, unknown> | undefined;
    const seo = {
        title: seoRaw ? normalizeJsonSeoEntry(seoRaw.title ?? seoRaw.seo_title) : null,
        description: seoRaw ? normalizeJsonSeoEntry(seoRaw.description ?? seoRaw.seo_description) : null,
    };

    const hasAnything = items.length > 0
        || audienceInsight.length > 0
        || Boolean(winner)
        || Boolean(packaging)
        || Boolean(description)
        || Boolean(firstComment)
        || hashtags.length > 0
        || tags.length > 0
        || Boolean(seo.title)
        || Boolean(seo.description);

    if (!hasAnything) {
        return null;
    }

    return { audienceInsight, items, winner, packaging, description, firstComment, hashtags, tags, seo };
}

/* ────────────────────────── Markdown fallback ────────────────────────── */

function parseMarkdownTitleResponse(text: string): YoutubeTitleParseResult {
    const result: YoutubeTitleParseResult = {
        ...EMPTY_RESULT,
        audienceInsight: [],
        items: [],
        winner: null,
        packaging: null,
        seo: { ...EMPTY_SEO },
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
                curiosityDevice: '',
                curiosityGap: '',
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

export function parseYoutubeTitleResponse(raw: string): YoutubeTitleParseResult {
    const text = String(raw || '').replace(/\r\n?/g, '\n');
    if (!text.trim()) {
        return EMPTY_RESULT;
    }

    // Response chuẩn mới = JSON object — ưu tiên parse JSON, fallback về markdown cũ.
    const jsonResult = normalizeJsonResult(extractJsonObject(text));
    if (jsonResult) {
        return jsonResult;
    }

    return parseMarkdownTitleResponse(text);
}

/**
 * Kiểm tra text có phải phản hồi tạo tiêu đề hợp lệ — phải parse ra ít nhất 1
 * tiêu đề thật (dùng để chặn lưu nhầm khi user copy sai nội dung clipboard).
 */
export function isYoutubeTitleResponse(raw: string): boolean {
    const parsed = parseYoutubeTitleResponse(raw);
    return parsed.items.some((item) => item.title.trim() !== '');
}
