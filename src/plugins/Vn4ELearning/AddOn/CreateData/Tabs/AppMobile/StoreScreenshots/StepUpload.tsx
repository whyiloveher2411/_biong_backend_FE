import React from 'react';
import {
    Alert,
    Box,
    CardMedia,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ImageForm from 'components/atoms/fields/image/Form';
import LoadingButton from 'components/atoms/LoadingButton';
import type { ImageObjectProps } from 'helpers/image';
import { convertToURL, validURL } from 'helpers/url';
import type { CopyStylePresetId } from './storeScreenshotCopyStyleOptions';
import { DEFAULT_COPY_STYLE_PRESET } from './storeScreenshotCopyStyleOptions';
import type { StoreScreenshotConfig, StoreScreenshotItem } from './storeScreenshotTypes';
import { saveStoreScreenshotCaptions, syncStoreScreenshotsFromImages } from './storeScreenshotApi';
import { encodeExternalImageUrl } from './storeScreenshotImageUtils';
import ScreenshotCopyStyleField from './ScreenshotCopyStyleField';

type Props = {
    appMobileId: number;
    config: StoreScreenshotConfig;
    onUpdated: (config: StoreScreenshotConfig) => void;
    onError: (message: string) => void;
};

const IMAGE_FIELD_NAME = 'store_screenshot_images';

type DisplayScreenshot = {
    key: string;
    id: string;
    order: number;
    source_url: string;
    width: number;
    height: number;
    caption: string;
    copy_style_preset: CopyStylePresetId;
};

function sortScreenshots(screenshots: StoreScreenshotItem[]): StoreScreenshotItem[] {
    return [...screenshots].sort((a, b) => a.order - b.order);
}

function screenshotsToImageValue(screenshots: StoreScreenshotItem[]): ImageObjectProps[] {
    return screenshots.map((shot) => {
        const link = shot.source_url || '';
        return {
            link,
            type_link: /^https?:\/\//i.test(link) ? 'external' : 'local',
            ext: link.split('.').pop()?.split('?')[0] || 'png',
            width: shot.width,
            height: shot.height,
        };
    });
}

function resolveImageLink(image: ImageObjectProps): string {
    const link = String(image.link || '').trim();
    if (!link) {
        return '';
    }
    if (validURL(link)) {
        return link;
    }
    return convertToURL(process.env.REACT_APP_BASE_URL, link);
}

function normalizeShotUrl(url: string): string {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }
    try {
        const parsed = new URL(raw);
        return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
    } catch {
        return raw.split('?')[0].replace(/\/+$/, '').toLowerCase();
    }
}

function buildDisplayScreenshots(
    pendingImages: ImageObjectProps[],
    savedScreenshots: StoreScreenshotItem[],
    captions: Record<string, string>,
    copyStyles: Record<string, CopyStylePresetId>,
): DisplayScreenshot[] {
    const savedByUrl = new Map<string, StoreScreenshotItem>();
    savedScreenshots.forEach((shot) => {
        const norm = normalizeShotUrl(shot.source_url);
        if (norm) {
            savedByUrl.set(norm, shot);
        }
    });

    return pendingImages
        .map((image, index) => {
            const sourceUrl = resolveImageLink(image);
            const norm = normalizeShotUrl(sourceUrl);
            const saved = norm ? savedByUrl.get(norm) : undefined;
            const id = saved?.id || `pending:${norm || index}`;
            const captionKey = saved?.id || id;

            return {
                key: id,
                id,
                order: index + 1,
                source_url: saved?.source_url || sourceUrl,
                width: image.width || saved?.width || 0,
                height: image.height || saved?.height || 0,
                caption: captions[captionKey] ?? saved?.caption ?? '',
                copy_style_preset: copyStyles[captionKey]
                    ?? (saved?.copy_style_preset as CopyStylePresetId)
                    ?? DEFAULT_COPY_STYLE_PRESET,
            };
        })
        .filter((shot) => shot.source_url);
}

