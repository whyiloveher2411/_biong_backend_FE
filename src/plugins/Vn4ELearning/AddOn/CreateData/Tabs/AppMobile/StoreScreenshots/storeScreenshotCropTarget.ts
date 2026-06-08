export type CropTargetSizeId =
    | '1242x2688'
    | '2688x1242'
    | '1284x2778'
    | '2778x1284';

export const DEFAULT_CROP_TARGET_SIZE_ID: CropTargetSizeId = '1242x2688';

export type CropTargetSizeOption = {
    id: CropTargetSizeId;
    label: string;
    width: number;
    height: number;
    ratio: string;
    orientation: 'portrait' | 'landscape';
    orientationLabel: 'Dọc' | 'Ngang';
    color: 'primary' | 'secondary' | 'info' | 'success';
};

export const CROP_TARGET_SIZE_OPTIONS: CropTargetSizeOption[] = [
    {
        id: '1242x2688',
        label: '1242 × 2688px',
        width: 1242,
        height: 2688,
        ratio: '9:19.5',
        orientation: 'portrait',
        orientationLabel: 'Dọc',
        color: 'primary',
    },
    {
        id: '2688x1242',
        label: '2688 × 1242px',
        width: 2688,
        height: 1242,
        ratio: '19.5:9',
        orientation: 'landscape',
        orientationLabel: 'Ngang',
        color: 'secondary',
    },
    {
        id: '1284x2778',
        label: '1284 × 2778px',
        width: 1284,
        height: 2778,
        ratio: '9:19.5',
        orientation: 'portrait',
        orientationLabel: 'Dọc',
        color: 'info',
    },
    {
        id: '2778x1284',
        label: '2778 × 1284px',
        width: 2778,
        height: 1284,
        ratio: '19.5:9',
        orientation: 'landscape',
        orientationLabel: 'Ngang',
        color: 'success',
    },
];

const CROP_TARGET_MAP = Object.fromEntries(
    CROP_TARGET_SIZE_OPTIONS.map((option) => [option.id, option]),
) as Record<CropTargetSizeId, CropTargetSizeOption>;

export function normalizeCropTargetSizeId(value?: string | null): CropTargetSizeId {
    if (value && value in CROP_TARGET_MAP) {
        return value as CropTargetSizeId;
    }
    return DEFAULT_CROP_TARGET_SIZE_ID;
}

export function getCropTargetSizeById(id: CropTargetSizeId): CropTargetSizeOption {
    return CROP_TARGET_MAP[id];
}

export function buildCropTargetPromptLines(
    cropTargetSizeId?: string | null,
    options?: { includeLogoInSafeZone?: boolean },
): string[] {
    const option = getCropTargetSizeById(normalizeCropTargetSizeId(cropTargetSizeId));
    const includeLogo = options?.includeLogoInSafeZone === true;

    const portraitLines = buildPortraitSafeZoneLines(option, includeLogo);
    const landscapeLines = buildLandscapeSafeZoneLines(option, includeLogo);

    return [
        '## Target crop size & safe framing (critical — read first)',
        ...(option.orientation === 'portrait' ? portraitLines : landscapeLines),
        '',
        'Headline/subtitle only: keep inside top safe band. Device mockup SHOULD extend near left/right/bottom edges per size rules below.',
        'Prioritize a LARGE near-full-width device; crop-safe margins apply to text and logo, not to shrinking the phone.',
    ];
}

function buildPortraitSafeZoneLines(option: CropTargetSizeOption, includeLogo: boolean): string[] {
    return [
        `Target crop: ${option.label} (portrait, aspect ${option.ratio}).`,
        'The user will center-crop or trim your image to this exact aspect ratio. Your output size may differ — compose for safe cropping, not pixel-perfect export.',
        '',
        'Safe zone (mandatory — text must survive crop):',
        `- Keep headline, subtitle${includeLogo ? ', and logo' : ''} inside crop-safe margins; device may use nearly full width.`,
        '- Headline + subtitle: tight upper band only (10%–18% from top) — two lines max, no extra padding.',
        '- Device mockup (hero): width 90–94% of canvas (left + right margins ≤10% total).',
        '- Device vertical span: top of phone at ~16%–20% from canvas top; bottom of phone at ~92%–96% from canvas top.',
        '- Gap from phone bottom to canvas bottom: ≤8% of canvas height (logo lives inside this thin strip, not far below a small phone).',
        '- Phone frame height target: ≥78% of total canvas height.',
        '- No drop shadow under the device.',
        '- WRONG: phone centered with 25%+ empty gradient below it. RIGHT: phone nearly touches bottom safe zone.',
        ...(includeLogo
            ? ['- Logo (from image 1): follow logo placement rules; keep inside safe zone margins.']
            : []),
        '- Background gradients, stars, and decorative shapes MAY bleed to edges — decoration only, never typography or UI.',
        '- Mental test: if a 9:19.5 crop window slides over your image, every letter of headline/subtitle and the full device must remain visible.',
    ];
}

function buildLandscapeSafeZoneLines(option: CropTargetSizeOption, includeLogo: boolean): string[] {
    return [
        `Target crop: ${option.label} (landscape, aspect ${option.ratio}).`,
        'The user will center-crop or trim your image to this exact aspect ratio. Your output size may differ — compose for safe cropping, not pixel-perfect export.',
        '',
        'Safe zone (mandatory — text must survive crop):',
        `- Keep headline, subtitle, and device mockup${includeLogo ? ' and logo' : ''} inside a centered safe rectangle: max 78% canvas width × 72% canvas height.`,
        '- Minimum inset from canvas edges for ALL text and device: 12% on all four sides.',
        '- Headline + subtitle: compact upper band, at least 12% from top; keep text area narrow vertically to maximize device height.',
        '- Device mockup (hero): center or center-right; height 72–88% of canvas; width 38–50% of canvas. Largest object on the frame.',
        '- Must not extend into the outer 12% margin on any side, but fill available height aggressively.',
        ...(includeLogo
            ? ['- Logo (from image 1): follow logo placement rules; keep inside safe zone margins.']
            : []),
        '- Background decoration MAY reach edges; readable text and device UI must not.',
        '- Mental test: if a 19.5:9 crop window slides over your image, every letter and the full device must remain visible.',
    ];
}
