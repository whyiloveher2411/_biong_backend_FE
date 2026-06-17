import React, { Suspense } from 'react';
import type { PlayerRef } from '@remotion/player';
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Typography,
} from '@mui/material';
import Button from 'components/atoms/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import useAjax from 'hook/useApi';
import {
    buildShortVideoRenderManifest,
    generateShortVideoSceneAudioVieneu,
    refreshShortVideoRenderManifest,
    resolveShortVideoSceneVisual,
    saveShortVideoRenderManifest,
} from 'helpers/marketingShortVideoManifestApi';
import {
    applyShortVideoTemplateToManifest,
    clearSceneLayoutKeysInManifest,
    getShortVideoRenderTemplate,
    injectSceneVisualPlaybackUrl,
    parseShortVideoRenderManifest,
    reinjectVisualPlaybackFromCache,
    resolveSceneActiveColor,
    resolveSceneHeadlineColor,
    resolveSceneHeadlineText,
    resolveSceneShowHeadline,
    resolveSceneShowKaraoke,
    resolveSceneTextColor,
    resolveSceneVisualType,
    resolveSceneVisualYoutubeId,
    sanitizeManifestForPersist,
    sceneBackgroundColor,
    updateSceneLayoutInManifest,
    type ShortVideoManifestScene,
    type ShortVideoManifestSceneLayout,
    type ShortVideoRenderManifest,
    type ShortVideoTemplateApplyMode,
} from 'helpers/shortVideoRenderManifest';
import {
    parseShortVideoSceneAudioMap,
    parseShortVideoScriptScenes,
    type ShortVideoScriptScene,
} from 'helpers/shortVideoScriptScenes';
import {
    buildShortVideoRenderJsonSceneWordsMap,
    shortVideoRenderJsonHasWhisperWords,
    type ShortVideoRenderWord,
} from 'helpers/shortVideoRenderJson';
import { buildVoiceoverPlaybackWordTimings } from 'helpers/shortVideoVoiceoverTimings';
import { SHORT_VIDEO_RENDER_API_PATH } from 'helpers/marketingShortVideoRenderWorkflow';
import {
    injectVisualClipPlaybackUrl,
    manifestUsesVisualClips,
    resolveVisualClipYoutubeId,
} from 'helpers/shortVideoVisualClips';
import { mergeRefreshedNarrationManifest } from 'helpers/shortVideoTimelineAdapter';
import {
    shortVideoTimelineDebug,
    summarizeManifestLayout,
} from 'helpers/shortVideoTimelineDebug';
import ShortVideoVoiceoverKaraoke from './ShortVideoVoiceoverKaraoke';
import ShortVideoSceneEditDrawer from './ShortVideoSceneEditDrawer';
import ShortVideoGlobalSettingsDrawer, {
    ShortVideoGlobalSettingsIcon,
} from './ShortVideoGlobalSettingsDrawer';
import ShortVideoVisualClipInspector from './ShortVideoVisualClipInspector';

/** Tạm ẩn banner manifest info — bật lại khi cần. */
const SHOW_MANIFEST_INFO_BANNER = false;

/** Nút header drawer chính — tách màu theo vai trò trên nền primary. */
const MAIN_HEADER_REFRESH_BTN_SX = {
    color: 'common.white',
    bgcolor: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: 'none',
    '&:hover': {
        bgcolor: 'rgba(255,255,255,0.24)',
        borderColor: 'common.white',
    },
    '&.Mui-disabled': {
        color: 'rgba(255,255,255,0.45)',
        bgcolor: 'rgba(255,255,255,0.08)',
        borderColor: 'rgba(255,255,255,0.25)',
    },
} as const;

const MAIN_HEADER_RENDER_BTN_SX = {
    color: 'grey.900',
    bgcolor: 'warning.main',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    '&:hover': {
        bgcolor: 'warning.dark',
        color: 'grey.900',
    },
    '&.Mui-disabled': {
        color: 'rgba(0,0,0,0.38)',
        bgcolor: 'rgba(255,255,255,0.3)',
    },
} as const;

const MAIN_HEADER_VIDEO_BTN_SX = {
    color: 'common.white',
    bgcolor: 'success.main',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    '&:hover': {
        bgcolor: 'success.dark',
    },
} as const;

const loadRemotionPlayerModule = () => import('./ShortVideoRemotionPlayer');

const ShortVideoRemotionPreview = React.lazy(() =>
    loadRemotionPlayerModule().then((mod) => ({
        default: mod.ShortVideoRemotionPreview,
    }))
);

const ShortVideoEditorTimeline = React.lazy(() => import('./ShortVideoEditorTimeline'));

type Props = {
    open: boolean;
    onClose: () => void;
    data: CreatePostTypeData;
    onRefreshPost?: () => void;
};

type DetailPost = Record<string, unknown>;

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') {
        return 'Yêu cầu thất bại';
    }
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') {
        return r.message;
    }
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return r.message.content;
    }
    return 'Yêu cầu thất bại';
}

function sceneHasScriptContent(scene: {
    voiceover?: string;
    on_screen_text?: string;
}): boolean {
    const voiceover = scene.voiceover?.trim() || '';
    const onScreenText = scene.on_screen_text?.trim() || '';
    return voiceover.length > 0 || onScreenText.length > 0;
}

function allContentScenesHaveAudio(
    scenes: ShortVideoScriptScene[],
    sceneAudioMap: ReturnType<typeof parseShortVideoSceneAudioMap>
): boolean {
    if (scenes.length === 0) {
        return false;
    }
    return scenes.every((scene) => {
        if (!sceneHasScriptContent(scene)) {
            return true;
        }
        const url = sceneAudioMap[scene.id]?.url?.trim() || '';
        return url.length > 0;
    });
}

function manifestReadyForRender(manifest: ShortVideoRenderManifest): boolean {
    if (manifest.scenes.length === 0) {
        return false;
    }
    return manifest.scenes.every((scene) => {
        if (!sceneHasScriptContent(scene)) {
            return true;
        }
        return sceneIsReadyForPlayback(scene);
    });
}

function manifestFingerprint(manifest: ShortVideoRenderManifest): string {
    return JSON.stringify(sanitizeManifestForPersist(manifest));
}

function sceneContentFingerprint(scene: ShortVideoManifestScene): string {
    return JSON.stringify({
        voiceover: scene.voiceover?.trim() || '',
        on_screen_text: scene.on_screen_text?.trim() || '',
    });
}

function buildSceneFingerprintMap(manifest: ShortVideoRenderManifest): Record<string, string> {
    return manifest.scenes.reduce<Record<string, string>>((acc, scene) => {
        acc[scene.id] = sceneContentFingerprint(scene);
        return acc;
    }, {});
}

