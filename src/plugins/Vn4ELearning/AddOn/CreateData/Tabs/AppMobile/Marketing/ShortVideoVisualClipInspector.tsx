import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    MenuItem,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import type {
    ShortVideoRenderManifest,
    ShortVideoSceneVisualType,
    ShortVideoVisualClip,
} from 'helpers/shortVideoRenderManifest';
import { updateVisualClipInManifest } from 'helpers/shortVideoVisualClips';
import {
    resolveVisualClipYoutubeId,
} from 'helpers/shortVideoVisualClips';
import { isHttpsImageUrl, parseYoutubeId } from 'helpers/shortVideoYoutube';
import ShortVideoSceneMediaPreview from './ShortVideoSceneMediaPreview';

type Props = {
    manifest: ShortVideoRenderManifest;
    clipId: string;
    sceneId?: string;
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onSave?: () => void;
    saving?: boolean;
    dirty?: boolean;
};

function clipAsPreviewScene(clip: ShortVideoVisualClip): ShortVideoRenderManifest['scenes'][number] {
    return {
        id: clip.id,
        voiceover: '',
        on_screen_text: clip.label || '',
        duration_hint_sec: clip.duration_sec,
        visual: {
            type: clip.type === 'image' ? 'image' : clip.type === 'video' ? 'video' : 'kinetic_text',
            ref: clip.ref,
            motion: clip.motion || 'pop',
        },
        audio_url: '',
        duration_sec: clip.duration_sec,
        start_offset_sec: clip.start_sec,
        words: [],
        layout: {
            visual_type: clip.type,
            visual_ref: clip.ref,
            visual_youtube_id: clip.visual_youtube_id,
            visual_playback_url: clip.visual_playback_url,
            visual_motion: clip.motion,
            visual_start_sec: clip.visual_start_sec,
            show_visual: clip.type !== 'none',
        },
    };
}

