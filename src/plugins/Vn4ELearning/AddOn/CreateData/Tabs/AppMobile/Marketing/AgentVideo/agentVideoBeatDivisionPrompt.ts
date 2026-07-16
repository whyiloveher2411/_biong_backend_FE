import { formatDurationSec } from './agentVideoHfPromptDuration';
import { buildBeatDivisionLanguageBlock } from './agentVideoContentLanguageBlock';
import { buildHtmlChatbotNoKaraokeRulesBlock, buildBeatDivisionSingleOutputRulesBlock } from './agentVideoHtmlChatbotRules';
import {
    buildVisualLibraryForPrompt,
    type ImportHtmlContextPayload,
} from './agentVideoImportHtmlPrompt';
import { formatWhisperWordsForPrompt } from './agentVideoWhisperPromptFormat';

const GITHUB_TOP_FORMATS = new Set([
    'github_top',
    'github_top_daily',
    'github_top_weekly',
    'github_top_monthly',
]);

export function buildBeatDivisionPrompt(context: ImportHtmlContextPayload): string {
    const durationSec = Number(context.audio_file_duration_sec || 0);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
        throw new Error('Thiếu audio_file_duration_sec — không thể tạo prompt chia beat');
    }

    const total = formatDurationSec(durationSec);
    const sourceFormat = String(context.source_format || '').trim();
    const isGithubTop = GITHUB_TOP_FORMATS.has(sourceFormat);
    const visualLibrary = buildVisualLibraryForPrompt(context);
    const catalogIds = visualLibrary
        .map((item) => String(item.id || '').trim())
        .filter(Boolean);
    const catalogRule = catalogIds.length
        ? `- Catalog IDs được phép (ghi nguyên ID trong visual_description nếu dùng): ${catalogIds.map((id) => `\`${id}\``).join(', ')}`
        : '- Không có catalog ID hợp lệ; không tham chiếu media catalog trong visual_description.';

    if (isGithubTop) {
        const topRepos = context.github_top_repos?.repos;
        const repos = Array.isArray(topRepos) ? topRepos : [];
        const repoCount = repos.length;
        const expectedBeats = repoCount + 2;
        const repoLines = repos.map((repo, i) => {
            const rank = i + 1;
            const beatN = i + 2;
            const name = String(repo.full_name || '').trim();
            const cover = String(repo.cover_image_url || '').trim();
            const coverId = String(repo.cover_visual_catalog_id || '').trim();
            return `- Rank #${rank} → **beat_${beatN}**: \`${name}\`${
                coverId ? ` | cover_id=${coverId}` : ''
            }${cover ? ` | cover_url=${cover}` : ''}`;
        });

        return [
            `# Chia beat — GitHub top repo (${sourceFormat})`,
            '',
            `CLIP_DURATION_SEC=${total}`,
            '',
            buildBeatDivisionLanguageBlock(context.language),
            '## Nhiệm vụ',
            `Chia voiceover **${total}s** thành đúng **${expectedBeats} beat** theo cấu trúc cố định top repo.`,
            'Mỗi beat = một chapter visual riêng (HTML generate sau — **chỉ visual, không karaoke**).',
            '',
            '## CẤU TRÚC BEAT BẮT BUỘC',
            '- **beat_1**: INTRO — giới thiệu danh sách; có thể liệt kê tên repo. Ưu tiên visual dựng bằng HTML/CSS.',
            `- **beat_2 → beat_${repoCount + 1}**: đúng 1 repo / beat theo rank.`,
            `- **beat_${repoCount + 2}**: OUTRO / tổng kết. Ưu tiên visual dựng bằng HTML/CSS.`,
            `- Tổng sections = **${expectedBeats}**.`,
            '',
            buildHtmlChatbotNoKaraokeRulesBlock(),
            buildBeatDivisionSingleOutputRulesBlock({ relaxDurationBounds: true }),
            '## BeatMap schema v2',
            '- Top-level bắt buộc `schema_version: 2`.',
            '- Mỗi section bắt buộc `visual_description`: 8–80 từ, viết hoàn toàn bằng tiếng Anh, mô tả content, composition, hierarchy và motion progression.',
            '- Cấm visual_description tự đặt palette, font, texture hoặc theme; toàn clip lấy từ visual_style.',
            '- Không xuất `hf_prompt_type` hoặc `image_url`.',
            '- Media catalog ID trong visual_description phải bọc bằng backtick; mỗi ID chỉ được xuất hiện trong tối đa 1 beat; không dùng ID ngoài danh sách.',
            catalogRule,
            '## Danh sách repo (map beat)',
            repoLines.length ? repoLines.join('\n') : '(chưa có github_top_repos)',
            '',
            '---',
            '',
            `# Short video (ID ${context.short_video_id ?? '?'})`,
            `Tiêu đề: ${context.title || '—'}`,
            `Ngôn ngữ: ${context.language || 'vi'}`,
            `Thời lượng audio: ${total}s`,
            `Source format: ${sourceFormat}`,
            '',
            '## Audio script',
            String(context.audio_script || '').trim() || '(trống)',
            '',
            '## Whisper word timing (chỉ pacing — KHÔNG dùng text làm karaoke/subtitle trong HTML beat)',
            '```text',
            formatWhisperWordsForPrompt(context.whisper_words || []),
            '```',
            '',
            '## Visual catalog (chỉ tham chiếu bằng exact ID trong visual_description)',
            '```json',
            JSON.stringify(visualLibrary, null, 2),
            '```',
            '',
            '## Thumbnail',
            context.thumbnail_url || '—',
        ].join('\n');
    }

    const beatTargetMin = 8;
    const beatTargetMax = 18;
    const estimatedBeats = Math.max(1, Math.ceil(durationSec / 12));

    return [
        '# Chia beat cho short video marketing',
        '',
        `CLIP_DURATION_SEC=${total}`,
        '',
        buildBeatDivisionLanguageBlock(context.language),
        '## Nhiệm vụ',
        `Chia voiceover **${total}s** thành **${estimatedBeats}±** beat liên tục, mỗi beat khoảng **${beatTargetMin}–${beatTargetMax}s**.`,
        'Mỗi beat = một chapter visual riêng (HTML sẽ generate sau — **chỉ visual, không karaoke**).',
        '',
        buildHtmlChatbotNoKaraokeRulesBlock(),
        buildBeatDivisionSingleOutputRulesBlock(),
        '## Output (bắt buộc)',
        '- Trả về **JSON thuần** — không markdown, không giải thích, không ``` fence',
        '- Schema:',
        '```json',
        JSON.stringify({
            schema_version: 2,
            totalVideoSec: Number(total),
            source: 'chatbot',
            sections: [
                {
                    id: 'beat_1',
                    beat_id: 'beat_1',
                    startSec: 0,
                    endSec: 12.4,
                    durationSec: 12.4,
                    phrase_anchor: 'đoạn script tại beat này',
                    visual_description: 'A bold editorial composition with one clear focal card, restrained depth, and deterministic motion timed to the spoken idea.',
                },
            ],
        }, null, 2),
        '```',
        '',
        '## Quy tắc',
        `- \`totalVideoSec\` = **${total}** (không đổi)`,
        '- `sections` phủ liên tục từ 0 → totalVideoSec, không overlap, không gap',
        '- `id` / `beat_id` = `beat_1`, `beat_2`, …',
        '- `durationSec` = endSec - startSec',
        '- `phrase_anchor` = metadata lập kế hoạch beat (không render lên màn hình, không dùng làm karaoke)',
        '- Top-level bắt buộc `schema_version: 2`',
        '- `visual_description` bắt buộc, 8–80 từ, hoàn toàn bằng tiếng Anh; mô tả content, composition, hierarchy, graphic elements và motion progression',
        '- Cấm visual_description tự đặt palette, font, texture hoặc theme; toàn clip lấy từ visual_style',
        '- Không xuất `hf_prompt_type` hoặc `image_url`',
        '- Chỉ dùng catalog ID nguyên văn và bọc bằng backtick trong visual_description; mỗi ID tối đa 1 beat; không có ID thì không tham chiếu catalog',
        catalogRule,
        '',
        '---',
        '',
        `# Short video (ID ${context.short_video_id ?? '?'})`,
        `Tiêu đề: ${context.title || '—'}`,
        `Ngôn ngữ: ${context.language || 'vi'}`,
        `Thời lượng audio: ${total}s`,
        '',
        '## Audio script',
        String(context.audio_script || '').trim() || '(trống)',
        '',
        '## Whisper word timing (chỉ pacing — KHÔNG dùng text làm karaoke/subtitle trong HTML beat)',
        '```text',
        formatWhisperWordsForPrompt(context.whisper_words || []),
        '```',
        '',
        '## Visual catalog (chỉ tham chiếu bằng exact ID trong visual_description)',
        '```json',
        JSON.stringify(visualLibrary, null, 2),
        '```',
        '',
        '## Thumbnail',
        context.thumbnail_url || '—',
    ].join('\n');
}
