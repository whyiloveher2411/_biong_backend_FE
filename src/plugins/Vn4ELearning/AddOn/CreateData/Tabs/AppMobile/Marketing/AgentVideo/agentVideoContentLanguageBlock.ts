const LANG_DISPLAY: Record<string, string> = {
    vi: 'Tiếng Việt',
    en: 'Tiếng Anh (English)',
    ja: 'tiếng Nhật',
    ko: 'tiếng Hàn',
    zh: 'tiếng Trung',
    'zh-cn': 'tiếng Trung (giản thể)',
    'zh-tw': 'tiếng Trung (phồn thể)',
    fr: 'tiếng Pháp',
    de: 'tiếng Đức',
    es: 'tiếng Tây Ban Nha',
};

function resolveLangCode(langCode?: string): string {
    const code = String(langCode || 'vi').trim().toLowerCase();
    return code || 'vi';
}

/** Khối ngôn ngữ cho prompt HTML beat — mọi chữ on-screen theo lang short video. */
export function buildBeatHtmlContentLanguageBlock(langCode?: string): string {
    const code = resolveLangCode(langCode);

    if (code === 'vi') {
        return [
            '## Ngôn ngữ nội dung — Tiếng Việt (bắt buộc)',
            'Mọi **natural-language** copy on-screen — headline, nhãn, badge, số đếm, UI chrome — phải **tiếng Việt**.',
            '**Literal exception:** command, filename, package name, code token, path (vd. `/tdd`, `CONTEXT.md`, `npx`) và proper noun có trong metadata beat — giữ nguyên ngôn ngữ nguồn; không dùng như subtitle.',
            'Prompt phong cách visual bên dưới viết bằng tiếng Anh (chỉ hướng dẫn craft) — **không** dùng tiếng Anh cho natural-language copy.',
            '**Cấm** karaoke/caption voiceover — chỉ áp dụng cho text graphic thuần (label, stat, hook visual).',
            '',
        ].join('\n');
    }

    if (code === 'en') {
        return [
            '## Content language — English (mandatory)',
            'All **natural-language** on-screen copy — headlines, labels, badges, counters, UI chrome — must be **English**.',
            '**Literal exception:** commands, filenames, package names, code tokens, and proper nouns from beat metadata stay as-is; never as subtitles.',
            'The visual style section below is craft direction in English — do not mix other languages in natural-language copy.',
            '**No** karaoke/caption voiceover — applies only to decorative graphic text.',
            '',
        ].join('\n');
    }

    const langName = LANG_DISPLAY[code] ?? 'ngôn ngữ đã cấu hình cho short video này';

    return [
        `## Ngôn ngữ nội dung — ${langName} (bắt buộc)`,
        `Mọi **natural-language** copy on-screen phải bằng **${langName}**.`,
        '**Literal exception:** command, filename, code token, proper noun từ metadata — giữ nguyên; không dùng như subtitle.',
        'Prompt phong cách visual bên dưới có thể viết tiếng Anh — chỉ là hướng dẫn craft, không phải ngôn ngữ on-screen.',
        '',
    ].join('\n');
}

/** Nhắc phrase_anchor / metadata beat theo ngôn ngữ video (prompt chia beat). */
export function buildBeatDivisionLanguageBlock(langCode?: string): string {
    const code = resolveLangCode(langCode);
    const langName = LANG_DISPLAY[code] ?? 'ngôn ngữ short video';

    return [
        `## Ngôn ngữ nội dung — ${langName} (bắt buộc)`,
        `- \`phrase_anchor\` và mọi metadata mô tả beat phải viết bằng **${langName}**.`,
        '- Không dùng tiếng Anh cho phrase_anchor khi video không phải tiếng Anh.',
        '',
    ].join('\n');
}
