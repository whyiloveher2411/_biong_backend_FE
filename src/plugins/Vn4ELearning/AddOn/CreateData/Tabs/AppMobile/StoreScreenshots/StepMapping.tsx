import React from 'react';
import {
    Alert,
    Box,
    Card,
    Stack,
    Typography,
} from '@mui/material';
import ImageForm from 'components/atoms/fields/image/Form';
import LoadingButton from 'components/atoms/LoadingButton';
import type { ImageObjectProps } from 'helpers/image';
import { MarketingCopyImageButton } from '../Marketing/MarketingPromptActionButtons';
import ScreenshotLogoPlacementField from './ScreenshotLogoPlacementField';
import StepMappingItemEditor from './StepMappingItemEditor';
import StepMappingScreenshotNav from './StepMappingScreenshotNav';
import { normalizeBackgroundPatternId } from './storeScreenshotBackgroundPattern';
import { normalizeBackgroundColor } from './storeScreenshotBackgroundColorPrompt';
import { normalizeDecorEditorValue } from './ScreenshotDecorEditor';
import { normalizeDecorStringList } from './storeScreenshotVisualDecorCatalog';
import { normalizeFeatureHighlightText } from './storeScreenshotFeatureHighlightPrompt';
import { normalizeHexColor } from './storeScreenshotColorUtils';
import {
    DEFAULT_CROP_TARGET_SIZE_ID,
    normalizeCropTargetSizeId,
} from './storeScreenshotCropTarget';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import {
    DEFAULT_LOGO_PLACEMENT_ID,
    logoPlacementUsesLogo,
    normalizeLogoPlacementId,
    type LogoPlacementId,
} from './storeScreenshotLogoPlacement';
import type {
    StoreMetadata,
    StoreScreenshotConfig,
    StoreScreenshotItem,
    StoreScreenshotProjectResponse,
    StoreScreenshotTarget,
} from './storeScreenshotTypes';
import {
    fetchStoreScreenshotAppLogoBlob,
    fetchStoreScreenshotProject,
    fetchStoreScreenshotSourceImageBlob,
    saveStoreScreenshotActiveScreenshot,
    saveStoreScreenshotAiContent,
    saveStoreScreenshotCaptions,
    syncStoreScreenshotsFromImages,
} from './storeScreenshotApi';
import { resolveLayoutReference } from './storeScreenshotLayoutReference';
import { buildStoreScreenshotAiPrompt } from './storeScreenshotPrompt';
import {
    getPromptLangText,
    normalizeMultilangText,
} from './storeScreenshotMultilang';
import type { EditableItem } from './stepMappingTypes';
import {
    getStoreScreenshotAiFieldName,
    imageUrlToImageObject,
    imageUrlToImagePostValue,
    normalizeImageFieldValue,
    readImagePostFieldValue,
    resolveStoreScreenshotAiImageDisplayUrl,
    stripImageObjectCacheBust,
} from './storeScreenshotImageUtils';
import {
    buildCaptionPayloadByUrl,
    normalizeStoreScreenshotShotUrl,
    resolveStoreScreenshotImageLink,
    screenshotsToImageValue,
    sortStoreScreenshots,
    STORE_SCREENSHOT_SOURCE_IMAGE_FIELD,
} from './storeScreenshotSourceImageSync';

type Props = {
    appMobileId: number;
    appTitle: string;
    appLogoUrl: string;
    storeMetadata: StoreMetadata;
    config: StoreScreenshotConfig;
    targets: Record<string, StoreScreenshotTarget>;
    onUpdated: (config: StoreScreenshotConfig) => void;
    onProjectRefreshed?: (result: StoreScreenshotProjectResponse) => void;
    onError: (message: string) => void;
};

const IMAGE_SYNC_DEBOUNCE_MS = 500;

function syncItemsLogoPlacement(items: EditableItem[], logoPlacement: LogoPlacementId): EditableItem[] {
    return items.map((item) => ({
        ...item,
        logo_placement: logoPlacement,
    }));
}

function resolveSharedLogoPlacement(items: EditableItem[]): LogoPlacementId {
    if (items.length === 0) {
        return DEFAULT_LOGO_PLACEMENT_ID;
    }

    return normalizeLogoPlacementId(items[0].logo_placement);
}

