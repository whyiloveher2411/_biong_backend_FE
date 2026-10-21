/**
 * Tách / định dạng beat của audio script cho workflow.
 *
 * Workflow có 3 kiểu nguồn:
 * 1. Script đã có header "BEAT 01:" → mỗi header là 1 beat (beat có thể nhiều dòng).
 * 2. Beat nhiều dòng, cách nhau bằng dòng trống → mỗi paragraph là 1 beat.
 * 3. Mỗi dòng non-empty là 1 beat.
 *
 * File này không import gì để có thể test độc lập.
 */

export const WORKFLOW_AUDIO_SCRIPT_BEATS_KEY = 'AUDIO-SCRIPT-BEATS';

/** Header beat có sẵn trong audio script: BEAT 01: / BEAT B01 / BEAT 1. */
const WORKFLOW_INPUT_BEAT_RE = /^[ \t]*(?:#{1,6}[ \t]*)?BEAT[ \t]*[:#]?[ \t]*B?(\d{1,4})\b[ \t]*:?[ \t]*(.*)$/gim;

/**
 * Tách audio script thành các beat.
 *
 * Thứ tự ưu tiên:
 * 1. Script đã có header "BEAT 01:" → mỗi header mở 1 beat (beat có thể nhiều dòng).
 * 2. Các đoạn cách nhau bằng dòng trống và TẤT CẢ đoạn đều nhiều dòng → mỗi đoạn
 *    là 1 beat (workflow dùng beat nhiều dòng).
 * 3. Mặc định: mỗi dòng non-empty = 1 beat (workflow 1 dòng 1 beat).
 */
export function splitWorkflowBeats(text: string): string[] {
    const source = String(text || '')
        .replace(/\r\n|\r/g, '\n')
        .trim();
    if (!source) {
        return [];
    }

    // 1) Header BEAT có sẵn — nội dung beat là phần sau header + các dòng tiếp theo.
    const marked = Array.from(source.matchAll(WORKFLOW_INPUT_BEAT_RE));
    if (marked.length > 0) {
        return marked
            .map((match, index) => {
                const start = (match.index ?? 0) + match[0].length;
                const end = index + 1 < marked.length
                    ? (marked[index + 1].index ?? source.length)
                    : source.length;
                const firstLine = String(match[2] || '').trim();
                const continuation = source.slice(start, end).trim();
                return [firstLine, continuation].filter(Boolean).join('\n').trim();
            })
            .filter(Boolean);
    }

    // 2) Beat nhiều dòng: các đoạn cách nhau bằng dòng trống.
    //    Chỉ dùng paragraph khi TẤT CẢ đoạn đều > 1 dòng — tránh gộp nhầm script
    //    1 dòng/beat chỉ vì có dòng trống giữa các cụm.
    const paragraphs = source
        .split(/\n[ \t]*\n+/)
        .map((part) => part.trim())
        .filter(Boolean);
    if (paragraphs.length > 1 && paragraphs.every((part) => part.includes('\n'))) {
        return paragraphs;
    }

    // 3) Mặc định: mỗi dòng non-empty = 1 beat.
    return source
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

/**
 * Xuất danh sách beat thành script có cấu trúc cố định:
 *   BEAT 01: nội dung beat 1
 *
 *   BEAT 02: nội dung beat 2 (có thể nhiều dòng)
 *
 * Chatbot đọc header để biết chính xác ranh giới beat, không tự chia lại theo newline.
 */
export function formatWorkflowBeatScript(beats: string[], startNumber = 1): string {
    const first = Math.max(1, Math.floor(Number(startNumber) || 1));
    return (Array.isArray(beats) ? beats : [])
        .map((beat, index) => {
            const number = String(first + index).padStart(2, '0');
            const content = String(beat || '').trim();
            return content ? `BEAT ${number}: ${content}` : `BEAT ${number}:`;
        })
        .join('\n\n');
}
