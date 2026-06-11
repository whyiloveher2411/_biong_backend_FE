import {
    getCropTargetSizeById,
    normalizeCropTargetSizeId,
} from './storeScreenshotCropTarget';
import type { ImageAttachmentRoles } from './storeScreenshotImageAttachment';

export function buildSeriesLayoutLockPromptLines(
    cropTargetSizeId?: string | null,
    appName?: string,
): string[] {
    const option = getCropTargetSizeById(normalizeCropTargetSizeId(cropTargetSizeId));
    const name = String(appName || '').trim() || 'App';

    return [
        '## SERIES LAYOUT LOCK (mandatory — same for ALL screenshots in this app)',
        'This screenshot is part of a multi-image store listing set. Device, logo, and app name scale MUST be identical across every image in the series.',
        '',
        '### Fixed scale (do not vary between screenshots)',
        '- Device mockup: EXACTLY 92% of canvas width and ≥78% of canvas height on every image.',
        '- Logo bounding box: EXACTLY 10% canvas width × 5% canvas height — same corner and offset every time.',
        `- App name "${name}": font size 1.2× logo height, same position offset relative to logo on every image.`,
        '- Headline band: fixed 14% canvas height from canvas top — wrap text to fit; NEVER shrink the phone to accommodate longer copy.',
        `- Output aspect ratio: compose as if canvas is ${option.label} (${option.ratio} ${option.orientation}).`,
        '',
        '### What may change between screenshots',
        '- In-app UI content inside the device screen (from the main screenshot ONLY).',
        '- Headline and subtitle text only.',
        '- Background decoration may vary slightly but must not affect device/logo scale.',
        '',
        '### Anti-patterns (reject)',
        'WRONG: phone noticeably larger or smaller than other screenshots in the series.',
        'WRONG: logo or app name scaled differently between screenshots.',
        'WRONG: shrinking the device to fit a longer headline.',
        'WRONG: reusing the same in-app UI from the layout reference image when the main screenshot shows different UI.',
        'RIGHT: identical device frame, logo size, and app name placement — only screen content and headline text differ.',
    ];
}

export function buildLayoutReferenceCriticalWarningLines(
    roles: ImageAttachmentRoles,
    anchorOrder: number,
): string[] {
    const refNum = roles.layoutRefNum;
    const mainNum = roles.mainScreenshotNum;
    if (!refNum) {
        return [];
    }

    return [
        '## CRITICAL — image roles (read first, overrides all other image instructions)',
        `Image ${mainNum} — Main screenshot: the ONLY source for in-app UI pixels inside the phone screen. Display this UI faithfully.`,
        `Image ${refNum} — Layout reference: a finished marketing image from screenshot #${anchorOrder}. Use ONLY to copy device frame size, logo scale, app name position, and headline band height.`,
        `NEVER put image ${refNum} screen content inside the phone — image ${refNum} is a structural template, NOT the app UI source.`,
        `If the phone screen shows UI from image ${refNum} instead of image ${mainNum}, the output is WRONG and must be regenerated.`,
        'The layout reference may look like a complete store image — ignore its in-app screen, headline text, and background when composing; borrow only geometry and scale.',
        '',
    ];
}

export function buildLayoutReferencePromptLines(
    roles: ImageAttachmentRoles,
    anchorOrder: number,
): string[] {
    const refNum = roles.layoutRefNum;
    const mainNum = roles.mainScreenshotNum;
    if (!refNum) {
        return [];
    }

    return [
        '## Layout reference image (structural template only)',
        `Image ${refNum} — Series layout reference from screenshot #${anchorOrder}.`,
        `Match from image ${refNum}: device mockup width/height, logo bounding box, app name size, headline band height, logo corner position.`,
        `Do NOT take from image ${refNum}: in-app UI inside the phone, headline/subtitle text, background gradient, floating icons.`,
        `Image ${mainNum} supplies ALL in-app UI inside the device — every button, tab, icon, and screen layout must come from image ${mainNum}.`,
        'WRONG: phone displays the same app screen as image ' + refNum + ' when image ' + mainNum + ' shows different UI.',
        'WRONG: copying headline or background from image ' + refNum + '.',
        'RIGHT: same frame scale as image ' + refNum + ', but phone screen content 100% from image ' + mainNum + '.',
    ];
}
