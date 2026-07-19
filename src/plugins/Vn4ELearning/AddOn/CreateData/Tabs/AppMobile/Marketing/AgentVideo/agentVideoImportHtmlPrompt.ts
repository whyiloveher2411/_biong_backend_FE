import {
    DEFAULT_HF_PROMPT_TYPE,
    loadHfPromptTemplate,
} from './agentVideoHfPromptCatalog';
import { applyVideoDurationToHfPromptTemplate, formatDurationSec } from './agentVideoHfPromptDuration';
import {
    buildBeatScaffoldInstructionsBlock,
    buildSingleBeatHtmlScaffold,
} from './agentVideoImportHtmlScaffold';
import { buildBeatHtmlContentLanguageBlock } from './agentVideoContentLanguageBlock';
import { buildHtmlChatbotLayoutSafeZonesBlock, buildHtmlChatbotNoKaraokeRulesBlock, buildHtmlChatbotNoLegacyBorrowRulesBlock, buildHtmlChatbotJsContractBlock, buildHtmlChatbotSingleHtmlFileRulesBlock } from './agentVideoHtmlChatbotRules';
import {
    buildFillBackgroundUsageBlock,
    buildFillCraftPrinciplesBlock,
    buildFillDomScaleRulesBlock,
    buildFillPriorityOrderBlock,
    buildFillTextAndBrandingRulesBlock,
    buildFillWhisperPacingRulesBlock,
    buildVisualDescriptionInterpretationBlock,
    sanitizeUniversalComposerForFill,
} from './agentVideoImportHtmlFillPrompts';
import { formatWhisperWordsForPrompt } from './agentVideoWhisperPromptFormat';
import type { BeatMapSection } from './agentVideoBeatMap';
import type { ImportHtmlVisualCatalogItem } from './agentVideoApi';

export type ImportHtmlContextPayload = {
    success?: boolean;
    short_video_id?: number;
    title?: string;
    language?: string;
    visual_style?: string;
    agent_show_karaoke?: boolean;
    /** @deprecated Transitional read fallback only. */
    hf_theme?: string;
    audio_script?: string;
    audio_file?: string;
    audio_file_duration_sec?: number;
    whisper_words?: Array<{ text: string; start: number; end: number }>;
    whisper_status?: string;
    markers?: unknown[];
    timeline?: Record<string, unknown> | null;
    core_signals?: Record<string, unknown> | null;
    marketing_post_images?: Array<{ url?: string; caption?: string; [key: string]: unknown }>;
    visual_catalog?: ImportHtmlVisualCatalogItem[];
    github_top_repos?: {
        period?: string;
        limit?: number | string;
        repos?: Array<{
            full_name?: string;
            cover_image_url?: string;
            cover_visual_catalog_id?: string;
            visual_catalog_ids?: string[];
            [key: string]: unknown;
        }>;
    };
    source_format?: string;
    thumbnail_url?: string;
    beat_map?: {
        totalVideoSec?: number;
        sections?: BeatMapSection[];
    } | null;
    message?: { content?: string } | string;
};

type VisualLibraryEntry = {
    id?: string;
    media_type: 'image' | 'video';
    url: string;
    preview_url: string;
    title: string;
    caption: string;
    source: 'user_upload' | 'marketing_post' | 'stock';
    provider?: string;
    search_query?: string;
    duration_sec?: number;
};

function resolveVisualCatalogCaption(item: ImportHtmlVisualCatalogItem): string {
    const caption = String(item.caption || '').trim();
    if (caption) {
        return caption;
    }
    const alt = String((item as { alt?: string }).alt || '').trim();
    if (alt) {
        return alt;
    }
    const searchQuery = String(item.search_query || '').trim();
    const title = String(item.title || '').trim();
    if (searchQuery && title) {
        return `${searchQuery} — ${title}`;
    }
    if (searchQuery) {
        return searchQuery;
    }
    if (title) {
        return title;
    }
    return item.media_type === 'video' ? 'Stock video Pexels' : 'Stock image Pexels';
}

