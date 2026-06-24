import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Paper,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import type {
    ShortVideoManifestSceneLayout,
    ShortVideoRenderManifest,
    ShortVideoVisualClip,
} from 'helpers/shortVideoRenderManifest';
import {
    resolveSceneAudioTtsSettings,
    resolveDefaultSceneAudioTtsSettings,
    resolveDefaultVbeeSceneAudioTtsSettings,
    resolveSceneAudioVolume,
} from 'helpers/shortVideoRenderManifest';
import type { ShortVideoSceneAudioTtsSettings } from 'helpers/shortVideoRenderManifest';
import {
    patchVisualClipAudioVolumeFromPercent,
    resolveVisualClipImageRef,
    resolveVisualClipVideoRef,
    resolveVisualClipYoutubeId,
    updateVisualClipInManifest,
    VISUAL_CLIP_MOTION_OPTIONS,
} from 'helpers/shortVideoVisualClips';
import { audioVolumeFromPercent, audioVolumePercent } from 'helpers/shortVideoAudioVolume';
import { isHttpsImageUrl, isValidVideoRef, parseYoutubeId } from 'helpers/shortVideoYoutube';
import {
    fetchSaydiTtsCatalog,
    fetchVbeeTtsAccountCredits,
    fetchVbeeTtsCatalog,
    type SaydiTtsSelectOption,
    type VbeeTtsAccountCredits,
    type VbeeTtsSelectOption,
} from 'helpers/marketingShortVideoManifestApi';
import ShortVideoSceneEditPanel from './ShortVideoSceneEditPanel';
import ShortVideoSceneMediaPreview from './ShortVideoSceneMediaPreview';
import ShortVideoVisualMediaFields, { resolveVisualMediaVolumePercent } from './ShortVideoVisualMediaFields';
import ShortVideoVisualLayoutFields from './ShortVideoVisualLayoutFields';
import {
    INSPECTOR_SHELL_CONTENT_SX,
    InspectorPanelBody,
    InspectorPanelTabs,
    InspectorPropertyGroup,
    InspectorPropertyReadonly,
    InspectorPropertySelect,
    InspectorPropertyVolume,
} from './ShortVideoInspectorFields';

type Props = {
    manifest: ShortVideoRenderManifest;
    clipId: string;
    sceneId?: string;
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onSave?: () => void;
    onRenderAudio?: () => void;
    onSceneLayoutChange?: (
        sceneId: string,
        patch: Partial<ShortVideoManifestSceneLayout>
    ) => void;
    onResetLayoutGroup?: (
        sceneId: string,
        keys: (keyof ShortVideoManifestSceneLayout)[]
    ) => void;
    saving?: boolean;
    rendering?: boolean;
    dirty?: boolean;
};

const NARRATION_TAB = {
    content: 0,
    display: 1,
} as const;

const VISUAL_CLIP_TAB = {
    properties: 0,
    layout: 1,
    animation: 2,
} as const;

function clipAsPreviewScene(clip: ShortVideoVisualClip): ShortVideoRenderManifest['scenes'][number] {
    const imageRef = resolveVisualClipImageRef(clip);
    const videoRef = resolveVisualClipVideoRef(clip);
    const activeRef = clip.type === 'video' ? videoRef : imageRef;
    return {
        id: clip.id,
        voiceover: '',
        on_screen_text: clip.label || '',
        duration_hint_sec: clip.duration_sec,
        visual: {
            type: clip.type === 'image' ? 'image' : clip.type === 'video' ? 'video' : 'kinetic_text',
            ref: activeRef,
            motion: clip.motion || 'pop',
        },
        audio_url: '',
        duration_sec: clip.duration_sec,
        start_offset_sec: clip.start_sec,
        words: [],
        layout: {
            visual_type: clip.type,
            visual_ref: activeRef,
            visual_image_ref: imageRef || undefined,
            visual_video_ref: videoRef || undefined,
            visual_video_preview_url: clip.video_preview_url,
            visual_youtube_id: clip.visual_youtube_id,
            visual_youtube_muted: clip.visual_youtube_muted,
            visual_audio_volume: clip.audio_volume,
            visual_playback_url: clip.visual_playback_url,
            visual_motion: clip.motion,
            visual_start_sec: clip.visual_start_sec,
            show_visual: clip.type !== 'none',
            visual_vertical_align: clip.visual_vertical_align,
            visual_inset_top: clip.visual_inset_top,
            visual_inset_bottom: clip.visual_inset_bottom,
            visual_background_mode: clip.visual_background_mode,
            visual_background_color: clip.visual_background_color,
            visual_background_gradient: clip.visual_background_gradient,
            visual_background_blur: clip.visual_background_blur,
        },
    };
}

