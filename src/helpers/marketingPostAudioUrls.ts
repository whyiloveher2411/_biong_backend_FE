import { openExternalTabViaExtension } from 'helpers/openExternalTabViaExtension';

type AudioLangMapEntry = {
    url?: string;
};

type AudioLangMap = {
    langs?: Record<string, AudioLangMapEntry>;
};

function openAudioUrlInNewTab(url: string): void {
    const trimmed = String(url || '').trim();
    if (!trimmed) {
        return;
    }

    // Audio preview: mở trực tiếp qua window.open.
    // Extension dedupe OPEN_NEW_TAB_URL (openedRequestKeySet) và giới hạn 1 child tab
    // nên click lần 2 qua openExternalTabViaExtension thường không mở lại được.
    const opened = window.open(trimmed, '_blank', 'noopener,noreferrer');
    if (!opened) {
        openExternalTabViaExtension(trimmed);
    }
}

function parseAudioLangMap(raw: unknown): AudioLangMap {
    if (!raw) {
        return { langs: {} };
    }

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
            return { langs: {} };
        }
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            return typeof parsed === 'object' && parsed !== null
                ? (parsed as AudioLangMap)
                : { langs: {} };
        } catch {
            return { langs: {} };
        }
    }

    if (typeof raw === 'object') {
        return raw as AudioLangMap;
    }

    return { langs: {} };
}

const LANG_SORT_ORDER: Record<string, number> = {
    vi: 0,
    en: 1,
};

export function collectMarketingPostAudioUrls(post: JsonFormat): string[] {
    const map = parseAudioLangMap(post.audio_lang_map);
    const langs = map.langs ?? {};

    const entries = Object.entries(langs)
        .map(([langCode, entry]) => ({
            langCode: langCode.toLowerCase().trim(),
            url: String(entry?.url ?? '').trim(),
        }))
        .filter((entry) => entry.langCode !== '' && entry.url !== '');

    entries.sort((a, b) => {
        const orderA = LANG_SORT_ORDER[a.langCode] ?? 99;
        const orderB = LANG_SORT_ORDER[b.langCode] ?? 99;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.langCode.localeCompare(b.langCode);
    });

    return entries.map((entry) => entry.url);
}

export function openMarketingPostAudioUrls(post: JsonFormat): void {
    const urls = collectMarketingPostAudioUrls(post);
    if (urls.length === 0) {
        window.alert('Chưa có audio nào cho bài viết này');
        return;
    }

    urls.forEach((url) => {
        openAudioUrlInNewTab(url);
    });
}