export function buildVisualLibraryForPrompt(context: ImportHtmlContextPayload): VisualLibraryEntry[] {
    const uploads: VisualLibraryEntry[] = [];
    const marketing: VisualLibraryEntry[] = [];
    const stock: VisualLibraryEntry[] = [];

    (context.visual_catalog || []).forEach((item) => {
        const url = String(item.url || '').trim();
        if (!url) {
            return;
        }
        const mediaType = item.media_type === 'video' ? 'video' : 'image';
        const source = item.source === 'user_upload' ? 'user_upload' : 'stock';
        const caption = resolveVisualCatalogCaption(item);
        const title = String(item.title || '').trim() || caption;
        const entry: VisualLibraryEntry = {
            id: String(item.id || '').trim() || undefined,
            media_type: mediaType,
            url,
            preview_url: String(item.preview_url || url).trim() || url,
            title,
            caption,
            source,
            provider: String(item.provider || (source === 'user_upload' ? 'upload' : 'pexels')),
        };
        if (item.search_query) {
            entry.search_query = String(item.search_query);
        }
        if (mediaType === 'video' && item.duration_sec) {
            entry.duration_sec = Number(item.duration_sec);
        }
        if (source === 'user_upload') {
            uploads.push(entry);
        } else {
            stock.push(entry);
        }
    });

    (context.marketing_post_images || []).forEach((item, index) => {
        const url = String(item.url || '').trim();
        if (!url) {
            return;
        }
        marketing.push({
            id: String(item.id || '').trim() || `marketing-post-${index + 1}`,
            media_type: 'image',
            url,
            preview_url: url,
            title: String(item.caption || '').trim(),
            caption: String(item.caption || '').trim(),
            source: 'marketing_post',
        });
    });

    return [...uploads, ...marketing, ...stock];
}

function buildVisualLibraryRulesBlock(): string {
    return [
        '## Thư viện visual (user upload + marketing post + Pexels stock)',
        '- Danh sách này đã được lọc: chỉ entry có exact catalog ID xuất hiện trong visual_description mới được cấp cho beat.',
        '- Chọn **0–1** media hero phù hợp; không tự tìm hoặc dùng entry ngoài JSON.',
        '- **Ưu tiên 1 — `source: user_upload`**: đọc `caption` so khớp visual_description + nhịp whisper; dùng đúng `url` nếu phù hợp',
        '- **Ưu tiên 2 — `source: marketing_post`**: `.browser-mockup-card` + `data-marketing-post-image` + `data-marketing-post-image-url`',
        '- **Ưu tiên 3 — `source: stock` (Pexels)**: chỉ khi không có upload/marketing khớp beat',
        '- Ảnh (`media_type: image`): bọc trong `.browser-mockup-card` (traffic-light bar macOS, không padding quanh img)',
        '- External image chỉ được dùng qua `<img src>` với đúng URL trong JSON; không tự fetch hoặc ghép URL khác',
        '- Video stock (`media_type: video`): **CẤM** thẻ `<video>` trong beat — dùng `preview_url` làm `<img>` nền (opacity 0.3–0.6) + parallax/zoom bằng transform cập nhật trong `render()` theo `t`',
        '- Tổng toàn beat tối đa **1 external media source**, tính chung `<img>` và CSS `url(...)`',
        '- Cấm `fetch`/XHR/WebSocket/EventSource; chỉ `<img src>` với đúng URL trong JSON — không bịa URL',
    ].join('\n');
}

