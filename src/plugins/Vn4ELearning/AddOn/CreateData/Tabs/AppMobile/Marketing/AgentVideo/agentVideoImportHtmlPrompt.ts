import { loadHfPromptTemplate } from './agentVideoHfPromptCatalog';
import { applyVideoDurationToHfPromptTemplate, formatDurationSec } from './agentVideoHfPromptDuration';
import {
    buildBeatScaffoldInstructionsBlock,
    buildSingleBeatHtmlScaffold,
} from './agentVideoImportHtmlScaffold';
import { buildHtmlChatbotNoKaraokeRulesBlock, buildHtmlChatbotSingleHtmlFileRulesBlock } from './agentVideoHtmlChatbotRules';
import type { BeatMapSection } from './agentVideoBeatMap';

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
    thumbnail_url?: string;
    beat_map?: {
        totalVideoSec?: number;
        sections?: BeatMapSection[];
    } | null;
    message?: { content?: string } | string;
};

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
    const clipTotal = formatDurationSec(Number(context.audio_file_duration_sec || 0));

    return [
        `# HyperFrames — HTML beat ${beat.id} (${durationLabel})`,
        '',
        `BEAT_DURATION_SEC=${formatDurationSec(durationSec)}`,
        `BEAT_ID=${beat.id}`,
        `CLIP_TOTAL_SEC=${clipTotal}`,
        '',
        buildHtmlChatbotNoKaraokeRulesBlock(),
        buildHtmlChatbotSingleHtmlFileRulesBlock(beat.id),
        '## BẮT BUỘC',
        `- Đây là **một beat** trong clip dài ${clipTotal}s — DURATION = **${formatDurationSec(durationSec)}** giây.`,
        `- \`data-duration="${formatDurationSec(durationSec)}"\` và \`const DURATION = ${formatDurationSec(durationSec)}\` — không đổi.`,
        '- `render(t)` phải hoạt động với mọi t từ 0 đến DURATION.',
        '',
        '## Phong cách visual',
        template,
        '',
        '---',
        '',
        `# Beat ${beat.id} — video Spacedev ID ${context.short_video_id ?? '?'}`,
        `Vị trí trong clip: ${formatDurationSec(beat.startSec)}s → ${formatDurationSec(beat.endSec)}s`,
        `phrase_anchor (metadata — KHÔNG render text này lên màn hình): ${beat.phrase_anchor}`,
        beat.image_url ? `image_url: ${beat.image_url}` : 'image_url: —',
        '',
        '## Whisper trong beat — CHỈ pacing, CẤM karaoke',
        'Dữ liệu dưới đây chỉ để căn nhịp animation. **Không** tạo element text từ các từ whisper.',
        '```json',
        JSON.stringify(
            beatWhisper.map((w) => ({
                ...w,
                start: Math.round((w.start - beat.startSec) * 10) / 10,
                end: Math.round((w.end - beat.startSec) * 10) / 10,
            })),
            null,
            2,
        ),
        '```',
        '',
        '## Ảnh marketing (tham khảo)',
        '```json',
        JSON.stringify(context.marketing_post_images || [], null, 2),
        '```',
        '',
        buildBeatScaffoldInstructionsBlock(durationSec, beat.id, scaffold),
        '## Checklist',
        `- [ ] data-duration="${formatDurationSec(durationSec)}"`,
        `- [ ] const DURATION = ${formatDurationSec(durationSec)}`,
        `- [ ] render() tại t=0 và t=${formatDurationSec(durationSec)}`,
        '- [ ] Không có karaoke, subtitle, caption, hay text sync voiceover trong HTML',
        '- [ ] Response là **1 file HTML duy nhất** — không nhiều file, không tách css/js',
    ].join('\n');
}

export { parseMessage as parseImportHtmlContextMessage };
