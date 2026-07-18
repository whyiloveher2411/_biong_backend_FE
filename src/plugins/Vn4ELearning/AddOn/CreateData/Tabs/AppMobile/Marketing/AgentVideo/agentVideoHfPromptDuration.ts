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
    const rawDuration = Number(durationSec);
    if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
        throw new Error('Thiếu thời lượng audio hợp lệ để điền vào prompt');
    }
    const totalSec = Math.max(0.1, rawDuration);

    let result = template;

    const replacePct = (_match: string, percentRaw: string) => {
        const percent = Math.min(100, Math.max(0, Number(percentRaw) || 0));
        return formatDurationSec((totalSec * percent) / 100);
    };

    result = result.replace(/\[pct_(\d{1,3})\]/g, replacePct);
    // legacy token — tránh nhầm "second_60" = 6 giây
    result = result.replace(/\[second_(\d{1,3})\]/g, replacePct);

    result = result.replace(/\[second\]/g, formatDurationSec(totalSec));
    result = result
        .replace(/\{\{DURATION(?:_SEC)?\}\}/g, formatDurationSec(totalSec))
        .replace(/\{\{CLIP_DURATION_SEC\}\}/g, formatDurationSec(totalSec))
        .replace(/\{\{BEAT_DURATION_SEC\}\}/g, formatDurationSec(totalSec))
        .replace(/\bDURATION\s*=\s*[\d.]+\b/g, `DURATION = ${formatDurationSec(totalSec)}`)
        .replace(/data-duration=["'][\d.]+["']/g, `data-duration="${formatDurationSec(totalSec)}"`);
    result = result.replace(
        /no external fonts, no external images\./g,
        'no external fonts. External images are allowed only when their exact URLs are supplied in the beat visual library.',
    );
    result = result.replace(
        /\n## Assets & information\n[\s\S]*?(?=\n## What HyperFrames lets you build)/g,
        '\n',
    );
    result = result.replace(
        /^- \*\*No brand logos:\*\*.*$/gm,
        '- **No brand logos:** Do NOT place logo artwork, official wordmarks, or watermarks in beat HTML. Neutral typography for product/proper nouns is allowed only when they appear in beat metadata. Do not fake logos with fonts or shapes. Brand overlay is a separate render layer.',
    );
    const forbiddenBrandTerms: Array<[RegExp, string]> = [
        [/logo \/ wordmark/g, 'abstract visual motif'],
        [/logo ident/g, 'abstract motif'],
        [/wordmark/g, 'visual motif'],
        [/brand mark/g, 'visual motif'],
        [/logo flash/g, 'graphic flash'],
        [/A logo that/g, 'A motif that'],
    ];
    forbiddenBrandTerms.forEach(([pattern, replacement]) => {
        result = result.replace(pattern, replacement);
    });
    result = result.replace(
        /Keep the frame visually alive throughout the full duration\. When the main action pauses, maintain subtle motion through ambient layers, secondary elements, light, texture, depth, or micro-interactions\. Avoid any noticeably frozen moment\./g,
        'Keep the frame visually alive during active phases. If this style calls for a held resolved frame, keep the primary foreground decisively still and allow at most imperceptible background texture drift; otherwise maintain subtle secondary or ambient motion.',
    );
    result = result.replace(
        /Open with an immediate visual hook, evolve the composition through meaningful motion beats, and resolve into a strong final frame that remains subtly alive\./g,
        'Open with an immediate visual hook, evolve through meaningful motion beats, and resolve into a strong final frame. Honor any style-specific hold rule for the primary foreground.',
    );
    result = result.replace(
        /^- \*\*No brand logos:\*\*.*$/gm,
        '- **No brand logos:** Do NOT place logo artwork, official wordmarks, or watermarks in beat HTML. Neutral typography for product/proper nouns is allowed only when they appear in beat metadata. Do not fake logos with fonts or shapes. Brand overlay is a separate render layer.',
    );
    result = result.replace(
        /^- \*\*Skip visual motif sections:\*\*.*$/gm,
        '- **Skip brand-resolve sections:** Ignore craft notes about logos, wordmarks, brand marks, or “follow for more” end cards when building a beat sub-composition.',
    );
    // Import HTML đã có contract kỹ thuật/scaffold riêng ở outer prompt.
    // Chỉ giữ art direction của style để tránh toolkit/output contract trùng và mâu thuẫn.
    result = result.replace(/\n## What HyperFrames lets you build[\s\S]*$/g, '');

    return result.trim();
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