export default function ShortVideoVisualClipInspector({
    manifest,
    clipId,
    sceneId = '',
    onManifestChange,
    onSave,
    saving = false,
    dirty = false,
}: Props) {
    const clip = (manifest.visual_clips ?? []).find((item) => item.id === clipId);
    const scene = manifest.scenes.find((item) => item.id === sceneId);

    const patch = React.useCallback(
        (patchData: Partial<ShortVideoVisualClip>) => {
            if (!clipId) {
                return;
            }
            onManifestChange(updateVisualClipInManifest(manifest, clipId, patchData));
        },
        [clipId, manifest, onManifestChange]
    );

    const visualType = clip?.type ?? 'none';
    const urlValue = clip?.ref ?? '';

    const validationError = React.useMemo(() => {
        if (!clip || visualType === 'none') {
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
    }, [clip, visualType, urlValue]);

    if (!clip && !scene) {
        return (
            <Box sx={{ p: 2, width: 280, flexShrink: 0 }}>
                <Typography variant="body2" color="text.secondary">
                    Chọn item trên timeline để chỉnh
                </Typography>
            </Box>
        );
    }

    if (!clip && scene) {
        const hasAudio = Boolean(scene.audio_url?.trim());
        const hasWhisper = Array.isArray(scene.words) && scene.words.length > 0;
        const pending = !hasAudio || !hasWhisper;
        return (
            <Box
                sx={{
                    width: 300,
                    flexShrink: 0,
                    borderLeft: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflowX: 'hidden',
                    overflowY: 'auto',
                }}
                className="custom_scroll"
            >
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                            Lời thoại
                        </Typography>
                        {pending ? (
                            <Chip size="small" color="warning" label="Chưa có audio/whisper" />
                        ) : (
                            <Chip size="small" color="success" label="Đã có audio + whisper" />
                        )}
                    </Box>
                    <TextField
                        label="Nhãn hiển thị trên track"
                        size="small"
                        fullWidth
                        value={scene.on_screen_text || ''}
                        onChange={(e) => {
                            const nextText = e.target.value;
                            onManifestChange({
                                ...manifest,
                                scenes: manifest.scenes.map((item) => (
                                    item.id === scene.id
                                        ? { ...item, on_screen_text: nextText }
                                        : item
                                )),
                            });
                        }}
                    />
                    <TextField
                        label="Voiceover"
                        size="small"
                        fullWidth
                        multiline
                        minRows={4}
                        value={scene.voiceover || ''}
                        onChange={(e) => {
                            const nextVoiceover = e.target.value;
                            onManifestChange({
                                ...manifest,
                                scenes: manifest.scenes.map((item) => (
                                    item.id === scene.id
                                        ? { ...item, voiceover: nextVoiceover }
                                        : item
                                )),
                            });
                        }}
                    />
                    <Divider />
                    <Typography variant="caption" color="text.secondary">
                        Lưu scene lời thoại sẽ trigger backend tạo lại audio + whisper cho scene mới/chỉnh sửa.
                    </Typography>
                </Box>
                <Box
                    sx={{
                        px: 2,
                        pb: 2,
                        pt: 1,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        position: 'sticky',
                        bottom: 0,
                    }}
                >
                    <Button
                        variant="contained"
                        fullWidth
                        disabled={!dirty || saving}
                        onClick={onSave}
                    >
                        {saving ? 'Đang lưu...' : 'Lưu lời thoại'}
                    </Button>
                </Box>
            </Box>
        );
    }

    if (!clip) {
        return null;
    }

    const motion = clip.motion || 'pop';
    const youtubeId = resolveVisualClipYoutubeId(clip);

    const handleTypeChange = (
        _event: React.MouseEvent<HTMLElement>,
        next: ShortVideoSceneVisualType | null
    ) => {
        if (!next) {
            return;
        }
        if (next === 'none') {
            patch({
                type: 'none',
                ref: '',
                visual_youtube_id: undefined,
                visual_playback_url: undefined,
                visual_start_sec: undefined,
            });
            return;
        }
        patch({
            type: next,
            visual_playback_url: undefined,
            visual_start_sec: next === 'image' ? undefined : clip.visual_start_sec,
        });
    };

    const handleUrlChange = (value: string) => {
        const trimmed = value.trim();
        if (visualType === 'video') {
            const parsedYoutubeId = parseYoutubeId(trimmed);
            patch({
                ref: trimmed,
                visual_youtube_id: parsedYoutubeId ?? undefined,
                visual_playback_url: undefined,
            });
            return;
        }
        patch({
            ref: trimmed,
            visual_playback_url: undefined,
        });
    };

    return (
        <Box
            sx={{
                width: 300,
                flexShrink: 0,
                borderLeft: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflowX: 'hidden',
                overflowY: 'auto',
            }}
            className="custom_scroll"
        >
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                    Visual clip
                </Typography>

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
                            value={urlValue}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            error={Boolean(validationError)}
                            helperText={validationError || 'URL public https://'}
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
                                label="Vị trí bắt đầu trong file (giây)"
                                type="number"
                                size="small"
                                fullWidth
                                value={clip.visual_start_sec ?? 0}
                                onChange={(e) => {
                                    const parsed = Number.parseFloat(e.target.value);
                                    if (!Number.isFinite(parsed)) {
                                        patch({ visual_start_sec: undefined });
                                        return;
                                    }
                                    patch({ visual_start_sec: Math.max(0, parsed) });
                                }}
                                inputProps={{ min: 0, step: 0.1 }}
                            />
                        ) : null}
                        <TextField
                            select
                            label="Hiệu ứng"
                            size="small"
                            fullWidth
                            value={motion}
                            onChange={(e) => patch({ motion: e.target.value })}
                        >
                            <MenuItem value="pop">Pop</MenuItem>
                            <MenuItem value="fade">Fade</MenuItem>
                        </TextField>
                    </>
                ) : null}
            </Box>
            <Box sx={{ px: 2, pb: 2, minWidth: 0, overflow: 'hidden' }}>
                <ShortVideoSceneMediaPreview scene={clipAsPreviewScene(clip)} />
            </Box>
            <Box
                sx={{
                    px: 2,
                    pb: 2,
                    pt: 1,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    position: 'sticky',
                    bottom: 0,
                }}
            >
                <Button
                    variant="contained"
                    fullWidth
                    disabled={!dirty || saving}
                    onClick={onSave}
                >
                    {saving ? 'Đang lưu...' : 'Lưu chỉnh sửa visual'}
                </Button>
            </Box>
        </Box>
    );
}
