import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    CardMedia,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageForm from 'components/atoms/fields/image/Form';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    MarketingCopyImageButton,
    MarketingCopyPromptButton,
} from '../Marketing/MarketingPromptActionButtons';
import ScreenshotBackgroundPatternField from './ScreenshotBackgroundPatternField';
import ScreenshotCropTargetField from './ScreenshotCropTargetField';
import ScreenshotDecorOptionsField from './ScreenshotDecorOptionsField';
import ScreenshotFeatureHighlightField from './ScreenshotFeatureHighlightField';
import ScreenshotLogoPlacementField from './ScreenshotLogoPlacementField';
import StoreScreenshotColorField from './StoreScreenshotColorField';
import StoreScreenshotExampleHighlight from './StoreScreenshotExampleHighlight';
import StoreScreenshotMultilangField from './StoreScreenshotMultilangField';
import { DEFAULT_CROP_TARGET_SIZE_ID } from './storeScreenshotCropTarget';
import { DEFAULT_LOGO_PLACEMENT_ID } from './storeScreenshotLogoPlacement';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import {
    getCopyStylePresetById,
    getScreenshotPositionHint,
    normalizeCopyStylePresetId,
} from './storeScreenshotCopyStyleOptions';
import { logoPlacementUsesLogo } from './storeScreenshotLogoPlacement';
import { openStoreScreenshotGemini } from './storeScreenshotGeminiWorkflow';
import { encodeExternalImageUrl } from './storeScreenshotImageUtils';
import type { EditableItem } from './stepMappingTypes';

type TabId = 'copy' | 'layout' | 'visual';

type Props = {
    appMobileId: number;
    appLogoUrl: string;
    item: EditableItem;
    totalCount: number;
    layoutReferenceUrl?: string;
    promptText: string;
    imageFieldKey: number;
    fieldName: string;
    post: Record<string, unknown>;
    backgroundColorSwatches: string[];
    onItemChange: (patch: Partial<EditableItem>) => void;
    onAiImageReview: (value: JsonFormat) => void;
    onCopyNotice: (message: string) => void;
    onError: (message: string) => void;
    onRefreshAiImage: () => Promise<void>;
    getImageBlob: () => Promise<Blob>;
    getLogoBlob?: () => Promise<Blob>;
};

function StepMappingItemEditor({
    appMobileId,
    appLogoUrl,
    item,
    totalCount,
    layoutReferenceUrl,
    promptText,
    imageFieldKey,
    fieldName,
    post,
    backgroundColorSwatches,
    onItemChange,
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
    const usesLogo = logoPlacementUsesLogo(item.logo_placement);

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

            await openStoreScreenshotGemini({
                appMobileId,
                screenshotId: item.id,
                prompt: promptText,
                sourceImageUrl: item.source_url,
                logoImageUrl: usesLogo ? appLogoUrl : undefined,
                layoutReferenceImageUrl: layoutReferenceUrl,
                usesLogo,
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
                <MarketingCopyImageButton
                    imageUrl={previewUrl}
                    getImageBlob={getImageBlob}
                    onCopyNotice={onCopyNotice}
                    fullWidth
                />
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                    Phong cách: {itemCopyPreset.label}
                    {item.caption ? ` · ${item.caption}` : ''}
                </Typography>
            </Stack>

            <Stack spacing={1.5}>
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
                        <StoreScreenshotMultilangField
                            label="Headline"
                            value={item.headline}
                            onChange={(headline) => onItemChange({ headline })}
                            placeholder="Learn in just 5 minutes a day"
                            helperText="En dùng trong prompt ảnh AI."
                        />
                        <StoreScreenshotMultilangField
                            label="Subtitle"
                            value={item.subtitle}
                            onChange={(subtitle) => onItemChange({ subtitle })}
                            placeholder="Short lessons that fit a busy schedule"
                            helperText="Ngắn hơn headline."
                        />
                        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Gợi ý phong cách — {itemCopyPreset.label}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                                <StoreScreenshotExampleHighlight
                                    title={`Gợi ý #${item.order}`}
                                    headline={itemCopyPreset.example.headline}
                                    subtitle={itemCopyPreset.example.subtitle}
                                    avoid={itemCopyPreset.example.avoid}
                                    hint={getScreenshotPositionHint(item.order, totalCount)}
                                />
                            </AccordionDetails>
                        </Accordion>
                    </Stack>
                ) : null}

                {activeTab === 'layout' ? (
                    <Stack spacing={1.5}>
                        <ScreenshotCropTargetField
                            compact
                            value={item.crop_target_size || DEFAULT_CROP_TARGET_SIZE_ID}
                            onChange={(cropTargetSize) => onItemChange({ crop_target_size: cropTargetSize })}
                        />
                        <ScreenshotLogoPlacementField
                            value={item.logo_placement || DEFAULT_LOGO_PLACEMENT_ID}
                            onChange={(logoPlacement) => onItemChange({ logo_placement: logoPlacement })}
                        />
                    </Stack>
                ) : null}

                {activeTab === 'visual' ? (
                    <Stack spacing={1.25}>
                        <ScreenshotBackgroundPatternField
                            value={item.background_pattern || ''}
                            onChange={(backgroundPattern) => onItemChange({ background_pattern: backgroundPattern })}
                        />
                        <StoreScreenshotColorField
                            label="Màu nền"
                            value={item.background_color || ''}
                            onChange={(backgroundColor) => onItemChange({ background_color: backgroundColor })}
                            swatchColors={backgroundColorSwatches}
                            note="Để trống = màu brand từ template."
                        />
                        <ScreenshotFeatureHighlightField
                            value={item.feature_highlight || ''}
                            onChange={(featureHighlight) => onItemChange({ feature_highlight: featureHighlight })}
                        />
                        <ScreenshotDecorOptionsField
                            floatingIconsEnabled={normalizeFloatingIconsEnabled(item.floating_icons_enabled)}
                            onFloatingIconsChange={(floatingIconsEnabled) => onItemChange({
                                floating_icons_enabled: floatingIconsEnabled,
                            })}
                        />
                    </Stack>
                ) : null}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <LoadingButton
                        variant="contained"
                        loading={openingGemini}
                        disabled={!String(promptText || '').trim()}
                        startIcon={<AutoAwesomeIcon />}
                        onClick={handleOpenGemini}
                        title="Tự điền logo + screenshot + prompt — bạn chỉ cần bấm Gửi trên Gemini"
                    >
                        Mở Gemini
                    </LoadingButton>
                    <MarketingCopyPromptButton
                        promptText={promptText}
                    />
                </Stack>
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
