import React from 'react';
import {
    Alert,
    Box,
    Card,
    CardMedia,
    Stack,
    Typography,
} from '@mui/material';
import ImageForm from 'components/atoms/fields/image/Form';
import LoadingButton from 'components/atoms/LoadingButton';
import type { ImageObjectProps } from 'helpers/image';
import {
    MarketingCopyImageButton,
    MarketingCopyPromptButton,
} from '../Marketing/MarketingPromptActionButtons';
import ScreenshotCropTargetField from './ScreenshotCropTargetField';
import ScreenshotBackgroundPatternField from './ScreenshotBackgroundPatternField';
import ScreenshotDecorOptionsField from './ScreenshotDecorOptionsField';
import ScreenshotFeatureHighlightField from './ScreenshotFeatureHighlightField';
import StoreScreenshotColorField from './StoreScreenshotColorField';
import ScreenshotLogoPlacementField from './ScreenshotLogoPlacementField';
import {
    DEFAULT_CROP_TARGET_SIZE_ID,
    normalizeCropTargetSizeId,
} from './storeScreenshotCropTarget';
import { normalizeBackgroundPatternId } from './storeScreenshotBackgroundPattern';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import { normalizeBackgroundColor } from './storeScreenshotBackgroundColorPrompt';
import { normalizeFeatureHighlightText } from './storeScreenshotFeatureHighlightPrompt';
import { normalizeHexColor } from './storeScreenshotColorUtils';
import {
    DEFAULT_LOGO_PLACEMENT_ID,
    logoPlacementUsesLogo,
    normalizeLogoPlacementId,
} from './storeScreenshotLogoPlacement';
import type {
    StoreMetadata,
    StoreScreenshotConfig,
    StoreScreenshotItem,
    StoreScreenshotTarget,
} from './storeScreenshotTypes';
import {
    fetchStoreScreenshotAppLogoBlob,
    fetchStoreScreenshotSourceImageBlob,
    saveStoreScreenshotAiContent,
} from './storeScreenshotApi';
import { buildStoreScreenshotAiPrompt } from './storeScreenshotPrompt';
import { buildHeadlineBulkPrompt } from './storeScreenshotHeadlinePrompt';
import { applyHeadlinesToItems } from './storeScreenshotHeadlineParser';
import StepMappingHeadlineBulkPanel from './StepMappingHeadlineBulkPanel';
import {
    getCopyStylePresetById,
    getScreenshotPositionHint,
    normalizeCopyStylePresetId,
} from './storeScreenshotCopyStyleOptions';
import StoreScreenshotExampleHighlight from './StoreScreenshotExampleHighlight';
import StoreScreenshotMultilangField from './StoreScreenshotMultilangField';
import {
    normalizeMultilangText,
    type StoreScreenshotMultilangText,
} from './storeScreenshotMultilang';
import {
    encodeExternalImageUrl,
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
    onError: (message: string) => void;
};

type EditableItem = Omit<StoreScreenshotItem, 'headline' | 'subtitle'> & {
    headline: StoreScreenshotMultilangText;
    subtitle: StoreScreenshotMultilangText;
    ai_image: ImageObjectProps | null;
};

