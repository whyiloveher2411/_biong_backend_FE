import type {
    StoreMetadata,
    StoreScreenshotItem,
    StoreScreenshotTemplate,
} from './storeScreenshotTypes';
import { buildCopyStylePromptLinesForScreenshot } from './storeScreenshotCopyStyleOptions';
import { buildCropTargetPromptLines } from './storeScreenshotCropTarget';
import {
    buildLogoAttachmentPromptLines,
    logoPlacementUsesLogo,
    normalizeLogoPlacementId,
} from './storeScreenshotLogoPlacement';
import { buildBackgroundColorPromptLines } from './storeScreenshotBackgroundColorPrompt';
import { buildBackgroundPatternPromptLines } from './storeScreenshotBackgroundPattern';
import { normalizeHexColor } from './storeScreenshotColorUtils';
import {
    normalizeFloatingIconsEnabled,
} from './storeScreenshotDecorOptions';
import { normalizeBackgroundPatternId } from './storeScreenshotBackgroundPattern';
import { buildFloatingIconsPromptLines } from './storeScreenshotFloatingIconsPrompt';
import { buildHeadlineTypographyPromptLines } from './storeScreenshotHeadlineTypographyPrompt';
import { buildFeatureHighlightPromptLines } from './storeScreenshotFeatureHighlightPrompt';
import { buildMainImagePromptLines, buildMainImageSizeOverrideLines } from './storeScreenshotMainImagePrompt';
import { getPromptLangText } from './storeScreenshotMultilang';
import { getImageAttachmentRoles } from './storeScreenshotImageAttachment';
import {
    buildLayoutReferenceCriticalWarningLines,
    buildLayoutReferencePromptLines,
    buildSeriesLayoutLockPromptLines,
} from './storeScreenshotSeriesLayoutPrompt';
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

    const lines = [
        'You are an expert mobile app store marketing designer with deep experience in App Store and Google Play screenshot creatives.',
        'Your role is to turn raw in-app screenshots into polished, conversion-focused store listing visuals that feel native to iOS and Android storefronts.',
        'Primary goal: maximize user attraction and download intent — the visual must stop the scroll and make the headline/subtitle irresistible.',
        'Prioritize clarity, hierarchy, benefit-led messaging, and brand consistency. Do not add watermarks or unrelated decorative clutter.',
        '',
        '## Task',
        'Create one professional app store marketing screenshot for a mobile app listing.',
        '',
        `App name: ${resolvedAppName}`,
        `Brand color: ${normalizeHexColor(template.brand_color, '#1A73E8')}`,
        '',
        `Screenshot #${item.order} of ${totalCount}`,
        headline ? `Headline: ${headline}` : '',
        subtitle ? `Subtitle: ${subtitle}` : '',
        '',
        ...(hasLayoutReference
            ? buildLayoutReferenceCriticalWarningLines(imageRoles, layoutReferenceOrder)
            : []),
        ...buildLogoAttachmentPromptLines(logoPlacementId, resolvedAppName, imageRoles),
        '',
        ...(hasLayoutReference
            ? [
                ...buildLayoutReferencePromptLines(imageRoles, layoutReferenceOrder),
                '',
            ]
            : []),
        ...buildMainImagePromptLines(usesLogo, logoPlacementId, imageRoles),
        '',
        ...buildFeatureHighlightPromptLines(item.feature_highlight, imageRoles),
        '',
        ...buildFloatingIconsPromptLines(floatingIconsEnabled, imageRoles),
        '',
        ...buildBackgroundColorPromptLines(item.background_color, template),
        '',
        ...buildBackgroundPatternPromptLines(backgroundPatternId, template, item.background_color),
        '',
        ...buildCropTargetPromptLines(item.crop_target_size, {
            includeLogoInSafeZone: usesLogo,
            logoImageNum: imageRoles.logoNum ?? undefined,
        }),
        '',
        '## Headline & title on image',
        ...buildCopyStylePromptLinesForScreenshot(item, template),
        ...buildHeadlineTypographyPromptLines(template),
        headline
            ? `Headline text to render: "${headline}" — apply typography rules above (accent keywords, shadow, hierarchy).`
            : 'If no headline is provided, leave headline area minimal.',
        subtitle
            ? `Subtitle text to render: "${subtitle}" — secondary styling per rules above; stay inside safe zone.`
            : '',
        '',
        '## Visual style',
        ...buildStylePromptLines(template, item.background_color),
        'Global overrides: device mockup has NO drop shadow; logo/app name and floating icons have NO background containers or plates.',
        '',
        ...(totalCount > 1
            ? [
                ...buildSeriesLayoutLockPromptLines(item.crop_target_size, resolvedAppName),
                '',
            ]
            : []),
        ...buildMainImageSizeOverrideLines(usesLogo, logoPlacementId, hasLayoutReference, imageRoles),
    ];

    return lines.filter((line) => line !== '').join('\n');
}
