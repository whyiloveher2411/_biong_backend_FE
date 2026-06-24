import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Button from 'components/atoms/Button';
import { audioVolumePercent } from 'helpers/shortVideoAudioVolume';
import { resolveVisualClipAudioVolume } from 'helpers/shortVideoVisualClips';
import type { ShortVideoVisualClip } from 'helpers/shortVideoRenderManifest';
import {
    INSPECTOR_TOGGLE_BUTTON_SX,
    InspectorPropertyGroup,
    InspectorPropertyImageUrl,
    InspectorPropertyReadonly,
    InspectorPropertyRow,
    InspectorPropertyText,
    InspectorPropertyVideoUrl,
    InspectorPropertyVolume,
} from './ShortVideoInspectorFields';

type EditorVisualType = 'image' | 'video';

type Props = {
    visualType: EditorVisualType;
    imageUrl: string;
    videoUrl: string;
    imageValidationError: string;
    videoValidationError: string;
    youtubeId?: string | null;
    onTypeChange: (
        event: React.MouseEvent<HTMLElement>,
        next: EditorVisualType | null
    ) => void;
    onImageUrlChange: (value: string) => void;
    onVideoUrlChange: (value: string) => void;
    onStockVideoSelect?: (url: string, previewUrl: string) => void;
    imageUrlPlaceholder?: string;
    videoUrlPlaceholder?: string;
    imageHelperText?: string;
    videoHelperText?: string;
    scriptRef?: string;
    showScriptRef?: boolean;
    onClearMedia?: () => void;
    startSec?: number;
    onStartSecChange?: (raw: string) => void;
    /** Âm lượng video 0–100 — chỉ khi visualType = video */
    audioVolumePercent?: number;
    onAudioVolumePercentChange?: (percent: number) => void;
};

export function resolveVisualMediaVolumePercent(
    clip: Pick<ShortVideoVisualClip, 'audio_volume' | 'visual_youtube_muted'>
): number {
    return audioVolumePercent(resolveVisualClipAudioVolume(clip as ShortVideoVisualClip));
}

export default function ShortVideoVisualMediaFields({
    visualType,
    imageUrl,
    videoUrl,
    imageValidationError,
    videoValidationError,
    youtubeId,
    onTypeChange,
    onImageUrlChange,
    onVideoUrlChange,
    onStockVideoSelect,
    imageUrlPlaceholder = 'https://…',
    videoUrlPlaceholder = 'https://www.youtube.com/watch?v=…',
    imageHelperText = '',
    videoHelperText = 'Hỗ trợ YouTube, mp4/webm HTTPS và Pexels',
    scriptRef = '',
    showScriptRef = false,
    onClearMedia,
    startSec,
    onStartSecChange,
    audioVolumePercent: volumePercent = 0,
    onAudioVolumePercentChange,
}: Props) {
    const activeValidationError = visualType === 'image' ? imageValidationError : videoValidationError;
    const urlHelperText = activeValidationError
        || (visualType === 'video' ? videoHelperText : imageHelperText);

    return (
        <>
            <InspectorPropertyGroup title="Nguồn media">
                <InspectorPropertyRow label="Loại media" fullWidthControl>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        fullWidth
                        value={visualType}
                        onChange={onTypeChange}
                        sx={{
                            bgcolor: 'background.default',
                            '& .MuiToggleButton-root': {
                                borderColor: 'divider',
                            },
                        }}
                    >
                        <ToggleButton value="image" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Ảnh
                        </ToggleButton>
                        <ToggleButton value="video" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Video
                        </ToggleButton>
                    </ToggleButtonGroup>
                </InspectorPropertyRow>

                {visualType === 'image' ? (
                    <InspectorPropertyImageUrl
                        label="URL ảnh"
                        value={imageUrl}
                        onChange={onImageUrlChange}
                        placeholder={imageUrlPlaceholder}
                        error={Boolean(imageValidationError)}
                        helperText={urlHelperText}
                    />
                ) : (
                    <InspectorPropertyVideoUrl
                        label="URL video"
                        value={videoUrl}
                        onChange={onVideoUrlChange}
                        onStockVideoSelect={(url, item) => {
                            onStockVideoSelect?.(url, item.preview_url);
                        }}
                        placeholder={videoUrlPlaceholder}
                        error={Boolean(videoValidationError)}
                        helperText={urlHelperText}
                    />
                )}

                {visualType === 'video' && youtubeId ? (
                    <InspectorPropertyReadonly
                        label="YouTube ID"
                        value={youtubeId}
                    />
                ) : null}

                {showScriptRef && scriptRef ? (
                    <InspectorPropertyReadonly
                        label="URL gốc script"
                        value={scriptRef}
                    />
                ) : null}

                {onClearMedia ? (
                    <Box sx={{ px: 1.5, pb: 1.25, pt: 0.25 }}>
                        <Button size="small" variant="outlined" fullWidth onClick={onClearMedia}>
                            Xóa media
                        </Button>
                    </Box>
                ) : null}
            </InspectorPropertyGroup>

            {visualType === 'video' && onStartSecChange ? (
                <InspectorPropertyGroup title="Phát lại video">
                    <InspectorPropertyText
                        label="Vị trí bắt đầu"
                        description="Giây bắt đầu trong file đã tải"
                        value={String(startSec ?? 0)}
                        type="number"
                        onChange={onStartSecChange}
                        inputProps={{ min: 0, step: 0.1 }}
                    />
                    {onAudioVolumePercentChange ? (
                        <InspectorPropertyVolume
                            label="Âm lượng video"
                            description="0% = tắt tiếng — dùng cho âm thanh nền (mưa, nhạc…)"
                            valuePercent={volumePercent}
                            onChange={onAudioVolumePercentChange}
                        />
                    ) : null}
                </InspectorPropertyGroup>
            ) : null}
        </>
    );
}