function buildEditableItems(screenshots: StoreScreenshotItem[]): EditableItem[] {
    return [...screenshots]
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
            ...item,
            headline: normalizeMultilangText(item.headline),
            subtitle: normalizeMultilangText(item.subtitle),
            headline_variants: item.headline_variants ?? [],
            ai_image_url: item.ai_image_url || '',
            ai_image: imageUrlToImageObject(
                item.ai_image_url,
                item.ai_image_width || item.width,
                item.ai_image_height || item.height,
            ),
            crop_target_size: normalizeCropTargetSizeId(item.crop_target_size),
            logo_placement: normalizeLogoPlacementId(item.logo_placement),
            floating_icons_enabled: normalizeFloatingIconsEnabled(item.floating_icons_enabled),
            background_pattern: normalizeBackgroundPatternId(
                item.background_pattern,
                item.background_motifs_enabled,
            ),
            feature_highlight: normalizeFeatureHighlightText(item.feature_highlight),
            background_color: normalizeBackgroundColor(item.background_color),
            icons: normalizeDecorStringList(item.icons, 3),
            background_motifs: normalizeDecorStringList(item.background_motifs, 6),
        }));
}

function buildCaptionsByUrl(items: EditableItem[]): Record<string, string> {
    const captionsByUrl: Record<string, string> = {};
    items.forEach((item) => {
        const norm = normalizeStoreScreenshotShotUrl(item.source_url);
        if (norm) {
            captionsByUrl[norm] = item.caption || '';
        }
    });
    return captionsByUrl;
}

