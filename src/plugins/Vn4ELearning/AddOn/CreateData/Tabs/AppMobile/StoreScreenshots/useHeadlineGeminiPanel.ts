import React from 'react';
import type { CopyStylePresetId } from './storeScreenshotCopyStyleOptions';
import { getCopyStylePresetById, normalizeCopyStylePresetId } from './storeScreenshotCopyStyleOptions';
import { buildHeadlineVariantsPrompt } from './storeScreenshotHeadlinePrompt';
import type { DecorSuggestion } from './storeScreenshotVisualDecorCatalog';
import {
    parseHeadlineVariantsResponse,
    type ParseHeadlineVariantsResponse,
} from './storeScreenshotHeadlineParser';
import { readTextFromClipboard } from './storeScreenshotClipboard';
import { openStoreScreenshotGemini } from './storeScreenshotGeminiWorkflow';
import {
    saveStoreScreenshotHeadlineSelection,
    saveStoreScreenshotHeadlineVariants,
} from './storeScreenshotApi';
import { resolveGeminiMarketingBackgroundColor } from './storeScreenshotBackgroundColorPrompt';
import { getPromptLangText, type StoreScreenshotMultilangText } from './storeScreenshotMultilang';
import type {
    HeadlineCopyVariant,
    StoreMetadata,
    StoreScreenshotConfig,
} from './storeScreenshotTypes';

const AUTO_IMPORT_DEBOUNCE_MS = 500;

export type UseHeadlineGeminiPanelParams = {
    appMobileId: number;
    appTitle: string;
    storeMetadata: StoreMetadata;
    config: StoreScreenshotConfig;
    screenshotId: string;
    sourceUrl: string;
    order: number;
    caption: string;
    totalCount: number;
    copyStylePreset: string;
    headline: StoreScreenshotMultilangText | string;
    subtitle: StoreScreenshotMultilangText | string;
    headlineVariants: HeadlineCopyVariant[];
    disabled?: boolean;
    onUpdated: (config: StoreScreenshotConfig) => void;
    onError: (message: string) => void;
};

type ImportResult = 'saved' | 'duplicate' | 'validation_failed' | 'save_failed' | 'skipped';

function buildVariantsFingerprint(
    variants: HeadlineCopyVariant[],
    decor: DecorSuggestion | null,
): string {
    const variantPart = variants.map((variant) => [
        variant.copy_style_id,
        getPromptLangText(variant.headline),
        getPromptLangText(variant.subtitle),
    ].join('|')).join(';;');

    if (!decor) {
        return variantPart;
    }

    const decorPart = [
        decor.background_pattern ?? '',
        decor.background_color ?? '',
        decor.floating_icons_enabled === undefined ? '' : String(decor.floating_icons_enabled),
        decor.icons.join('||'),
        decor.background_motifs.join('||'),
    ].join('::');

    return `${variantPart}@@@${decorPart}`;
}

function buildImportValidationError(parsed: ParseHeadlineVariantsResponse): string {
    if (parsed.errors.length > 0) {
        return parsed.errors.join(' · ');
    }
    return 'JSON chưa hợp lệ — cần mảng variants đủ 8 phong cách';
}

function buildImportSuccessMessage(
    parsed: ParseHeadlineVariantsResponse,
    brandColor?: string,
): string {
    if (!parsed.decor) {
        return `Đã cập nhật thành công — đã lưu ${parsed.variants.length} gợi ý headline.`;
    }
    const marketingBg = resolveGeminiMarketingBackgroundColor(
        parsed.decor.background_color ?? '',
        brandColor,
    );
    const parts = [
        `${parsed.variants.length} gợi ý headline`,
        marketingBg ? `màu nền ${marketingBg}` : '',
        `${parsed.decor.icons.length} floating icon`,
        `${parsed.decor.background_motifs.length} họa tiết nền`,
    ].filter(Boolean);
    return `Đã cập nhật thành công — ${parts.join(', ')}.`;
}

function resolveDecorForSave(
    decor: DecorSuggestion,
    brandColor?: string,
): DecorSuggestion {
    return {
        ...decor,
        background_color: resolveGeminiMarketingBackgroundColor(
            decor.background_color ?? '',
            brandColor,
        ),
    };
}

