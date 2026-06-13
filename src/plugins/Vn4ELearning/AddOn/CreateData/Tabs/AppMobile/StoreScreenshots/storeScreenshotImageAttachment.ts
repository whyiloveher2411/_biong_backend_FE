import { STORE_SCREENSHOT_LOGO_SIZE_LABEL } from './storeScreenshotLogoPlacement';

export type ImageAttachmentRoles = {
    layoutRefNum: number | null;
    logoNum: number | null;
    mainScreenshotNum: number;
};

/**
 * Thứ tự đính ảnh vào Gemini (extension):
 * layout reference → logo → main screenshot (screenshot luôn cuối để AI không nhầm làm nội dung màn hình).
 */
export function getImageAttachmentRoles(
    usesLogo: boolean,
    hasLayoutReference: boolean,
): ImageAttachmentRoles {
    if (hasLayoutReference && usesLogo) {
        return { layoutRefNum: 1, logoNum: 2, mainScreenshotNum: 3 };
    }
    if (hasLayoutReference) {
        return { layoutRefNum: 1, logoNum: null, mainScreenshotNum: 2 };
    }
    if (usesLogo) {
        return { layoutRefNum: null, logoNum: 1, mainScreenshotNum: 2 };
    }
    return { layoutRefNum: null, logoNum: null, mainScreenshotNum: 1 };
}

export function formatMainScreenshotRef(roles: ImageAttachmentRoles): string {
    if (roles.mainScreenshotNum <= 1 && roles.logoNum === null && roles.layoutRefNum === null) {
        return 'the attached main screenshot';
    }
    return `Image ${roles.mainScreenshotNum}`;
}

export function formatLogoRef(roles: ImageAttachmentRoles): string {
    return roles.logoNum ? `Image ${roles.logoNum}` : 'the logo image';
}

export function buildImageAttachmentPromptLines(
    roles: ImageAttachmentRoles,
    layoutReferenceOrder?: number,
): string[] {
    const mainNum = roles.mainScreenshotNum;
    const lines: string[] = ['## Images (paste in order)'];
    let step = 0;

    if (roles.layoutRefNum) {
        step += 1;
        const anchor = layoutReferenceOrder ? ` (#${layoutReferenceOrder})` : '';
        lines.push(`${step}. Image ${roles.layoutRefNum} — Layout ref${anchor}: scale/geometry only, NOT screen UI.`);
    }
    if (roles.logoNum) {
        step += 1;
        lines.push(`${step}. Image ${roles.logoNum} — Official logo file (composite as-is, never redraw; display at ${STORE_SCREENSHOT_LOGO_SIZE_LABEL}).`);
    }
    step += 1;
    lines.push(
        `${step}. Image ${mainNum} — Main screenshot: ONLY source for phone screen pixels (composite as-is, never redraw).`,
    );

    lines.push(
        '',
        '## Image roles',
        `- Image ${mainNum} → phone screen UI ONLY — composite exact pixels from upload; faithful, large, sharp.`,
        `- Image ${mainNum} → NOT a style reference; do NOT generate a new app screen.`,
    );

    if (roles.layoutRefNum) {
        lines.push(
            `- Image ${roles.layoutRefNum} → device frame size & positions ONLY — FORBIDDEN to copy its screen UI, headline, logo, or background.`,
        );
    }

    if (roles.logoNum) {
        lines.push(`- Image ${roles.logoNum} → logo graphic only; place exact uploaded artwork at ${STORE_SCREENSHOT_LOGO_SIZE_LABEL}, not a reinterpretation.`);
    }

    return lines;
}
