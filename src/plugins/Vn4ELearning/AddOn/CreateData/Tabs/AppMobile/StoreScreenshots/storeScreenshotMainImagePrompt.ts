import { normalizeLogoPlacementId, type LogoPlacementId } from './storeScreenshotLogoPlacement';

function isBottomLogoPlacement(placementId: LogoPlacementId): boolean {
    return placementId === 'bottom_center'
        || placementId === 'bottom_left'
        || placementId === 'bottom_right';
}

/**
 * Prompt lines cho ảnh screenshot chính trong device mockup — hero visual của store listing.
 */
export function buildMainImagePromptLines(
    usesLogo: boolean,
    logoPlacementId?: string | null,
): string[] {
    const placement = normalizeLogoPlacementId(logoPlacementId);
    const bottomLogo = usesLogo && isBottomLogoPlacement(placement);
    const imageRef = usesLogo
        ? 'Image 2 (main screenshot)'
        : 'The attached main screenshot';

    return [
        '## Main screenshot & device mockup (HIGHEST PRIORITY — size & layout)',
        `${imageRef} is the raw in-app UI. The device screen MUST display it faithfully — large, sharp, detailed.`,
        'Never replace the real UI with a generic placeholder, wireframe, or re-drawn approximation.',
        '',
        '### Portrait layout blueprint (follow these percentages exactly)',
        'Vertical stack:',
        '- Top 10–18%: headline + subtitle only (compact, no wasted padding).',
        '- Middle-to-bottom 78–86%: OVERSIZED phone mockup — this zone is almost entirely the device.',
        '- Bottom ≤8%: thin strip for bottom logo/app name only (if used) — NOT a large empty gap.',
        '',
        '### Size rules (mandatory)',
        '- Phone width: 90–94% of canvas width (≈5% margin per side, 10% total).',
        '- Phone height: ≥78% of total canvas height — the phone is the tallest object on the canvas.',
        '- Phone top edge: starts at 16–20% from canvas top (directly under subtitle).',
        '- Phone bottom edge: ends at 92–96% from canvas top — as low as possible without clipping.',
        ...(bottomLogo
            ? [
                '- Bottom logo layout: phone extends DOWN first; logo + app name sit in the bottom-right corner of the last ≤8% strip, beside/under the phone — NOT floating in a vast void far below a small phone.',
                '- The phone bottom and logo corner share the lower zone — minimize empty purple/blue gradient between them.',
            ]
            : [
                '- Phone bottom to canvas bottom: ≤8% margin.',
            ]),
        '',
        '### Anti-patterns (reject these outputs)',
        'WRONG: phone occupying only ~50% of canvas height with huge empty bottom third.',
        'WRONG: phone floating in the vertical center with equal empty space above and below.',
        'WRONG: small phone + tiny logo stranded at the very bottom with 20%+ blank gradient between them.',
        'RIGHT: headline at top → massive phone filling width and most of height → small logo tucked in bottom corner.',
        '',
        '### Fidelity, sharpness & detail',
        'Preserve 100% of real UI from the main screenshot — crisp, legible at thumbnail size.',
        'Do not blur, soften, or downscale in-screen UI.',
        '',
        '### Framing',
        'Slim modern phone frame, minimal bezels, front-facing, NO drop shadow under device.',
        '',
        '### Composition priority',
        'Visual weight: (1) headline, (2) OVERSIZED device with crisp UI, (3) subtitle, (4) tiny logo + app name.',
    ];
}

export function buildMainImageSizeOverrideLines(
    usesLogo: boolean,
    logoPlacementId?: string | null,
): string[] {
    const bottomLogo = usesLogo && isBottomLogoPlacement(normalizeLogoPlacementId(logoPlacementId));

    return [
        '## FINAL CHECK — device size (override everything above if conflict)',
        'Before finishing: verify the phone mockup is OVERSIZED — width ~92%, height ≥78% of canvas.',
        bottomLogo
            ? 'Bottom logo case: phone bottom must be within 8% of canvas bottom; no large empty band under the phone.'
            : 'Phone bottom within 8% of canvas bottom.',
        'If the phone looks small or there is a large empty area below it — enlarge the phone and push it downward until the layout matches the blueprint.',
    ];
}
