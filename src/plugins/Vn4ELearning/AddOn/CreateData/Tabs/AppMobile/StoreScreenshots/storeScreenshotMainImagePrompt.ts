import type { ImageAttachmentRoles } from './storeScreenshotImageAttachment';
import { formatMainScreenshotRef } from './storeScreenshotImageAttachment';
import { getCropTargetSizeById, normalizeCropTargetSizeId } from './storeScreenshotCropTarget';
import {
    normalizeLogoPlacementId,
    STORE_SCREENSHOT_LOGO_SIZE_LABEL,
    type LogoPlacementId,
} from './storeScreenshotLogoPlacement';

function isBottomLogoPlacement(placementId: LogoPlacementId): boolean {
    return placementId === 'bottom_center'
        || placementId === 'bottom_left'
        || placementId === 'bottom_right';
}

type MainImagePromptOptions = {
    isLayoutAnchor?: boolean;
    hasLayoutReference?: boolean;
};

export function buildMainImagePromptLines(
    usesLogo: boolean,
    logoPlacementId?: string | null,
    roles?: ImageAttachmentRoles,
    cropTargetSizeId?: string | null,
    options: MainImagePromptOptions = {},
): string[] {
    const { isLayoutAnchor = false, hasLayoutReference = false } = options;
    const placement = normalizeLogoPlacementId(logoPlacementId);
    const bottomLogo = usesLogo && isBottomLogoPlacement(placement);
    const imageRoles = roles ?? { layoutRefNum: null, logoNum: usesLogo ? 1 : null, mainScreenshotNum: usesLogo ? 2 : 1 };
    const imageRef = formatMainScreenshotRef(imageRoles);
    const crop = getCropTargetSizeById(normalizeCropTargetSizeId(cropTargetSizeId));
    const layoutRefNum = imageRoles.layoutRefNum;

    const sectionTitle = isLayoutAnchor
        ? '## Layout & device (screenshot #1 — series anchor)'
        : '## Layout & device';

    const deviceSizeLines = isLayoutAnchor
        ? [
            'MAXIMIZE device size — phone must be the dominant hero, as large as possible on canvas.',
            'Target: width 94–96%, height 88–92% of canvas; push to the upper limit of safe crop margins.',
            'Stack: compact headline band 10–16% → oversized phone → logo strip ≤8% if used.',
            'This sets device scale for the whole series — err on TOO LARGE, never a small centered phone.',
        ]
        : hasLayoutReference && layoutRefNum
            ? [
                `Match Image ${layoutRefNum} layout reference for device frame size, position, headline band, and logo placement exactly.`,
                'Only replace phone screen UI from the main screenshot — do not resize or reposition the device.',
            ]
            : [
                'Stack: headline band 10–18% → phone 78–86% height (width 90–94%) → logo strip ≤8% if used.',
            ];

    return [
        sectionTitle,
        `Crop target: ${crop.label} (${crop.ratio} ${crop.orientation}). Compose for safe crop — text/logo in safe zone.`,
        `${imageRef} inside slim phone frame (minimal bezels, no drop shadow) — faithful UI, not wireframe.`,
        ...deviceSizeLines,
        ...(bottomLogo
            ? ['Bottom logo: phone extends low; logo in bottom strip — no empty gap.']
            : isLayoutAnchor
                ? ['Phone bottom within 6–8% of canvas — minimize empty space below device.']
                : ['Phone bottom within 8% of canvas.']),
        'Reject: small centered phone, blurred UI, invented screen content, generic mockup UI.',
        'Reject: any phone screen that does not match the uploaded main screenshot pixels.',
        'Hierarchy: headline > device > subtitle > logo.',
    ];
}

export function buildMainImageSizeOverrideLines(
    usesLogo: boolean,
    logoPlacementId?: string | null,
    hasLayoutReference = false,
    roles?: ImageAttachmentRoles,
    options: MainImagePromptOptions = {},
): string[] {
    const { isLayoutAnchor = false } = options;
    const bottomLogo = usesLogo && isBottomLogoPlacement(normalizeLogoPlacementId(logoPlacementId));
    const imageRoles = roles ?? { layoutRefNum: null, logoNum: usesLogo ? 1 : null, mainScreenshotNum: usesLogo ? 2 : 1 };
    const mainRef = formatMainScreenshotRef(imageRoles);

    const deviceCheckLine = isLayoutAnchor
        ? 'Phone ~94–96% width, ≥88% height — largest possible while keeping headline/subtitle/logo in safe zone.'
        : hasLayoutReference && imageRoles.layoutRefNum
            ? `Device frame matches Image ${imageRoles.layoutRefNum} exactly — same scale and position as screenshot #1.`
            : 'Phone ~92% width, ≥78% height; headline/subtitle/logo inside safe zone.';

    return [
        '## Final check',
        ...(usesLogo && imageRoles.logoNum
            ? [`Logo matches Image ${imageRoles.logoNum} exactly at ${STORE_SCREENSHOT_LOGO_SIZE_LABEL} — not a redrawn or generic icon.`]
            : []),
        deviceCheckLine,
        ...(bottomLogo ? ['No large empty band under phone.'] : []),
        ...(hasLayoutReference && imageRoles.layoutRefNum
            ? [`Screen UI from ${mainRef} only — not Image ${imageRoles.layoutRefNum}.`]
            : []),
        ...(isLayoutAnchor
            ? ['If the phone feels small, enlarge it — screenshot #1 is the size reference for the series.']
            : []),
        `${mainRef} pixels must match the upload inside the bezel — not a redrawn or invented screen.`,
        ...(hasLayoutReference && imageRoles.layoutRefNum
            ? [`Never copy screen UI from Image ${imageRoles.layoutRefNum} — layout ref is geometry only.`]
            : []),
        'No magnifying glass / callout unless feature highlight requested. No watermark.',
    ];
}
