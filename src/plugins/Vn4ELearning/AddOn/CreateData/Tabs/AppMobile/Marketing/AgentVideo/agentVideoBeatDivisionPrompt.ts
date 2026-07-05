import { HF_PROMPT_CATALOG } from './agentVideoHfPromptCatalog';
import { formatDurationSec } from './agentVideoHfPromptDuration';
import { buildBeatDivisionLanguageBlock } from './agentVideoContentLanguageBlock';
import { buildHtmlChatbotNoKaraokeRulesBlock, buildBeatDivisionSingleOutputRulesBlock } from './agentVideoHtmlChatbotRules';
import type { ImportHtmlContextPayload } from './agentVideoImportHtmlPrompt';
import { formatWhisperWordsForPrompt } from './agentVideoWhisperPromptFormat';

const HF_PROMPT_LIST = HF_PROMPT_CATALOG.map(
    (item) => `- \`${item.key}\` — ${item.label}: ${item.descriptionVi}`,
).join('\n');

export function buildBeatDivisionPrompt(context: ImportHtmlContextPayload): string {
    const durationSec = Number(context.audio_file_duration_sec || 0);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
        throw new Error('Thiếu audio_file_duration_sec — không thể tạo prompt chia beat');
    }

    const total = formatDurationSec(durationSec);
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
                    hf_prompt_type: 'universal-composer',
                    image_url: 'https://… (tùy chọn, từ marketing_post_images)',
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
        '- `hf_prompt_type` chọn 1 trong catalog bên dưới theo nội dung beat',
        '- `image_url` gán từ ảnh marketing khi phù hợp nội dung beat',
        '',
        '## hf_prompt_type catalog',
        HF_PROMPT_LIST,
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
        '## Ảnh marketing post (gán image_url khi phù hợp)',
        '```json',
        JSON.stringify(context.marketing_post_images || [], null, 2),
        '```',
        '',
        '## Thumbnail',
        context.thumbnail_url || '—',
    ].join('\n');
}
