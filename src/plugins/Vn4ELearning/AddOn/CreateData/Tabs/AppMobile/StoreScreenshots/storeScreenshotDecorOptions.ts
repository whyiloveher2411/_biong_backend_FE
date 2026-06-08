/** Mặc định bật — chỉ tắt khi user/storage ghi rõ false. */
export function normalizeDecorOptionEnabled(
    value?: boolean | string | number | null,
    defaultEnabled = true,
): boolean {
    if (value === true || value === 1) {
        return true;
    }
    if (value === false || value === 0) {
        return false;
    }
    if (value === null || value === undefined) {
        return defaultEnabled;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
            return true;
        }
        if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
            return false;
        }
    }
    return defaultEnabled;
}

export const DEFAULT_FLOATING_ICONS_ENABLED = true;
export const DEFAULT_BACKGROUND_MOTIFS_ENABLED = true;

export function normalizeFloatingIconsEnabled(value?: boolean | string | number | null): boolean {
    return normalizeDecorOptionEnabled(value, DEFAULT_FLOATING_ICONS_ENABLED);
}

export function normalizeBackgroundMotifsEnabled(value?: boolean | string | number | null): boolean {
    return normalizeDecorOptionEnabled(value, DEFAULT_BACKGROUND_MOTIFS_ENABLED);
}