const TTS_PROVIDER_OPTIONS = [
    { value: 'saydi', label: 'Saydi API' },
    { value: 'vbee', label: 'Vbee API' },
] as const;

function formatVbeeCreditCount(value: number): string {
    return value.toLocaleString('vi-VN');
}

type VbeeCreditsSummaryProps = {
    credits: VbeeTtsAccountCredits | null;
    loading: boolean;
    error: string;
};

function VbeeCreditsSummary({ credits, loading, error }: VbeeCreditsSummaryProps) {
    const value = loading
        ? 'Đang tải...'
        : credits
            ? formatVbeeCreditCount(credits.available_characters)
            : (error || '—');

    return (
        <InspectorPropertyReadonly
            label="Credit"
            value={value}
        />
    );
}

function noopSceneLayoutChange(
    _sceneId: string,
    _patch: Partial<ShortVideoManifestSceneLayout>
): void {
    return undefined;
}

function noopResetLayoutGroup(
    _sceneId: string,
    _keys: (keyof ShortVideoManifestSceneLayout)[]
): void {
    return undefined;
}

const INSPECTOR_TAB_SX = {
    minHeight: 36,
    py: 0.75,
    px: 0.75,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'none',
    minWidth: 0,
} as const;

const INSPECTOR_SHELL_SX = {
    width: 300,
    flexShrink: 0,
    borderLeft: 1,
    borderColor: 'divider',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
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

function EmptyInspector() {
    return (
        <Box sx={INSPECTOR_SHELL_SX} className="custom_scroll">
            <Box sx={{ px: 2, py: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                    Cài đặt video
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Chọn scene hoặc visual clip trên timeline để chỉnh sửa
                </Typography>
            </Box>
        </Box>
    );
}

type NarrationAudioSettingsPanelProps = {
    ttsSettings: ShortVideoSceneAudioTtsSettings;
    catalogLoading: boolean;
    langOptions: SaydiTtsSelectOption[];
    voiceOptionsForLang: SaydiTtsSelectOption[];
    vbeeVoiceOptions: VbeeTtsSelectOption[];
    selectedLangCode: string;
    selectedVoiceSample: string;
    selectedVbeeVoiceCode: string;
    hasAudio: boolean;
    audioUrl: string;
    hasWhisper: boolean;
    wordsCount: number;
    durationSec: number;
    narrationVolumePercent: number;
    onNarrationVolumeChange: (percent: number) => void;
    vbeeCredits: VbeeTtsAccountCredits | null;
    vbeeCreditsLoading: boolean;
    vbeeCreditsError: string;
    onProviderChange: (provider: 'saydi' | 'vbee') => void;
    onPatchTtsSettings: (nextSettings: ShortVideoSceneAudioTtsSettings) => void;
    onRefreshVbeeCredits?: () => void;
};

function NarrationAudioSettingsPanel({
    ttsSettings,
    catalogLoading,
    langOptions,
    voiceOptionsForLang,
    vbeeVoiceOptions,
    selectedLangCode,
    selectedVoiceSample,
    selectedVbeeVoiceCode,
    hasAudio,
    audioUrl,
    hasWhisper,
    wordsCount,
    durationSec,
    narrationVolumePercent,
    onNarrationVolumeChange,
    vbeeCredits,
    vbeeCreditsLoading,
    vbeeCreditsError,
    onProviderChange,
    onPatchTtsSettings,
    onRefreshVbeeCredits,
}: NarrationAudioSettingsPanelProps) {
    const providerLabel = ttsSettings.provider === 'vbee' ? 'Vbee API' : 'Saydi API';

    const handleAudioSettingsExpanded = React.useCallback((expanded: boolean) => {
        if (expanded && ttsSettings.provider === 'vbee') {
            onRefreshVbeeCredits?.();
        }
    }, [onRefreshVbeeCredits, ttsSettings.provider]);

    return (
        <InspectorPanelBody>
            <InspectorPropertyGroup
                title={`Cài đặt audio · ${providerLabel}`}
                defaultExpanded={false}
                onExpandedChange={handleAudioSettingsExpanded}
            >
                <InspectorPropertySelect
                    label="Provider"
                    value={ttsSettings.provider}
                    onChange={(value) => {
                        if (value === 'saydi' || value === 'vbee') {
                            onProviderChange(value);
                        }
                    }}
                    options={TTS_PROVIDER_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                    }))}
                />
                {ttsSettings.provider === 'vbee' ? (
                    <VbeeCreditsSummary
                        credits={vbeeCredits}
                        loading={vbeeCreditsLoading}
                        error={vbeeCreditsError}
                    />
                ) : null}
                {ttsSettings.provider === 'saydi' ? (
                    <>
                        <InspectorPropertySelect
                            label="Ngôn ngữ"
                            description={
                                catalogLoading
                                    ? 'Đang tải danh sách ngôn ngữ...'
                                    : langOptions.length === 0
                                        ? 'Không có ngôn ngữ khả dụng'
                                        : 'Ngôn ngữ TTS cho scene này'
                            }
                            value={selectedLangCode}
                            onChange={(value) => {
                                if (ttsSettings.provider !== 'saydi') {
                                    return;
                                }
                                onPatchTtsSettings({
                                    ...ttsSettings,
                                    lang_code: value,
                                });
                            }}
                            options={langOptions.map((option) => ({
                                value: option.value,
                                label: option.label,
                            }))}
                            disabled={catalogLoading || langOptions.length === 0}
                        />
                        <InspectorPropertySelect
                            label="Voice sample"
                            description={
                                catalogLoading
                                    ? 'Đang tải danh sách voice...'
                                    : voiceOptionsForLang.length === 0
                                        ? 'Không có voice sample khả dụng'
                                        : 'Giọng Saydi cho scene này'
                            }
                            value={selectedVoiceSample}
                            onChange={(value) => {
                                if (ttsSettings.provider !== 'saydi') {
                                    return;
                                }
                                onPatchTtsSettings({
                                    ...ttsSettings,
                                    voice_sample: value,
                                });
                            }}
                            options={voiceOptionsForLang.map((option) => ({
                                value: option.value,
                                label: option.label,
                            }))}
                            disabled={catalogLoading || voiceOptionsForLang.length === 0}
                        />
                    </>
                ) : (
                    <InspectorPropertySelect
                        label="Voice code"
                        description={
                            catalogLoading
                                ? 'Đang tải danh sách voice...'
                                : vbeeVoiceOptions.length === 0
                                    ? 'Không có voice code khả dụng'
                                    : 'Giọng Vbee cho scene này'
                        }
                        value={selectedVbeeVoiceCode}
                        onChange={(value) => {
                            if (ttsSettings.provider !== 'vbee') {
                                return;
                            }
                            onPatchTtsSettings({
                                ...ttsSettings,
                                voice_code: value,
                            });
                        }}
                        options={vbeeVoiceOptions.map((option) => ({
                            value: option.value,
                            label: option.label,
                        }))}
                        disabled={catalogLoading || vbeeVoiceOptions.length === 0}
                    />
                )}
            </InspectorPropertyGroup>

            <InspectorPropertyGroup title="Âm lượng" collapsible={false}>
                <InspectorPropertyVolume
                    label="Voiceover"
                    description="Âm lượng lời thoại trên track narration"
                    valuePercent={narrationVolumePercent}
                    onChange={onNarrationVolumeChange}
                />
            </InspectorPropertyGroup>

            <InspectorPropertyGroup title="Trạng thái output" defaultExpanded={false}>
                <InspectorPropertyReadonly
                    label="Audio"
                    value={hasAudio ? 'Đã render' : 'Chưa có'}
                    href={hasAudio ? audioUrl : undefined}
                />
                <InspectorPropertyReadonly
                    label="Karaoke sync"
                    value={hasWhisper ? `${wordsCount} từ` : 'Chưa có'}
                />
                <InspectorPropertyReadonly
                    label="Thời lượng"
                    value={`${durationSec}s`}
                />
            </InspectorPropertyGroup>
        </InspectorPanelBody>
    );
}

