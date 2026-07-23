import { formatDurationSec } from './agentVideoHfPromptDuration';
import { buildBeatDivisionLanguageBlock } from './agentVideoContentLanguageBlock';
import { buildHtmlChatbotNoKaraokeRulesBlock, buildBeatDivisionSingleOutputRulesBlock } from './agentVideoHtmlChatbotRules';
import {
    buildBeatDivisionVisualCreativeDirectionBlock,
    buildBeatDivisionVisualCreativeGithubSummaryBlock,
} from './agentVideoBeatDivisionCreativeDirection';
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
            buildBeatDivisionVisualCreativeGithubSummaryBlock(),
            buildBeatDivisionSingleOutputRulesBlock({ relaxDurationBounds: true }),
            '## BeatMap schema v2',
            '- Top-level bắt buộc `schema_version: 2`.',
            '- Mỗi section bắt buộc `visual_description`: follow **Visual description — creative summary** above; English; approximately **40–100 words**; semantic and style-neutral.',
            '- Mỗi section bắt buộc `background` (tiếng Anh, 3–60 từ): mood + texture + 1–2 ràng buộc ngắn; AI tự chọn nền phù hợp visual/nội dung beat.',
            '- Ví dụ background: `Dark navy void, soft grain, cyan haze; no photo plates, no hard cut between beats`.',
            '- Field string JSON: **cấm nháy kép thô** trong nội dung — dùng nháy đơn hoặc `\\"`.',
            '- Cấm visual_description tự đặt palette, font hoặc theme hệ thống; toàn clip lấy từ visual_style.',
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

    return [
        '# Chia beat cho short video marketing',
        '',
        `CLIP_DURATION_SEC=${total}`,
        '',
        buildBeatDivisionLanguageBlock(context.language),
        '## Nhiệm vụ',
        `Chia voiceover **${total}s** thành các beat liên tục **theo cấu trúc nội dung** (không theo công thức giây cố định).`,
        'Mỗi beat = một chapter visual riêng (HTML sẽ generate sau — **chỉ visual, không karaoke**).',
        '',
        '## Cách chia (bắt buộc — ưu tiên nội dung)',
        '- Đọc `audio_script`: ưu tiên **1 beat ≈ 1 đoạn** (cách nhau dòng trống) khi đoạn đó là một ý visual đủ rõ.',
        '- Trong một đoạn nhiều câu: được **gộp** nhiều câu cùng ý; nếu tách thì **chỉ cắt sau dấu kết câu** (`.?!…`) hoặc sau **xuống dòng**.',
        '- **Cấm** đặt `endSec` giữa cụm từ đang nói dở — không bao giờ cắt giữa câu.',
        '- Dùng Whisper word timing để neo `startSec`/`endSec` sát biên câu đó (cuối từ cuối của câu / trước từ đầu câu sau).',
        '- Số beat = theo số ý/đoạn phù hợp — **không** target `ceil(duration/12)` hay khoảng 8–18s/beat.',
        '',
        '## Beat duration — soft hint (không validate cứng trong code)',
        '- Soft: tránh beat **< ~3s** hoặc **> ~30s** khi vẫn giữ nguyên câu.',
        '- Nếu một ý quá dài: tách ở **cuối câu** gần biên hợp lý — **cấm** cắt giữa câu chỉ để “vừa giây”.',
        '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
        '- Chỉ bắt buộc: durationSec > 0, sections phủ liên tục 0 → totalVideoSec.',
        '',
        buildHtmlChatbotNoKaraokeRulesBlock(),
        buildBeatDivisionVisualCreativeDirectionBlock(),
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
                    visual_description: 'A single content channel tries to grab four incompatible trend objects arriving from different directions: a comedy mask, a football, a news microphone, and a film clapper. Each object pulls the channel toward a different path, stretching and fragmenting its structure. As it reaches for the final trend, the channel breaks apart and becomes inactive while all four trends continue moving past, making the consequence visible without warning symbols.',
                    background: 'Deep charcoal void, soft grain, cool cyan haze; no photo plates, no hard cut between beats',
                },
            ],
        }, null, 2),
        '```',
        '',
        '## Quy tắc',
        `- \`totalVideoSec\` = **${total}** (không đổi)`,
        '- `sections` phủ liên tục từ 0 → totalVideoSec, không overlap, không gap',
        '- `id` / `beat_id` = `beat_1`, `beat_2`, …',
        '- `durationSec` = endSec - startSec; soft hint ~3–30s (không bắt buộc); cắt chỉ ở cuối câu/xuống dòng',
        '- `phrase_anchor` = metadata lập kế hoạch beat (không render lên màn hình, không dùng làm karaoke)',
        '- Top-level bắt buộc `schema_version: 2`',
        '- `visual_description`: follow **Visual description — creative direction** above; English; approximately **40–100 words**; semantic and style-neutral',
        '- `background` bắt buộc mỗi section, tiếng Anh 3–60 từ: mood + texture + ràng buộc ngắn; AI tự chọn nền phù hợp visual',
        '- Ví dụ background: `Dark navy void, soft grain, cyan haze; no photo plates, no hard cut between beats`',
        '- Field string JSON: **cấm nháy kép thô** trong nội dung — dùng nháy đơn hoặc `\\"`',
        '- Cấm visual_description tự đặt palette, font hoặc theme hệ thống; toàn clip lấy từ visual_style',
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