function buildEditableItems(screenshots: StoreScreenshotItem[]): EditableItem[] {
    return [...screenshots]
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
            ...item,
            headline: normalizeMultilangText(item.headline),
            subtitle: normalizeMultilangText(item.subtitle),
            ai_image_url: item.ai_image_url || '',
            ai_image: imageUrlToImageObject(item.ai_image_url, item.width, item.height),
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
    targets,
    onUpdated,
    onError,
}: Props) {
    const [items, setItems] = React.useState<EditableItem[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [copyNotice, setCopyNotice] = React.useState('');
    const [imageFieldKeys, setImageFieldKeys] = React.useState<Record<string, number>>({});
    const postRef = React.useRef<Record<string, ImageObjectProps | ''>>({});

    React.useEffect(() => {
        const nextItems = buildEditableItems(config.screenshots || []);
        setItems(nextItems);

        const nextPost: Record<string, ImageObjectProps | ''> = {};
        nextItems.forEach((item) => {
            const fieldName = getStoreScreenshotAiFieldName(item.id);
            nextPost[fieldName] = imageUrlToImagePostValue(item.ai_image_url, item.width, item.height);
        });
        postRef.current = nextPost;
        setImageFieldKeys((prev) => {
            const next: Record<string, number> = {};
            nextItems.forEach((item) => {
                next[item.id] = (prev[item.id] || 0) + 1;
            });
            return next;
        });
    }, [config.updated_at]);

    const totalCount = items.length;
    const brandColor = normalizeHexColor(config.template.brand_color, '#1A73E8');
    const backgroundColorSwatches = brandColor ? [brandColor] : [];
    const showLogoCopyButton = items.some((item) => logoPlacementUsesLogo(item.logo_placement));
    const getAppLogoBlob = React.useCallback(
        () => fetchStoreScreenshotAppLogoBlob(appMobileId),
        [appMobileId],
    );

    const resolvePrompt = React.useCallback((item: EditableItem): string => {
        return buildStoreScreenshotAiPrompt({
            appTitle,
            storeMetadata,
            template: config.template,
            item,
            totalCount,
        });
    }, [appTitle, storeMetadata, config.template, totalCount]);

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

    const handleAiImageReview = (id: string, value: JsonFormat) => {
        const image = normalizeImageFieldValue(value);
        const fieldName = getStoreScreenshotAiFieldName(id);
        postRef.current[fieldName] = image || '';
        updateItem(id, {
            ai_image: image,
            ai_image_url: image?.link || '',
        });
        setImageFieldKeys((prev) => ({
            ...prev,
            [id]: (prev[id] || 0) + 1,
        }));
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

    return (
        <Box sx={{ position: 'relative' }}>
            <Stack spacing={2} sx={{ pb: 10 }}>
                <Alert severity="info">
                    Ưu tiên: headline/subtitle phải thu hút user tải app. Với từng ảnh: chọn kích thước cắt và vị trí logo. Nếu có logo: dán ảnh 1 = logo app, ảnh 2 = screenshot gốc trước khi gửi prompt. Bước 1: prompt bulk headline. Bước 2: copy logo (nếu cần) + copy ảnh gốc + copy prompt ảnh → AI → upload kết quả.
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

                {items.map((item) => {
                const promptText = resolvePrompt(item);
                const fieldName = getStoreScreenshotAiFieldName(item.id);
                const previewUrl = encodeExternalImageUrl(item.source_url);
                const getImageBlob = () => fetchStoreScreenshotSourceImageBlob(appMobileId, item.id);
                const itemCopyPreset = getCopyStylePresetById(
                    normalizeCopyStylePresetId(item.copy_style_preset),
                );

                return (
                    <Card key={item.id} sx={{ p: 2 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    md: 'minmax(140px, 180px) minmax(0, 1fr) minmax(140px, 180px)',
                                },
                                gap: 2,
                                alignItems: 'start',
                            }}
                        >
                            <Stack spacing={1}>
                                <Typography variant="caption" color="text.secondary">
                                    Ảnh gốc
                                </Typography>
                                <CardMedia
                                    component="img"
                                    image={previewUrl}
                                    alt={`Screenshot ${item.order}`}
                                    sx={{ height: 220, objectFit: 'cover', borderRadius: 1 }}
                                />
                                <MarketingCopyImageButton
                                    imageUrl={previewUrl}
                                    getImageBlob={getImageBlob}
                                    onCopyNotice={setCopyNotice}
                                    fullWidth
                                />
                                <ScreenshotFeatureHighlightField
                                    value={item.feature_highlight || ''}
                                    onChange={(featureHighlight) => updateItem(item.id, {
                                        feature_highlight: featureHighlight,
                                    })}
                                />
                                <ScreenshotBackgroundPatternField
                                    value={item.background_pattern || ''}
                                    onChange={(backgroundPattern) => updateItem(item.id, {
                                        background_pattern: backgroundPattern,
                                    })}
                                />
                                <ScreenshotDecorOptionsField
                                    floatingIconsEnabled={normalizeFloatingIconsEnabled(item.floating_icons_enabled)}
                                    onFloatingIconsChange={(floatingIconsEnabled) => updateItem(item.id, {
                                        floating_icons_enabled: floatingIconsEnabled,
                                    })}
                                />
                                <StoreScreenshotColorField
                                    label="Màu nền"
                                    value={item.background_color || ''}
                                    onChange={(backgroundColor) => updateItem(item.id, {
                                        background_color: normalizeBackgroundColor(backgroundColor),
                                    })}
                                    swatchColors={backgroundColorSwatches}
                                    note="Để trống để dùng màu brand từ template. Chọn màu riêng cho từng ảnh."
                                />
                            </Stack>

                            <Stack spacing={1.5}>
                                <Typography variant="subtitle1">Screenshot #{item.order}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Phong cách: {itemCopyPreset.label}
                                    {item.caption ? ` · ${item.caption}` : ''}
                                </Typography>

                                <StoreScreenshotMultilangField
                                    label="Headline"
                                    value={item.headline}
                                    onChange={(headline) => updateItem(item.id, { headline })}
                                    placeholder="Learn in just 5 minutes a day"
                                    helperText="Bản en dùng trong prompt ảnh AI. Bản vi thường sinh từ prompt bulk."
                                />

                                <StoreScreenshotMultilangField
                                    label="Subtitle"
                                    value={item.subtitle}
                                    onChange={(subtitle) => updateItem(item.id, { subtitle })}
                                    placeholder="Short lessons that fit a busy schedule"
                                    helperText="Ngắn hơn headline. En cho prompt ảnh; vi cho review."
                                />

                                <ScreenshotCropTargetField
                                    value={item.crop_target_size || DEFAULT_CROP_TARGET_SIZE_ID}
                                    onChange={(cropTargetSize) => updateItem(item.id, {
                                        crop_target_size: cropTargetSize,
                                    })}
                                />

                                <ScreenshotLogoPlacementField
                                    value={item.logo_placement || DEFAULT_LOGO_PLACEMENT_ID}
                                    onChange={(logoPlacement) => updateItem(item.id, {
                                        logo_placement: logoPlacement,
                                    })}
                                />

                                <StoreScreenshotExampleHighlight
                                    title={`Gợi ý #${item.order} — ${itemCopyPreset.label}`}
                                    headline={itemCopyPreset.example.headline}
                                    subtitle={itemCopyPreset.example.subtitle}
                                    avoid={itemCopyPreset.example.avoid}
                                    hint={getScreenshotPositionHint(item.order, totalCount)}
                                />

                                <MarketingCopyPromptButton
                                    promptText={promptText}
                                    sx={{ alignSelf: 'flex-start' }}
                                />
                            </Stack>

                            <Stack spacing={1}>
                                <Typography variant="caption" color="text.secondary">
                                    Ảnh AI
                                </Typography>
                                <ImageForm
                                    key={imageFieldKeys[item.id] || 0}
                                    component="image"
                                    name={fieldName}
                                    post={postRef.current}
                                    config={{
                                        title: '',
                                        multiple: false,
                                    }}
                                    onReview={(value) => handleAiImageReview(item.id, value)}
                                />
                            </Stack>
                        </Box>
                    </Card>
                );
                })}
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
