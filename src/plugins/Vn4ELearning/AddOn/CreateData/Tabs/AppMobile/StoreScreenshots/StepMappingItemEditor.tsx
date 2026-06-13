import React from 'react';
import {
    Box,
    CardMedia,
    Divider,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ImageForm from 'components/atoms/fields/image/Form';
import LoadingButton from 'components/atoms/LoadingButton';
import HeadlineGeminiActionButtons from './HeadlineGeminiActionButtons';
import HeadlineGeminiPanel from './HeadlineGeminiPanel';
import ScreenshotSourceCopyMenu from './ScreenshotSourceCopyMenu';
import { useHeadlineGeminiPanel } from './useHeadlineGeminiPanel';
import ScreenshotCropTargetField from './ScreenshotCropTargetField';
import ScreenshotDecorEditor from './ScreenshotDecorEditor';
import ScreenshotFeatureHighlightField from './ScreenshotFeatureHighlightField';
import StoreScreenshotMultilangField from './StoreScreenshotMultilangField';
import { DEFAULT_CROP_TARGET_SIZE_ID } from './storeScreenshotCropTarget';
import {
    getCopyStylePresetById,
    normalizeCopyStylePresetId,
} from './storeScreenshotCopyStyleOptions';
import { normalizeHexColor } from './storeScreenshotColorUtils';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import {
    openStoreScreenshotGemini,
    resolveFloatingIconsForGemini,
} from './storeScreenshotGeminiWorkflow';
import { getPromptLangText } from './storeScreenshotMultilang';
import { encodeExternalImageUrl } from './storeScreenshotImageUtils';
import type { EditableItem } from './stepMappingTypes';
import type { StoreMetadata, StoreScreenshotConfig } from './storeScreenshotTypes';

type TabId = 'copy' | 'layout' | 'visual';

type Props = {
    appMobileId: number;
    appTitle: string;
    appLogoUrl: string;
    storeMetadata: StoreMetadata;
    config: StoreScreenshotConfig;
    item: EditableItem;
    totalCount: number;
    layoutReferenceUrl?: string;
    usesLogo: boolean;
    promptText: string;
    imageFieldKey: number;
    fieldName: string;
    post: Record<string, unknown>;
    backgroundColorSwatches: string[];
    geminiDisabled?: boolean;
    onItemChange: (patch: Partial<EditableItem>) => void;
    onConfigUpdated: (config: StoreScreenshotConfig) => void;
    onAiImageReview: (value: JsonFormat) => void;
    onCopyNotice: (message: string) => void;
    onError: (message: string) => void;
    onRefreshAiImage: () => Promise<void>;
    getImageBlob: () => Promise<Blob>;
    getLogoBlob?: () => Promise<Blob>;
};

function StepMappingItemEditor({
    appMobileId,
    appTitle,
    appLogoUrl,
    storeMetadata,
    config,
    item,
    totalCount,
    layoutReferenceUrl,
    usesLogo,
    promptText,
    imageFieldKey,
    fieldName,
    post,
    backgroundColorSwatches,
    geminiDisabled = false,
    onItemChange,
    onConfigUpdated,
    onAiImageReview,
    onCopyNotice,
    onError,
    onRefreshAiImage,
    getImageBlob,
    getLogoBlob,
}: Props) {
    const [activeTab, setActiveTab] = React.useState<TabId>('copy');
    const [openingGemini, setOpeningGemini] = React.useState(false);
    const [refreshingAiImage, setRefreshingAiImage] = React.useState(false);
    const previewUrl = encodeExternalImageUrl(item.source_url);
    const itemCopyPreset = getCopyStylePresetById(
        normalizeCopyStylePresetId(item.copy_style_preset),
    );

    const headlineWorkflow = useHeadlineGeminiPanel({
        appMobileId,
        appTitle,
        storeMetadata,
        config,
        screenshotId: item.id,
        sourceUrl: item.source_url,
        order: item.order,
        caption: item.caption || '',
        totalCount,
        copyStylePreset: item.copy_style_preset,
        headline: item.headline,
        subtitle: item.subtitle,
        headlineVariants: item.headline_variants ?? [],
        disabled: geminiDisabled,
        onUpdated: onConfigUpdated,
        onError,
    });

    const handleOpenGemini = async () => {
        if (openingGemini || !String(promptText || '').trim()) {
            return;
        }

        setOpeningGemini(true);
        try {
            if (item.order > 1 && totalCount > 1 && !String(layoutReferenceUrl || '').trim()) {
                onCopyNotice(
                    'Screenshot #1 chưa có ảnh AI — generate #1 trước để #2+ đồng bộ layout tốt hơn.',
                );
            }

            const floatingIconsEnabled = normalizeFloatingIconsEnabled(item.floating_icons_enabled);
            const floatingIcons = floatingIconsEnabled
                ? resolveFloatingIconsForGemini({
                      floating_icons_enabled: item.floating_icons_enabled,
                      icons: item.icons,
                      iconsText: item.iconsText,
                  })
                : [];

            await openStoreScreenshotGemini({
                appMobileId,
                screenshotId: item.id,
                prompt: promptText,
                sourceImageUrl: item.source_url,
                logoImageUrl: usesLogo ? appLogoUrl : undefined,
                layoutReferenceImageUrl: layoutReferenceUrl,
                usesLogo,
                floatingIconsEnabled,
                floatingIcons,
                headline: getPromptLangText(item.headline),
                subtitle: getPromptLangText(item.subtitle),
                brandColor: normalizeHexColor(config.template.brand_color, '#1A73E8'),
            });
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không mở được Gemini');
        } finally {
            setOpeningGemini(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    lg: 'minmax(160px, 200px) minmax(0, 1fr) minmax(160px, 220px)',
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
                    sx={{ height: 180, objectFit: 'cover', borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Gợi ý copy
                </Typography>
                <HeadlineGeminiActionButtons workflow={headlineWorkflow} />
                <Divider sx={{ my: 0.25 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Ảnh AI
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="stretch">
                    <LoadingButton
                        variant="contained"
                        size="small"
                        loading={openingGemini}
                        disabled={!String(promptText || '').trim() || geminiDisabled}
                        startIcon={<AutoAwesomeIcon />}
                        onClick={handleOpenGemini}
                        title="Tự điền logo + screenshot + prompt ảnh AI — bạn chỉ cần bấm Gửi trên Gemini"
                        sx={{ flex: 1, minWidth: 0 }}
                    >
                        Mở Gemini ảnh AI
                    </LoadingButton>
                    <ScreenshotSourceCopyMenu
                        promptText={promptText}
                        imageUrl={previewUrl}
                        getImageBlob={getImageBlob}
                        onCopyNotice={onCopyNotice}
                    />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                    Phong cách: {itemCopyPreset.label}
                    {item.caption ? ` · ${item.caption}` : ''}
                </Typography>
            </Stack>

            <Stack spacing={1.5}>
                <TextField
                    label="Tên / mô tả"
                    value={item.caption || ''}
                    onChange={(event) => onItemChange({ caption: event.target.value })}
                    placeholder="Ví dụ: Màn hình học bài, streak hàng ngày..."
                    fullWidth
                    multiline
                    minRows={2}
                    size="small"
                    helperText="Mô tả nội dung ảnh — dùng trong prompt Gemini"
                />

                <Tabs
                    value={activeTab}
                    onChange={(_, value: TabId) => setActiveTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab value="copy" label="Copy" sx={{ minHeight: 36, py: 0.5 }} />
                    <Tab value="layout" label="Bố cục" sx={{ minHeight: 36, py: 0.5 }} />
                    <Tab value="visual" label="Visual" sx={{ minHeight: 36, py: 0.5 }} />
                </Tabs>

                {activeTab === 'copy' ? (
                    <Stack spacing={1.25}>
                        {headlineWorkflow.hasSavedSelection ? (
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {`Phong cách đang dùng — ${itemCopyPreset.label}`}
                            </Typography>
                        ) : null}
                        <StoreScreenshotMultilangField
                            label="Headline"
                            value={item.headline}
                            onChange={(headline) => onItemChange({ headline })}
                            placeholder="Learn in just 5 minutes a day"
                            helperText="En dùng trong prompt ảnh AI — chỉnh tay hoặc chọn gợi ý phong cách bên ảnh gốc."
                        />
                        <StoreScreenshotMultilangField
                            label="Subtitle"
                            value={item.subtitle}
                            onChange={(subtitle) => onItemChange({ subtitle })}
                            placeholder="Short lessons that fit a busy schedule"
                            helperText="Ngắn hơn headline."
                        />
                        <HeadlineGeminiPanel workflow={headlineWorkflow} />
                    </Stack>
                ) : null}

                {activeTab === 'layout' ? (
                    <ScreenshotCropTargetField
                        compact
                        value={item.crop_target_size || DEFAULT_CROP_TARGET_SIZE_ID}
                        onChange={(cropTargetSize) => onItemChange({ crop_target_size: cropTargetSize })}
                    />
                ) : null}

                {activeTab === 'visual' ? (
                    <Stack spacing={1.25}>
                        <ScreenshotDecorEditor
                            value={{
                                background_pattern: item.background_pattern,
                                background_color: item.background_color,
                                floating_icons_enabled: item.floating_icons_enabled,
                                icons: item.icons,
                                background_motifs: item.background_motifs,
                                iconsText: item.iconsText,
                                backgroundMotifsText: item.backgroundMotifsText,
                            }}
                            brandColor={backgroundColorSwatches[0]}
                            onChange={onItemChange}
                        />
                        <ScreenshotFeatureHighlightField
                            value={item.feature_highlight || ''}
                            onChange={(featureHighlight) => onItemChange({ feature_highlight: featureHighlight })}
                        />
                    </Stack>
                ) : null}
            </Stack>

            <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                        Ảnh AI
                    </Typography>
                    <LoadingButton
                        size="small"
                        variant="outlined"
                        loading={refreshingAiImage}
                        onClick={async () => {
                            setRefreshingAiImage(true);
                            try {
                                await onRefreshAiImage();
                            } finally {
                                setRefreshingAiImage(false);
                            }
                        }}
                    >
                        Tải lại ảnh AI
                    </LoadingButton>
                </Stack>
                <ImageForm
                    key={imageFieldKey}
                    component="image"
                    name={fieldName}
                    post={post}
                    config={{
                        title: '',
                        multiple: false,
                    }}
                    onReview={onAiImageReview}
                />
            </Stack>
        </Box>
    );
}

export default StepMappingItemEditor;
