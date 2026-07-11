export type ImportHtmlPipelineBlocker = {
    id: string;
    message: string;
    hint?: string;
};

export type ImportHtmlPipelineBlockersInput = {
    scriptApproved: boolean;
    hasAudio: boolean;
    importHtmlReady: boolean;
    whisperStatus: string;
    bgmSegmentCount: number;
    bgmInsufficient: boolean;
    /** Thiếu bao nhiêu giây BGM so với video (nếu biết). */
    bgmShortfallSec?: number;
    assembleOk: boolean;
    assembleStatus?: string;
    assembleError?: string;
};

export type BuildImportHtmlRenderBlockersOptions = {
    /** false = Render tự force_assemble, không bắt đã ghép trước. */
    requireAssembleOk?: boolean;
};

function whisperLabel(status: string): string {
    const normalized = String(status || 'none').trim().toLowerCase();
    if (normalized === 'completed') return 'đã xong';
    if (normalized === 'pending') return 'đang chờ';
    if (normalized === 'processing') return 'đang chạy';
    if (normalized === 'failed') return 'thất bại';
    return normalized || 'chưa chạy';
}

/** True khi lỗi ghép do caption/Whisper sync (có thể bypass sau xác nhận user). */
export function isCaptionSyncAssembleError(rawError: string): boolean {
    const text = String(rawError || '').trim();
    if (!text) return false;
    return /Caption lệch script|verify-caption-sync|cấm dùng Whisper text|caption word count|Timing không monotonic|Unmatched ratio|trusted.*70%|chưa khớp timing Whisper/i.test(
        text,
    );
}

/** Chuyển lỗi kỹ thuật từ daemon/ghép sang câu user hiểu được. */
export function humanizeImportHtmlAssembleError(rawError: string): string {
    const text = String(rawError || '').trim();
    if (!text) return '';

    if (isCaptionSyncAssembleError(text)) {
        const captionSummary = text.match(/Caption lệch script:[^\n.]*?(?:\([^)]+\))?[^.\n]*/i)?.[0]?.trim();
        return [
            captionSummary
                || (text.includes('Caption lệch script')
                    ? 'Caption lệch script — timing Whisper chưa khớp đủ.'
                    : 'Đồng bộ caption thất bại — script và timing Whisper chưa khớp đủ.'),
            'Có thể chạy lại Whisper, hoặc xác nhận tiếp tục render trong dialog (karaoke text vẫn theo audio script; timing có thể lệch).',
        ].join(' ');
    }

    if (/check-beat-timing|beat timing fail|> 20s|>20s/i.test(text)) {
        const beatMatch = text.match(/(beat_\d+)[^:]*:\s*[^>]*>\s*20s/i);
        const beatId = beatMatch?.[1] || 'một beat';
        return [
            `Beat-map không hợp lệ: ${beatId} dài hơn 20 giây (quy tắc visual-shot-plan: mỗi beat 5–20s).`,
            'Vào tab Render → Mở Gemini chia beat lại, hoặc render lại (hệ thống sẽ tự tách beat dài và clone HTML tạm).',
        ].join(' ');
    }

    if (/sync-caption-from-script|whisper_words/i.test(text)) {
        return 'Không align được script với Whisper — chạy transcribe Whisper trên tab Script & TTS rồi render lại.';
    }

    if (/exit\s*1/i.test(text) && !text.includes(':')) {
        return `${text} — xem log render local hoặc thử lại sau khi whisper sẵn sàng.`;
    }

    return text;
}

export function buildImportHtmlAssembleBlockers(
    input: ImportHtmlPipelineBlockersInput,
): ImportHtmlPipelineBlocker[] {
    const blockers: ImportHtmlPipelineBlocker[] = [];

    if (!input.scriptApproved) {
        blockers.push({
            id: 'script',
            message: 'Thiếu: script chưa được duyệt',
            hint: 'Tab Kịch bản → duyệt audio script',
        });
    }
    if (!input.hasAudio) {
        blockers.push({
            id: 'audio',
            message: 'Thiếu: file audio (TTS)',
            hint: 'Chờ TTS hoàn tất hoặc tạo lại audio',
        });
    }
    if (!input.importHtmlReady) {
        blockers.push({
            id: 'beat_html',
            message: 'Thiếu: beat-map hoặc HTML một số beat',
            hint: 'Tab Render → chia beat + sinh HTML từng beat (timeline / Gemini)',
        });
    }
    if (input.whisperStatus !== 'completed') {
        blockers.push({
            id: 'whisper',
            message: `Thiếu: Whisper karaoke (trạng thái: ${whisperLabel(input.whisperStatus)})`,
            hint: 'Tab Script & TTS → bước 4 Karaoke sync (Whisper tự chạy sau audio mới)',
        });
    }

    return blockers;
}

export function buildImportHtmlRenderBlockers(
    input: ImportHtmlPipelineBlockersInput,
    options: BuildImportHtmlRenderBlockersOptions = {},
): ImportHtmlPipelineBlocker[] {
    const requireAssembleOk = options.requireAssembleOk === true;
    const blockers: ImportHtmlPipelineBlocker[] = [
        ...buildImportHtmlAssembleBlockers(input),
    ];

    if (input.bgmSegmentCount <= 0) {
        blockers.push({
            id: 'bgm',
            message: 'Thiếu nhạc nền (BGM) — chưa chọn bài nào',
            hint: 'Mục Nhạc nền phía trên → Chọn → Lưu tài nguyên',
        });
    }
    if (input.bgmInsufficient) {
        const shortfall = Number(input.bgmShortfallSec || 0);
        blockers.push({
            id: 'bgm_duration',
            message: shortfall > 0
                ? `BGM thiếu ~${shortfall.toFixed(1)}s so với độ dài video`
                : 'BGM chưa phủ đủ thời lượng video',
            hint: 'Thêm segment BGM hoặc chọn track dài hơn → Lưu tài nguyên',
        });
    }

    if (requireAssembleOk && !input.assembleOk) {
        const humanized = humanizeImportHtmlAssembleError(input.assembleError || '');
        blockers.push({
            id: 'assemble',
            message: humanized || `Chưa ghép composition thành công (${input.assembleStatus || 'unknown'})`,
            hint: 'Bấm Render video — hệ thống sẽ tự ghép rồi render',
        });
    }

    return blockers;
}
