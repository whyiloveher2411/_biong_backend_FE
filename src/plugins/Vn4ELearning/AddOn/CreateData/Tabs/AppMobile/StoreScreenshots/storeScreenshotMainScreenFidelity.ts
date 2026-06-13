import type { ImageAttachmentRoles } from './storeScreenshotImageAttachment';
import { formatMainScreenshotRef } from './storeScreenshotImageAttachment';

type MainScreenFidelityOptions = {
    hasLayoutReference?: boolean;
};

export function buildMainScreenFidelityPromptLines(
    roles: ImageAttachmentRoles,
    options: MainScreenFidelityOptions = {},
): string[] {
    const { hasLayoutReference = false } = options;
    const mainNum = roles.mainScreenshotNum;
    const mainRef = formatMainScreenshotRef(roles);
    const layoutRefNum = roles.layoutRefNum;

    const lines = [
        '## Main screen — NON-NEGOTIABLE (use uploaded screenshot)',
        `Image ${mainNum} (${mainRef}) is the ONLY source for in-app pixels inside the phone.`,
        'Composite/place those exact UI pixels — same layout, icons, labels, and colors as the upload.',
        'FORBIDDEN: inventing UI, redrawing, simplifying, generic mockup, wireframe, blurred recreation, or a "similar looking" app screen.',
        'FORBIDDEN: generating new screen content — composite the upload; do not design the app UI.',
        `REQUIRED: scale ${mainRef} to fit inside the device bezel; preserve readability; keep all real UI from the upload.`,
    ];

    if (hasLayoutReference && layoutRefNum) {
        lines.push(
            `FORBIDDEN: copying screen UI from Image ${layoutRefNum} (layout reference) — geometry/scale/positions ONLY; ignore every pixel inside its phone screen.`,
        );
    }

    return lines;
}
