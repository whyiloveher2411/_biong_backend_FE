/**
 * Parse response chatbot của prompt GỘP generate-content-youtube.md — 1 JSON object chứa
 * CẢ phần title (titles/winner/description/chapters/tags/seo) LẪN phần thumbnail (thumbnails).
 *
 * Tách response thành 2 kết quả có cấu trúc bằng lại 2 parser cũ:
 *  - `title`     → shortVideoYoutubeTitleResponse.parseYoutubeTitleResponse
 *  - `thumbnail` → shortVideoYoutubeThumbnailResponse.parseYoutubeThumbnailResponse
 *
 * (2 prompt cũ generate-title-youtube / generate-thumbnail-youtube đã ngừng dùng nhưng parser
 * vẫn fallback được markdown/array cũ nên an toàn với dữ liệu đã lưu.)
 */

import {
    parseYoutubeTitleResponse,
    type YoutubeTitleParseResult,
} from './shortVideoYoutubeTitleResponse';
import {
    parseYoutubeThumbnailResponse,
    type YoutubeThumbnailParseResult,
} from './shortVideoYoutubeThumbnailResponse';

export type YoutubeContentParseResult = {
    title: YoutubeTitleParseResult;
    thumbnail: YoutubeThumbnailParseResult;
};

export function parseYoutubeContentResponse(raw: string): YoutubeContentParseResult {
    return {
        title: parseYoutubeTitleResponse(raw),
        thumbnail: parseYoutubeThumbnailResponse(raw),
    };
}

/**
 * Kiểm tra text có phải phản hồi prompt gộp hợp lệ — cần ít nhất 1 concept thumbnail, hoặc
 * description/tiêu đề parse được (prompt mới không sinh tiêu đề, có thể chỉ có description).
 * Dùng để chặn lưu nhầm khi user copy sai nội dung clipboard.
 */
export function isYoutubeContentResponse(raw: string): boolean {
    const parsed = parseYoutubeContentResponse(raw);
    return parsed.title.items.some((item) => item.title.trim() !== '')
        || Boolean(parsed.title.description.trim())
        || parsed.thumbnail.concepts.length > 0;
}
