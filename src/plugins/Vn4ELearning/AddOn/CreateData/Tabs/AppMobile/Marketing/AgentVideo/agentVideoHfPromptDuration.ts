export function formatDurationSec(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Thay token thời lượng trong template HyperFrames trước khi copy cho chatbot.
 *
 * - `[second]` — tổng thời lượng clip (giây)
 * - `[pct_XX]` — mốc thời gian tại XX% tổng thời lượng (vd. [pct_20] = 20%)
 */
export function applyVideoDurationToHfPromptTemplate(template: string, durationSec: number): string {
    const totalSec = Math.max(0.1, Number(durationSec) || 0);
    if (!Number.isFinite(totalSec) || totalSec <= 0) {
        throw new Error('Thiếu thời lượng audio hợp lệ để điền vào prompt');
    }

    let result = template;

    const replacePct = (_match: string, percentRaw: string) => {
        const percent = Math.min(100, Math.max(0, Number(percentRaw) || 0));
        return formatDurationSec((totalSec * percent) / 100);
    };

    result = result.replace(/\[pct_(\d{1,3})\]/g, replacePct);
    // legacy token — tránh nhầm "second_60" = 6 giây
    result = result.replace(/\[second_(\d{1,3})\]/g, replacePct);

    result = result.replace(/\[second\]/g, formatDurationSec(totalSec));

    return result;
}

export function buildDurationContractBlock(durationSec: number): string {
    const total = formatDurationSec(durationSec);
    return [
        `CLIP_DURATION_SEC=${total}`,
        '',
        '## BẮT BUỘC — thời lượng clip (đọc trước khi generate)',
        `- Tổng thời lượng clip: **${total} giây** — KHÔNG phải 6s, 8s, 10s hay 60s.`,
        `- data-duration="${total}" trên thẻ html — bắt buộc đúng số ${total}.`,
        `- const DURATION = ${total} trong script — bắt buộc, không đổi.`,
        `- render(t) phải cập nhật visual cho mọi t từ 0 đến ${total} (không dừng animation sớm).`,
        '- Dùng mảng SCENES trong scaffold để chia chapter theo whisper.',
        '- Bắt đầu từ scaffold HTML cuối prompt — không viết lại từ đầu.',
        '',
    ].join('\n');
}

