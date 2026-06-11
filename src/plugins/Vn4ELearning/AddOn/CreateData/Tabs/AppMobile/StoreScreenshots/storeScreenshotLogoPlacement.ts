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

function buildLogoSizeAndAppNameLines(appName: string, logoImageNum = 1): string[] {
    const name = String(appName || '').trim() || 'App';

    return [
        '## App name on image (mandatory)',
        `Render the app name "${name}" on the image — exact spelling, sentence case, no trailing period.`,
        'Place the app name adjacent to the logo (below, beside, or lightly integrated) as a compact wordmark.',
        'App name must be readable but secondary: smaller than the headline, never the largest text on the image.',
        'Do not invent a different app name, abbreviation, or tagline in place of the name above.',
        '',
        '## Logo & app name — NO background container (critical)',
        'Render logo and app name DIRECTLY on the marketing gradient — fully transparent behind them.',
        'Do NOT add any background shape behind logo or app name: no rounded rectangle, pill, card, badge, panel, frosted glass, dark box, or colored block.',
        'No container, border box, or backdrop plate — only the logo image and plain text wordmark on the gradient.',
        'Wrong: logo + "Spacedev" inside a dark blue rounded box in the corner.',
        'Right: small logo icon + white app name text sitting cleanly on the gradient with zero background fill.',
        '',
        '## Logo size (critical — do not oversize)',
        `Scale the logo from image ${logoImageNum} as a SMALL brand mark — not a hero graphic or sticker.`,
        'Maximum logo bounding box: 8–12% of total canvas width AND 4–6% of total canvas height.',
        'Keep generous empty space around the logo; it must not touch or crowd the device mockup.',
        'Visual hierarchy: headline > device mockup > subtitle > app name + logo badge.',
        'Wrong: oversized logo filling a corner (e.g. ~20–30% of the frame). Right: discreet footer-style branding like top App Store listings.',
        'Never scale the logo up to match the phone width or to fill negative space.',
    ];
}

function buildPlacementPositionLines(placementId: LogoPlacementId): string[] {
    switch (placementId) {
        case 'top_left':
            return [
                'Place the logo in the top-left corner inside the safe zone — at least 12% from the top edge and 12% from the left edge.',
                'App name wordmark sits beside or directly under the logo, aligned left.',
            ];
        case 'top_center':
            return [
                'Place the logo centered horizontally near the top — at least 12% below the top edge.',
                'App name centered under the logo; both stay above the headline band without overlap.',
            ];
        case 'top_right':
            return [
                'Place the logo in the top-right corner inside the safe zone — at least 12% from the top and right edges.',
                'App name wordmark beside or under the logo, aligned right.',
            ];
        case 'bottom_center':
            return [
                'Place logo centered in the bottom ≤8% strip — directly under the phone, not far below it.',
                'App name under logo; phone bottom edge should be just above this strip.',
            ];
        case 'bottom_left':
            return [
                'Place logo bottom-left in the last ≤8% vertical strip, ~5% from left edge.',
                'App name beside logo; phone extends down to ~92–96% canvas height above this strip.',
            ];
        case 'bottom_right':
            return [
                'Place logo bottom-right in the last ≤8% vertical strip, ~5% from right edge.',
                'App name beside logo; phone bottom sits just above — NO large empty gap between phone and logo.',
            ];
        default:
            return [];
    }
}

function buildAttachedImageOrderLines(roles: ImageAttachmentRoles): string[] {
    const lines: string[] = ['The user will paste images in this exact order before sending this prompt:'];
    let step = 0;

    if (roles.layoutRefNum) {
        step += 1;
        lines.push(
            `${step}. Image ${roles.layoutRefNum} — Layout reference: finished marketing image from an earlier screenshot. Structural template ONLY — match device/logo scale, NEVER use its in-app UI.`,
        );
    }
    if (roles.logoNum) {
        step += 1;
        lines.push(
            `${step}. Image ${roles.logoNum} — App logo: official brand logo. Use exactly as the logo.`,
        );
    }
    step += 1;
    lines.push(
        `${step}. Image ${roles.mainScreenshotNum} — Main screenshot: raw in-app UI. Display LARGE inside device mockup — this is the ONLY source for phone screen content.`,
    );
    lines.push('');
    lines.push('Main screenshot is attached LAST on purpose — always use it for in-app UI, not the layout reference.');
    return lines;
}

export function buildLogoAttachmentPromptLines(
    placementId?: string | null,
    appName?: string,
    roles?: ImageAttachmentRoles,
): string[] {
    const placement = getLogoPlacementById(normalizeLogoPlacementId(placementId));
    const imageRoles = roles ?? { layoutRefNum: null, logoNum: 1, mainScreenshotNum: 2 };

    if (!placement.usesLogo) {
        if (imageRoles.layoutRefNum) {
            return [
                '## Attached images (order is mandatory)',
                ...buildAttachedImageOrderLines(imageRoles),
                '',
                '## Logo',
                'Do NOT add any app logo, brand mark, wordmark, or invented logo graphic to this image.',
                'No placeholder logo — omit logo entirely.',
            ];
        }

        return [
            '## Logo',
            'Do NOT add any app logo, brand mark, wordmark, or invented logo graphic to this image.',
            'No placeholder logo — omit logo entirely.',
        ];
    }

    return [
        '## Attached images (order is mandatory)',
        ...buildAttachedImageOrderLines(imageRoles),
        '',
        ...buildLogoSizeAndAppNameLines(appName || '', imageRoles.logoNum ?? 1),
        '',
        `## Logo placement: ${placement.label}`,
        ...buildPlacementPositionLines(placement.id),
        `Render the logo from image ${imageRoles.logoNum ?? 1} at the position above — never use text-only fake logos.`,
        'Logo and app name: transparent background only — never place inside a colored or rounded container.',
        'Keep the logo and app name inside the crop safe zone so they are not clipped when the user crops to store size.',
    ];
}