type NarrationInspectorProps = {
    manifest: ShortVideoRenderManifest;
    scene: ShortVideoRenderManifest['scenes'][number];
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onSave?: () => void;
    onRenderAudio?: () => void;
    onSceneLayoutChange?: (
        sceneId: string,
        patch: Partial<ShortVideoManifestSceneLayout>
    ) => void;
    onResetLayoutGroup?: (
        sceneId: string,
        keys: (keyof ShortVideoManifestSceneLayout)[]
    ) => void;
    saving?: boolean;
    rendering?: boolean;
    dirty?: boolean;
};

function NarrationSceneInspector({
    manifest,
    scene,
    onManifestChange,
    onSave,
    onRenderAudio,
    onSceneLayoutChange = noopSceneLayoutChange,
    onResetLayoutGroup = noopResetLayoutGroup,
    saving = false,
    rendering = false,
    dirty = false,
}: NarrationInspectorProps) {
    const [activeTab, setActiveTab] = React.useState<number>(NARRATION_TAB.content);
    const [langOptions, setLangOptions] = React.useState<SaydiTtsSelectOption[]>([]);
    const [voiceSampleOptions, setVoiceSampleOptions] = React.useState<SaydiTtsSelectOption[]>([]);
    const [vbeeVoiceOptions, setVbeeVoiceOptions] = React.useState<VbeeTtsSelectOption[]>([]);
    const [catalogLoading, setCatalogLoading] = React.useState(true);
    const [vbeeCredits, setVbeeCredits] = React.useState<VbeeTtsAccountCredits | null>(null);
    const [vbeeCreditsLoading, setVbeeCreditsLoading] = React.useState(false);
    const [vbeeCreditsError, setVbeeCreditsError] = React.useState('');
    const hasAudio = Boolean(scene.audio_url?.trim());
    const hasWhisper = Array.isArray(scene.words) && scene.words.length > 0;
    const pending = !hasAudio || !hasWhisper;
    const voiceoverTrimmed = scene.voiceover?.trim() || '';
    const ttsSettings = resolveSceneAudioTtsSettings(scene, manifest.lang);

    const refreshVbeeCredits = React.useCallback(() => {
        setVbeeCreditsLoading(true);
        setVbeeCreditsError('');
        fetchVbeeTtsAccountCredits()
            .then((result) => {
                setVbeeCredits(result.credits ?? null);
            })
            .catch((err: unknown) => {
                setVbeeCredits(null);
                setVbeeCreditsError(
                    err instanceof Error ? err.message : 'Không tải được credit Vbee'
                );
            })
            .finally(() => {
                setVbeeCreditsLoading(false);
            });
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        setCatalogLoading(true);

        if (ttsSettings.provider === 'vbee') {
            refreshVbeeCredits();
        } else {
            setVbeeCredits(null);
            setVbeeCreditsError('');
            setVbeeCreditsLoading(false);
        }

        const loadCatalog = ttsSettings.provider === 'vbee'
            ? fetchVbeeTtsCatalog().then((result) => {
                if (cancelled) {
                    return;
                }
                setVbeeVoiceOptions(Array.isArray(result.voice_codes) ? result.voice_codes : []);
                setLangOptions([]);
                setVoiceSampleOptions([]);
            })
            : fetchSaydiTtsCatalog().then((result) => {
                if (cancelled) {
                    return;
                }
                setLangOptions(Array.isArray(result.languages) ? result.languages : []);
                setVoiceSampleOptions(Array.isArray(result.voice_samples) ? result.voice_samples : []);
                setVbeeVoiceOptions([]);
            });

        loadCatalog
            .catch(() => {
                if (!cancelled) {
                    setLangOptions([]);
                    setVoiceSampleOptions([]);
                    setVbeeVoiceOptions([]);
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
    }, [ttsSettings.provider, refreshVbeeCredits]);

    const selectedLangCode = React.useMemo(() => {
        if (ttsSettings.provider !== 'saydi') {
            return 'vi';
        }
        const current = ttsSettings.lang_code?.trim() || '';
        if (langOptions.some((option) => option.value === current)) {
            return current;
        }
        if (langOptions.length > 0) {
            return langOptions[0].value;
        }
        return current || 'vi';
    }, [ttsSettings, langOptions]);

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
        if (ttsSettings.provider !== 'saydi') {
            return '';
        }
        const current = ttsSettings.voice_sample?.trim() || '';
        if (voiceOptionsForLang.some((option) => option.value === current)) {
            return current;
        }
        if (voiceOptionsForLang.length > 0) {
            return voiceOptionsForLang[0].value;
        }
        return current;
    }, [ttsSettings, voiceOptionsForLang]);

    const selectedVbeeVoiceCode = React.useMemo(() => {
        if (ttsSettings.provider !== 'vbee') {
            return '';
        }
        const current = ttsSettings.voice_code?.trim() || '';
        if (vbeeVoiceOptions.some((option) => option.value === current)) {
            return current;
        }
        if (vbeeVoiceOptions.length > 0) {
            return vbeeVoiceOptions[0].value;
        }
        return current || 's_sg_male_thientam_ytstable_vc';
    }, [ttsSettings, vbeeVoiceOptions]);

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
        (nextSettings: ShortVideoSceneAudioTtsSettings) => {
            patchScene({
                audio_tts_settings: nextSettings,
            });
        },
        [patchScene]
    );

    const handleProviderChange = React.useCallback((provider: 'saydi' | 'vbee') => {
        if (provider === 'vbee') {
            patchTtsSettings(resolveDefaultVbeeSceneAudioTtsSettings());
            return;
        }
        patchTtsSettings(resolveDefaultSceneAudioTtsSettings(manifest.lang));
    }, [manifest.lang, patchTtsSettings]);

    return (
        <Box sx={INSPECTOR_SHELL_SX} className="custom_scroll">
            <Box sx={INSPECTOR_SHELL_CONTENT_SX}>
                <Tabs
                    value={activeTab}
                    onChange={(_event, next) => setActiveTab(next)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 36,
                        mb: 1.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTabs-indicator': {
                            height: 2,
                            borderRadius: 1,
                        },
                    }}
                >
                    <Tab label="Nội dung" sx={INSPECTOR_TAB_SX} />
                    <Tab label="Hiển thị" sx={INSPECTOR_TAB_SX} />
                </Tabs>
            </Box>

            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                {activeTab === NARRATION_TAB.content ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {pending ? (
                            <Chip size="small" color="warning" label="Chưa có audio" sx={{ alignSelf: 'flex-start' }} />
                        ) : (
                            <Chip size="small" color="success" label="Sẵn sàng" sx={{ alignSelf: 'flex-start' }} />
                        )}
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
                                    sx={{ display: 'block', textAlign: 'center' }}
                                >
                                    Cần nhập voiceover trước khi render
                                </Typography>
                            ) : null}
                        </InspectorSection>

                        <NarrationAudioSettingsPanel
                            ttsSettings={ttsSettings}
                            catalogLoading={catalogLoading}
                            langOptions={langOptions}
                            voiceOptionsForLang={voiceOptionsForLang}
                            vbeeVoiceOptions={vbeeVoiceOptions}
                            selectedLangCode={selectedLangCode}
                            selectedVoiceSample={selectedVoiceSample}
                            selectedVbeeVoiceCode={selectedVbeeVoiceCode}
                            hasAudio={hasAudio}
                            audioUrl={scene.audio_url?.trim() || ''}
                            hasWhisper={hasWhisper}
                            wordsCount={scene.words?.length ?? 0}
                            durationSec={scene.duration_sec}
                            narrationVolumePercent={audioVolumePercent(resolveSceneAudioVolume(scene))}
                            onNarrationVolumeChange={(percent) => {
                                patchScene({ audio_volume: audioVolumeFromPercent(percent) });
                            }}
                            vbeeCredits={vbeeCredits}
                            vbeeCreditsLoading={vbeeCreditsLoading}
                            vbeeCreditsError={vbeeCreditsError}
                            onProviderChange={handleProviderChange}
                            onPatchTtsSettings={patchTtsSettings}
                            onRefreshVbeeCredits={refreshVbeeCredits}
                        />

                        <Alert severity="info" sx={{ py: 0.5, alignItems: 'center' }}>
                            Sửa voiceover cần render lại audio. Sửa nhãn hoặc hiển thị thì bấm Lưu.
                        </Alert>
                    </Box>
                ) : null}

                {activeTab === NARRATION_TAB.display ? (
                    <ShortVideoSceneEditPanel
                        manifest={manifest}
                        selectedSceneId={scene.id}
                        onSceneLayoutChange={onSceneLayoutChange}
                        onResetLayoutGroup={onResetLayoutGroup}
                    />
                ) : null}
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
                    color="inherit"
                    fullWidth
                    size="medium"
                    disabled={!dirty || saving || rendering}
                    onClick={onSave}
                    sx={{
                        py: 1,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'divider',
                        '&:hover': {
                            bgcolor: 'grey.100',
                        },
                    }}
                >
                    {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
            </Box>
        </Box>
    );
}