function sceneIsReadyForPlayback(scene?: ShortVideoManifestScene): boolean {
    if (!scene) {
        return false;
    }
    return Boolean(scene.audio_url?.trim()) && Array.isArray(scene.words) && scene.words.length > 0;
}

function isKeyboardEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
    }
    if (target.isContentEditable) {
        return true;
    }
    return Boolean(target.closest('[contenteditable="true"]'));
}

function manifestSceneForPreview(
    scriptScene: ShortVideoScriptScene,
    manifest: ShortVideoRenderManifest
): ShortVideoManifestScene {
    const matched = manifest.scenes.find((item) => item.id === scriptScene.id);
    if (matched) {
        return matched;
    }
    return {
        id: scriptScene.id,
        voiceover: scriptScene.voiceover,
        on_screen_text: scriptScene.on_screen_text,
        duration_hint_sec: scriptScene.duration_hint_sec,
        visual: scriptScene.visual,
        audio_url: '',
        duration_sec: 0,
        start_offset_sec: 0,
        words: [],
    };
}

function resolveSceneListPreviewStyles({
    scriptScene,
    manifest,
}: {
    scriptScene: ShortVideoScriptScene;
    manifest: ShortVideoRenderManifest | null;
}) {
    if (!manifest) {
        return {
            backgroundColor: '#000000',
            headlineColor: '#FFFFFF',
            textColor: '#FFFFFF',
            activeColor: '#E53935',
            showHeadline: true,
            showKaraoke: true,
            headlineText: scriptScene.on_screen_text.trim(),
        };
    }
    const previewScene = manifestSceneForPreview(scriptScene, manifest);
    return {
        backgroundColor: sceneBackgroundColor(previewScene, manifest),
        headlineColor: resolveSceneHeadlineColor(previewScene, manifest),
        textColor: resolveSceneTextColor(previewScene, manifest),
        activeColor: resolveSceneActiveColor(previewScene, manifest),
        showHeadline: resolveSceneShowHeadline(previewScene),
        showKaraoke: resolveSceneShowKaraoke(previewScene),
        headlineText: resolveSceneHeadlineText(previewScene),
    };
}

