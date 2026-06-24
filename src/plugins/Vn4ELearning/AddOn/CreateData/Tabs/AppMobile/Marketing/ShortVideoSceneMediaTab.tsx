import React from 'react';
import { Box, Typography } from '@mui/material';
import Button from 'components/atoms/Button';
import {
    resolveSceneVisualImageRef,
    resolveSceneVisualMotion,
    resolveSceneVisualStartSec,
    resolveSceneVisualType,
    resolveSceneVisualVideoRef,
    resolveSceneVisualAudioVolume,
    resolveSceneVisualYoutubeId,
    type ShortVideoManifestScene,
    type ShortVideoManifestSceneLayout,
} from 'helpers/shortVideoRenderManifest';
import { VISUAL_CLIP_MOTION_OPTIONS } from 'helpers/shortVideoVisualClips';
import {
    isHttpsImageUrl,
    isValidVideoRef,
    parseYoutubeId,
} from 'helpers/shortVideoYoutube';
import {
    InspectorPanelBody,
    InspectorPanelTabs,
    InspectorPropertyGroup,
    InspectorPropertySelect,
} from './ShortVideoInspectorFields';
import ShortVideoVisualMediaFields from './ShortVideoVisualMediaFields';

type Props = {
    scene: ShortVideoManifestScene;
    layout: ShortVideoManifestSceneLayout;
    patch: (next: Partial<ShortVideoManifestSceneLayout>) => void;
    onReset: () => void;
};

const MEDIA_TAB = {
    properties: 0,
    animation: 1,
} as const;

function patchOrClearString(
    current: string | undefined,
    next: string
): string | undefined {
    const trimmed = next.trim();
    if (!trimmed) {
        return undefined;
    }
    if (current !== undefined && trimmed === current) {
        return trimmed;
    }
    return trimmed;
}

type EditorVisualType = 'image' | 'video';

function resolveEditorVisualType(scene: ShortVideoManifestScene): EditorVisualType {
    const override = scene.layout?.visual_type;
    if (override === 'image' || override === 'video') {
        return override;
    }
    if (override === 'none') {
        return 'image';
    }
    return resolveSceneVisualType(scene) === 'video' ? 'video' : 'image';
}

function validateImageUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return 'Cần nhập URL';
    }
    return isHttpsImageUrl(trimmed) ? '' : 'URL ảnh phải bắt đầu bằng https://';
}

function validateVideoUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return 'Cần nhập URL';
    }
    return isValidVideoRef(trimmed) ? '' : 'URL video không hợp lệ (YouTube hoặc mp4/webm HTTPS)';
}

