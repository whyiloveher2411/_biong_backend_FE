export type StoreScreenshotMultilangText = Record<string, string>;

export const STORE_SCREENSHOT_PROMPT_LANG = 'en';
export const STORE_SCREENSHOT_BULK_LANG = 'vi';

export function normalizeMultilangText(
    raw: StoreScreenshotMultilangText | string | null | undefined,
): StoreScreenshotMultilangText {
    if (!raw) {
        return {};
    }

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
            return {};
        }

        return { [STORE_SCREENSHOT_PROMPT_LANG]: trimmed };
    }

    if (typeof raw === 'object') {
        const result: StoreScreenshotMultilangText = {};
        Object.entries(raw).forEach(([lang, value]) => {
            const trimmed = String(value ?? '').trim();
            if (trimmed) {
                result[lang] = trimmed;
            }
        });
        return result;
    }

    return {};
}

export function getPromptLangText(
    raw: StoreScreenshotMultilangText | string | null | undefined,
    lang: string = STORE_SCREENSHOT_PROMPT_LANG,
): string {
    return normalizeMultilangText(raw)[lang]?.trim() || '';
}

/** Ưu tiên vi cho review UI; chỉ fallback en khi không có vi. */
export function getReviewCopyLines(
    headline: StoreScreenshotMultilangText | string | null | undefined,
    subtitle: StoreScreenshotMultilangText | string | null | undefined,
): { headline: string; subtitle: string } {
    const headlineMap = normalizeMultilangText(headline);
    const subtitleMap = normalizeMultilangText(subtitle);
    const viHeadline = headlineMap[STORE_SCREENSHOT_BULK_LANG]?.trim() || '';
    const viSubtitle = subtitleMap[STORE_SCREENSHOT_BULK_LANG]?.trim() || '';

    if (viHeadline || viSubtitle) {
        return { headline: viHeadline, subtitle: viSubtitle };
    }

    return {
        headline: headlineMap[STORE_SCREENSHOT_PROMPT_LANG]?.trim() || '',
        subtitle: subtitleMap[STORE_SCREENSHOT_PROMPT_LANG]?.trim() || '',
    };
}

export function hasMultilangText(
    raw: StoreScreenshotMultilangText | string | null | undefined,
): boolean {
    return Object.values(normalizeMultilangText(raw)).some((value) => value.trim() !== '');
}

export function setMultilangText(
    raw: StoreScreenshotMultilangText | string | null | undefined,
    lang: string,
    value: string,
): StoreScreenshotMultilangText {
    const next = { ...normalizeMultilangText(raw) };
    const trimmed = value.trim();

    if (trimmed) {
        next[lang] = trimmed;
    } else {
        delete next[lang];
    }

    return next;
}

export function sortLanguagesForScreenshotCopy<T extends { code: string }>(languages: T[]): T[] {
    if (!languages.length) {
        return languages;
    }

    const en = languages.find((lang) => lang.code === STORE_SCREENSHOT_PROMPT_LANG);
    const rest = languages.filter((lang) => lang.code !== STORE_SCREENSHOT_PROMPT_LANG);

    return en ? [en, ...rest] : languages;
}
