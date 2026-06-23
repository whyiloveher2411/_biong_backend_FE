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
    ToggleButton,
    ToggleButtonGroup,
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
} from 'helpers/shortVideoRenderManifest';
import type { ShortVideoSceneAudioTtsSettings } from 'helpers/shortVideoRenderManifest';
import { updateVisualClipInManifest } from 'helpers/shortVideoVisualClips';
import {
    resolveVisualClipYoutubeId,
} from 'helpers/shortVideoVisualClips';
import { isHttpsImageUrl, parseYoutubeId } from 'helpers/shortVideoYoutube';
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
import {
    InspectorPanelBody,
    InspectorPanelTabs,
    InspectorPropertyGroup,
    InspectorPropertyReadonly,
    InspectorPropertyRow,
    InspectorPropertySelect,
    InspectorPropertySwitch,
    InspectorPropertyText,
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
    animation: 1,
} as const;

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

    const sceneIndex = manifest.scenes.findIndex((item) => item.id === scene.id);
    const sceneTitle = sceneIndex >= 0
        ? `Scene ${sceneIndex + 1} · ${scene.id}`
        : scene.id;

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
            <Box sx={{ px: 2, pt: 2, pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {sceneTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Chỉnh nội dung và hiển thị
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
                    variant="scrollable"
                    scrollButtons="auto"
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
                    <Tab label="Hiển thị" sx={INSPECTOR_TAB_SX} />
                </Tabs>
            </Box>

            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                {activeTab === NARRATION_TAB.content ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
    validationError: string;
    dirty: boolean;
    saving: boolean;
    onSave?: () => void;
    onPatch: (patchData: Partial<ShortVideoVisualClip>) => void;
};

function VisualClipMediaInspector({
    clip,
    validationError,
    dirty,
    saving,
    onSave,
    onPatch,
}: VisualClipMediaInspectorProps) {
    const [visualTab, setVisualTab] = React.useState<number>(VISUAL_CLIP_TAB.properties);
    const visualType: 'image' | 'video' = clip.type === 'video' ? 'video' : 'image';
    const urlValue = clip.ref ?? '';
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

    const handleUrlChange = (value: string) => {
        const trimmed = value.trim();
        if (visualType === 'video') {
            const parsedYoutubeId = parseYoutubeId(trimmed);
            onPatch({
                ref: trimmed,
                visual_youtube_id: parsedYoutubeId ?? undefined,
                visual_playback_url: undefined,
            });
            return;
        }
        onPatch({
            ref: trimmed,
            visual_playback_url: undefined,
        });
    };

    return (
        <Box sx={INSPECTOR_SHELL_SX} className="custom_scroll">
            <Box sx={{ px: 2, pt: 2, pb: 0 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Visual clip
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {clip.label || clip.id}
                </Typography>

                <InspectorPanelTabs
                    value={visualTab}
                    onChange={setVisualTab}
                    tabs={[
                        { label: 'Thuộc tính' },
                        { label: 'Hiệu ứng' },
                    ]}
                />
            </Box>

            <Box sx={{ px: 2, pb: 1.5 }}>
                <InspectorPanelBody>
                    {visualTab === VISUAL_CLIP_TAB.properties ? (
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
                                        error={Boolean(validationError)}
                                        helperText={validationError || 'URL public https://'}
                                    />
                                    {visualType === 'video' && youtubeId ? (
                                        <InspectorPropertyReadonly
                                            label="YouTube ID"
                                            value={youtubeId}
                                        />
                                    ) : null}
                                    {validationError ? (
                                        <Box sx={{ px: 0.25, pb: 1 }}>
                                            <Alert severity="warning" sx={{ py: 0.5 }}>
                                                {validationError}
                                            </Alert>
                                        </Box>
                                    ) : null}
                            </InspectorPropertyGroup>

                            {visualType === 'video' ? (
                                <InspectorPropertyGroup title="Phát lại video">
                                    <InspectorPropertyText
                                        label="Vị trí bắt đầu"
                                        description="Giây bắt đầu trong file đã tải"
                                        value={String(clip.visual_start_sec ?? 0)}
                                        type="number"
                                        onChange={(raw) => {
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
                                        inputProps={{ min: 0, step: 0.1 }}
                                    />
                                    <InspectorPropertySwitch
                                        label="Phát tiếng YouTube"
                                        description="Tắt để chỉ dùng audio voiceover"
                                        checked={clip.visual_youtube_muted === false}
                                        onChange={(checked) => {
                                            onPatch({
                                                visual_youtube_muted: checked ? false : true,
                                            });
                                        }}
                                    />
                                </InspectorPropertyGroup>
                            ) : null}
                        </>
                    ) : null}

                    {visualTab === VISUAL_CLIP_TAB.animation ? (
                        <InspectorPropertyGroup title="Chuyển động">
                            <InspectorPropertySelect
                                label="Hiệu ứng vào"
                                description="Cách media xuất hiện trên màn hình"
                                value={motion}
                                onChange={(value) => onPatch({ motion: value })}
                                options={[
                                    { value: 'pop', label: 'Pop' },
                                    { value: 'fade', label: 'Fade' },
                                ]}
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

    const visualType: 'image' | 'video' = clip?.type === 'video' ? 'video' : 'image';
    const urlValue = clip?.ref ?? '';

    const validationError = React.useMemo(() => {
        if (!clip) {
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
            validationError={validationError}
            dirty={dirty}
            saving={saving}
            onSave={onSave}
            onPatch={patch}
        />
    );
}