function StepUpload({ appMobileId, config, onUpdated, onError }: Props) {
    const [saving, setSaving] = React.useState(false);
    const [fieldKey, setFieldKey] = React.useState(0);
    const [captions, setCaptions] = React.useState<Record<string, string>>({});
    const [copyStyles, setCopyStyles] = React.useState<Record<string, CopyStylePresetId>>({});
    const [pendingImages, setPendingImages] = React.useState<ImageObjectProps[]>([]);
    const [hasPendingChanges, setHasPendingChanges] = React.useState(false);
    const postRef = React.useRef<Record<string, ImageObjectProps[]>>({
        [IMAGE_FIELD_NAME]: [],
    });
    const captionsRef = React.useRef<Record<string, string>>({});
    const copyStylesRef = React.useRef<Record<string, CopyStylePresetId>>({});

    const savedScreenshots = sortScreenshots(config.screenshots || []);
    const imageSignature = React.useMemo(
        () => savedScreenshots.map((shot) => `${shot.id}:${shot.source_url}:${shot.order}`).join('|'),
        [savedScreenshots],
    );

    React.useEffect(() => {
        const images = screenshotsToImageValue(savedScreenshots);
        postRef.current[IMAGE_FIELD_NAME] = images;
        setPendingImages(images);

        const nextCaptions: Record<string, string> = {};
        const nextCopyStyles: Record<string, CopyStylePresetId> = {};
        savedScreenshots.forEach((shot) => {
            nextCaptions[shot.id] = shot.caption || '';
            nextCopyStyles[shot.id] = (shot.copy_style_preset as CopyStylePresetId) || DEFAULT_COPY_STYLE_PRESET;
        });
        captionsRef.current = nextCaptions;
        copyStylesRef.current = nextCopyStyles;
        setCaptions(nextCaptions);
        setCopyStyles(nextCopyStyles);
        setHasPendingChanges(false);
        setFieldKey((prev) => prev + 1);
    }, [imageSignature]);

    const displayScreenshots = React.useMemo(
        () => buildDisplayScreenshots(pendingImages, savedScreenshots, captions, copyStyles),
        [pendingImages, savedScreenshots, captions, copyStyles],
    );

    const handleImagesReview = (value: JsonFormat) => {
        const images = Array.isArray(value) ? (value as ImageObjectProps[]) : [];
        postRef.current[IMAGE_FIELD_NAME] = images;
        setPendingImages(images);
        setHasPendingChanges(true);
    };

    const handleCaptionChange = (captionKey: string, value: string) => {
        const nextCaptions = {
            ...captionsRef.current,
            [captionKey]: value,
        };
        captionsRef.current = nextCaptions;
        setCaptions(nextCaptions);
        setHasPendingChanges(true);
    };

    const handleCopyStyleChange = (styleKey: string, value: CopyStylePresetId) => {
        const nextCopyStyles = {
            ...copyStylesRef.current,
            [styleKey]: value,
        };
        copyStylesRef.current = nextCopyStyles;
        setCopyStyles(nextCopyStyles);
        setHasPendingChanges(true);
    };

    const handleSave = async () => {
        const images = postRef.current[IMAGE_FIELD_NAME] || [];
        if (images.length === 0) {
            onError('Hãy chọn ít nhất 1 screenshot');
            return;
        }

        setSaving(true);
        try {
            const payloadByUrl: Record<string, { caption: string; copy_style_preset: CopyStylePresetId }> = {};
            displayScreenshots.forEach((shot) => {
                const norm = normalizeShotUrl(shot.source_url);
                if (norm) {
                    payloadByUrl[norm] = {
                        caption: captions[shot.id] ?? shot.caption ?? '',
                        copy_style_preset: copyStyles[shot.id] ?? shot.copy_style_preset ?? DEFAULT_COPY_STYLE_PRESET,
                    };
                }
            });

            const syncResult = await syncStoreScreenshotsFromImages(appMobileId, images);
            const captionPayload = sortScreenshots(syncResult.config.screenshots || []).map((shot) => {
                const payload = payloadByUrl[normalizeShotUrl(shot.source_url)];
                return {
                    id: shot.id,
                    caption: payload?.caption ?? shot.caption ?? '',
                    copy_style_preset: payload?.copy_style_preset ?? shot.copy_style_preset ?? DEFAULT_COPY_STYLE_PRESET,
                };
            });

            const result = captionPayload.length > 0
                ? await saveStoreScreenshotCaptions(appMobileId, captionPayload)
                : syncResult;

            onUpdated(result.config);
            setHasPendingChanges(false);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không cập nhật được screenshot');
        } finally {
            setSaving(false);
        }
    };

    const screenshotCount = pendingImages.length;

    return (
        <Box sx={{ position: 'relative' }}>
            <Stack spacing={2} sx={{ pb: 10 }}>
                <Alert severity="info">
                    Chọn nhiều ảnh portrait (PNG/JPG/WEBP) qua file manager. Kéo thả để sắp xếp thứ tự. Cạnh ngắn tối thiểu 1080px, tối đa 10 ảnh. Với từng ảnh: đặt tên/mô tả và chọn phong cách headline/subtitle riêng — bước Copy & ảnh AI sẽ dùng phong cách từng ảnh.
                </Alert>

                <ImageForm
                    key={fieldKey}
                    component="image"
                    name={IMAGE_FIELD_NAME}
                    post={postRef.current}
                    config={{
                        title: 'Screenshots',
                        multiple: true,
                        note: 'Đã chọn ' + screenshotCount + '/10 ảnh',
                        size: {
                            minWidth: 1080,
                            minHeight: 1080,
                        },
                    }}
                    onReview={handleImagesReview}
                />

                {displayScreenshots.length > 0 ? (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                            Tên và phong cách từng screenshot
                        </Typography>

                        <Stack spacing={1.5}>
                            {displayScreenshots.map((shot) => (
                                <Box
                                    key={shot.key}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '96px 1fr', sm: '120px 1fr' },
                                        gap: 1.5,
                                        alignItems: 'start',
                                        p: 1.5,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                    }}
                                >
                                    <Stack spacing={0.5} alignItems="center">
                                        <Typography variant="caption" color="text.secondary">
                                            #{shot.order}
                                        </Typography>
                                        <CardMedia
                                            component="img"
                                            image={encodeExternalImageUrl(shot.source_url)}
                                            alt={shot.caption || `Screenshot ${shot.order}`}
                                            sx={{
                                                width: '100%',
                                                height: 160,
                                                objectFit: 'cover',
                                                borderRadius: 1,
                                            }}
                                        />
                                    </Stack>

                                    <Stack spacing={1.5}>
                                        <TextField
                                            label="Tên / mô tả"
                                            value={captions[shot.id] ?? shot.caption}
                                            onChange={(event) => handleCaptionChange(shot.id, event.target.value)}
                                            placeholder="Ví dụ: Màn hình học bài, streak hàng ngày..."
                                            fullWidth
                                            multiline
                                            minRows={2}
                                            helperText="Mô tả nội dung ảnh — giúp AI hiểu ngữ cảnh screenshot"
                                        />

                                        <ScreenshotCopyStyleField
                                            value={copyStyles[shot.id] ?? shot.copy_style_preset}
                                            onChange={(value) => handleCopyStyleChange(shot.id, value)}
                                            compactExample
                                        />
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                ) : null}
            </Stack>

            <Box
                sx={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    display: 'flex',
                    justifyContent: 'flex-end',
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
                <LoadingButton
                    variant="contained"
                    loading={saving}
                    onClick={handleSave}
                    disabled={!hasPendingChanges && displayScreenshots.length === 0}
                >
                    Cập nhật
                </LoadingButton>
            </Box>
        </Box>
    );
}

export default StepUpload;
