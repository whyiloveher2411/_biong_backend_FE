const HEX_COLOR_PATTERN = /^#?[0-9A-Fa-f]{6}$/;

export function normalizeHexColor(value?: string | null, fallback = ''): string {
    const raw = String(value || '').trim();
    if (!HEX_COLOR_PATTERN.test(raw)) {
        return fallback;
    }

    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    return hex.toUpperCase();
}

export function isValidHexColor(value?: string | null): boolean {
    return normalizeHexColor(value) !== '';
}
