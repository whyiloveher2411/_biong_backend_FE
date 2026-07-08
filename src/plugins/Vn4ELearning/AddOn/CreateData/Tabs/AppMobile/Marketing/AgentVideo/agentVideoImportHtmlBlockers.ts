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
    assembleOk: boolean;
    assembleStatus?: string;
    assembleError?: string;
};

function whisperLabel(status: string): string {
    const normalized = String(status || 'none').trim().toLowerCase();
    if (normalized === 'completed') return 'đã xong';
    if (normalized === 'pending') return 'đang chờ';
    if (normalized === 'processing') return 'đang chạy';
    if (normalized === 'failed') return 'thất bại';
    return normalized || 'chưa chạy';
}

/** Chuyển lỗi kỹ thuật từ daemon/ghép sang câu user hiểu được. */
export function humanizeImportHtmlAssembleError(rawError: string): string {
    const text = String(rawError || '').trim();
    if (!text) return '';

    if (/verify-caption-sync/i.test(text)) {
        return [
            'Đồng bộ caption thất bại (verify-caption-sync).',
            'Script và timing Whisper chưa khớp đủ — kiểm tra audio script và chạy lại transcribe Whisper.',
            'Ghép lại sau khi whisper_status = completed.',
        ].join(' ');
    }

    if (/check-beat-timing|beat timing fail|> 20s|>20s/i.test(text)) {
        const beatMatch = text.match(/(beat_\d+)[^:]*:\s*[^>]*>\s*20s/i);
        const beatId = beatMatch?.[1] || 'một beat';
        return [
            `Beat-map không hợp lệ: ${beatId} dài hơn 20 giây (quy tắc visual-shot-plan: mỗi beat 5–20s).`,
            'Vào tab HTML chatbot → Mở Gemini chia beat lại, hoặc ghép lại (hệ thống sẽ tự tách beat dài và clone HTML tạm).',
        ].join(' ');
    }

    if (/sync-caption-from-script|whisper_words/i.test(text)) {
        return 'Không align được script với Whisper — chạy transcribe Whisper trên tab HTML chatbot rồi ghép lại.';
    }

    if (/exit\s*1/i.test(text) && !text.includes(':')) {
        return `${text} — xem log ghép local hoặc thử ghép lại sau khi whisper sẵn sàng.`;
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
            message: 'Script chưa được duyệt',
            hint: 'Tab Kịch bản → duyệt audio script',
        });
    }
    if (!input.hasAudio) {
        blockers.push({
            id: 'audio',
            message: 'Chưa có file audio (TTS)',
            hint: 'Chờ TTS hoàn tất hoặc tạo lại audio',
        });
    }
    if (!input.importHtmlReady) {
        blockers.push({
            id: 'beat_html',
            message: 'Chưa đủ beat-map + HTML tất cả beat',
            hint: 'Tab HTML chatbot → chia beat + sinh HTML từng beat',
        });
    }
    if (input.whisperStatus !== 'completed') {
        blockers.push({
            id: 'whisper',
            message: `Whisper chưa sẵn sàng (${whisperLabel(input.whisperStatus)})`,
            hint: 'Tab HTML chatbot → chạy transcribe Whisper (karaoke sync tự động khi ghép)',
        });
    }

    return blockers;
}

export function buildImportHtmlRenderBlockers(
    input: ImportHtmlPipelineBlockersInput,
): ImportHtmlPipelineBlocker[] {
    const blockers: ImportHtmlPipelineBlocker[] = [
        ...buildImportHtmlAssembleBlockers(input),
    ];

    if (input.bgmSegmentCount <= 0) {
        blockers.push({
            id: 'bgm',
            message: 'Chưa chọn nhạc nền (BGM)',
            hint: 'Mục Nhạc nền phía trên → Chọn → Lưu tài nguyên',
        });
    }
    if (input.bgmInsufficient) {
        blockers.push({
            id: 'bgm_duration',
            message: 'BGM chưa phủ đủ thời lượng video',
            hint: 'Thêm segment BGM hoặc chọn track dài hơn',
        });
    }

    if (!input.assembleOk) {
        const humanized = humanizeImportHtmlAssembleError(input.assembleError || '');
        blockers.push({
            id: 'assemble',
            message: humanized || `Ghép import_html chưa thành công (${input.assembleStatus || 'unknown'})`,
            hint: 'Tab HTML chatbot → Ghép video hoặc xem log daemon',
        });
    }

    return blockers;
}
