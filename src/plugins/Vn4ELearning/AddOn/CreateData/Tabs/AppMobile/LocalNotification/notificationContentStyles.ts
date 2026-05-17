import type { ContentStyleItem, StyleOptionsState } from './NotificationStylePicker';

/** Fallback khi API chưa trả catalog (đồng bộ với backend content-styles.php). */
export const FALLBACK_CONTENT_STYLES: ContentStyleItem[] = [
    {
        id: 'balanced',
        label: 'Chuẩn & thân thiện',
        short: 'Rõ ràng, ấm áp',
        emoji: '✨',
        example: 'Streak đang chờ — 5 phút là xong!',
    },
    {
        id: 'duolingo',
        label: 'Kiểu Duolingo',
        short: 'Mắng yêu, guilt-trip dí dỏm',
        emoji: '🦉',
        example: 'Streak đang khóc trong góc đấy 👀',
    },
    {
        id: 'fun_playful',
        label: 'Vui nhộn / game',
        short: 'Năng lượng cao, game hóa',
        emoji: '🎮',
        example: 'Boss cuối ngày: 10 thẻ due!',
    },
    {
        id: 'genz_vn',
        label: 'Gen Z / teen Việt',
        short: 'Slang tự nhiên, FOMO vui',
        emoji: '🔥',
        example: 'Streak sắp toang rồi, vào 2 phút thôi!',
    },
    {
        id: 'playful_roast',
        label: 'Cà khịa nhẹ',
        short: 'Teasing bạn thân',
        emoji: '😏',
        example: 'Ủa, bỏ streak luôn hả? Vào đi.',
    },
    {
        id: 'spicy_vn',
        label: 'Tục vui (PG-13)',
        short: 'Chửi thề hài, không xúc phạm',
        emoji: '🌶️',
        example: 'Ôi dồi due card đầy rồi, vào lẹ!',
    },
    {
        id: 'coach',
        label: 'Coach / discipline',
        short: 'Kỷ luật, ít joke',
        emoji: '💪',
        example: '10 thẻ due — xong trước 21:00.',
    },
    {
        id: 'minimal',
        label: 'Cực ngắn',
        short: 'Telegram-style',
        emoji: '⚡',
        example: 'Streak? / Vào ngay.',
    },
    {
        id: 'curiosity',
        label: 'Hook tò mò',
        short: 'Cliffhanger nhẹ',
        emoji: '👀',
        example: 'Có thứ đang chờ bạn tối nay…',
    },
];

export const DEFAULT_STYLE_OPTIONS: StyleOptionsState = {
    styleIds: ['balanced'],
    styleCustom: '',
    styleSpice: 'medium',
};

export const DEFAULT_MESSAGE_COUNT = 5;

export function styleOptionsToApiPayload(
    options: StyleOptionsState,
    messageCount?: number
): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        style_ids: options.styleIds,
        style_custom: options.styleCustom,
        style_spice: options.styleSpice,
    };
    if (messageCount !== undefined) {
        payload.message_count = Math.min(20, Math.max(1, messageCount));
    }
    return payload;
}
