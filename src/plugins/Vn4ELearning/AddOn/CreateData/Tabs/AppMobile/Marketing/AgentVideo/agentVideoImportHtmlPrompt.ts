import { loadHfPromptTemplate } from './agentVideoHfPromptCatalog';
import { applyVideoDurationToHfPromptTemplate, formatDurationSec } from './agentVideoHfPromptDuration';
import {
    buildBeatScaffoldInstructionsBlock,
    buildSingleBeatHtmlScaffold,
} from './agentVideoImportHtmlScaffold';
import { buildBeatHtmlContentLanguageBlock } from './agentVideoContentLanguageBlock';
import { buildHtmlChatbotLayoutSafeZonesBlock, buildHtmlChatbotNoKaraokeRulesBlock, buildHtmlChatbotNoLegacyBorrowRulesBlock, buildHtmlChatbotJsContractBlock, buildHtmlChatbotSingleHtmlFileRulesBlock } from './agentVideoHtmlChatbotRules';
import { formatWhisperWordsForPrompt } from './agentVideoWhisperPromptFormat';
import type { BeatMapSection } from './agentVideoBeatMap';
import type { ImportHtmlVisualCatalogItem } from './agentVideoApi';

export type ImportHtmlContextPayload = {
    success?: boolean;
    short_video_id?: number;
    title?: string;
    language?: string;
    hf_prompt_type?: string;
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

    (context.marketing_post_images || []).forEach((item) => {
        const url = String(item.url || '').trim();
        if (!url) {
            return;
        }
        marketing.push({
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
        '- Chọn **0–1** media hero phù hợp nội dung beat này; không bắt buộc dùng hết catalog',
        '- **Ưu tiên 1 — `source: user_upload`**: đọc `caption` (mô tả user) so khớp `phrase_anchor` + nhịp whisper; dùng đúng `url` nếu phù hợp',
        '- **Ưu tiên 2 — `source: marketing_post`**: `.browser-mockup-card` + `data-marketing-post-image` + `data-marketing-post-image-url`',
        '- **Ưu tiên 3 — `source: stock` (Pexels)**: chỉ khi không có upload/marketing khớp beat',
        '- Ảnh (`media_type: image`): bọc trong `.browser-mockup-card` (traffic-light bar macOS, không padding quanh img)',
        '- Video stock (`media_type: video`): **CẤM** thẻ `<video>` trong beat — dùng `preview_url` làm `<img>` nền (opacity 0.3–0.6) + GSAP parallax/zoom',
        '- Dùng đúng `url` từ JSON — không bịa URL',
    ].join('\n');
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
    return words.filter((word) => word.end >= startSec && word.start <= endSec);
}

const GITHUB_TOP_FORMATS = new Set(['github_top_daily', 'github_top_weekly', 'github_top_monthly']);

function resolveGithubTopBeatRole(
    context: ImportHtmlContextPayload,
    beat: BeatMapSection,
): { role: 'intro' | 'repo' | 'outro' | 'unknown'; repoIndex: number } {
    const sections = context.beat_map?.sections || [];
    const sectionIndex = Math.max(0, sections.findIndex((sec) => sec.id === beat.id));
    const sectionCount = sections.length;
    const repos = Array.isArray(context.github_top_repos?.repos) ? context.github_top_repos.repos : [];
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
    const repos = Array.isArray(context.github_top_repos?.repos) ? context.github_top_repos.repos : [];
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

    const promptType = String(beat.hf_prompt_type || 'universal-composer').trim() || 'universal-composer';
    const rawTemplate = await loadHfPromptTemplate(promptType);
    const template = applyVideoDurationToHfPromptTemplate(rawTemplate, durationSec);
    const durationLabel = `${formatDurationSec(durationSec)}s`;
    const scaffold = buildSingleBeatHtmlScaffold(durationSec, beat.id);
    const beatWhisper = filterWhisperForBeat(context.whisper_words || [], beat.startSec, beat.endSec);
    const beatWhisperPrompt = formatWhisperWordsForPrompt(beatWhisper, { timeOffsetSec: beat.startSec });
    const clipTotal = formatDurationSec(Number(context.audio_file_duration_sec || 0));
    const sourceFormat = String(context.source_format || '').trim();
    const isGithubTop = GITHUB_TOP_FORMATS.has(sourceFormat);
    const githubRole = isGithubTop ? resolveGithubTopBeatRole(context, beat) : null;
    const isGithubIntro = githubRole?.role === 'intro';
    const visualLibrary = isGithubIntro || githubRole?.role === 'outro'
        ? []
        : buildVisualLibraryForPrompt(context);
    const githubIntroRules = isGithubIntro ? buildGithubTopIntroRankRulesBlock(context) : '';

    return [
        `# HyperFrames — HTML beat ${beat.id} (${durationLabel})`,
        '',
        `BEAT_DURATION_SEC=${formatDurationSec(durationSec)}`,
        `BEAT_ID=${beat.id}`,
        `CLIP_TOTAL_SEC=${clipTotal}`,
        '',
        buildBeatHtmlContentLanguageBlock(context.language),
        buildHtmlChatbotNoKaraokeRulesBlock(),
        buildHtmlChatbotLayoutSafeZonesBlock(),
        buildHtmlChatbotNoLegacyBorrowRulesBlock(),
        buildHtmlChatbotSingleHtmlFileRulesBlock(beat.id),
        buildHtmlChatbotJsContractBlock(durationSec),
        '## BẮT BUỘC',
        `- Đây là **một beat** trong clip dài ${clipTotal}s — DURATION = **${formatDurationSec(durationSec)}** giây.`,
        `- \`data-duration="${formatDurationSec(durationSec)}"\` và \`const DURATION = ${formatDurationSec(durationSec)}\` — không đổi.`,
        '- `render()` (đọc biến global `t` qua `hf-seek`) phải hoạt động với mọi time từ 0 đến DURATION.',
        '',
        '## Phong cách visual',
        template,
        '',
        '---',
        '',
        `# Beat ${beat.id} — short video ID ${context.short_video_id ?? '?'}`,
        `Vị trí trong clip: ${formatDurationSec(beat.startSec)}s → ${formatDurationSec(beat.endSec)}s`,
        `phrase_anchor (metadata — KHÔNG render text này lên màn hình): ${beat.phrase_anchor}`,
        githubRole?.role ? `beat_role: ${githubRole.role}` : '',
        beat.image_url && !isGithubIntro && githubRole?.role !== 'outro'
            ? `image_url: ${beat.image_url}`
            : 'image_url: —',
        '',
        '## Whisper trong beat — CHỈ pacing, CẤM karaoke',
        'Dữ liệu dưới đây chỉ để căn nhịp animation. **Không** tạo element text từ các từ whisper.',
        '```text',
        beatWhisperPrompt,
        '```',
        '',
        githubIntroRules,
        githubIntroRules ? '' : buildVisualLibraryRulesBlock(),
        githubIntroRules ? '' : '```json',
        githubIntroRules ? '' : JSON.stringify(visualLibrary, null, 2),
        githubIntroRules ? '' : '```',
        '',
        buildBeatScaffoldInstructionsBlock(durationSec, beat.id, scaffold),
        '## Checklist',
        `- [ ] data-duration="${formatDurationSec(durationSec)}"`,
        `- [ ] const DURATION = ${formatDurationSec(durationSec)}`,
        '- [ ] `addEventListener(\'hf-seek\', ...)` còn nguyên — không chỉ `window.render`',
        '- [ ] `function render()` không tham số; dùng `const time = clamp(t, 0, DURATION)`',
        `- [ ] render() tại t=0 và t=${formatDurationSec(durationSec)}`,
        '- [ ] Không có karaoke, subtitle, caption, hay text sync voiceover trong HTML',
        '- [ ] Response là **1 file HTML duy nhất** — không nhiều file, không tách css/js',
        isGithubIntro
            ? '- [ ] (github top intro) Nếu chia nhiều list/panel: rank liên tục (#1→#5 rồi #6→#10) — **không** reset về #1'
            : '',
    ].filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');
}

export { parseMessage as parseImportHtmlContextMessage };
