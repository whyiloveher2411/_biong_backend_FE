/** Trích phiên âm TTS từ clipboard (Gemini có thể trả thêm markdown/dòng thừa). */
export function extractPhoneticFromPastedText(text: string): string {
    const raw = String(text || '').trim();
    if (!raw) {
        return '';
    }

    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    let candidate = lines[0] || raw;
    for (const line of lines) {
        const lower = line.toLowerCase();
        if (
            lower.startsWith('phiên âm')
            || lower.includes('→')
            || lower.includes('->')
        ) {
            const arrowSplit = line.split(/→|->/);
            if (arrowSplit.length > 1) {
                candidate = arrowSplit[arrowSplit.length - 1].trim();
                break;
            }
        }
    }

    return candidate
        .replace(/^```[\w-]*\s*/i, '')
        .replace(/```$/i, '')
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/^phiên\s*âm\s*(tts)?\s*[:：-]?\s*/i, '')
        .trim();
}
