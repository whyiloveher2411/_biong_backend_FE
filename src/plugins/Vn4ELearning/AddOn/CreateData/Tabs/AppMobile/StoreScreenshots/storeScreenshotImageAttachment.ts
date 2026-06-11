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
    return `Image ${roles.mainScreenshotNum} (main screenshot)`;
}

export function formatLogoRef(roles: ImageAttachmentRoles): string {
    return roles.logoNum ? `image ${roles.logoNum}` : 'the logo';
}
