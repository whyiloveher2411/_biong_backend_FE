import React from 'react';
import {
    Alert,
    Box,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import Button from 'components/atoms/Button';
import {
    resolveSceneVisualMotion,
    resolveSceneVisualRef,
    resolveSceneVisualStartSec,
    resolveSceneVisualType,
    resolveSceneVisualYoutubeId,
    type ShortVideoManifestScene,
    type ShortVideoManifestSceneLayout,
} from 'helpers/shortVideoRenderManifest';
import {
    isHttpsImageUrl,
    isYoutubeUrl,
    parseYoutubeId,
} from 'helpers/shortVideoYoutube';
import {
    InspectorPanelBody,
    InspectorPanelTabs,
    InspectorPropertyGroup,
    InspectorPropertyReadonly,
    InspectorPropertyRow,
    InspectorPropertySelect,
    InspectorPropertyText,
} from './ShortVideoInspectorFields';

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

export default function ShortVideoSceneMediaTab({
    scene,
    layout,
    patch,
    onReset,
}: Props) {
    const [activeTab, setActiveTab] = React.useState<number>(MEDIA_TAB.properties);
    const visualType = resolveEditorVisualType(scene);
    const urlValue = layout.visual_ref ?? resolveSceneVisualRef(scene);
    const motion = layout.visual_motion ?? resolveSceneVisualMotion(scene);
    const scriptRef = scene.visual?.ref?.trim() || '';

    const validationError = React.useMemo(() => {
        const trimmed = urlValue.trim();
        if (!trimmed) {
            return 'Cần nhập URL';
        }
        if (visualType === 'image') {
            return isHttpsImageUrl(trimmed) ? '' : 'URL ảnh phải bắt đầu bằng https://';
        }
        if (visualType === 'video') {
            return parseYoutubeId(trimmed) ? '' : 'Link YouTube không hợp lệ';
        }
        return '';
    }, [visualType, urlValue]);

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

    const handleUrlChange = (value: string) => {
        const trimmed = value.trim();
        if (visualType === 'video') {
            const parsedYoutubeId = parseYoutubeId(trimmed);
            patch({
                visual_ref: patchOrClearString(layout.visual_ref, value),
                visual_youtube_id: parsedYoutubeId ?? undefined,
                visual_playback_url: undefined,
                show_visual: parsedYoutubeId ? true : undefined,
            });
            return;
        }
        patch({
            visual_ref: patchOrClearString(layout.visual_ref, value),
            visual_playback_url: undefined,
            show_visual: trimmed && isHttpsImageUrl(trimmed) ? true : undefined,
        });
    };

    const handleClearMedia = () => {
        patch({
            visual_ref: undefined,
            visual_youtube_id: undefined,
            visual_playback_url: undefined,
            visual_start_sec: undefined,
            show_visual: true,
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
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
                    <>
                        <InspectorPropertyGroup title="Hiển thị">
                            <InspectorPropertyRow label="Loại media" fullWidthControl>
                                <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    fullWidth
                                    value={visualType}
                                    onChange={handleTypeChange}
                                >
                                    <ToggleButton value="image" sx={{ flex: 1, textTransform: 'none' }}>
                                        Ảnh
                                    </ToggleButton>
                                    <ToggleButton value="video" sx={{ flex: 1, textTransform: 'none' }}>
                                        Video
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </InspectorPropertyRow>
                        </InspectorPropertyGroup>

                        <InspectorPropertyGroup title="Nguồn media">
                                <InspectorPropertyText
                                    label={visualType === 'video' ? 'Link YouTube' : 'URL ảnh'}
                                    value={urlValue}
                                    onChange={handleUrlChange}
                                    placeholder={
                                        visualType === 'video'
                                            ? 'https://www.youtube.com/watch?v=…'
                                            : scriptRef || 'https://…'
                                    }
                                    error={Boolean(validationError)}
                                    helperText={
                                        validationError
                                            || (visualType === 'video'
                                                ? 'Hỗ trợ watch, youtu.be và embed'
                                                : 'URL public https://')
                                    }
                                />
                                {visualType === 'video' && youtubeId ? (
                                    <InspectorPropertyReadonly
                                        label="YouTube ID"
                                        value={youtubeId}
                                    />
                                ) : null}
                                {scriptRef && !layout.visual_ref ? (
                                    <InspectorPropertyReadonly
                                        label="URL gốc script"
                                        value={isYoutubeUrl(scriptRef) ? scriptRef : scriptRef}
                                    />
                                ) : null}
                                {validationError ? (
                                    <Box sx={{ px: 0.25, pb: 1 }}>
                                        <Alert severity="warning" sx={{ py: 0.5 }}>
                                            {validationError}
                                        </Alert>
                                    </Box>
                                ) : null}
                                <Box sx={{ px: 0.25, pb: 1 }}>
                                    <Button size="small" variant="outlined" fullWidth onClick={handleClearMedia}>
                                        Xóa media
                                    </Button>
                                </Box>
                        </InspectorPropertyGroup>

                        {visualType === 'video' ? (
                            <InspectorPropertyGroup title="Phát lại video">
                                <InspectorPropertyText
                                    label="Vị trí bắt đầu"
                                    description="Giây bắt đầu trong file đã tải"
                                    value={String(startSec)}
                                    type="number"
                                    onChange={handleStartSecChange}
                                    inputProps={{ min: 0, step: 0.1 }}
                                />
                            </InspectorPropertyGroup>
                        ) : null}
                    </>
                ) : null}

                {activeTab === MEDIA_TAB.animation ? (
                    <InspectorPropertyGroup title="Chuyển động">
                        <InspectorPropertySelect
                            label="Hiệu ứng vào"
                            description="Cách media xuất hiện trên màn hình"
                            value={motion}
                            onChange={(value) => patch({ visual_motion: value })}
                            options={[
                                { value: 'pop', label: 'Pop' },
                                { value: 'fade', label: 'Fade' },
                            ]}
                        />
                    </InspectorPropertyGroup>
                ) : null}
            </InspectorPanelBody>
        </Box>
    );
}