function buildCreativeTruthContractBlock(): string {
    return [
        '## CREATIVE TRUTH CONTRACT — ưu tiên cao hơn template style',
        '- `phrase_anchor` và Whisper là nguồn hiểu ý/pacing, **không** được copy nguyên câu hoặc sync word-by-word lên màn hình.',
        '- Cho phép tối đa **3 graphic phrase ngắn, mỗi phrase 1–5 từ**, viết bằng ngôn ngữ nội dung và diễn đạt lại đúng ý `phrase_anchor`; không biến chúng thành phụ đề.',
        '- **CẤM bịa dữ kiện:** số liệu, phần trăm, ngày, phiên bản/build, rank, nguồn trích dẫn, tên người/chức danh, giải thưởng, URL, install command hoặc claim cụ thể.',
        '- Chỉ hiển thị proper noun/fact nếu xuất hiện nguyên nghĩa trong metadata beat hoặc JSON visual; cấm logo artwork/wordmark/watermark (proper noun text trung tính OK khi có trong metadata).',
        '- Ví dụ copy, version, date, metric, URL và command trong template style chỉ là mô tả craft — **không phải dữ liệu được phép render**.',
        '- **Tổng tối đa 1 external media source** cho cả beat, tính chung `<img>` và CSS `url(...)`; có thể dùng 0 media.',
        '- **Cấm JavaScript networking:** `fetch`, XMLHttpRequest, WebSocket, EventSource; cấm `<audio>`, AudioContext và WebAudio.',
        '- Chỉ `<img src>` được phép tải URL xuất hiện nguyên văn trong JSON visual library; cấm tự ghép hoặc suy đoán URL.',
        '- Mọi pixel động phải là hàm xác định của local `t`; không dùng playback state, system time hoặc runtime randomness.',
    ].join('\n');
}

const VISUAL_STYLE_ART_DIRECTION: Record<string, string> = {
    vignelli: 'High-contrast editorial system, disciplined modular grid, bold scale changes, minimal ornament, and precise geometric spacing.',
    'kinetic-type': 'Typography-led visual identity with decisive scale, rhythmic cropping, strong alignment, and energetic but controlled motion.',
    'warm-grain': 'Warm educational storytelling with tactile grain, soft depth, calm spacing, rounded forms, and measured organic movement.',
    'nyt-graph': 'Evidence-led editorial graphics with rigorous hierarchy, restrained chart language, legible annotation, and quiet analytical motion.',
    'swiss-grid': 'Swiss modernist grid, asymmetric balance, strict alignment, neutral structure, and a small number of purposeful accents.',
    'product-promo': 'Polished product presentation with confident depth, refined interface surfaces, focused highlights, and premium reveal timing.',
};

function buildStyleCompatibilityBlock(visualStyle: string): string {
    const resolvedStyle = visualStyle === 'auto' ? 'vignelli' : visualStyle;
    const artDirection = VISUAL_STYLE_ART_DIRECTION[resolvedStyle]
        || VISUAL_STYLE_ART_DIRECTION.vignelli;
    return [
        '## VISUAL STYLE ART DIRECTION — bắt buộc',
        `Clip-level visual_style: \`${resolvedStyle}\`.`,
        `Art direction: ${artDirection}`,
        '- Dùng visual_style như art direction nhất quán cho palette, typography, texture và shape language; không coi đây là template/layout.',
        '- Universal composer quyết định composition riêng cho beat dựa trên visual_description.',
        '- Nếu visual_description yêu cầu palette, font, texture hoặc theme khác, bỏ qua phần đó và giữ visual_style.',
        '- Counters, timestamps và source labels chỉ được dùng khi có dữ kiện thật; cấm transcript-driven word-by-word text.',
        'Nếu style direction phía trên trái với contract này, **contract này thắng**.',
    ].join('\n');
}

