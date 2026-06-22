import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControlLabel,
    MenuItem,
    Paper,
    Switch,
    Tab,
    Tabs,
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
import {
    resolveSceneAudioTtsSettings,
} from 'helpers/shortVideoRenderManifest';
import { updateVisualClipInManifest } from 'helpers/shortVideoVisualClips';
import {
    resolveVisualClipYoutubeId,
} from 'helpers/shortVideoVisualClips';
import { isHttpsImageUrl, parseYoutubeId } from 'helpers/shortVideoYoutube';
import {
    fetchSaydiTtsCatalog,
    type SaydiTtsSelectOption,
} from 'helpers/marketingShortVideoManifestApi';
import ShortVideoSceneMediaPreview from './ShortVideoSceneMediaPreview';

type Props = {
    manifest: ShortVideoRenderManifest;
    clipId: string;
    sceneId?: string;
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onSave?: () => void;
    onRenderAudio?: () => void;
    saving?: boolean;
    rendering?: boolean;
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
            visual_youtube_muted: clip.visual_youtube_muted,
            visual_playback_url: clip.visual_playback_url,
            visual_motion: clip.motion,
            visual_start_sec: clip.visual_start_sec,
            show_visual: clip.type !== 'none',
        },
    };
}

type NarrationInspectorProps = {
    manifest: ShortVideoRenderManifest;
    scene: ShortVideoRenderManifest['scenes'][number];
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onRenderAudio?: () => void;
    rendering?: boolean;
};

const TTS_PROVIDER_OPTIONS = [
    { value: 'saydi', label: 'Saydi API' },
] as const;

const INSPECTOR_TAB_SX = {
    minHeight: 36,
    py: 0.75,
    px: 1,
    fontSize: 13,
    fontWeight: 500,
    textTransform: 'none',
} as const;

function InspectorSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.75,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                bgcolor: 'background.paper',
            }}
        >
            <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                    {title}
                </Typography>
                {description ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                        {description}
                    </Typography>
                ) : null}
            </Box>
            {children}
        </Paper>
    );
}

