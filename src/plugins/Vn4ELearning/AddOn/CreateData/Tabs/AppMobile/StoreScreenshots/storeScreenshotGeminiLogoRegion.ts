export type GeminiLogoRegion = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type GeminiLogoRegionInput = GeminiLogoRegion & {
    screenshot_id: string;
};

export type GeminiLogoRegionsById = Record<string, GeminiLogoRegion | null>;

const MIN_NATURAL_SIZE = 8;

export function normalizeGeminiLogoRegion(value: unknown): GeminiLogoRegion | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const row = value as Record<string, unknown>;
    const x = Number(row.x ?? 0);
    const y = Number(row.y ?? 0);
    const w = Number(row.w ?? row.width ?? 0);
    const h = Number(row.h ?? row.height ?? 0);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
        return null;
    }
    if (w < MIN_NATURAL_SIZE || h < MIN_NATURAL_SIZE) {
        return null;
    }

    return {
        x: Math.max(0, Math.round(x)),
        y: Math.max(0, Math.round(y)),
        w: Math.round(w),
        h: Math.round(h),
    };
}

export function displayRectToNaturalRegion(
    displayRect: { left: number; top: number; width: number; height: number },
    image: HTMLImageElement,
): GeminiLogoRegion | null {
    const { clientWidth, clientHeight, naturalWidth, naturalHeight } = image;
    if (
        clientWidth <= 0
        || clientHeight <= 0
        || naturalWidth <= 0
        || naturalHeight <= 0
        || displayRect.width < 4
        || displayRect.height < 4
    ) {
        return null;
    }

    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    return normalizeGeminiLogoRegion({
        x: displayRect.left * scaleX,
        y: displayRect.top * scaleY,
        w: displayRect.width * scaleX,
        h: displayRect.height * scaleY,
    });
}

export function naturalRegionToDisplayRect(
    region: GeminiLogoRegion,
    image: HTMLImageElement,
): { left: number; top: number; width: number; height: number } | null {
    const { clientWidth, clientHeight, naturalWidth, naturalHeight } = image;
    if (clientWidth <= 0 || clientHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
        return null;
    }

    const scaleX = clientWidth / naturalWidth;
    const scaleY = clientHeight / naturalHeight;

    return {
        left: region.x * scaleX,
        top: region.y * scaleY,
        width: region.w * scaleX,
        height: region.h * scaleY,
    };
}

export function buildGeminiLogoRegionPayload(
    regionsById: GeminiLogoRegionsById,
    screenshotIds?: string[],
): GeminiLogoRegionInput[] {
    const ids = screenshotIds && screenshotIds.length > 0
        ? screenshotIds
        : Object.keys(regionsById);

    const payload: GeminiLogoRegionInput[] = [];
    ids.forEach((screenshotId) => {
        const region = normalizeGeminiLogoRegion(regionsById[screenshotId]);
        if (!region) {
            return;
        }
        payload.push({
            screenshot_id: screenshotId,
            ...region,
        });
    });

    return payload;
}

export function countGeminiLogoRegions(regionsById: GeminiLogoRegionsById): number {
    return Object.values(regionsById).filter((region) => Boolean(normalizeGeminiLogoRegion(region))).length;
}
