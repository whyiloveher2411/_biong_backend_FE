import React from 'react';
import {
    Alert,
    Box,
    Card,
    Stack,
} from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import type { ImageObjectProps } from 'helpers/image';
import { MarketingCopyImageButton } from '../Marketing/MarketingPromptActionButtons';
import StepMappingHeadlineBulkPanel from './StepMappingHeadlineBulkPanel';
import StepMappingItemEditor from './StepMappingItemEditor';
import StepMappingScreenshotNav from './StepMappingScreenshotNav';
import { normalizeBackgroundPatternId } from './storeScreenshotBackgroundPattern';
import { normalizeBackgroundColor } from './storeScreenshotBackgroundColorPrompt';
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
} from './storeScreenshotApi';
import { resolveLayoutReference } from './storeScreenshotLayoutReference';
import { buildStoreScreenshotAiPrompt } from './storeScreenshotPrompt';
import { buildHeadlineBulkPrompt } from './storeScreenshotHeadlinePrompt';
import { applyHeadlinesToItems } from './storeScreenshotHeadlineParser';
import {
    normalizeMultilangText,
} from './storeScreenshotMultilang';
import type { EditableItem } from './stepMappingTypes';
import {
    getStoreScreenshotAiFieldName,
    imageUrlToImageObject,
    imageUrlToImagePostValue,
    normalizeImageFieldValue,
    readImagePostFieldValue,
} from './storeScreenshotImageUtils';

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