function NarrationSceneInspector({
    manifest,
    scene,
    onManifestChange,
    onRenderAudio,
    rendering = false,
}: NarrationInspectorProps) {
    const [activeTab, setActiveTab] = React.useState(0);
    const [langOptions, setLangOptions] = React.useState<SaydiTtsSelectOption[]>([]);
    const [voiceSampleOptions, setVoiceSampleOptions] = React.useState<SaydiTtsSelectOption[]>([]);
    const [catalogLoading, setCatalogLoading] = React.useState(true);
    const hasAudio = Boolean(scene.audio_url?.trim());
    const hasWhisper = Array.isArray(scene.words) && scene.words.length > 0;
    const pending = !hasAudio || !hasWhisper;
    const voiceoverTrimmed = scene.voiceover?.trim() || '';
    const ttsSettings = resolveSceneAudioTtsSettings(scene, manifest.lang);

    React.useEffect(() => {
        let cancelled = false;
        setCatalogLoading(true);
        fetchSaydiTtsCatalog()
            .then((result) => {
                if (cancelled) {
                    return;
                }
                setLangOptions(Array.isArray(result.languages) ? result.languages : []);
                setVoiceSampleOptions(Array.isArray(result.voice_samples) ? result.voice_samples : []);
            })
            .catch(() => {
                if (!cancelled) {
                    setLangOptions([]);
                    setVoiceSampleOptions([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setCatalogLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedLangCode = React.useMemo(() => {
        const current = ttsSettings.lang_code?.trim() || '';
        if (langOptions.some((option) => option.value === current)) {
            return current;
        }
        if (langOptions.length > 0) {
            return langOptions[0].value;
        }
        return current || 'vi';
    }, [ttsSettings.lang_code, langOptions]);

    const voiceOptionsForLang = React.useMemo(() => {
        if (!selectedLangCode) {
            return voiceSampleOptions;
        }
        const filtered = voiceSampleOptions.filter(
            (option) => !option.lang_code || option.lang_code === selectedLangCode
        );
        return filtered.length > 0 ? filtered : voiceSampleOptions;
    }, [selectedLangCode, voiceSampleOptions]);

    const selectedVoiceSample = React.useMemo(() => {
        const current = ttsSettings.voice_sample?.trim() || '';
        if (voiceOptionsForLang.some((option) => option.value === current)) {
            return current;
        }
        if (voiceOptionsForLang.length > 0) {
            return voiceOptionsForLang[0].value;
        }
        return current;
    }, [ttsSettings.voice_sample, voiceOptionsForLang]);

    const patchScene = React.useCallback(
        (patchData: Partial<ShortVideoRenderManifest['scenes'][number]>) => {
            onManifestChange({
                ...manifest,
                scenes: manifest.scenes.map((item) => (
                    item.id === scene.id ? { ...item, ...patchData } : item
                )),
            });
        },
        [manifest, onManifestChange, scene.id]
    );

    const patchTtsSettings = React.useCallback(
        (patchData: Partial<typeof ttsSettings>) => {
            patchScene({
                audio_tts_settings: {
                    ...ttsSettings,
                    ...patchData,
                    provider: 'saydi',
                },
            });
        },
        [patchScene, ttsSettings]
    );

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
            <Box sx={{ px: 2, pt: 2, pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                            Lời thoại
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Chỉnh nội dung và cấu hình TTS
                        </Typography>
                    </Box>
                    {pending ? (
                        <Chip size="small" color="warning" label="Chưa có audio" sx={{ flexShrink: 0 }} />
                    ) : (
                        <Chip size="small" color="success" label="Sẵn sàng" sx={{ flexShrink: 0 }} />
                    )}
                </Box>
                <Tabs
                    value={activeTab}
                    onChange={(_event, next) => setActiveTab(next)}
                    variant="fullWidth"
                    sx={{
                        minHeight: 36,
                        mb: 1.5,
                        '& .MuiTabs-indicator': {
                            height: 2,
                            borderRadius: 1,
                        },
                    }}
                >
                    <Tab label="Nội dung" sx={INSPECTOR_TAB_SX} />
                    <Tab label="Settings" sx={INSPECTOR_TAB_SX} />
                </Tabs>
            </Box>

            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                {activeTab === 0 ? (
                    <InspectorSection
                        title="Nội dung scene"
                        description="Nhãn hiển thị trên timeline và văn bản TTS."
                    >
                        <TextField
                            label="Nhãn hiển thị trên track"
                            size="small"
                            fullWidth
                            value={scene.on_screen_text || ''}
                            onChange={(e) => patchScene({ on_screen_text: e.target.value })}
                        />
                        <TextField
                            label="Voiceover"
                            size="small"
                            fullWidth
                            multiline
                            minRows={5}
                            value={scene.voiceover || ''}
                            onChange={(e) => patchScene({ voiceover: e.target.value })}
                            placeholder="Nhập lời thoại cần chuyển thành audio..."
                        />
                        <Alert severity="info" sx={{ py: 0.5, alignItems: 'center' }}>
                            Sửa lời thoại sẽ đánh dấu scene chờ render. Bấm Render audio khi sẵn sàng.
                        </Alert>
                    </InspectorSection>
                ) : (
                    <InspectorSection
                        title="Cấu hình render audio"
                        description="Chọn provider và tham số Saydi cho scene này."
                    >
                        <TextField
                            select
                            label="Provider"
                            size="small"
                            fullWidth
                            value={ttsSettings.provider}
                            onChange={(e) => {
                                if (e.target.value === 'saydi') {
                                    patchTtsSettings({ provider: 'saydi' });
                                }
                            }}
                        >
                            {TTS_PROVIDER_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Ngôn ngữ"
                            size="small"
                            fullWidth
                            value={selectedLangCode}
                            onChange={(e) => patchTtsSettings({ lang_code: e.target.value })}
                            disabled={catalogLoading || langOptions.length === 0}
                            helperText={
                                catalogLoading
                                    ? 'Đang tải danh sách ngôn ngữ...'
                                    : langOptions.length === 0
                                        ? 'Không có ngôn ngữ khả dụng'
                                        : 'Chọn ngôn ngữ TTS cho scene này'
                            }
                        >
                            {langOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Voice sample"
                            size="small"
                            fullWidth
                            value={selectedVoiceSample}
                            onChange={(e) => patchTtsSettings({ voice_sample: e.target.value })}
                            disabled={catalogLoading || voiceOptionsForLang.length === 0}
                            helperText={
                                catalogLoading
                                    ? 'Đang tải danh sách voice...'
                                    : voiceOptionsForLang.length === 0
                                        ? 'Không có voice sample khả dụng'
                                        : 'Chọn giọng Saydi cho scene này'
                            }
                        >
                            {voiceOptionsForLang.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </InspectorSection>
                )}
            </Box>

            <Box
                sx={{
                    px: 2,
                    pb: 2,
                    pt: 1.25,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                    position: 'sticky',
                    bottom: 0,
                }}
            >
                <Button
                    variant="contained"
                    fullWidth
                    size="medium"
                    disabled={!voiceoverTrimmed || rendering}
                    onClick={onRenderAudio}
                    sx={{
                        py: 1,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: 1.5,
                    }}
                >
                    {rendering ? 'Đang render audio...' : 'Render audio'}
                </Button>
                {!voiceoverTrimmed ? (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center', mt: 0.75 }}
                    >
                        Cần nhập voiceover trước khi render
                    </Typography>
                ) : null}
            </Box>
        </Box>
    );
}

export default function ShortVideoVisualClipInspector({
    manifest,
    clipId,
    sceneId = '',
    onManifestChange,
    onSave,
    onRenderAudio,
    saving = false,
    rendering = false,
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
        return (
            <NarrationSceneInspector
                manifest={manifest}
                scene={scene}
                onManifestChange={onManifestChange}
                onRenderAudio={onRenderAudio}
                rendering={rendering || saving}
            />
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
                            <>
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
                                <FormControlLabel
                                    control={(
                                        <Switch
                                            size="small"
                                            checked={clip.visual_youtube_muted === false}
                                            onChange={(e) => {
                                                patch({
                                                    visual_youtube_muted: e.target.checked ? false : true,
                                                });
                                            }}
                                        />
                                    )}
                                    label="Phát tiếng YouTube"
                                />
                            </>
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
