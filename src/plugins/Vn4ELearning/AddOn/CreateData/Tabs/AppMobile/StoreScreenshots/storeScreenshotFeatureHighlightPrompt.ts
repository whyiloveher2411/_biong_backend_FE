import type { ImageAttachmentRoles } from './storeScreenshotImageAttachment';
import { formatMainScreenshotRef } from './storeScreenshotImageAttachment';

export function normalizeFeatureHighlightText(value?: string | null): string {
    return String(value || '').trim();
}

export function hasFeatureHighlight(value?: string | null): boolean {
    return normalizeFeatureHighlightText(value) !== '';
}

export function buildFeatureHighlightPromptLines(
    instruction: string | undefined | null,
    roles: ImageAttachmentRoles,
): string[] {
    const text = normalizeFeatureHighlightText(instruction);
    const mainImageRef = formatMainScreenshotRef(roles);

    if (!text) {
        return ['## Feature highlight', 'Off — show full in-app screen, no callout/zoom/spotlight.'];
    }

    return [
        '## Feature highlight (enabled)',
        `Instruction: "${text}" — apply inside phone screen on real UI from ${mainImageRef} only.`,
        'Highlight/zoom must show pixels from the uploaded screenshot — never invent UI for the callout.',
        'One focal region only (magnifier, dim surround, or small inset). No effects outside device.',
    ];
}
