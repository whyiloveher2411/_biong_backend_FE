import { parseYoutubeContentResponse, isYoutubeContentResponse } from './shortVideoYoutubeContentResponse';

/**
 * JSON mẫu của prompt gộp generate-content-youtube.md: dùng title gốc, KHÔNG sinh titles/winner —
 * chỉ description + chapters + tags + SEO và 3 concept thumbnail.
 */
const JSON_SAMPLE = `{
    "audience_insight": {
        "target_audience": "Người tò mò về lịch sử",
        "primary_motivation": "Hiểu nguồn gốc cảm xúc",
        "primary_reason_to_click": "Tò mò phát hiện bất ngờ"
    },
    "main_keyword": "người neanderthal",
    "intro_must_deliver": "Cho thấy bằng chứng chôn cất trong 30 giây đầu.",
    "description": "Khám phá vì sao người neanderthal chôn cất người chết.\\n\\nChapters:\\n{{CHAPTERS}}\\n\\nXem hết video! #history #neanderthal #khoahoc",
    "chapters": [{ "anchor_line": "Khi chúng ta nghĩ về", "anchor_text": "Khi chúng ta nghĩ", "title": "Mở đầu" }],
    "first_comment": "Bạn nghĩ điều gì khiến họ chôn cất người chết?",
    "hashtags": ["#history", "#neanderthal", "#khoahoc"],
    "tags": ["người neanderthal", "lịch sử", "khảo cổ", "chôn cất", "khoa học"],
    "seo_score": {
        "description": { "score": 85, "notes": ["Keyword trong 200 ký tự đầu", "Cấu trúc rõ"] }
    },
    "thumbnails": [{
        "rank": 1,
        "concept_id": 1,
        "concept_name": "The First Tear",
        "template_id": "single_expressive_reaction",
        "template_name": "Nhân vật biểu cảm",
        "template_reason": "Video kể chuyện chôn cất giàu cảm xúc.",
        "spotlight_element": "face",
        "hook_type": "curiosity gap",
        "hook": "Biểu cảm đau buồn của nhân vật.",
        "questions_raised": ["Vì sao họ khóc?", "Họ chôn ai?"],
        "thumbnail_text": "NƯỚC MẮT ĐẦU TIÊN?",
        "thumbnail_subtext": "",
        "viral_score": 97,
        "score_breakdown": { "curiosity_gap": 25, "emotional_impact": 20, "visual_clarity": 19, "title_thumbnail_synergy": 19, "visual_distinctiveness": 14 },
        "image_generation_prompt": "16:9 YouTube thumbnail, 2D digital cartoon. A prehistoric character kneeling beside a pit.",
        "why_it_could_work": "Cảm xúc mạnh tạo kết nối tức thì."
    }]
}`;

describe('parseYoutubeContentResponse', () => {
    it('returns empty results for empty input', () => {
        const parsed = parseYoutubeContentResponse('');
        expect(parsed.title.items).toHaveLength(0);
        expect(parsed.thumbnail.concepts).toHaveLength(0);
    });

    it('splits a merged JSON object into description + thumbnail results (no titles)', () => {
        const parsed = parseYoutubeContentResponse(JSON_SAMPLE);

        // Prompt mới KHÔNG sinh tiêu đề/winner/packaging.
        expect(parsed.title.items).toHaveLength(0);
        expect(parsed.title.winner).toBeNull();
        expect(parsed.title.packaging).toBeNull();

        expect(parsed.title.description).toContain('{{CHAPTERS}}');
        expect(parsed.title.chapters).toHaveLength(1);
        expect(parsed.title.tags).toContain('người neanderthal');
        expect(parsed.title.firstComment).toContain('chôn cất');
        expect(parsed.title.seo.description?.score).toBe(85);
        expect(parsed.title.seo.title).toBeNull();

        expect(parsed.thumbnail.concepts).toHaveLength(1);
        expect(parsed.thumbnail.concepts[0].conceptName).toBe('The First Tear');
        expect(parsed.thumbnail.concepts[0].thumbnailText).toBe('NƯỚC MẮT ĐẦU TIÊN?');
        expect(parsed.thumbnail.concepts[0].imagePrompt).toContain('2D digital cartoon');
    });

    it('parses merged JSON wrapped in a code fence', () => {
        const parsed = parseYoutubeContentResponse('```json\n' + JSON_SAMPLE + '\n```');
        expect(parsed.title.description).toContain('{{CHAPTERS}}');
        expect(parsed.thumbnail.concepts).toHaveLength(1);
    });
});

describe('isYoutubeContentResponse', () => {
    it('accepts a valid merged response', () => {
        expect(isYoutubeContentResponse(JSON_SAMPLE)).toBe(true);
    });

    it('rejects empty and unrelated text', () => {
        expect(isYoutubeContentResponse('')).toBe(false);
        expect(isYoutubeContentResponse('hello world, nothing here')).toBe(false);
    });

    it('accepts a description-only response (new prompt may omit thumbnails)', () => {
        expect(isYoutubeContentResponse(JSON.stringify({
            description: 'Mô tả video có keyword.\\n\\nChapters:\\n{{CHAPTERS}}',
        }))).toBe(true);
    });

    it('still accepts a titles-only response (legacy)', () => {
        expect(isYoutubeContentResponse(JSON.stringify({
            titles: [{ rank: 1, title: 'A valid title' }],
        }))).toBe(true);
    });
});
