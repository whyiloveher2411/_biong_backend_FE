import type {
    StoreMetadata,
    StoreScreenshotItem,
    StoreScreenshotTemplate,
} from './storeScreenshotTypes';
import { buildCopyStylePromptLinesForScreenshot } from './storeScreenshotCopyStyleOptions';
import {
    buildLogoAttachmentPromptLines,
    logoPlacementUsesLogo,
    normalizeLogoPlacementId,
} from './storeScreenshotLogoPlacement';
import { buildBackgroundColorPromptLines } from './storeScreenshotBackgroundColorPrompt';
import { buildBackgroundPatternPromptLines } from './storeScreenshotBackgroundPattern';
import { normalizeHexColor } from './storeScreenshotColorUtils';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import { normalizeBackgroundPatternId } from './storeScreenshotBackgroundPattern';
import { buildFloatingIconsPromptLines } from './storeScreenshotFloatingIconsPrompt';
import { buildHeadlineTypographyPromptLines } from './storeScreenshotHeadlineTypographyPrompt';
import { buildFeatureHighlightPromptLines } from './storeScreenshotFeatureHighlightPrompt';
import { buildCropTargetPromptLines } from './storeScreenshotCropTarget';
import { buildMainImagePromptLines, buildMainImageSizeOverrideLines } from './storeScreenshotMainImagePrompt';
import { buildMainScreenFidelityPromptLines } from './storeScreenshotMainScreenFidelity';
import { getPromptLangText } from './storeScreenshotMultilang';
import {
    buildImageAttachmentPromptLines,
    getImageAttachmentRoles,
} from './storeScreenshotImageAttachment';
import { buildSeriesLayoutLockPromptLines } from './storeScreenshotSeriesLayoutPrompt';
import { buildStylePromptLines } from './storeScreenshotStyleOptions';

type BuildPromptInput = {
    appTitle: string;
    storeMetadata: StoreMetadata;
    template: StoreScreenshotTemplate;
    item: StoreScreenshotItem;
    totalCount: number;
    hasLayoutReference?: boolean;
    layoutReferenceOrder?: number;
};

export function buildStoreScreenshotAiPrompt({
    appTitle,
    storeMetadata,
    template,
    item,
    totalCount,
    hasLayoutReference = false,
    layoutReferenceOrder = 1,
}: BuildPromptInput): string {
    const headline = getPromptLangText(item.headline);
    const subtitle = getPromptLangText(item.subtitle);
    const logoPlacementId = normalizeLogoPlacementId(item.logo_placement);
    const usesLogo = logoPlacementUsesLogo(logoPlacementId);
    const floatingIconsEnabled = normalizeFloatingIconsEnabled(item.floating_icons_enabled);
    const backgroundPatternId = normalizeBackgroundPatternId(
        item.background_pattern,
        item.background_motifs_enabled,
    );
    const resolvedAppName = appTitle || storeMetadata.title || 'App';
    const imageRoles = getImageAttachmentRoles(usesLogo, hasLayoutReference);
    const isLayoutAnchor = item.order === 1;

    const lines = [
        'Composite task: place the uploaded app screenshot inside a marketing phone frame with headline/subtitle/decor.',
        'Do NOT redraw or invent in-app UI — composite Image roles below. Conversion-focused, no watermarks.',
        '',
        ...buildImageAttachmentPromptLines(
            imageRoles,
            hasLayoutReference ? layoutReferenceOrder : undefined,
        ),
        '',
        ...buildMainScreenFidelityPromptLines(imageRoles, { hasLayoutReference }),
        '',
        ...buildCropTargetPromptLines(item.crop_target_size, {
            includeLogoInSafeZone: usesLogo,
            logoImageNum: imageRoles.logoNum ?? 1,
        }),
        '',
        '## Brief',
        `App: ${resolvedAppName} · Brand: ${normalizeHexColor(template.brand_color, '#1A73E8')} · #${item.order}/${totalCount}`,
        headline ? `Headline: "${headline}"` : '',
        subtitle ? `Subtitle: "${subtitle}"` : '',
        '',
        ...buildLogoAttachmentPromptLines(logoPlacementId, resolvedAppName, imageRoles),
        '',
        ...buildMainImagePromptLines(usesLogo, logoPlacementId, imageRoles, item.crop_target_size, {
            isLayoutAnchor,
            hasLayoutReference,
        }),
        '',
        ...buildFeatureHighlightPromptLines(item.feature_highlight, imageRoles),
        ...buildFloatingIconsPromptLines(floatingIconsEnabled, imageRoles, item.icons),
        ...buildBackgroundColorPromptLines(item.background_color, template),
        ...buildBackgroundPatternPromptLines(
            backgroundPatternId,
            template,
            item.background_color,
            item.background_motifs,
        ),
        '',
        '## Copy & typography',
        ...buildCopyStylePromptLinesForScreenshot(item, template),
        ...buildHeadlineTypographyPromptLines(template),
        ...buildStylePromptLines(template, item.background_color),
        '',
        ...(totalCount > 1
            ? [
                ...buildSeriesLayoutLockPromptLines(item.crop_target_size, resolvedAppName, {
                    isLayoutAnchor,
                }),
                '',
            ]
            : []),
        ...buildMainImageSizeOverrideLines(usesLogo, logoPlacementId, hasLayoutReference, imageRoles, {
            isLayoutAnchor,
        }),
    ];

    return lines.filter((line) => line !== '').join('\n');
}