export default function ShortVideoSceneMediaTab({
    scene,
    layout,
    patch,
    onReset,
}: Props) {
    const [activeTab, setActiveTab] = React.useState<number>(MEDIA_TAB.properties);
    const visualType = resolveEditorVisualType(scene);
    const imageUrl = layout.visual_image_ref ?? resolveSceneVisualImageRef(scene);
    const videoUrl = layout.visual_video_ref ?? resolveSceneVisualVideoRef(scene);
    const motion = layout.visual_motion ?? resolveSceneVisualMotion(scene);
    const scriptRef = scene.visual?.ref?.trim() || '';

    const imageValidationError = React.useMemo(
        () => validateImageUrl(imageUrl),
        [imageUrl]
    );
    const videoValidationError = React.useMemo(
        () => validateVideoUrl(videoUrl),
        [videoUrl]
    );

    const handleTypeChange = (
        _event: React.MouseEvent<HTMLElement>,
        next: EditorVisualType | null
    ) => {
        if (!next) {
            return;
        }
        if (next === 'image') {
            patch({
                visual_type: next,
                show_visual: true,
                visual_playback_url: undefined,
                visual_start_sec: undefined,
            });
            return;
        }
        patch({
            visual_type: next,
            show_visual: true,
            visual_playback_url: undefined,
        });
    };

    const handleImageUrlChange = (value: string) => {
        const trimmed = value.trim();
        patch({
            visual_image_ref: patchOrClearString(layout.visual_image_ref, value),
            visual_playback_url: undefined,
            show_visual: trimmed && isHttpsImageUrl(trimmed) ? true : undefined,
        });
    };

    const handleVideoUrlChange = (value: string) => {
        const trimmed = value.trim();
        const parsedYoutubeId = parseYoutubeId(trimmed);
        patch({
            visual_video_ref: patchOrClearString(layout.visual_video_ref, value),
            visual_youtube_id: parsedYoutubeId ?? undefined,
            visual_playback_url: undefined,
            visual_video_preview_url: trimmed ? layout.visual_video_preview_url : undefined,
            show_visual: trimmed && isValidVideoRef(trimmed) ? true : undefined,
        });
    };

    const handleStockVideoSelect = (url: string, previewUrl: string) => {
        const parsedYoutubeId = parseYoutubeId(url);
        patch({
            visual_video_ref: url.trim(),
            visual_video_preview_url: previewUrl.trim() || undefined,
            visual_youtube_id: parsedYoutubeId ?? undefined,
            visual_playback_url: undefined,
            show_visual: true,
        });
    };

    const handleClearMedia = () => {
        if (visualType === 'image') {
            patch({
                visual_image_ref: undefined,
                visual_playback_url: undefined,
                show_visual: Boolean(videoUrl.trim() && isValidVideoRef(videoUrl)),
                visual_type: visualType,
            });
            return;
        }
        patch({
            visual_video_ref: undefined,
            visual_video_preview_url: undefined,
            visual_youtube_id: undefined,
            visual_playback_url: undefined,
            visual_start_sec: undefined,
            show_visual: Boolean(imageUrl.trim() && isHttpsImageUrl(imageUrl)),
            visual_type: visualType,
        });
    };

    const youtubeId = resolveSceneVisualYoutubeId(scene);
    const startSec = layout.visual_start_sec ?? resolveSceneVisualStartSec(scene);

    const handleStartSecChange = (raw: string) => {
        if (raw.trim() === '') {
            patch({ visual_start_sec: undefined });
            return;
        }
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed)) {
            return;
        }
        patch({ visual_start_sec: Math.max(0, parsed) });
    };

    const hasCustomImageRef = Boolean(layout.visual_image_ref?.trim());
    const hasCustomVideoRef = Boolean(layout.visual_video_ref?.trim());

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 1,
                }}
            >
                <Typography variant="subtitle2" fontWeight={600}>
                    Hình ảnh & video
                </Typography>
                <Button size="small" variant="text" onClick={onReset}>
                    Đặt lại
                </Button>
            </Box>

            <InspectorPanelTabs
                value={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { label: 'Thuộc tính' },
                    { label: 'Hiệu ứng' },
                ]}
            />

            <InspectorPanelBody>
                {activeTab === MEDIA_TAB.properties ? (
                    <ShortVideoVisualMediaFields
                        visualType={visualType}
                        imageUrl={imageUrl}
                        videoUrl={videoUrl}
                        imageValidationError={imageValidationError}
                        videoValidationError={videoValidationError}
                        youtubeId={youtubeId}
                        onTypeChange={handleTypeChange}
                        onImageUrlChange={handleImageUrlChange}
                        onVideoUrlChange={handleVideoUrlChange}
                        onStockVideoSelect={handleStockVideoSelect}
                        imageUrlPlaceholder={scriptRef || 'https://…'}
                        showScriptRef={Boolean(scriptRef && !hasCustomImageRef && !hasCustomVideoRef)}
                        scriptRef={scriptRef}
                        onClearMedia={handleClearMedia}
                        startSec={startSec}
                        onStartSecChange={handleStartSecChange}
                        audioVolumePercent={audioVolumePercent(resolveSceneVisualAudioVolume(scene))}
                        onAudioVolumePercentChange={(percent) => {
                            const volume = audioVolumeFromPercent(percent);
                            if (volume <= 0) {
                                patch({
                                    visual_audio_volume: 0,
                                    visual_youtube_muted: undefined,
                                });
                                return;
                            }
                            patch({
                                visual_audio_volume: volume,
                                visual_youtube_muted: false,
                            });
                        }}
                    />
                ) : null}

                {activeTab === MEDIA_TAB.animation ? (
                    <InspectorPropertyGroup title="Chuyển động" collapsible={false}>
                        <InspectorPropertySelect
                            label="Hiệu ứng vào"
                            description="Cách media xuất hiện trên màn hình"
                            value={motion}
                            onChange={(value) => patch({ visual_motion: value })}
                            options={[...VISUAL_CLIP_MOTION_OPTIONS]}
                        />
                    </InspectorPropertyGroup>
                ) : null}
            </InspectorPanelBody>
        </Box>
    );
}
