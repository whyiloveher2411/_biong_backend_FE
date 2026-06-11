import type { ImageAttachmentRoles } from './storeScreenshotImageAttachment';
import { formatMainScreenshotRef } from './storeScreenshotImageAttachment';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';

export { normalizeFloatingIconsEnabled };

export function buildFloatingIconsPromptLines(
    enabled: boolean,
    roles: ImageAttachmentRoles,
): string[] {
    if (!enabled) {
        return [
            '## Floating icons & decorative UI outside the device',
            'Do NOT add floating icons, exploded UI elements, detached buttons, stickers, or feature icons outside the phone frame.',
            'No abstracted / exploded UI — all functional app UI must stay inside the device screen only.',
            'Do not place hearts, stars, badges, hexagons, or tool icons floating around the mockup.',
            'Background pattern (if selected separately) may still appear on the backdrop — but no object-level app icons outside the phone.',
            'Keep negative space around the device clean of floating UI objects; let the large phone UI and headline carry the composition.',
        ];
    }

    const mainImageRef = formatMainScreenshotRef(roles);

    return [
        '## Floating icons & decorative UI outside the device (ENABLED)',
        'Add floating icons / decorative UI elements around the device mockup to make the static image feel dynamic — common in top App Store creatives.',
        'Industry terms: Floating Icons, Floating Elements, Decorative Elements, Abstracted UI, Exploded UI.',
        '',
        '### Icon selection — unique motifs from main screenshot (critical)',
        `Study ${mainImageRef} carefully before choosing icons.`,
        'Pick 2–3 DISTINCT icon types already visible in the app UI — e.g. one hexagon node, one gift, one star/gem — each type used ONCE.',
        'Do NOT duplicate the same icon repeatedly to fill space (wrong: 3 identical gift boxes or 4 identical hexagons).',
        'If the screen only offers 1–2 unique motifs, use only those — empty margin is better than redundant clones.',
        'Do not invent random unrelated clipart.',
        '',
        '### No background behind floating icons (critical)',
        'Each floating icon sits DIRECTLY on the marketing gradient — transparent behind the icon graphic.',
        'Do NOT add circular blobs, colored discs, square panels, glow plates, or shadow patches behind floating icons.',
        'No drop shadow, ground shadow, or halo that reads as a separate background shape under the icon.',
        'Wrong: icon inside a colored circle, soft blob, or dark glow patch.',
        'Right: clean icon graphic on the gradient only.',
        '',
        '### Visual separation from in-app UI (without backgrounds)',
        'Floating icons must NOT look like tappable in-app UI — users must instantly tell marketing decoration apart from the real screen.',
        'Use ONLY these separation techniques (no backgrounds):',
        '- Slightly higher saturation and brightness than the in-screen version.',
        '- Thin white or brand-tinted stroke/outline (1–2px) around the icon silhouette.',
        '- Slight scale and rotation — marketing accent, not a UI button.',
        '- More illustrative/3D marketing render — not pixel-identical copies of in-app flat icons.',
        'Wrong: floating icons that look like duplicate interactive buttons on the lesson path.',
        'Right: stylized icon on transparent background over gradient — obviously decorative, not part of the phone UI.',
        '',
        '### Classification — pick icons that support the message',
        'Feature signifiers: icons representing the key feature shown on screen (lesson path, streak, reward, favorite, trend).',
        'Brand assets / brand stickers: small branded marks consistent with the app identity — subtle, not a second logo.',
        'Contextual elements: optional context icons only if they reinforce the app category and appear in or match the main UI.',
        '',
        '### Placement, density & overlap (critical)',
        'Use a MODERATE density: 2–3 unique floating icons total — never a crowded swarm or duplicate set.',
        'Default layout: icons sit in the OUTER wings beside the phone (left and right margins), NOT stacked on top of the device.',
        'Place icons in the narrow side wings (~5% margin each side) or upper corners — phone is nearly full width.',
        '',
        '### Overlap rules — protect the main image',
        'The in-app UI inside the phone is sacred — floating icons must NOT cover readable screen content.',
        'Do NOT place icons over the phone screen, notch, or center of the mockup.',
        'At most ONE icon may lightly kiss the device bezel edge (outer frame only) with ≤10% overlap — never over the screen glass.',
        'If unsure, place icons farther out — framing the phone like parentheses ( ) rather than covering it.',
        'Never overlap headline, subtitle, logo, or app-name zone.',
        '',
        '### Size',
        'Floating icons: small accents — smaller than a lesson hexagon on screen; not hero-sized stickers.',
        'Slight rotation OK; no shadows or background shapes.',
        'Distinct from background pattern/texture: floating icons are sharper, 3D-illustrated, and represent app UI/features.',
        '',
        '### Style rules',
        'Semi-flat or soft-3D illustration matching the app UI — not photorealistic, not emoji-style unless the app uses that.',
        'Icons must survive crop safe zone margins.',
        '',
        'Wrong: 6+ icons piled on the phone, hearts/gifts covering the lesson path UI, or icons blocking the screen.',
        'Wrong: random clipart unrelated to the screenshot.',
        'Right: one hexagon + one gift + one star — each unique, clean on gradient (no icon background), beside the near-full-width phone.',
    ];
}