export function useHeadlineGeminiPanel({
    appMobileId,
    appTitle,
    storeMetadata,
    config,
    screenshotId,
    sourceUrl,
    order,
    caption,
    totalCount,
    copyStylePreset,
    headline,
    subtitle,
    headlineVariants,
    disabled = false,
    onUpdated,
    onError,
}: UseHeadlineGeminiPanelParams) {
    const [pasteValue, setPasteValue] = React.useState('');
    const [openingGemini, setOpeningGemini] = React.useState(false);
    const [readingClipboard, setReadingClipboard] = React.useState(false);
    const [importing, setImporting] = React.useState(false);
    const [savingStyleId, setSavingStyleId] = React.useState('');
    const [applyError, setApplyError] = React.useState('');
    const [applySuccess, setApplySuccess] = React.useState('');

    const pasteValueRef = React.useRef(pasteValue);
    const lastImportedFingerprintRef = React.useRef('');
    const importInFlightRef = React.useRef(false);
    const captionRef = React.useRef(caption);
    pasteValueRef.current = pasteValue;
    captionRef.current = caption;

    const hasSavedSelection = Boolean(getPromptLangText(headline));
    const selectedStyleId = normalizeCopyStylePresetId(copyStylePreset);
    const selectedPreset = getCopyStylePresetById(selectedStyleId);
    const displayVariants = headlineVariants.length > 0 ? headlineVariants : [];

    const promptText = React.useMemo(() => buildHeadlineVariantsPrompt({
        appTitle,
        storeMetadata,
        template: config.template,
        order,
        caption,
        totalCount,
    }), [appTitle, storeMetadata, config.template, order, caption, totalCount]);

    React.useEffect(() => {
        setPasteValue('');
        setApplyError('');
        setApplySuccess('');
        setOpeningGemini(false);
        setReadingClipboard(false);
        setSavingStyleId('');
    }, [screenshotId]);

    React.useEffect(() => {
        const shot = config.screenshots.find((item) => item.id === screenshotId);
        const decor: DecorSuggestion | null = shot ? {
            background_pattern: shot.background_pattern,
            background_color: shot.background_color,
            floating_icons_enabled: shot.floating_icons_enabled,
            icons: shot.icons ?? [],
            background_motifs: shot.background_motifs ?? [],
        } : null;
        lastImportedFingerprintRef.current = buildVariantsFingerprint(headlineVariants, decor);
    }, [screenshotId, headlineVariants, config.screenshots]);

    const importVariants = React.useCallback(async (
        raw: string,
        options?: { silent?: boolean; prevalidated?: ParseHeadlineVariantsResponse },
    ): Promise<ImportResult> => {
        if (disabled || importInFlightRef.current) {
            return 'skipped';
        }

        const trimmed = String(raw || '').trim();
        if (!trimmed) {
            if (!options?.silent) {
                setApplyError('Chưa có nội dung JSON');
                setApplySuccess('');
            }
            return 'validation_failed';
        }

        const parsed = options?.prevalidated ?? parseHeadlineVariantsResponse(trimmed);
        if (parsed.errors.length > 0 || parsed.variants.length === 0) {
            if (!options?.silent) {
                setApplyError(buildImportValidationError(parsed));
                setApplySuccess('');
            }
            return 'validation_failed';
        }

        const decorForSave = parsed.decor
            ? resolveDecorForSave(parsed.decor, config.template.brand_color)
            : null;
        const fingerprint = buildVariantsFingerprint(parsed.variants, decorForSave);
        if (fingerprint === lastImportedFingerprintRef.current) {
            if (!options?.silent) {
                setApplyError('');
                setApplySuccess('Dữ liệu trùng với bản đã lưu — không cần cập nhật lại.');
            }
            return 'duplicate';
        }

        importInFlightRef.current = true;
        setImporting(true);
        setApplyError('');

        try {
            const result = await saveStoreScreenshotHeadlineVariants(appMobileId, {
                id: screenshotId,
                caption: captionRef.current,
                headline_variants: parsed.variants.map((variant) => ({
                    copy_style_id: variant.copy_style_id,
                    headline: variant.headline,
                    subtitle: variant.subtitle,
                })),
                ...(decorForSave ? {
                    background_pattern: decorForSave.background_pattern,
                    background_color: decorForSave.background_color ?? '',
                    floating_icons_enabled: decorForSave.floating_icons_enabled,
                    icons: decorForSave.icons,
                    background_motifs: decorForSave.background_motifs,
                } : {}),
            });
            lastImportedFingerprintRef.current = fingerprint;
            onUpdated(result.config);
            if (!options?.silent) {
                setApplySuccess(buildImportSuccessMessage(parsed, config.template.brand_color));
            }
            setPasteValue('');
            return 'saved';
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không lưu được gợi ý headline';
            setApplyError(message);
            setApplySuccess('');
            if (!options?.silent) {
                onError(message);
            }
            return 'save_failed';
        } finally {
            importInFlightRef.current = false;
            setImporting(false);
        }
    }, [appMobileId, config.template.brand_color, disabled, onError, onUpdated, screenshotId]);

    React.useEffect(() => {
        if (!pasteValue.trim() || disabled) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            void importVariants(pasteValueRef.current, { silent: true });
        }, AUTO_IMPORT_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [pasteValue, disabled, importVariants]);

    const handleImportFromClipboard = React.useCallback(async () => {
        if (disabled || readingClipboard || importing) {
            return;
        }

        setApplyError('');
        setApplySuccess('');
        setReadingClipboard(true);

        try {
            const raw = await readTextFromClipboard();
            const trimmed = String(raw || '').trim();
            if (!trimmed) {
                setApplyError('Clipboard trống — hãy copy JSON từ Gemini trước');
                return;
            }

            const parsed = parseHeadlineVariantsResponse(trimmed);
            if (parsed.errors.length > 0 || parsed.variants.length === 0) {
                setApplyError(buildImportValidationError(parsed));
                return;
            }

            await importVariants(trimmed, { prevalidated: parsed });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không đọc được clipboard';
            setApplyError(message);
            setApplySuccess('');
            onError(message);
        } finally {
            setReadingClipboard(false);
        }
    }, [disabled, importVariants, importing, onError, readingClipboard]);

    const handleOpenGemini = React.useCallback(async () => {
        if (openingGemini || disabled) {
            return;
        }

        setOpeningGemini(true);
        try {
            await openStoreScreenshotGemini({
                appMobileId,
                screenshotId,
                prompt: promptText,
                sourceImageUrl: sourceUrl,
                usesLogo: false,
                headlineOnly: true,
            });
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không mở được Gemini');
        } finally {
            setOpeningGemini(false);
        }
    }, [appMobileId, disabled, onError, openingGemini, promptText, screenshotId, sourceUrl]);

    const handlePaste = React.useCallback(() => {
        window.setTimeout(() => {
            void importVariants(pasteValueRef.current);
        }, 0);
    }, [importVariants]);

    const handleSelectVariant = React.useCallback(async (copyStyleId: CopyStylePresetId) => {
        if (disabled || savingStyleId) {
            return;
        }

        setApplyError('');
        setApplySuccess('');
        setSavingStyleId(copyStyleId);

        try {
            const result = await saveStoreScreenshotHeadlineSelection(appMobileId, {
                id: screenshotId,
                copy_style_id: copyStyleId,
            });
            onUpdated(result.config);
            setApplySuccess(`Đã chọn: ${getCopyStylePresetById(copyStyleId).label}`);
        } catch (error) {
            setApplyError(error instanceof Error ? error.message : 'Không lưu được lựa chọn');
        } finally {
            setSavingStyleId('');
        }
    }, [appMobileId, disabled, onUpdated, savingStyleId, screenshotId]);

    const clearApplySuccess = React.useCallback(() => {
        setApplySuccess('');
    }, []);

    const handlePasteValueChange = React.useCallback((value: string) => {
        setPasteValue(value);
        setApplyError('');
        setApplySuccess('');
    }, []);

    return {
        disabled,
        promptText,
        openingGemini,
        readingClipboard,
        importing,
        handleOpenGemini,
        handleImportFromClipboard,
        pasteValue,
        handlePasteValueChange,
        applyError,
        applySuccess,
        clearApplySuccess,
        hasSavedSelection,
        selectedPreset,
        headline,
        subtitle,
        savingStyleId,
        handlePaste,
        handleSelectVariant,
        displayVariants,
        selectedStyleId,
    };
}

export type HeadlineGeminiWorkflow = ReturnType<typeof useHeadlineGeminiPanel>;
