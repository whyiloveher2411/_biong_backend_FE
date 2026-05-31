import { fade } from 'helpers/mui4/color';

export function safeFadeColor(color?: string, alpha = 0.12): string | undefined {
    const resolved = resolvePostTypeColor(color);
    if (!resolved) {
        return undefined;
    }

    try {
        return fade(resolved, alpha);
    } catch {
        return undefined;
    }
}

const NAMED_COLORS: Record<string, string> = {
    primary: '#3f51b5',
    secondary: '#f50057',
    success: '#43a047',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ff9800',
    red: '#f44336',
    green: '#43a047',
    blue: '#2196f3',
};

export type PostTypeCustomFilter = {
    name: string,
    filters?: string,
    sort?: string,
    group?: string,
    color?: string,
};

export function resolvePostTypeColor(color?: string): string | undefined {
    if (!color || typeof color !== 'string') {
        return undefined;
    }

    const trimmed = color.trim();
    if (!trimmed) {
        return undefined;
    }

    if (trimmed.startsWith('#')) {
        return trimmed;
    }

    if (trimmed.startsWith('rgb(') && !trimmed.includes(',')) {
        const parts = trimmed.replace(/^rgba?\(|\)$/g, '').trim().split(/\s+/);
        if (parts.length >= 3) {
            return parts.length >= 4
                ? `rgba(${parts.join(', ')})`
                : `rgb(${parts.join(', ')})`;
        }
    }

    if (trimmed.startsWith('rgb')) {
        return trimmed;
    }

    return NAMED_COLORS[trimmed.toLowerCase()] ?? trimmed;
}

export function getPostTypeColorBackground(color?: string, alpha = 0.12): string | undefined {
    const resolved = resolvePostTypeColor(color);
    if (!resolved) {
        return undefined;
    }

    try {
        return fade(resolved, alpha);
    } catch {
        return resolved;
    }
}

export function getMergedCustomFilters(dataConfig?: {
    filters_custom?: PostTypeCustomFilter[],
    filter_custom?: PostTypeCustomFilter[],
    filters_saved?: PostTypeCustomFilter[],
} | null): PostTypeCustomFilter[] {
    const filtersSaved = Array.isArray(dataConfig?.filters_saved) ? (dataConfig?.filters_saved ?? []) : [];
    const filtersCustom = Array.isArray(dataConfig?.filters_custom)
        ? (dataConfig?.filters_custom ?? [])
        : (Array.isArray(dataConfig?.filter_custom) ? (dataConfig?.filter_custom ?? []) : []);

    return [...filtersSaved, ...filtersCustom];
}
