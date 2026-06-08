/**
 * Ngôn ngữ news marketing — nguồn sự thật là sac_language trên app_mobile (backend).
 * FE không hardcode danh sách vi/en; chỉ chuẩn hóa mã khi có context.
 */

export type MarketingAppLanguage = {
    code: string;
    name?: string;
    title?: string;
    flag_code?: string;
    icon_url?: string;
};

export function normalizeMarketingLangCode(code: string | null | undefined): string {
    return String(code ?? '')
        .trim()
        .toLowerCase();
}

export function isMarketingNewsLangEnabled(
    code: string | null | undefined,
    enabledCodes?: readonly string[] | null,
): boolean {
    const normalized = normalizeMarketingLangCode(code);
    if (!normalized) {
        return false;
    }
    if (!enabledCodes || enabledCodes.length === 0) {
        return true;
    }
    return enabledCodes.includes(normalized);
}

export function filterMarketingNewsLangCodes(codes: string[], enabledCodes?: readonly string[] | null): string[] {
    return codes
        .map((code) => normalizeMarketingLangCode(code))
        .filter((code) => code !== '' && isMarketingNewsLangEnabled(code, enabledCodes));
}

export function marketingLangDisplayLabel(lang: MarketingAppLanguage): string {
    const title = String(lang.title ?? lang.name ?? '').trim();
    if (title !== '') {
        return title;
    }
    return normalizeMarketingLangCode(lang.code).toUpperCase();
}