export default function ShortVideoEditDrawer({
    open,
    onClose,
    data,
    onRefreshPost,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const shortVideoId = Number(data?.post?.id || 0);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [post, setPost] = React.useState<DetailPost>({});
    const [selectedSceneId, setSelectedSceneId] = React.useState('');
    const [manifest, setManifest] = React.useState<ShortVideoRenderManifest | null>(null);
    const [manifestLoading, setManifestLoading] = React.useState(false);
    const [manifestError, setManifestError] = React.useState('');
    const [manifestInfo, setManifestInfo] = React.useState('');
    const [manifestRefreshing, setManifestRefreshing] = React.useState(false);
    const [manifestSaving, setManifestSaving] = React.useState(false);
    const [sceneEditId, setSceneEditId] = React.useState('');
    const [selectedVisualClipId, setSelectedVisualClipId] = React.useState('');
    const [globalSettingsOpen, setGlobalSettingsOpen] = React.useState(false);
    const [videoRendering, setVideoRendering] = React.useState(false);
    const [savingActivityCount, setSavingActivityCount] = React.useState(0);
    const [narrationRunningSceneIds, setNarrationRunningSceneIds] = React.useState<string[]>([]);
    const savedManifestFingerprintRef = React.useRef('');
    const savedSceneFingerprintMapRef = React.useRef<Record<string, string>>({});
    const pollingAbortRef = React.useRef(false);
    const remotionPlayerRef = React.useRef<PlayerRef | null>(null);
    const [remotionPlayerInstance, setRemotionPlayerInstance] = React.useState<PlayerRef | null>(null);
    const visualResolveCacheRef = React.useRef<Record<string, string>>({});
    const visualResolveFailedRef = React.useRef<Record<string, string>>({});
    const manifestRef = React.useRef<ShortVideoRenderManifest | null>(null);
    const manifestInitialResolveDoneRef = React.useRef(false);
    const visualResolveDebounceRef = React.useRef<Record<string, number>>({});
    const timelineSaveChainRef = React.useRef<Promise<void>>(Promise.resolve());
    const pendingTimelineSaveManifestRef = React.useRef<ShortVideoRenderManifest | null>(null);
    const savingActivityCountRef = React.useRef(0);

    manifestRef.current = manifest;

    const beginSavingActivity = React.useCallback(() => {
        savingActivityCountRef.current += 1;
        setSavingActivityCount(savingActivityCountRef.current);
    }, []);

    const endSavingActivity = React.useCallback(() => {
        savingActivityCountRef.current = Math.max(0, savingActivityCountRef.current - 1);
        setSavingActivityCount(savingActivityCountRef.current);
    }, []);

    const clearVisualResolveCacheForScene = React.useCallback((sceneId: string) => {
        const prefix = `${sceneId}:`;
        Object.keys(visualResolveCacheRef.current).forEach((key) => {
            if (key.startsWith(prefix)) {
                delete visualResolveCacheRef.current[key];
            }
        });
        Object.keys(visualResolveFailedRef.current).forEach((key) => {
            if (key.startsWith(prefix)) {
                delete visualResolveFailedRef.current[key];
            }
        });
    }, []);

    const scenes = React.useMemo(
        () => parseShortVideoScriptScenes(post.script_json),
        [post.script_json]
    );
    const sceneAudioMap = React.useMemo(
        () => parseShortVideoSceneAudioMap(post.scene_audio_json),
        [post.scene_audio_json]
    );
    const renderSceneWordsMap = React.useMemo(
        () => buildShortVideoRenderJsonSceneWordsMap(post.render_json),
        [post.render_json]
    );
    const hasScriptContent = scenes.length > 0;
    const scenesReadyForRender = React.useMemo(
        () => allContentScenesHaveAudio(scenes, sceneAudioMap),
        [scenes, sceneAudioMap]
    );
    const manifestRenderReady = React.useMemo(
        () => (manifest ? manifestReadyForRender(manifest) : false),
        [manifest]
    );

    React.useEffect(() => {
        if (!open || !hasScriptContent || !manifest || manifestLoading) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code !== 'Space' && event.key !== ' ') {
                return;
            }
            if (event.repeat || isKeyboardEditableTarget(event.target)) {
                return;
            }
            if (!remotionPlayerRef.current) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            remotionPlayerRef.current.toggle();
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [open, hasScriptContent, manifest, manifestLoading]);

    const manifestDirty = React.useMemo(() => {
        if (!manifest) {
            return false;
        }
        return manifestFingerprint(manifest) !== savedManifestFingerprintRef.current;
    }, [manifest]);

    const videoUrl = React.useMemo(() => {
        const raw = post.video_url;
        if (typeof raw === 'string') {
            return raw.trim();
        }
        return '';
    }, [post.video_url]);

    const handleOpenFinalVideo = React.useCallback(() => {
        if (!videoUrl) {
            return;
        }
        window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }, [videoUrl]);

    React.useEffect(() => {
        if (!open || shortVideoId <= 0) {
            return;
        }
        setLoading(true);
        setError('');
        apiAjaxRef.current({
            url: `post-type/detail/spacedev_app_short_video/${shortVideoId}`,
            method: 'POST',
            loading: false,
            success: (result: { post?: DetailPost }) => {
                setLoading(false);
                setPost(result?.post && typeof result.post === 'object' ? result.post : {});
            },
            error: (err: unknown) => {
                setLoading(false);
                setError(parseApiMessage(err));
                setPost({});
            },
        });
    }, [open, shortVideoId]);

    React.useEffect(() => {
        pollingAbortRef.current = !open;
    }, [open]);

    React.useEffect(() => {
        if (!open) {
            setSelectedSceneId('');
            setPost({});
            setError('');
            setManifest(null);
            setManifestError('');
            setManifestInfo('');
            savedManifestFingerprintRef.current = '';
            setSceneEditId('');
            setSelectedVisualClipId('');
            setGlobalSettingsOpen(false);
            setNarrationRunningSceneIds([]);
            pollingAbortRef.current = true;
            remotionPlayerRef.current = null;
            setRemotionPlayerInstance(null);
            manifestInitialResolveDoneRef.current = false;
            Object.values(visualResolveDebounceRef.current).forEach((timerId) => {
                window.clearTimeout(timerId);
            });
            visualResolveDebounceRef.current = {};
            timelineSaveChainRef.current = Promise.resolve();
            pendingTimelineSaveManifestRef.current = null;
            savingActivityCountRef.current = 0;
            setSavingActivityCount(0);
            savedSceneFingerprintMapRef.current = {};
        }
    }, [open]);

    const applyManifestResult = React.useCallback(
        (nextManifest: ShortVideoRenderManifest | undefined, rebuilt?: boolean) => {
            const parsed = parseShortVideoRenderManifest(nextManifest);
            if (!parsed) {
                setManifest(null);
                savedManifestFingerprintRef.current = '';
                visualResolveCacheRef.current = {};
                return;
            }
            const withPlayback = reinjectVisualPlaybackFromCache(
                parsed,
                visualResolveCacheRef.current
            );
            setManifest(withPlayback);
            savedManifestFingerprintRef.current = manifestFingerprint(withPlayback);
            savedSceneFingerprintMapRef.current = buildSceneFingerprintMap(withPlayback);
            if (rebuilt) {
                visualResolveCacheRef.current = {};
                manifestInitialResolveDoneRef.current = false;
                setManifestInfo('Đang chạy whisper — manifest đã được làm mới');
            } else {
                setManifestInfo('');
            }
        },
        []
    );

    const resolveVisualForScene = React.useCallback(
        async (scene: ShortVideoManifestScene) => {
            if (shortVideoId <= 0) {
                return;
            }
            const youtubeId = resolveSceneVisualYoutubeId(scene);
            if (!youtubeId) {
                return;
            }
            const cacheKey = `${scene.id}:${youtubeId}`;
            if (visualResolveCacheRef.current[cacheKey]) {
                setManifest((prev) => {
                    if (!prev || prev.scenes.find((item) => item.id === scene.id)?.layout?.visual_playback_url) {
                        return prev;
                    }
                    return injectSceneVisualPlaybackUrl(
                        prev,
                        scene.id,
                        visualResolveCacheRef.current[cacheKey]
                    );
                });
                return;
            }
            if (visualResolveFailedRef.current[cacheKey]) {
                return;
            }
            try {
                const result = await resolveShortVideoSceneVisual({
                    shortVideoId,
                    youtubeId,
                    visualRef: scene.layout?.visual_ref,
                });
                const playbackUrl = result.playback_url?.trim() || '';
                if (!playbackUrl) {
                    return;
                }
                visualResolveCacheRef.current[cacheKey] = playbackUrl;
                delete visualResolveFailedRef.current[cacheKey];
                setManifest((prev) => {
                    if (!prev) {
                        return prev;
                    }
                    return injectSceneVisualPlaybackUrl(prev, scene.id, playbackUrl);
                });
                setManifestInfo('');
            } catch (err: unknown) {
                const message =
                    err instanceof Error
                        ? err.message
                        : 'Không resolve được video YouTube cho preview';
                visualResolveFailedRef.current[cacheKey] = message;
                setManifestInfo(
                    `Scene ${scene.id}: ${message}. Preview Remotion dùng thumbnail YouTube; render MP4 vẫn chạy trên server.`
                );
            }
        },
        [shortVideoId]
    );

    const resolveVisualForClip = React.useCallback(
        async (clipId: string, youtubeId: string) => {
            if (shortVideoId <= 0) {
                return;
            }
            const cacheKey = `clip:${clipId}:${youtubeId}`;
            if (visualResolveCacheRef.current[cacheKey]) {
                setManifest((prev) => {
                    if (!prev) {
                        return prev;
                    }
                    const clip = prev.visual_clips?.find((item) => item.id === clipId);
                    if (clip?.visual_playback_url?.trim()) {
                        return prev;
                    }
                    return injectVisualClipPlaybackUrl(
                        prev,
                        clipId,
                        visualResolveCacheRef.current[cacheKey]
                    );
                });
                return;
            }
            if (visualResolveFailedRef.current[cacheKey]) {
                return;
            }
            try {
                const result = await resolveShortVideoSceneVisual({
                    shortVideoId,
                    youtubeId,
                });
                const playbackUrl = result.playback_url?.trim() || '';
                if (!playbackUrl) {
                    return;
                }
                visualResolveCacheRef.current[cacheKey] = playbackUrl;
                delete visualResolveFailedRef.current[cacheKey];
                setManifest((prev) => {
                    if (!prev) {
                        return prev;
                    }
                    return injectVisualClipPlaybackUrl(prev, clipId, playbackUrl);
                });
                setManifestInfo('');
            } catch (err: unknown) {
                const message =
                    err instanceof Error
                        ? err.message
                        : 'Không resolve được video YouTube cho preview';
                visualResolveFailedRef.current[cacheKey] = message;
                setManifestInfo(
                    `Clip ${clipId}: ${message}. Preview dùng thumbnail YouTube; render MP4 vẫn chạy trên server.`
                );
            }
        },
        [shortVideoId]
    );

    const scheduleResolveVisualForScene = React.useCallback(
        (sceneId: string) => {
            const existing = visualResolveDebounceRef.current[sceneId];
            if (existing) {
                window.clearTimeout(existing);
            }
            visualResolveDebounceRef.current[sceneId] = window.setTimeout(() => {
                delete visualResolveDebounceRef.current[sceneId];
                const current = manifestRef.current;
                const scene = current?.scenes.find((item) => item.id === sceneId);
                if (!scene || resolveSceneVisualType(scene) !== 'video') {
                    return;
                }
                void resolveVisualForScene(scene);
            }, 600);
        },
        [resolveVisualForScene]
    );

    React.useEffect(() => {
        if (!open || loading || shortVideoId <= 0 || !hasScriptContent) {
            return;
        }
        let cancelled = false;
        setManifestLoading(true);
        setManifestError('');
        buildShortVideoRenderManifest(shortVideoId)
            .then((result) => {
                if (cancelled) {
                    return;
                }
                applyManifestResult(result.manifest, result.rebuilt);
                if (Array.isArray(result.warnings) && result.warnings.length > 0) {
                    setManifestInfo(result.warnings.join(' · '));
                }
            })
            .catch((err: unknown) => {
                if (cancelled) {
                    return;
                }
                setManifest(null);
                savedManifestFingerprintRef.current = '';
                setManifestError(
                    err instanceof Error ? err.message : 'Không tải được manifest'
                );
            })
            .finally(() => {
                if (!cancelled) {
                    setManifestLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open, loading, shortVideoId, hasScriptContent, applyManifestResult]);

    React.useEffect(() => {
        if (!open || manifestLoading || !manifest || shortVideoId <= 0) {
            return;
        }
        if (manifestInitialResolveDoneRef.current) {
            return;
        }

        const usesClips = manifestUsesVisualClips(manifest);

        const pendingScenes = usesClips
            ? []
            : manifest.scenes.filter((scene) => {
                if (resolveSceneVisualType(scene) !== 'video') {
                    return false;
                }
                const youtubeId = resolveSceneVisualYoutubeId(scene);
                if (!youtubeId) {
                    return false;
                }
                if (scene.layout?.visual_playback_url?.trim()) {
                    return false;
                }
                const cacheKey = `${scene.id}:${youtubeId}`;
                if (visualResolveCacheRef.current[cacheKey]) {
                    return false;
                }
                if (visualResolveFailedRef.current[cacheKey]) {
                    return false;
                }
                return true;
            });

        const pendingClips = usesClips
            ? (manifest.visual_clips ?? []).filter((clip) => {
                if (clip.type !== 'video') {
                    return false;
                }
                const youtubeId = resolveVisualClipYoutubeId(clip);
                if (!youtubeId) {
                    return false;
                }
                if (clip.visual_playback_url?.trim()) {
                    return false;
                }
                const cacheKey = `clip:${clip.id}:${youtubeId}`;
                if (visualResolveCacheRef.current[cacheKey]) {
                    return false;
                }
                if (visualResolveFailedRef.current[cacheKey]) {
                    return false;
                }
                return true;
            })
            : [];

        manifestInitialResolveDoneRef.current = true;

        if (pendingScenes.length === 0 && pendingClips.length === 0) {
            return;
        }

        let cancelled = false;
        (async () => {
            for (const scene of pendingScenes) {
                if (cancelled) {
                    return;
                }
                await resolveVisualForScene(scene);
            }
            for (const clip of pendingClips) {
                if (cancelled) {
                    return;
                }
                const youtubeId = resolveVisualClipYoutubeId(clip);
                if (youtubeId) {
                    await resolveVisualForClip(clip.id, youtubeId);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, shortVideoId, manifestLoading, manifest, resolveVisualForScene, resolveVisualForClip]);

    const persistTimelineManifestAuto = React.useCallback(
        async (nextManifest: ShortVideoRenderManifest) => {
            if (shortVideoId <= 0) {
                return;
            }
            const nextFingerprint = manifestFingerprint(nextManifest);
            if (nextFingerprint === savedManifestFingerprintRef.current) {
                shortVideoTimelineDebug('EditDrawer', 'save.skip', { reason: 'same fingerprint' });
                return;
            }
            shortVideoTimelineDebug('EditDrawer', 'save.start', {
                layout: summarizeManifestLayout(nextManifest),
            });
            beginSavingActivity();
            try {
                await saveShortVideoRenderManifest(
                    shortVideoId,
                    sanitizeManifestForPersist(nextManifest)
                );
                savedManifestFingerprintRef.current = nextFingerprint;
                shortVideoTimelineDebug('EditDrawer', 'save.done', {});
            } catch (err: unknown) {
                shortVideoTimelineDebug('EditDrawer', 'save.error', {
                    message: err instanceof Error ? err.message : String(err),
                });
                setManifestError(
                    err instanceof Error ? err.message : 'Tự động lưu timeline thất bại'
                );
            } finally {
                endSavingActivity();
            }
        },
        [shortVideoId, beginSavingActivity, endSavingActivity]
    );

    const scheduleTimelineAutoSave = React.useCallback(
        (nextManifest: ShortVideoRenderManifest) => {
            pendingTimelineSaveManifestRef.current = nextManifest;
            timelineSaveChainRef.current = timelineSaveChainRef.current
                .catch(() => undefined)
                .then(async () => {
                    while (pendingTimelineSaveManifestRef.current) {
                        const toSave = pendingTimelineSaveManifestRef.current;
                        pendingTimelineSaveManifestRef.current = null;
                        await persistTimelineManifestAuto(toSave);
                    }
                });
        },
        [persistTimelineManifestAuto]
    );

    const applyManifestVisualChange = React.useCallback(
        (nextManifest: ShortVideoRenderManifest, source = 'unknown') => {
            shortVideoTimelineDebug('EditDrawer', 'setManifest', {
                source,
                layout: summarizeManifestLayout(nextManifest),
            });
            setManifest(nextManifest);
            (nextManifest.visual_clips ?? []).forEach((clip) => {
                if (clip.type !== 'video') {
                    return;
                }
                const youtubeId = resolveVisualClipYoutubeId(clip);
                if (!youtubeId || clip.visual_playback_url?.trim()) {
                    return;
                }
                void resolveVisualForClip(clip.id, youtubeId);
            });
        },
        [resolveVisualForClip]
    );

    const handleTimelineVisualChange = React.useCallback(
        (nextManifest: ShortVideoRenderManifest) => {
            applyManifestVisualChange(nextManifest, 'timeline');
            scheduleTimelineAutoSave(nextManifest);
        },
        [applyManifestVisualChange, scheduleTimelineAutoSave]
    );

    const handleInspectorVisualChange = React.useCallback(
        (nextManifest: ShortVideoRenderManifest) => {
            if (!selectedSceneId) {
                applyManifestVisualChange(nextManifest);
                return;
            }
            const savedFingerprint = savedSceneFingerprintMapRef.current[selectedSceneId] || '';
            const scene = nextManifest.scenes.find((item) => item.id === selectedSceneId);
            const changed = scene ? sceneContentFingerprint(scene) !== savedFingerprint : false;
            if (!changed) {
                applyManifestVisualChange(nextManifest);
                return;
            }
            const patchedManifest: ShortVideoRenderManifest = {
                ...nextManifest,
                scenes: nextManifest.scenes.map((item) => {
                    if (item.id !== selectedSceneId) {
                        return item;
                    }
                    return {
                        ...item,
                        audio_url: '',
                        words: [],
                    };
                }),
            };
            applyManifestVisualChange(patchedManifest);
        },
        [applyManifestVisualChange, selectedSceneId]
    );

    const handleSeekToScene = React.useCallback(
        (sceneId: string) => {
            setSelectedSceneId(sceneId);
            if (!manifest || !remotionPlayerRef.current) {
                return;
            }
            const scene = manifest.scenes.find((item) => item.id === sceneId);
            if (!scene) {
                return;
            }
            const fps = manifest.fps || 30;
            remotionPlayerRef.current.seekTo(Math.round(Math.max(0, scene.start_offset_sec) * fps));
        },
        [manifest]
    );

    const handleSceneLayoutChange = React.useCallback(
        (sceneId: string, patch: Partial<ShortVideoManifestSceneLayout>) => {
            const touchesVisual = (
                'visual_type' in patch
                || 'visual_ref' in patch
                || 'visual_youtube_id' in patch
                || 'show_visual' in patch
            );
            const touchesVideo = (
                patch.visual_type === 'video'
                || patch.visual_ref !== undefined
                || patch.visual_youtube_id !== undefined
            );
            if (touchesVisual) {
                clearVisualResolveCacheForScene(sceneId);
            }
            setManifest((prev) => {
                if (!prev) {
                    return prev;
                }
                return updateSceneLayoutInManifest(prev, sceneId, patch);
            });
            if (touchesVideo) {
                scheduleResolveVisualForScene(sceneId);
            }
        },
        [clearVisualResolveCacheForScene, scheduleResolveVisualForScene]
    );

    const handleResetSceneLayoutGroup = React.useCallback(
        (sceneId: string, keys: (keyof ShortVideoManifestSceneLayout)[]) => {
            setManifest((prev) => {
                if (!prev) {
                    return prev;
                }
                return clearSceneLayoutKeysInManifest(prev, sceneId, keys);
            });
        },
        []
    );

    const handleApplyGlobalTemplateAndSave = React.useCallback(
        async (templateId: string, mode: ShortVideoTemplateApplyMode) => {
            if (!manifest || shortVideoId <= 0) {
                return;
            }
            const nextManifest = applyShortVideoTemplateToManifest(
                manifest,
                templateId,
                mode
            );
            setManifestSaving(true);
            beginSavingActivity();
            setManifestError('');
            try {
                const result = await saveShortVideoRenderManifest(
                    shortVideoId,
                    sanitizeManifestForPersist(nextManifest)
                );
                applyManifestResult(result.manifest ?? nextManifest, false);
                setGlobalSettingsOpen(false);
            } catch (err: unknown) {
                setManifestError(
                    err instanceof Error ? err.message : 'Lưu manifest thất bại'
                );
            } finally {
                setManifestSaving(false);
                endSavingActivity();
            }
        },
        [manifest, shortVideoId, applyManifestResult, beginSavingActivity, endSavingActivity]
    );

    const activeTemplateLabel = React.useMemo(() => {
        if (!manifest?.template_id) {
            return '';
        }
        return getShortVideoRenderTemplate(manifest.template_id)?.label ?? '';
    }, [manifest?.template_id]);

    const pollManifestUntilScenesReady = React.useCallback(
        async (sceneIds: string[]) => {
            if (shortVideoId <= 0 || sceneIds.length === 0) {
                return;
            }
            const targetSet = new Set(sceneIds);
            const maxAttempts = 45;
            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                if (pollingAbortRef.current) {
                    break;
                }
                const refreshed = await refreshShortVideoRenderManifest(shortVideoId);
                const nextManifest = refreshed.manifest;
                if (nextManifest) {
                    const localBefore = manifestRef.current;
                    const merged = localBefore
                        ? mergeRefreshedNarrationManifest(localBefore, nextManifest)
                        : nextManifest;
                    applyManifestResult(merged, true);
                    const ready = sceneIds.every((sceneId) => {
                        const scene = merged.scenes.find((item) => item.id === sceneId);
                        return sceneIsReadyForPlayback(scene);
                    });
                    if (ready) {
                        break;
                    }
                }
                await new Promise((resolve) => window.setTimeout(resolve, 1800));
            }
            if (!pollingAbortRef.current) {
                setNarrationRunningSceneIds((prev) => prev.filter((id) => !targetSet.has(id)));
            }
        },
        [shortVideoId, applyManifestResult]
    );

    const runNarrationSceneQueue = React.useCallback(
        async (sceneIds: string[]) => {
            if (shortVideoId <= 0 || sceneIds.length === 0) {
                return;
            }
            const unique = Array.from(new Set(sceneIds));
            setNarrationRunningSceneIds((prev) => Array.from(new Set([...prev, ...unique])));
            for (const sceneId of unique) {
                if (pollingAbortRef.current) {
                    break;
                }
                try {
                    await generateShortVideoSceneAudioVieneu({
                        shortVideoId,
                        sceneId,
                        force: true,
                    });
                } catch (err) {
                    setManifestError(
                        err instanceof Error ? err.message : `Không thể tạo audio scene ${sceneId}`
                    );
                }
            }
            await pollManifestUntilScenesReady(unique);
        },
        [shortVideoId, pollManifestUntilScenesReady]
    );

    const handleSaveManifest = React.useCallback(async () => {
        if (!manifest || shortVideoId <= 0) {
            return;
        }
        const changedSceneIds = manifest.scenes
            .filter((scene) => {
                const savedFingerprint = savedSceneFingerprintMapRef.current[scene.id] || '';
                return sceneContentFingerprint(scene) !== savedFingerprint;
            })
            .map((scene) => scene.id);
        setManifestSaving(true);
        beginSavingActivity();
        setManifestError('');
        try {
            const result = await saveShortVideoRenderManifest(
                shortVideoId,
                sanitizeManifestForPersist(manifest),
                { changedSceneIds }
            );
            applyManifestResult(result.manifest ?? manifest, false);
            if (changedSceneIds.length > 0) {
                void runNarrationSceneQueue(changedSceneIds);
            }
        } catch (err: unknown) {
            setManifestError(
                err instanceof Error ? err.message : 'Lưu manifest thất bại'
            );
        } finally {
            setManifestSaving(false);
            endSavingActivity();
        }
    }, [
        manifest,
        shortVideoId,
        applyManifestResult,
        beginSavingActivity,
        endSavingActivity,
        runNarrationSceneQueue,
    ]);

    const handleRefreshManifest = React.useCallback(async () => {
        if (shortVideoId <= 0) {
            return;
        }
        const confirmed = window.confirm(
            'Làm mới manifest? Whisper sẽ chạy lại; background đã chỉnh sẽ được giữ.'
        );
        if (!confirmed) {
            return;
        }
        setManifestRefreshing(true);
        setManifestError('');
        setManifestInfo('Đang chạy whisper…');
        try {
            const result = await refreshShortVideoRenderManifest(shortVideoId);
            const localBefore = manifestRef.current;
            const merged = localBefore && result.manifest
                ? mergeRefreshedNarrationManifest(localBefore, result.manifest)
                : result.manifest;
            applyManifestResult(merged, true);
            if (Array.isArray(result.warnings) && result.warnings.length > 0) {
                setManifestInfo(result.warnings.join(' · '));
            }
        } catch (err: unknown) {
            setManifestInfo('');
            setManifestError(
                err instanceof Error ? err.message : 'Làm mới manifest thất bại'
            );
        } finally {
            setManifestRefreshing(false);
        }
    }, [shortVideoId, applyManifestResult]);

    const handleOpenSceneEdit = React.useCallback((sceneId: string) => {
        setSelectedSceneId(sceneId);
        setSceneEditId(sceneId);
        handleSeekToScene(sceneId);
    }, [handleSeekToScene]);

    const handleCloseSceneEdit = React.useCallback(() => {
        setSceneEditId('');
    }, []);

    const reloadPostDetail = React.useCallback(() => {
        if (shortVideoId <= 0) {
            return;
        }
        apiAjaxRef.current({
            url: `post-type/detail/spacedev_app_short_video/${shortVideoId}`,
            method: 'POST',
            loading: false,
            success: (result: { post?: DetailPost }) => {
                setPost(result?.post && typeof result.post === 'object' ? result.post : {});
            },
        });
    }, [shortVideoId]);

    const handleRenderVideo = React.useCallback(() => {
        if (shortVideoId <= 0) {
            return;
        }
        if (!scenesReadyForRender || !manifestRenderReady || !manifest) {
            api.showMessage('Cần audio đầy đủ cho mọi scene có lời thoại trước khi render', 'warning');
            return;
        }

        const dirtyNote = manifestDirty
            ? '\n\nThay đổi layout chưa lưu sẽ được lưu trước khi render.'
            : '';
        const confirmed = window.confirm(
            `Render MP4 TikTok 9:16 bằng Remotion? Quá trình có thể mất vài phút.${dirtyNote}`
        );
        if (!confirmed) {
            return;
        }

        const runRender = (manifestForRender: ShortVideoRenderManifest) => {
            setVideoRendering(true);
            apiAjaxRef.current({
                url: SHORT_VIDEO_RENDER_API_PATH,
                method: 'POST',
                data: {
                    short_video_id: shortVideoId,
                    id: shortVideoId,
                    manifest: sanitizeManifestForPersist(manifestForRender),
                },
                loading: false,
                success: (result: { success?: boolean; video_url?: string; message?: string | { content?: string } }) => {
                    if (!result?.success) {
                        return;
                    }
                    reloadPostDetail();
                    onRefreshPost?.();
                },
                error: (response: Response) => {
                    void response.json().then((body: { message?: string | { content?: string } }) => {
                        const msg = typeof body?.message === 'string'
                            ? body.message
                            : body?.message?.content;
                        if (msg) {
                            api.showMessage(msg, 'error');
                        }
                    }).catch(() => {
                        api.showMessage('Render video thất bại', 'error');
                    });
                },
                finally: () => {
                    setVideoRendering(false);
                },
            });
        };

        if (manifestDirty) {
            setVideoRendering(true);
            beginSavingActivity();
            saveShortVideoRenderManifest(shortVideoId, sanitizeManifestForPersist(manifest))
                .then((saveResult) => {
                    const savedManifest = saveResult.manifest ?? manifest;
                    applyManifestResult(savedManifest, false);
                    runRender(savedManifest);
                })
                .catch((err: unknown) => {
                    api.showMessage(
                        err instanceof Error ? err.message : 'Lưu manifest trước render thất bại',
                        'error'
                    );
                    setVideoRendering(false);
                })
                .finally(() => {
                    endSavingActivity();
                });
            return;
        }

        runRender(manifest);
    }, [
        shortVideoId,
        scenesReadyForRender,
        manifestRenderReady,
        manifest,
        manifestDirty,
        applyManifestResult,
        reloadPostDetail,
        onRefreshPost,
        api.showMessage,
        beginSavingActivity,
        endSavingActivity,
    ]);

    React.useEffect(() => {
        if (scenes.length === 0) {
            setSelectedSceneId('');
            return;
        }
        setSelectedSceneId((prev) => {
            if (prev && scenes.some((s) => s.id === prev)) {
                return prev;
            }
            return scenes[0].id;
        });
    }, [scenes]);

    const title =
        typeof data?.post?.title === 'string' && data.post.title.trim()
            ? String(data.post.title).trim()
            : `Short video #${shortVideoId}`;

    const mainDrawerHeaderAction = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {hasScriptContent ? (
                <LoadingButton
                    size="small"
                    variant="contained"
                    loading={manifestRefreshing}
                    disabled={manifestLoading || manifestRefreshing}
                    onClick={handleRefreshManifest}
                    sx={MAIN_HEADER_REFRESH_BTN_SX}
                >
                    Làm mới manifest
                </LoadingButton>
            ) : null}
            {hasScriptContent && manifest && scenesReadyForRender && manifestRenderReady ? (
                <LoadingButton
                    size="small"
                    variant="contained"
                    loading={videoRendering}
                    disabled={
                        manifestLoading
                        || manifestRefreshing
                        || manifestSaving
                        || videoRendering
                    }
                    onClick={handleRenderVideo}
                    sx={MAIN_HEADER_RENDER_BTN_SX}
                >
                    Render
                </LoadingButton>
            ) : null}
            {videoUrl ? (
                <Button
                    size="small"
                    variant="contained"
                    onClick={handleOpenFinalVideo}
                    sx={MAIN_HEADER_VIDEO_BTN_SX}
                >
                    Video
                </Button>
            ) : null}
        </Box>
    );

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            title={title}
            width={2600}
            headerAction={mainDrawerHeaderAction}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    p: 0,
                    bgcolor: 'background.default',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                }}
            >
                {error && (
                    <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>
                        {error}
                    </Alert>
                )}
                {loading && (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}
                {!loading && (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                minHeight: 0,
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 320,
                                    flexShrink: 0,
                                    borderRight: 1,
                                    borderColor: 'divider',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: 0,
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            Lời thoại
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {scenes.length} đoạn
                                            {activeTemplateLabel
                                                ? ` · ${activeTemplateLabel}`
                                                : ''}
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        aria-label="Cài đặt video"
                                        disabled={!manifest || manifestLoading}
                                        onClick={() => setGlobalSettingsOpen(true)}
                                        sx={{ mt: -0.25 }}
                                    >
                                        <ShortVideoGlobalSettingsIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                                <Box
                                    className="custom_scroll"
                                    sx={{
                                        flex: 1,
                                        overflow: 'auto',
                                        p: 1,
                                    }}
                                >
                                    {scenes.length === 0 ? (
                                        <Alert severity="info" sx={{ m: 1 }}>
                                            Chưa có script — sinh script TikTok trước khi chỉnh sửa video
                                        </Alert>
                                    ) : (
                                        scenes.map((scene, index) => (
                                            (() => {
                                                const manifestScene = manifest?.scenes.find((item) => item.id === scene.id);
                                                const manifestReady = sceneIsReadyForPlayback(manifestScene);
                                                const hasContent = sceneHasScriptContent(scene);
                                                const isRunning = narrationRunningSceneIds.includes(scene.id);
                                                const audioUrl = isRunning
                                                    ? ''
                                                    : (
                                                        manifestScene?.audio_url?.trim()
                                                        || sceneAudioMap[scene.id]?.url?.trim()
                                                        || ''
                                                    );
                                                const whisperWords = isRunning
                                                    ? []
                                                    : (
                                                        manifestReady
                                                            ? (manifestScene?.words ?? renderSceneWordsMap[scene.id] ?? [])
                                                            : (renderSceneWordsMap[scene.id] ?? [])
                                                    );
                                                return (
                                            <SceneListItem
                                                key={scene.id}
                                                scene={scene}
                                                index={index}
                                                manifest={manifest}
                                                selected={selectedSceneId === scene.id}
                                                audioUrl={audioUrl}
                                                whisperWords={whisperWords}
                                                hasScriptContent={hasContent}
                                                onSelect={() => handleOpenSceneEdit(scene.id)}
                                            />
                                                );
                                            })()
                                        ))
                                    )}
                                </Box>
                            </Box>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: 0,
                                    p: 3,
                                    bgcolor: (theme) =>
                                        theme.palette.mode === 'dark'
                                            ? 'grey.900'
                                            : 'grey.50',
                                }}
                            >
                                {manifestError && (
                                    <Alert
                                        severity={manifest ? 'warning' : 'error'}
                                        sx={{ mb: 2, flexShrink: 0 }}
                                    >
                                        {manifestError}
                                    </Alert>
                                )}
                                {SHOW_MANIFEST_INFO_BANNER && manifestInfo && !manifestError && (
                                    <Alert severity="info" sx={{ mb: 2, flexShrink: 0 }}>
                                        {manifestInfo}
                                    </Alert>
                                )}
                                {manifest && !manifestUsesVisualClips(manifest) && !manifestLoading ? (
                                    <Alert severity="info" sx={{ mb: 2, flexShrink: 0 }}>
                                        Timeline visual có sau khi làm mới manifest
                                    </Alert>
                                ) : null}
                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {!hasScriptContent ? (
                                        <Alert severity="warning" sx={{ maxWidth: 480, width: '100%' }}>
                                            Cần script trước khi xem preview Remotion
                                        </Alert>
                                    ) : manifestLoading ? (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 2,
                                                py: 6,
                                            }}
                                        >
                                            <CircularProgress size={32} />
                                            <Typography variant="body2" color="text.secondary">
                                                Đang tải manifest preview…
                                            </Typography>
                                        </Box>
                                    ) : manifest ? (
                                        <Suspense
                                            fallback={
                                                <Box
                                                    sx={{
                                                        width: '100%',
                                                        maxWidth: 320,
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        py: 4,
                                                    }}
                                                >
                                                    <CircularProgress size={28} />
                                                </Box>
                                            }
                                        >
                                            <ShortVideoRemotionPreview
                                                manifest={manifest}
                                                playerRef={remotionPlayerRef}
                                                onPlayerReady={setRemotionPlayerInstance}
                                            />
                                        </Suspense>
                                    ) : (
                                        <Alert severity="info" sx={{ maxWidth: 480, width: '100%' }}>
                                            Chưa có manifest preview — thử làm mới manifest
                                        </Alert>
                                    )}
                                </Box>
                            </Box>
                            {manifest && !manifestLoading ? (
                                <Box
                                    sx={{
                                        width: 300,
                                        flexShrink: 0,
                                        borderLeft: 1,
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        minHeight: 0,
                                        overflowX: 'hidden',
                                        overflowY: 'auto',
                                    }}
                                    className="custom_scroll"
                                >
                                    <ShortVideoVisualClipInspector
                                        manifest={manifest}
                                        clipId={selectedVisualClipId}
                                        sceneId={selectedSceneId}
                                        onManifestChange={handleInspectorVisualChange}
                                        onSave={handleSaveManifest}
                                        saving={
                                            manifestSaving
                                            || narrationRunningSceneIds.includes(selectedSceneId)
                                        }
                                        dirty={manifestDirty}
                                    />
                                </Box>
                            ) : null}
                        </Box>
                        {manifest && !manifestLoading ? (
                            <Suspense fallback={null}>
                                <ShortVideoEditorTimeline
                                    manifest={manifest}
                                    playerRef={remotionPlayerRef}
                                    playerInstance={remotionPlayerInstance}
                                    selectedVisualClipId={selectedVisualClipId}
                                    selectedNarrationSceneId={selectedSceneId}
                                    onSelectVisualClip={(clipId) => {
                                        setSelectedVisualClipId(clipId);
                                        if (clipId) {
                                            setSelectedSceneId('');
                                        }
                                    }}
                                    onSelectNarrationScene={(sceneId) => {
                                        setSelectedSceneId(sceneId);
                                        if (sceneId) {
                                            setSelectedVisualClipId('');
                                        }
                                    }}
                                    onManifestChange={handleTimelineVisualChange}
                                    onSeekScene={handleSeekToScene}
                                    onSyncClick={handleSaveManifest}
                                    saving={savingActivityCount > 0}
                                    narrationRunningSceneIds={narrationRunningSceneIds}
                                />
                            </Suspense>
                        ) : null}
                    </Box>
                )}
            </Box>
            <ShortVideoSceneEditDrawer
                open={sceneEditId.length > 0}
                onClose={handleCloseSceneEdit}
                sceneId={sceneEditId}
                manifest={manifest}
                manifestLoading={manifestLoading}
                manifestError={manifestError}
                manifestInfo={manifestInfo}
                saving={manifestSaving}
                dirty={manifestDirty}
                onSceneLayoutChange={handleSceneLayoutChange}
                onResetLayoutGroup={handleResetSceneLayoutGroup}
                onSave={handleSaveManifest}
            />
            {manifest ? (
                <ShortVideoGlobalSettingsDrawer
                    open={globalSettingsOpen}
                    onClose={() => setGlobalSettingsOpen(false)}
                    manifest={manifest}
                    saving={manifestSaving}
                    onApplyAndSave={handleApplyGlobalTemplateAndSave}
                />
            ) : null}
        </DrawerCustom>
    );
}