function StepMapping({
    appMobileId,
    appTitle,
    appLogoUrl,
    storeMetadata,
    config,
    onUpdated,
    onProjectRefreshed,
    onError,
}: Props) {
    const [items, setItems] = React.useState<EditableItem[]>([]);
    const [activeId, setActiveId] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [copyNotice, setCopyNotice] = React.useState('');
    const [imageFieldKeys, setImageFieldKeys] = React.useState<Record<string, number>>({});
    const [sourceImageFieldKey, setSourceImageFieldKey] = React.useState(0);
    const [pendingSourceImages, setPendingSourceImages] = React.useState<ImageObjectProps[]>([]);
    const [syncingImages, setSyncingImages] = React.useState(false);
    const [syncError, setSyncError] = React.useState('');

    const aiPostRef = React.useRef<Record<string, ImageObjectProps | ''>>({});
    const sourcePostRef = React.useRef<Record<string, ImageObjectProps[]>>({
        [STORE_SCREENSHOT_SOURCE_IMAGE_FIELD]: [],
    });
    const itemsRef = React.useRef<EditableItem[]>([]);
    const syncTimerRef = React.useRef<number | null>(null);
    const configRef = React.useRef(config);
    configRef.current = config;
    itemsRef.current = items;

    const savedScreenshots = React.useMemo(
        () => sortStoreScreenshots(config.screenshots || []),
        [config.screenshots],
    );
    const imageSignature = React.useMemo(
        () => savedScreenshots.map((shot) => `${shot.id}:${shot.source_url}:${shot.order}`).join('|'),
        [savedScreenshots],
    );

    const resolveActiveScreenshotId = React.useCallback((
        projectConfig: StoreScreenshotConfig,
        itemsList: EditableItem[],
        fallbackId = '',
    ) => {
        const savedId = String(projectConfig.active_mapping_screenshot_id || '').trim();
        if (savedId && itemsList.some((item) => item.id === savedId)) {
            return savedId;
        }
        if (fallbackId && itemsList.some((item) => item.id === fallbackId)) {
            return fallbackId;
        }
        return itemsList[0]?.id || '';
    }, []);

    const applyProjectConfig = React.useCallback((projectConfig: StoreScreenshotConfig) => {
        const builtItems = buildEditableItems(projectConfig.screenshots || []);
        const sharedLogoPlacement = resolveSharedLogoPlacement(builtItems);
        const nextItems = syncItemsLogoPlacement(builtItems, sharedLogoPlacement);
        setItems(nextItems);
        itemsRef.current = nextItems;

        const nextPost: Record<string, ImageObjectProps | ''> = {};
        nextItems.forEach((item) => {
            const fieldName = getStoreScreenshotAiFieldName(item.id);
            const displayUrl = resolveStoreScreenshotAiImageDisplayUrl(item);
            nextPost[fieldName] = imageUrlToImagePostValue(
                displayUrl,
                item.ai_image_width || item.width,
                item.ai_image_height || item.height,
            );
        });
        aiPostRef.current = nextPost;
        setImageFieldKeys((prev) => {
            const next: Record<string, number> = {};
            nextItems.forEach((item) => {
                const versionKey = Number(item.ai_image_version || 0);
                next[item.id] = versionKey > 0
                    ? versionKey
                    : (prev[item.id] || 0) + 1;
            });
            return next;
        });
        setActiveId((prev) => resolveActiveScreenshotId(projectConfig, nextItems, prev));
    }, [resolveActiveScreenshotId]);

    React.useEffect(() => {
        const images = screenshotsToImageValue(savedScreenshots);
        sourcePostRef.current[STORE_SCREENSHOT_SOURCE_IMAGE_FIELD] = images;
        setPendingSourceImages(images);
        setSourceImageFieldKey((prev) => prev + 1);
    }, [imageSignature]);

    React.useEffect(() => {
        applyProjectConfig(config);
    }, [config.updated_at, config.active_mapping_screenshot_id, applyProjectConfig, config]);

    const performImageSync = React.useCallback(async (images: ImageObjectProps[]) => {
        if (!appMobileId || images.length === 0) {
            return;
        }

        setSyncingImages(true);
        setSyncError('');

        try {
            const captionsByUrl = buildCaptionsByUrl(itemsRef.current);
            images.forEach((image) => {
                const norm = normalizeStoreScreenshotShotUrl(resolveStoreScreenshotImageLink(image));
                if (norm && captionsByUrl[norm] === undefined) {
                    captionsByUrl[norm] = '';
                }
            });
            const payloadByUrl = buildCaptionPayloadByUrl(images, captionsByUrl);

            const syncResult = await syncStoreScreenshotsFromImages(appMobileId, images);
            const captionPayload = sortStoreScreenshots(syncResult.config.screenshots || []).map((shot) => {
                const norm = normalizeStoreScreenshotShotUrl(shot.source_url);
                return {
                    id: shot.id,
                    caption: payloadByUrl[norm] ?? shot.caption ?? '',
                };
            });

            const result = captionPayload.length > 0
                ? await saveStoreScreenshotCaptions(appMobileId, captionPayload)
                : syncResult;

            onUpdated(result.config);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không đồng bộ được ảnh screenshot';
            setSyncError(message);
            onError(message);
        } finally {
            setSyncingImages(false);
        }
    }, [appMobileId, onError, onUpdated]);

    const handleSourceImagesReview = React.useCallback((value: JsonFormat) => {
        const images = Array.isArray(value) ? (value as ImageObjectProps[]) : [];
        sourcePostRef.current[STORE_SCREENSHOT_SOURCE_IMAGE_FIELD] = images;
        setPendingSourceImages(images);

        if (syncTimerRef.current) {
            window.clearTimeout(syncTimerRef.current);
        }

        if (images.length === 0) {
            return;
        }

        syncTimerRef.current = window.setTimeout(() => {
            void performImageSync(images);
        }, IMAGE_SYNC_DEBOUNCE_MS);
    }, [performImageSync]);

    React.useEffect(() => () => {
        if (syncTimerRef.current) {
            window.clearTimeout(syncTimerRef.current);
        }
    }, []);

    const totalCount = items.length;
    const activeItem = items.find((item) => item.id === activeId) || items[0];
    const brandColor = normalizeHexColor(config.template.brand_color, '#1A73E8');
    const backgroundColorSwatches = brandColor ? [brandColor] : [];
    const globalLogoPlacement = normalizeLogoPlacementId(items[0]?.logo_placement);
    const usesGlobalLogo = logoPlacementUsesLogo(globalLogoPlacement);
    const showLogoCopyButton = usesGlobalLogo;
    const getAppLogoBlob = React.useCallback(
        () => fetchStoreScreenshotAppLogoBlob(appMobileId),
        [appMobileId],
    );

    const resolvePrompt = React.useCallback((item: EditableItem): string => {
        const layoutReference = resolveLayoutReference(items, item);
        return buildStoreScreenshotAiPrompt({
            appTitle,
            storeMetadata,
            template: config.template,
            item,
            totalCount,
            hasLayoutReference: !!layoutReference,
            layoutReferenceOrder: layoutReference?.order ?? 1,
        });
    }, [appTitle, storeMetadata, config.template, totalCount, items]);

    const activeLayoutReference = React.useMemo(
        () => resolveLayoutReference(items, activeItem),
        [items, activeItem],
    );

    const geminiImageOrderHint = React.useMemo(() => {
        const hasRef = !!activeLayoutReference;

        if (usesGlobalLogo && hasRef) {
            return 'Ảnh 1 = layout reference (#1), ảnh 2 = logo, ảnh 3 = screenshot gốc (nội dung màn hình).';
        }
        if (usesGlobalLogo) {
            return 'Logo (nếu có): ảnh 1 = logo, ảnh 2 = screenshot.';
        }
        if (hasRef) {
            return 'Ảnh 1 = layout reference (#1), ảnh 2 = screenshot gốc (nội dung màn hình).';
        }
        return 'Ảnh 1 = screenshot.';
    }, [usesGlobalLogo, activeLayoutReference]);

    const handleGlobalLogoPlacementChange = React.useCallback((logoPlacement: LogoPlacementId) => {
        setItems((prev) => syncItemsLogoPlacement(prev, logoPlacement));
    }, []);

    const updateItem = (id: string, patch: Partial<EditableItem>) => {
        setItems((prev) => {
            const next = prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
            itemsRef.current = next;
            return next;
        });
    };

    const handleSelectScreenshot = React.useCallback((screenshotId: string) => {
        setActiveId(screenshotId);
        onUpdated({
            ...configRef.current,
            active_mapping_screenshot_id: screenshotId,
        });

        if (!appMobileId) {
            return;
        }

        saveStoreScreenshotActiveScreenshot(appMobileId, screenshotId)
            .then((result) => {
                onUpdated(result.config);
            })
            .catch((error) => {
                onError(error instanceof Error ? error.message : 'Không lưu được screenshot đang chỉnh');
            });
    }, [appMobileId, onError, onUpdated]);

    const handleAiImageReview = (id: string, value: JsonFormat) => {
        const image = normalizeImageFieldValue(value);
        const fieldName = getStoreScreenshotAiFieldName(id);
        aiPostRef.current[fieldName] = image || '';
        updateItem(id, {
            ai_image: image,
            ai_image_url: image?.link || '',
            ai_image_width: image?.width || 0,
            ai_image_height: image?.height || 0,
        });
        setImageFieldKeys((prev) => ({
            ...prev,
            [id]: (prev[id] || 0) + 1,
        }));
    };

    const handleRefreshAiImage = async (_id: string) => {
        try {
            const result = await fetchStoreScreenshotProject(appMobileId);
            applyProjectConfig(result.config);
            if (onProjectRefreshed) {
                onProjectRefreshed(result);
            } else {
                onUpdated(result.config);
            }
            setCopyNotice('Đã tải lại toàn bộ dữ liệu từ server');
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không tải lại được dữ liệu từ server');
        }
    };

    const handleSave = async () => {
        if (items.length === 0) {
            onError('Hãy chọn ít nhất 1 screenshot');
            return;
        }

        setSaving(true);
        try {
            await saveStoreScreenshotCaptions(
                appMobileId,
                items.map((item) => ({
                    id: item.id,
                    caption: item.caption || '',
                })),
            );

            const result = await saveStoreScreenshotAiContent(
                appMobileId,
                items.map((item) => {
                    const decor = normalizeDecorEditorValue({
                        background_pattern: item.background_pattern,
                        background_color: item.background_color,
                        floating_icons_enabled: item.floating_icons_enabled,
                        icons: item.icons,
                        background_motifs: item.background_motifs,
                        iconsText: item.iconsText,
                        backgroundMotifsText: item.backgroundMotifsText,
                    });

                    return {
                        id: item.id,
                        headline: item.headline,
                        subtitle: item.subtitle,
                        crop_target_size: item.crop_target_size || DEFAULT_CROP_TARGET_SIZE_ID,
                        logo_placement: globalLogoPlacement,
                        floating_icons_enabled: decor.floating_icons_enabled,
                        background_pattern: decor.background_pattern,
                        feature_highlight: normalizeFeatureHighlightText(item.feature_highlight),
                        background_color: decor.background_color,
                        icons: decor.icons,
                        background_motifs: decor.background_motifs,
                        ai_prompt: resolvePrompt(item),
                        ai_image: stripImageObjectCacheBust(
                            readImagePostFieldValue(
                                aiPostRef.current[getStoreScreenshotAiFieldName(item.id)],
                            ) || item.ai_image,
                        ),
                    };
                }),
            );
            onUpdated(result.config);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không lưu được nội dung');
        } finally {
            setSaving(false);
        }
    };

    const screenshotCount = pendingSourceImages.length;

    return (
        <Box sx={{ position: 'relative' }}>
            <Stack spacing={2} sx={{ pb: 10 }}>
                <Alert severity="info" sx={{ py: 1 }}>
                    {`Chọn ảnh portrait — hệ thống tự đồng bộ. Chọn screenshot ở thanh trên → tab Copy: gợi ý Gemini headline → chỉnh visual → Mở Gemini ảnh AI / upload. ${geminiImageOrderHint} Generate screenshot #1 trước để #2+ dùng làm layout reference.`}
                </Alert>

                <ImageForm
                    key={sourceImageFieldKey}
                    component="image"
                    name={STORE_SCREENSHOT_SOURCE_IMAGE_FIELD}
                    post={sourcePostRef.current}
                    config={{
                        title: 'Screenshots',
                        multiple: true,
                        note: `Đã chọn ${screenshotCount}/10 ảnh`,
                        size: {
                            minWidth: 1080,
                            minHeight: 1080,
                        },
                    }}
                    onReview={handleSourceImagesReview}
                />

                {syncingImages ? (
                    <Typography variant="caption" color="text.secondary">
                        Đang đồng bộ ảnh…
                    </Typography>
                ) : null}

                {syncError ? (
                    <Alert severity="error" onClose={() => setSyncError('')}>
                        {syncError}
                    </Alert>
                ) : null}

                {items.length > 0 && activeItem ? (
                    <>
                        <Card sx={{ p: 2 }}>
                            <ScreenshotLogoPlacementField
                                value={globalLogoPlacement}
                                onChange={handleGlobalLogoPlacementChange}
                            />
                        </Card>

                        {showLogoCopyButton && !appLogoUrl ? (
                            <Alert severity="warning">
                                App chưa có logo — upload logo ở thông tin app trước khi copy.
                            </Alert>
                        ) : null}

                        {copyNotice ? (
                            <Alert severity="warning" onClose={() => setCopyNotice('')}>
                                {copyNotice}
                            </Alert>
                        ) : null}

                        <StepMappingScreenshotNav
                            items={items}
                            activeId={activeItem.id}
                            onSelect={handleSelectScreenshot}
                            isItemHeadlineComplete={(item) => Boolean(getPromptLangText(item.headline))}
                            isItemComplete={(item) => Boolean(item.ai_image_url)}
                        />

                        <Card sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                                Chỉnh screenshot #{activeItem.order}
                            </Typography>
                            <StepMappingItemEditor
                                key={activeItem.id}
                                appMobileId={appMobileId}
                                appTitle={appTitle}
                                appLogoUrl={appLogoUrl}
                                storeMetadata={storeMetadata}
                                config={config}
                                item={activeItem}
                                totalCount={totalCount}
                                layoutReferenceUrl={activeLayoutReference?.url}
                                usesLogo={usesGlobalLogo}
                                promptText={resolvePrompt(activeItem)}
                                imageFieldKey={imageFieldKeys[activeItem.id] || 0}
                                fieldName={getStoreScreenshotAiFieldName(activeItem.id)}
                                post={aiPostRef.current}
                                backgroundColorSwatches={backgroundColorSwatches}
                                geminiDisabled={syncingImages}
                                onItemChange={(patch) => updateItem(activeItem.id, patch)}
                                onConfigUpdated={onUpdated}
                                onAiImageReview={(value) => handleAiImageReview(activeItem.id, value)}
                                onCopyNotice={setCopyNotice}
                                onError={onError}
                                onRefreshAiImage={() => handleRefreshAiImage(activeItem.id)}
                                getImageBlob={() => fetchStoreScreenshotSourceImageBlob(appMobileId, activeItem.id)}
                                getLogoBlob={usesGlobalLogo ? getAppLogoBlob : undefined}
                            />
                        </Card>
                    </>
                ) : null}
            </Stack>

            <Box
                sx={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.5,
                    px: { xs: 2, md: 3 },
                    mx: { xs: -2, md: -3 },
                    bgcolor: 'background.paper',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (theme) => (
                        theme.palette.mode === 'dark'
                            ? '0 -8px 24px rgba(0,0,0,0.45)'
                            : '0 -8px 24px rgba(0,0,0,0.08)'
                    ),
                }}
            >
                {showLogoCopyButton ? (
                    <MarketingCopyImageButton
                        getImageBlob={getAppLogoBlob}
                        proxyOnly
                        onCopyNotice={setCopyNotice}
                        disabled={!appMobileId}
                    >
                        Sao chép logo
                    </MarketingCopyImageButton>
                ) : (
                    <Box />
                )}
                <LoadingButton
                    variant="contained"
                    loading={saving}
                    disabled={items.length === 0 || syncingImages}
                    onClick={handleSave}
                >
                    Lưu
                </LoadingButton>
            </Box>
        </Box>
    );
}

export default StepMapping;