type VisualClipMediaInspectorProps = {
    clip: ShortVideoVisualClip;
    imageValidationError: string;
    videoValidationError: string;
    dirty: boolean;
    saving: boolean;
    onSave?: () => void;
    onPatch: (patchData: Partial<ShortVideoVisualClip>) => void;
};

function VisualClipMediaInspector({
    clip,
    imageValidationError,
    videoValidationError,
    dirty,
    saving,
    onSave,
    onPatch,
}: VisualClipMediaInspectorProps) {
    const [visualTab, setVisualTab] = React.useState<number>(VISUAL_CLIP_TAB.properties);
    const visualType: 'image' | 'video' = clip.type === 'video' ? 'video' : 'image';
    const imageUrl = clip.image_ref ?? resolveVisualClipImageRef(clip);
    const videoUrl = clip.video_ref ?? resolveVisualClipVideoRef(clip);
    const motion = clip.motion || 'pop';
    const youtubeId = resolveVisualClipYoutubeId(clip);

    const handleTypeChange = (
        _event: React.MouseEvent<HTMLElement>,
        next: 'image' | 'video' | null
    ) => {
        if (!next) {
            return;
        }
        onPatch({
            type: next,
            visual_playback_url: undefined,
            visual_start_sec: next === 'image' ? undefined : clip.visual_start_sec,
        });
    };

    const handleImageUrlChange = (value: string) => {
        onPatch({
            image_ref: value.trim() || undefined,
            visual_playback_url: undefined,
        });
    };

    const handleVideoUrlChange = (value: string) => {
        const trimmed = value.trim();
        const parsedYoutubeId = parseYoutubeId(trimmed);
        onPatch({
            video_ref: trimmed || undefined,
            video_preview_url: trimmed ? clip.video_preview_url : undefined,
            visual_youtube_id: parsedYoutubeId ?? undefined,
            visual_playback_url: undefined,
        });
    };

    const handleStockVideoSelect = (url: string, previewUrl: string) => {
        const parsedYoutubeId = parseYoutubeId(url);
        onPatch({
            video_ref: url.trim(),
            video_preview_url: previewUrl.trim() || undefined,
            visual_youtube_id: parsedYoutubeId ?? undefined,
            visual_playback_url: undefined,
        });
    };

    return (
        <Box sx={INSPECTOR_SHELL_SX} className="custom_scroll">
            <Box sx={INSPECTOR_SHELL_CONTENT_SX}>
                <InspectorPanelTabs
                    value={visualTab}
                    onChange={setVisualTab}
                    tabs={[
                        { label: 'Thuộc tính' },
                        { label: 'Bố cục' },
                        { label: 'Hiệu ứng' },
                    ]}
                />

                <InspectorPanelBody>
                    {visualTab === VISUAL_CLIP_TAB.properties ? (
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
                            startSec={clip.visual_start_sec ?? 0}
                            onStartSecChange={(raw) => {
                                if (raw.trim() === '') {
                                    onPatch({ visual_start_sec: undefined });
                                    return;
                                }
                                const parsed = Number.parseFloat(raw);
                                if (!Number.isFinite(parsed)) {
                                    return;
                                }
                                onPatch({ visual_start_sec: Math.max(0, parsed) });
                            }}
                            audioVolumePercent={resolveVisualMediaVolumePercent(clip)}
                            onAudioVolumePercentChange={(percent) => {
                                onPatch(patchVisualClipAudioVolumeFromPercent(percent));
                            }}
                        />
                    ) : null}

                    {visualTab === VISUAL_CLIP_TAB.layout ? (
                        <ShortVideoVisualLayoutFields clip={clip} onPatch={onPatch} />
                    ) : null}

                    {visualTab === VISUAL_CLIP_TAB.animation ? (
                        <InspectorPropertyGroup title="Chuyển động" collapsible={false}>
                            <InspectorPropertySelect
                                label="Hiệu ứng vào"
                                description="Cách media xuất hiện trên màn hình"
                                value={motion}
                                onChange={(value) => onPatch({ motion: value })}
                                options={[...VISUAL_CLIP_MOTION_OPTIONS]}
                            />
                        </InspectorPropertyGroup>
                    ) : null}
                </InspectorPanelBody>
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

export default function ShortVideoVisualClipInspector({
    manifest,
    clipId,
    sceneId = '',
    onManifestChange,
    onSave,
    onRenderAudio,
    onSceneLayoutChange,
    onResetLayoutGroup,
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

    const imageUrl = clip?.image_ref ?? (clip ? resolveVisualClipImageRef(clip) : '');
    const videoUrl = clip?.video_ref ?? (clip ? resolveVisualClipVideoRef(clip) : '');

    const imageValidationError = React.useMemo(() => {
        const trimmed = imageUrl.trim();
        if (!trimmed) {
            return 'Cần nhập URL';
        }
        return isHttpsImageUrl(trimmed) ? '' : 'URL ảnh phải bắt đầu bằng https://';
    }, [imageUrl]);

    const videoValidationError = React.useMemo(() => {
        const trimmed = videoUrl.trim();
        if (!trimmed) {
            return 'Cần nhập URL';
        }
        return isValidVideoRef(trimmed) ? '' : 'URL video không hợp lệ (YouTube hoặc mp4/webm HTTPS)';
    }, [videoUrl]);

    if (!clip && !scene) {
        return <EmptyInspector />;
    }

    if (!clip && scene) {
        return (
            <NarrationSceneInspector
                manifest={manifest}
                scene={scene}
                onManifestChange={onManifestChange}
                onSave={onSave}
                onRenderAudio={onRenderAudio}
                onSceneLayoutChange={onSceneLayoutChange}
                onResetLayoutGroup={onResetLayoutGroup}
                saving={saving}
                rendering={rendering}
                dirty={dirty}
            />
        );
    }

    if (!clip) {
        return null;
    }

    return (
        <VisualClipMediaInspector
            clip={clip}
            imageValidationError={imageValidationError}
            videoValidationError={videoValidationError}
            dirty={dirty}
            saving={saving}
            onSave={onSave}
            onPatch={patch}
        />
    );
}