function descriptionMentionsExactId(description: string, id: string): boolean {
    if (!id) {
        return false;
    }
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9_-])${escaped}($|[^A-Za-z0-9_-])`).test(description);
}

function parseMessage(message: ImportHtmlContextPayload['message']): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content).trim();
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function filterWhisperForBeat(
    words: Array<{ text: string; start: number; end: number }>,
    startSec: number,
    endSec: number,
) {
    return words
        .filter((word) => {
            const midpoint = (Number(word.start) + Number(word.end)) / 2;
            return midpoint >= startSec && midpoint < endSec;
        })
        .map((word) => ({
            ...word,
            start: Math.max(startSec, Math.min(endSec, Number(word.start))),
            end: Math.max(startSec, Math.min(endSec, Number(word.end))),
        }));
}

const GITHUB_TOP_FORMATS = new Set([
    'github_top',
    'github_top_daily',
    'github_top_weekly',
    'github_top_monthly',
]);

function resolveGithubTopBeatRole(
    context: ImportHtmlContextPayload,
    beat: BeatMapSection,
): { role: 'intro' | 'repo' | 'outro' | 'unknown'; repoIndex: number } {
    const sections = context.beat_map?.sections || [];
    const sectionIndex = Math.max(0, sections.findIndex((sec) => sec.id === beat.id));
    const sectionCount = sections.length;
    const repoItems = context.github_top_repos?.repos;
    const repos = Array.isArray(repoItems) ? repoItems : [];
    const repoCount = repos.length;

    if (sectionCount >= 2) {
        if (sectionIndex === 0) return { role: 'intro', repoIndex: -1 };
        if (sectionIndex === sectionCount - 1) return { role: 'outro', repoIndex: -1 };
    } else if (sectionIndex === 0 && beat.id === 'beat_1') {
        return { role: 'intro', repoIndex: -1 };
    }

    const repoIndex = sectionIndex - 1;
    if (repoIndex >= 0 && repoIndex < repoCount) {
        return { role: 'repo', repoIndex };
    }

    const match = /^beat_(\d+)$/.exec(String(beat.id || ''));
    if (match) {
        const n = Number(match[1]);
        if (n === 1) return { role: 'intro', repoIndex: -1 };
        if (repoCount > 0 && n === repoCount + 2) return { role: 'outro', repoIndex: -1 };
        const idx = n - 2;
        if (idx >= 0 && idx < repoCount) return { role: 'repo', repoIndex: idx };
    }

    return { role: 'unknown', repoIndex: -1 };
}

function buildGithubTopIntroRankRulesBlock(context: ImportHtmlContextPayload): string {
    const repoItems = context.github_top_repos?.repos;
    const repos = Array.isArray(repoItems) ? repoItems : [];
    const rankLines = repos
        .map((repo, i) => {
            const name = String(repo.full_name || '').trim();
            return name ? `- Rank **#${i + 1}**: \`${name}\`` : '';
        })
        .filter(Boolean);

    return [
        '## Visual top-repo — MỞ ĐẦU',
        '- **CẤM** dùng ảnh từ visual library / catalog / stock.',
        '- Chỉ dùng element HTML/CSS/JS (typography, shape, motion) để mở đầu.',
        '',
        '## Rank list trên UI (BẮT BUỘC — github top intro)',
        '- Nếu chia danh sách repo thành **nhiều nhóm / panel / trang / list** theo thời gian (vd list A rồi list B), số thứ tự rank phải **liên tục theo danh sách nguồn** — **CẤM** reset về #1 ở nhóm sau.',
        '- Ví dụ đúng: nhóm 1 = **#1→#5**, nhóm 2 = **#6→#10** (không phải #1→#5 lần nữa).',
        '- Ví dụ sai: nhóm 1 = #1→#5 rồi nhóm 2 cũng #1→#5 / #01→#05.',
        '- Label UI (`#01`, `#1`, `01.`, rank badge, …) phải khớp **rank toàn cục** trong nguồn bên dưới — không đánh số lại theo vị trí trong nhóm.',
        '- Khi reveal từng item theo thời gian, item tiếp theo lấy rank kế tiếp (sau item vừa hiện), không quay lại rank đã dùng.',
        rankLines.length ? '' : '',
        rankLines.length ? '## Danh sách rank nguồn (dùng đúng số này trên UI)' : '',
        ...rankLines,
    ].filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');
}

