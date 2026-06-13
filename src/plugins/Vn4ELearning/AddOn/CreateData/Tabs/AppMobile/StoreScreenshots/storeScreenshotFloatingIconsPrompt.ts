import type { ImageAttachmentRoles } from './storeScreenshotImageAttachment';
import { formatMainScreenshotRef } from './storeScreenshotImageAttachment';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';

export { normalizeFloatingIconsEnabled };

export function buildFloatingIconsPromptLines(
    enabled: boolean,
    roles: ImageAttachmentRoles,
    icons?: string[],
): string[] {
    if (!enabled) {
        return ['## Floating icons', 'Off — no icons outside the phone frame.'];
    }

    const mainImageRef = formatMainScreenshotRef(roles);
    const iconList = (icons ?? []).map((item) => String(item || '').trim()).filter(Boolean);

    return [
        '## Floating icons (enabled)',
        ...(iconList.length > 0
            ? [`Required: ${iconList.map((item, i) => `${i + 1}) ${item}`).join(' ')}`]
            : [`Pick 2–3 unique motifs from ${mainImageRef} — each type once, no duplicates.`]),
        'Side wings beside phone only — never on screen, headline, subtitle, or logo. ≤3 icons, small accents.',
        'On gradient directly — no blobs, discs, or shadow plates. Stylized marketing render, not tappable UI clones.',
    ];
}
