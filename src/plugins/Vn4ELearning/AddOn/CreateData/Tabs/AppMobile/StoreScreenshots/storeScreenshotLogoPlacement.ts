import type { ImageAttachmentRoles } from './storeScreenshotImageAttachment';

export type LogoPlacementId =
    | 'none'
    | 'top_left'
    | 'top_center'
    | 'top_right'
    | 'bottom_center'
    | 'bottom_left'
    | 'bottom_right';

export const DEFAULT_LOGO_PLACEMENT_ID: LogoPlacementId = 'none';
export const STORE_SCREENSHOT_LOGO_SIZE_PX = 100;
export const STORE_SCREENSHOT_LOGO_SIZE_LABEL = `${STORE_SCREENSHOT_LOGO_SIZE_PX}×${STORE_SCREENSHOT_LOGO_SIZE_PX} px`;

export type LogoPlacementOption = {
    id: LogoPlacementId;
    label: string;
    description: string;
    usesLogo: boolean;
};

export const LOGO_PLACEMENT_OPTIONS: LogoPlacementOption[] = [
    {
        id: 'none',
        label: 'Không logo',
        description: 'Không đặt logo trên ảnh marketing',
        usesLogo: false,
    },
    {
        id: 'top_left',
        label: 'Logo góc trái trên',
        description: 'Logo app ở góc trái phía trên',
        usesLogo: true,
    },
    {
        id: 'top_center',
        label: 'Logo giữa trên',
        description: 'Logo app căn giữa phía trên',
        usesLogo: true,
    },
    {
        id: 'top_right',
        label: 'Logo góc phải trên',
        description: 'Logo app ở góc phải phía trên',
        usesLogo: true,
    },
    {
        id: 'bottom_center',
        label: 'Logo giữa dưới',
        description: 'Logo app căn giữa phía dưới (phổ biến store listing)',
        usesLogo: true,
    },
    {
        id: 'bottom_left',
        label: 'Logo góc trái dưới',
        description: 'Logo app ở góc trái phía dưới',
        usesLogo: true,
    },
    {
        id: 'bottom_right',
        label: 'Logo góc phải dưới',
        description: 'Logo app ở góc phải phía dưới',
        usesLogo: true,
    },
];

const LOGO_PLACEMENT_MAP = Object.fromEntries(
    LOGO_PLACEMENT_OPTIONS.map((option) => [option.id, option]),
) as Record<LogoPlacementId, LogoPlacementOption>;

export function normalizeLogoPlacementId(value?: string | null): LogoPlacementId {
    if (value && value in LOGO_PLACEMENT_MAP) {
        return value as LogoPlacementId;
    }
    return DEFAULT_LOGO_PLACEMENT_ID;
}

export function getLogoPlacementById(id: LogoPlacementId): LogoPlacementOption {
    return LOGO_PLACEMENT_MAP[id];
}

export function logoPlacementUsesLogo(placementId?: string | null): boolean {
    return getLogoPlacementById(normalizeLogoPlacementId(placementId)).usesLogo;
}

function buildLogoFidelityLines(appName: string, logoImageNum: number): string[] {
    const name = String(appName || '').trim() || 'App';

    return [
        '## Logo — NON-NEGOTIABLE (use uploaded file)',
        `Image ${logoImageNum} is the real brand logo. Composite/place those exact pixels — same shape, colors, and details.`,
        'FORBIDDEN: redrawing, simplifying, stylizing, substituting a generic app icon, lettermark, mascot, or any logo that does not match the uploaded image.',
        'FORBIDDEN: rounded-square icon tile, frosted card, pill, badge, or colored box behind the logo.',
        `App name "${name}" beside logo (sentence case, smaller than headline). Logo size: fixed ${STORE_SCREENSHOT_LOGO_SIZE_LABEL} on canvas — exact square box, never larger or smaller.`,
    ];
}

function buildPlacementPositionLines(placementId: LogoPlacementId): string[] {
    switch (placementId) {
        case 'top_left':
            return ['Top-left safe zone (~12% from top/left). App name beside or under logo.'];
        case 'top_center':
            return ['Top-center (~12% below top). App name centered under logo, above headline band.'];
        case 'top_right':
            return ['Top-right safe zone (~12% from top/right). App name beside or under logo.'];
        case 'bottom_center':
            return ['Bottom ≤8% strip, centered under phone.'];
        case 'bottom_left':
            return ['Bottom-left in last ≤8% strip (~5% from left). Phone bottom at ~92–96% height.'];
        case 'bottom_right':
            return ['Bottom-right in last ≤8% strip (~5% from right). No gap between phone and logo.'];
        default:
            return [];
    }
}

export function buildLogoAttachmentPromptLines(
    placementId?: string | null,
    appName?: string,
    roles?: ImageAttachmentRoles,
): string[] {
    const placement = getLogoPlacementById(normalizeLogoPlacementId(placementId));
    const imageRoles = roles ?? { layoutRefNum: null, logoNum: 1, mainScreenshotNum: 2 };

    if (!placement.usesLogo) {
        return ['## Logo', 'No logo on this image — do not add any mark or wordmark.'];
    }

    const logoNum = imageRoles.logoNum ?? 1;

    return [
        ...buildLogoFidelityLines(appName || '', logoNum),
        `Placement: ${placement.label} — ${buildPlacementPositionLines(placement.id).join(' ')}`,
    ];
}