function buildEditableItems(screenshots: StoreScreenshotItem[]): EditableItem[] {
    return [...screenshots]
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
            ...item,
            headline: normalizeMultilangText(item.headline),
            subtitle: normalizeMultilangText(item.subtitle),
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
        }));
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
    const postRef = React.useRef<Record<string, ImageObjectProps | ''>>({});
    const configRef = React.useRef(config);
    configRef.current = config;

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
        const nextItems = buildEditableItems(projectConfig.screenshots || []);
        setItems(nextItems);

        const nextPost: Record<string, ImageObjectProps | ''> = {};
        nextItems.forEach((item) => {
            const fieldName = getStoreScreenshotAiFieldName(item.id);
            nextPost[fieldName] = imageUrlToImagePostValue(
                item.ai_image_url,
                item.ai_image_width || item.width,
                item.ai_image_height || item.height,
            );
        });
        postRef.current = nextPost;
        setImageFieldKeys((prev) => {
            const next: Record<string, number> = {};
            nextItems.forEach((item) => {
                next[item.id] = (prev[item.id] || 0) + 1;
            });
            return next;
        });
        setActiveId((prev) => resolveActiveScreenshotId(projectConfig, nextItems, prev));
    }, [resolveActiveScreenshotId]);

    React.useEffect(() => {
        applyProjectConfig(config);
    }, [config.updated_at, applyProjectConfig]);

    const totalCount = items.length;
    const activeItem = items.find((item) => item.id === activeId) || items[0];
    const brandColor = normalizeHexColor(config.template.brand_color, '#1A73E8');
    const backgroundColorSwatches = brandColor ? [brandColor] : [];
    const showLogoCopyButton = items.some((item) => logoPlacementUsesLogo(item.logo_placement));
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
        const usesLogo = logoPlacementUsesLogo(activeItem?.logo_placement);
        const hasRef = !!activeLayoutReference;

        if (usesLogo && hasRef) {
            return 'Ảnh 1 = layout reference (#1), ảnh 2 = logo, ảnh 3 = screenshot gốc (nội dung màn hình).';
        }
        if (usesLogo) {
            return 'Logo (nếu có): ảnh 1 = logo, ảnh 2 = screenshot.';
        }
        if (hasRef) {
            return 'Ảnh 1 = layout reference (#1), ảnh 2 = screenshot gốc (nội dung màn hình).';
        }
        return 'Ảnh 1 = screenshot.';
    }, [activeItem?.logo_placement, activeLayoutReference]);

    const headlineBulkPrompt = React.useMemo(() => buildHeadlineBulkPrompt({
        appTitle,
        storeMetadata,
        template: config.template,
        screenshots: items,
    }), [appTitle, storeMetadata, config.template, items]);

    const handleBulkHeadlineApply = React.useCallback((rows: Parameters<typeof applyHeadlinesToItems>[1]) => {
        setItems((prev) => applyHeadlinesToItems(prev, rows));
    }, []);

    const updateItem = (id: string, patch: Partial<EditableItem>) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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
        postRef.current[fieldName] = image || '';
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
        setSaving(true);
        try {
            const result = await saveStoreScreenshotAiContent(
                appMobileId,
                items.map((item) => ({
                    id: item.id,
                    headline: item.headline,
                    subtitle: item.subtitle,
                    crop_target_size: item.crop_target_size || DEFAULT_CROP_TARGET_SIZE_ID,
                    logo_placement: item.logo_placement || DEFAULT_LOGO_PLACEMENT_ID,
                    floating_icons_enabled: normalizeFloatingIconsEnabled(item.floating_icons_enabled),
                    background_pattern: normalizeBackgroundPatternId(
                        item.background_pattern,
                        item.background_motifs_enabled,
                    ),
                    feature_highlight: normalizeFeatureHighlightText(item.feature_highlight),
                    background_color: normalizeBackgroundColor(item.background_color),
                    ai_prompt: resolvePrompt(item),
                    ai_image: readImagePostFieldValue(
                        postRef.current[getStoreScreenshotAiFieldName(item.id)],
                    ) || item.ai_image,
                })),
            );
            onUpdated(result.config);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không lưu được nội dung AI');
        } finally {
            setSaving(false);
        }
    };

    if (items.length === 0) {
        return <Alert severity="warning">Hãy chọn ít nhất 1 screenshot ở bước Upload.</Alert>;
    }

    if (!activeItem) {
        return null;
    }

    return (
        <Box sx={{ position: 'relative' }}>
            <Stack spacing={2} sx={{ pb: 10 }}>
                <Alert severity="info" sx={{ py: 1 }}>
                    {`Bước 1: sinh headline bulk. Bước 2: chọn ảnh ở thanh trên → chỉnh từng tab → copy prompt/ảnh → AI → upload. ${geminiImageOrderHint} Generate screenshot #1 trước để #2+ dùng làm layout reference.`}
                </Alert>

                <StepMappingHeadlineBulkPanel
                    promptText={headlineBulkPrompt}
                    expectedCount={totalCount}
                    onApply={handleBulkHeadlineApply}
                />

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
                />

                <Card sx={{ p: 2 }}>
                    <StepMappingItemEditor
                        key={activeItem.id}
                        appMobileId={appMobileId}
                        appLogoUrl={appLogoUrl}
                        item={activeItem}
                        totalCount={totalCount}
                        layoutReferenceUrl={activeLayoutReference?.url}
                        promptText={resolvePrompt(activeItem)}
                        imageFieldKey={imageFieldKeys[activeItem.id] || 0}
                        fieldName={getStoreScreenshotAiFieldName(activeItem.id)}
                        post={postRef.current}
                        backgroundColorSwatches={backgroundColorSwatches}
                        onItemChange={(patch) => updateItem(activeItem.id, patch)}
                        onAiImageReview={(value) => handleAiImageReview(activeItem.id, value)}
                        onCopyNotice={setCopyNotice}
                        onError={onError}
                        onRefreshAiImage={() => handleRefreshAiImage(activeItem.id)}
                        getImageBlob={() => fetchStoreScreenshotSourceImageBlob(appMobileId, activeItem.id)}
                        getLogoBlob={
                            logoPlacementUsesLogo(activeItem.logo_placement)
                                ? getAppLogoBlob
                                : undefined
                        }
                    />
                </Card>
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
                <LoadingButton variant="contained" loading={saving} onClick={handleSave}>
                    Lưu prompt và ảnh AI
                </LoadingButton>
            </Box>
        </Box>
    );
}

export default StepMapping;