function SceneListItem({
    scene,
    index,
    manifest,
    selected,
    audioUrl,
    whisperWords,
    hasScriptContent,
    onSelect,
}: {
    scene: ShortVideoScriptScene;
    index: number;
    manifest: ShortVideoRenderManifest | null;
    selected: boolean;
    audioUrl: string;
    whisperWords: ShortVideoRenderWord[];
    hasScriptContent: boolean;
    onSelect: () => void;
}) {
    const voiceover = scene.voiceover.trim();
    const previewStyles = resolveSceneListPreviewStyles({ scriptScene: scene, manifest });
    const hasPlayableAudio = audioUrl.length > 0;

    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
    const [audioDurationSec, setAudioDurationSec] = React.useState(0);
    const [isAudioPlaying, setIsAudioPlaying] = React.useState(false);
    const [hasStartedPlayback, setHasStartedPlayback] = React.useState(false);

    const playbackActive =
        hasStartedPlayback && (isAudioPlaying || currentTimeSec > 0.01);

    const syncTime = React.useCallback(() => {
        const el = audioRef.current;
        if (!el) {
            return;
        }
        setCurrentTimeSec(el.currentTime);
    }, []);

    const onAudioPlay = React.useCallback(() => {
        setHasStartedPlayback(true);
        setIsAudioPlaying(true);
        syncTime();
    }, [syncTime]);

    const onAudioPause = React.useCallback(() => {
        setIsAudioPlaying(false);
        syncTime();
    }, [syncTime]);

    const onAudioEnded = React.useCallback(() => {
        setIsAudioPlaying(false);
        syncTime();
    }, [syncTime]);

    const syncDuration = React.useCallback(() => {
        const el = audioRef.current;
        if (!el) {
            return;
        }
        const d = el.duration;
        if (Number.isFinite(d) && d > 0) {
            setAudioDurationSec(d);
        }
    }, []);

    const karaokeWords = React.useMemo(() => {
        if (shortVideoRenderJsonHasWhisperWords(whisperWords)) {
            return whisperWords;
        }
        if (voiceover && audioDurationSec > 0) {
            return buildVoiceoverPlaybackWordTimings(voiceover, audioDurationSec);
        }
        return [];
    }, [whisperWords, voiceover, audioDurationSec]);

    const showKaraoke = previewStyles.showKaraoke && karaokeWords.length > 0;

    const setAudioRef = React.useCallback(
        (node: HTMLAudioElement | null) => {
            audioRef.current = node;
            if (node) {
                syncDuration();
                syncTime();
            }
        },
        [syncDuration, syncTime]
    );

    React.useEffect(() => {
        const el = audioRef.current;
        if (!el) {
            return;
        }
        el.addEventListener('timeupdate', syncTime);
        el.addEventListener('seeked', syncTime);
        el.addEventListener('play', onAudioPlay);
        el.addEventListener('pause', onAudioPause);
        el.addEventListener('ended', onAudioEnded);
        el.addEventListener('loadedmetadata', syncDuration);
        el.addEventListener('durationchange', syncDuration);

        let rafId = 0;
        const tick = () => {
            if (!audioRef.current) {
                return;
            }
            syncTime();
            if (!audioRef.current.paused && !audioRef.current.ended) {
                rafId = requestAnimationFrame(tick);
            }
        };
        const onPlay = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(tick);
        };
        el.addEventListener('play', onPlay);

        return () => {
            el.removeEventListener('timeupdate', syncTime);
            el.removeEventListener('seeked', syncTime);
            el.removeEventListener('play', onAudioPlay);
            el.removeEventListener('pause', onAudioPause);
            el.removeEventListener('ended', onAudioEnded);
            el.removeEventListener('loadedmetadata', syncDuration);
            el.removeEventListener('durationchange', syncDuration);
            el.removeEventListener('play', onPlay);
            cancelAnimationFrame(rafId);
        };
    }, [syncTime, syncDuration, audioUrl, onAudioPlay, onAudioPause, onAudioEnded]);

    React.useEffect(() => {
        setHasStartedPlayback(false);
        setIsAudioPlaying(false);
        setCurrentTimeSec(0);
        setAudioDurationSec(0);
    }, [audioUrl]);

    return (
        <Box
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
            sx={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 2,
                borderColor: selected ? 'primary.main' : 'rgba(0,0,0,0.12)',
                borderRadius: 1.5,
                p: 1.25,
                mb: 1,
                cursor: 'pointer',
                bgcolor: previewStyles.backgroundColor,
                boxShadow: selected
                    ? '0 0 0 1px rgba(25, 118, 210, 0.35), 0 4px 12px rgba(0,0,0,0.12)'
                    : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                '&:hover': {
                    boxShadow: '0 4px 14px rgba(0,0,0,0.14)',
                },
                '&:focus-visible': {
                    outline: 2,
                    outlineColor: 'primary.main',
                    outlineOffset: 1,
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 0.75,
                }}
            >
                <Typography variant="caption" sx={{ color: previewStyles.textColor, opacity: 0.8 }}>
                    Scene {index + 1} · {scene.id}
                </Typography>
            </Box>
            {previewStyles.showHeadline && previewStyles.headlineText ? (
                <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{
                        color: previewStyles.headlineColor,
                        mb: 0.75,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.35,
                    }}
                >
                    {previewStyles.headlineText}
                </Typography>
            ) : null}
            {showKaraoke ? (
                <Box sx={{ mb: 1 }}>
                    <ShortVideoVoiceoverKaraoke
                        words={karaokeWords}
                        currentTimeSec={currentTimeSec}
                        playbackActive={playbackActive}
                        textColor={previewStyles.textColor}
                        activeColor={previewStyles.activeColor}
                    />
                </Box>
            ) : (
                <Typography
                    variant="body2"
                    sx={{
                        color: previewStyles.textColor,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                        mb: 1,
                    }}
                >
                    {voiceover || '—'}
                </Typography>
            )}
            <Box
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                {hasPlayableAudio ? (
                    <Box
                        sx={{
                            width: '100%',
                            '& audio': {
                                width: '100%',
                                height: 36,
                                display: 'block',
                            },
                        }}
                    >
                        <audio
                            ref={setAudioRef}
                            controls
                            controlsList="nodownload noplaybackrate"
                            preload="metadata"
                            src={audioUrl}
                            style={{ width: '100%' }}
                        />
                    </Box>
                ) : (
                    <Typography
                        variant="caption"
                        sx={{ color: previewStyles.textColor, opacity: 0.72 }}
                    >
                        {hasScriptContent
                            ? 'Chưa có audio — sinh audio VieNeu cho scene này'
                            : 'Scene trống — thêm lời thoại khi cần'}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