export async function buildBeatHtmlPrompt(
    context: ImportHtmlContextPayload,
    beat: BeatMapSection,
): Promise<string> {
    const durationSec = Number(beat.durationSec || 0);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
        throw new Error(`Beat ${beat.id}: thiếu durationSec hợp lệ`);
    }

    const promptType = DEFAULT_HF_PROMPT_TYPE;
    const rawTemplate = await loadHfPromptTemplate(promptType);
    const template = sanitizeUniversalComposerForFill(
        applyVideoDurationToHfPromptTemplate(rawTemplate, durationSec),
    );
    const durationFormatted = formatDurationSec(durationSec);
    const durationLabel = `${durationFormatted}s`;
    const showKaraoke = context.agent_show_karaoke !== false;
    const scaffold = buildSingleBeatHtmlScaffold(durationSec, beat.id, { showKaraoke });
    const beatWhisper = filterWhisperForBeat(context.whisper_words || [], beat.startSec, beat.endSec);
    const beatWhisperPrompt = formatWhisperWordsForPrompt(beatWhisper, { timeOffsetSec: beat.startSec });
    const clipTotal = formatDurationSec(Number(context.audio_file_duration_sec || 0));
    const sourceFormat = String(context.source_format || '').trim();
    const isGithubTop = GITHUB_TOP_FORMATS.has(sourceFormat);
    const githubRole = isGithubTop ? resolveGithubTopBeatRole(context, beat) : null;
    const isGithubIntro = githubRole?.role === 'intro';
    let visualLibrary = isGithubIntro || githubRole?.role === 'outro'
        ? []
        : buildVisualLibraryForPrompt(context);
    if (githubRole?.role === 'repo' && githubRole.repoIndex >= 0) {
        const repo = context.github_top_repos?.repos?.[githubRole.repoIndex];
        const allowedIds = new Set([
            String(repo?.cover_visual_catalog_id || '').trim(),
            ...(repo?.visual_catalog_ids || []).map((id) => String(id || '').trim()),
        ].filter(Boolean));
        const coverUrl = String(repo?.cover_image_url || '').trim();
        visualLibrary = visualLibrary.filter((item) => (
            (item.id && allowedIds.has(item.id))
            || (coverUrl && (item.url === coverUrl || item.preview_url === coverUrl))
        ));
    }
    const visualDescription = String(beat.visual_description || '').trim();
    const background = String(beat.background || '').trim();
    visualLibrary = visualLibrary.filter((item) => (
        Boolean(item.id) && descriptionMentionsExactId(visualDescription, String(item.id))
    ));
    const visualStyle = String(context.visual_style || context.hf_theme || 'auto').trim() || 'auto';
    const resolvedStyle = visualStyle === 'auto' ? 'vignelli' : visualStyle;
    const artDirection = VISUAL_STYLE_ART_DIRECTION[resolvedStyle]
        || VISUAL_STYLE_ART_DIRECTION.vignelli;
    const githubIntroRules = isGithubIntro ? buildGithubTopIntroRankRulesBlock(context) : '';
    const visualBlock = githubIntroRules
        ? githubIntroRules
        : [
            buildVisualLibraryRulesBlock(),
            '```json',
            JSON.stringify(visualLibrary, null, 2),
            '```',
        ].join('\n');

    return [
        `# HyperFrames — HTML beat ${beat.id} (${durationLabel})`,
        '',
        `BEAT_DURATION_SEC=${durationFormatted}`,
        `BEAT_ID=${beat.id}`,
        `CLIP_TOTAL_SEC=${clipTotal}`,
        'COMPOSER=universal-composer',
        `VISUAL_STYLE=${visualStyle}`,
        `RESOLVED_ART_DIRECTION=${artDirection}`,
        `VISUAL_DESCRIPTION=${visualDescription}`,
        `BACKGROUND=${background || '(thiếu — suy từ visual_description + VISUAL_STYLE, ưu tiên nền ổn định)'}`,
        '',
        buildFillPriorityOrderBlock(),
        buildVisualDescriptionInterpretationBlock(),
        buildCreativeTruthContractBlock(),
        buildBeatHtmlContentLanguageBlock(context.language),
        buildHtmlChatbotNoKaraokeRulesBlock(),
        buildFillTextAndBrandingRulesBlock(),
        buildHtmlChatbotLayoutSafeZonesBlock({ showKaraoke }),
        visualBlock,
        '',
        buildHtmlChatbotJsContractBlock(durationSec),
        buildFillDomScaleRulesBlock(),
        buildHtmlChatbotNoLegacyBorrowRulesBlock(),
        buildHtmlChatbotSingleHtmlFileRulesBlock(beat.id),
        buildFillCraftPrinciplesBlock(),
        '## Universal composer — technical/art contract (đã sanitize cho fill)',
        template,
        buildStyleCompatibilityBlock(visualStyle),
        '',
        buildFillBackgroundUsageBlock(),
        '---',
        '',
        `# Beat ${beat.id} — short video ID ${context.short_video_id ?? '?'}`,
        `Vị trí trong clip: ${formatDurationSec(beat.startSec)}s → ${formatDurationSec(beat.endSec)}s`,
        `phrase_anchor (metadata — KHÔNG render như subtitle; proper noun literal OK khi cần): ${beat.phrase_anchor}`,
        `visual_description (semantic brief — xem interpretation block): ${visualDescription}`,
        `background (atmosphere — xem BACKGROUND usage): ${background || '(thiếu)'}`,
        githubRole?.role ? `beat_role: ${githubRole.role}` : '',
        '',
        '## Tự test trước khi trả HTML (bắt buộc)',
        '- Contrast chữ vs nền: không chữ chìm / low-contrast trên background đã chọn.',
        '- Hierarchy cỡ chữ trên canvas **1080×1920**: headline / key claim đủ lớn; **cấm** micro-type cho nội dung chính.',
        '- Focal action rõ; frame cuối có chủ đích.',
        '',
        '## Whisper trong beat — CHỈ pacing, CẤM karaoke',
        buildFillWhisperPacingRulesBlock(),
        'Dữ liệu dưới đây chỉ để căn nhịp animation. **Không** tạo element text từ các từ whisper.',
        '```text',
        beatWhisperPrompt,
        '```',
        '',
        buildBeatScaffoldInstructionsBlock(durationSec, beat.id, scaffold),
        '## Checklist',
        `- [ ] data-duration="${durationFormatted}"`,
        `- [ ] const DURATION = ${durationFormatted}`,
        "- [ ] `addEventListener('hf-seek', ...)` còn nguyên — không chỉ `window.render`",
        '- [ ] `function render()` không tham số; dùng `const time = clamp(...)` với Number.isFinite',
        `- [ ] render() tại t=0 và t=${durationFormatted}`,
        '- [ ] Không có karaoke, subtitle, caption, hay text sync voiceover trong HTML',
        '- [ ] Contrast chữ vs nền OK — không chữ chìm',
        '- [ ] Cỡ chữ nội dung chính đủ lớn trên 1080×1920 (không micro-type)',
        '- [ ] Background khớp BACKGROUND / mood beat; không đổi VISUAL_STYLE hệ thống',
        '- [ ] Response là **1 file HTML duy nhất** — không nhiều file, không tách css/js',
        isGithubIntro
            ? '- [ ] (github top intro) Nếu chia nhiều list/panel: rank liên tục (#1→#5 rồi #6→#10) — **không** reset về #1'
            : '',
    ].filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');
}

export { parseMessage as parseImportHtmlContextMessage };
