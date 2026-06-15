import React from 'react';
import {
    Alert,
    Box,
    FormControlLabel,
    MenuItem,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import Button from 'components/atoms/Button';
import {
    resolveSceneShowVisual,
    resolveSceneVisualMotion,
    resolveSceneVisualRef,
    resolveSceneVisualStartSec,
    resolveSceneVisualType,
    resolveSceneVisualYoutubeId,
    type ShortVideoManifestScene,
    type ShortVideoManifestSceneLayout,
    type ShortVideoSceneVisualType,
} from 'helpers/shortVideoRenderManifest';
import {
    isHttpsImageUrl,
    isYoutubeUrl,
    parseYoutubeId,
} from 'helpers/shortVideoYoutube';

type Props = {
    scene: ShortVideoManifestScene;
    layout: ShortVideoManifestSceneLayout;
    patch: (next: Partial<ShortVideoManifestSceneLayout>) => void;
    onReset: () => void;
};

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

function resolveEditorVisualType(scene: ShortVideoManifestScene): ShortVideoSceneVisualType {
    const override = scene.layout?.visual_type;
    if (override === 'none' || override === 'image' || override === 'video') {
        return override;
    }
    return resolveSceneVisualType(scene);
}

export default function ShortVideoSceneMediaTab({
    scene,
    layout,
    patch,
    onReset,
}: Props) {
    const visualType = resolveEditorVisualType(scene);
    const urlValue = layout.visual_ref ?? resolveSceneVisualRef(scene);
    const motion = layout.visual_motion ?? resolveSceneVisualMotion(scene);
    const scriptRef = scene.visual?.ref?.trim() || '';

    const validationError = React.useMemo(() => {
        if (visualType === 'none') {
            return '';
        }
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
        next: ShortVideoSceneVisualType | null
    ) => {
        if (!next) {
            return;
        }
        if (next === 'none') {
            patch({
                visual_type: 'none',
                show_visual: false,
                visual_ref: undefined,
                visual_youtube_id: undefined,
                visual_playback_url: undefined,
                visual_start_sec: undefined,
            });
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
            visual_type: 'none',
            visual_ref: undefined,
            visual_youtube_id: undefined,
            visual_playback_url: undefined,
            visual_start_sec: undefined,
            show_visual: false,
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                }}
            >
                <Typography variant="subtitle2" fontWeight={600}>
                    Media scene
                </Typography>
                <Button size="small" variant="text" onClick={onReset}>
                    Đặt lại nhóm này
                </Button>
            </Box>

            <FormControlLabel
                control={
                    <Switch
                        checked={resolveSceneShowVisual(scene) || visualType !== 'none'}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            if (!checked) {
                                handleClearMedia();
                                return;
                            }
                            patch({
                                show_visual: true,
                                visual_type: visualType === 'none' ? 'image' : visualType,
                            });
                        }}
                    />
                }
                label="Hiển thị media"
            />

            <Box>
                <Typography variant="body2" sx={{ mb: 0.75 }}>
                    Loại media
                </Typography>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={visualType}
                    onChange={handleTypeChange}
                    sx={{ flexWrap: 'wrap' }}
                >
                    <ToggleButton value="none">Không</ToggleButton>
                    <ToggleButton value="image">Ảnh</ToggleButton>
                    <ToggleButton value="video">Video</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {visualType !== 'none' ? (
                <>
                    <TextField
                        label={visualType === 'video' ? 'Link YouTube' : 'URL ảnh'}
                        size="small"
                        fullWidth
                        placeholder={
                            visualType === 'video'
                                ? 'https://www.youtube.com/watch?v=… hoặc youtu.be/…'
                                : scriptRef || 'https://…'
                        }
                        value={urlValue}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        error={Boolean(validationError)}
                        helperText={
                            validationError
                                || (visualType === 'video'
                                    ? 'Hỗ trợ link watch, youtu.be và embed'
                                    : 'URL public https://')
                        }
                    />
                    {visualType === 'video' && youtubeId ? (
                        <Typography variant="caption" color="text.secondary">
                            YouTube ID: {youtubeId}
                        </Typography>
                    ) : null}
                    {validationError ? (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                            {validationError}
                        </Alert>
                    ) : null}
                    {visualType === 'video' ? (
                        <TextField
                            label="Vị trí bắt đầu (giây)"
                            type="number"
                            size="small"
                            fullWidth
                            value={startSec}
                            onChange={(e) => handleStartSecChange(e.target.value)}
                            helperText="Video sẽ phát từ giây này trong file đã tải"
                            inputProps={{ min: 0, step: 0.1 }}
                        />
                    ) : null}
                    <TextField
                        select
                        label="Hiệu ứng"
                        size="small"
                        fullWidth
                        value={motion}
                        onChange={(e) => patch({ visual_motion: e.target.value })}
                    >
                        <MenuItem value="pop">Pop</MenuItem>
                        <MenuItem value="fade">Fade</MenuItem>
                    </TextField>
                    <Button size="small" variant="outlined" onClick={handleClearMedia}>
                        Xóa media
                    </Button>
                </>
            ) : null}

            {scriptRef && !layout.visual_ref ? (
                <Typography variant="caption" color="text.secondary">
                    URL gốc từ script: {isYoutubeUrl(scriptRef) ? scriptRef : scriptRef}
                </Typography>
            ) : null}
        </Box>
    );
}
