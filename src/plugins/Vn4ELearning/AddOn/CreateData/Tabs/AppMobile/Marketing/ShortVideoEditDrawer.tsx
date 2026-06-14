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
    refreshShortVideoRenderManifest,
    saveShortVideoRenderManifest,
} from 'helpers/marketingShortVideoManifestApi';
import {
    applyShortVideoTemplateToManifest,
    clearSceneLayoutKeysInManifest,
    getShortVideoRenderTemplate,
    parseShortVideoRenderManifest,
    resolveSceneActiveColor,
    resolveSceneHeadlineColor,
    resolveSceneHeadlineText,
    resolveSceneShowHeadline,
    resolveSceneShowKaraoke,
    resolveSceneTextColor,
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
import ShortVideoVoiceoverKaraoke from './ShortVideoVoiceoverKaraoke';
import ShortVideoSceneEditDrawer from './ShortVideoSceneEditDrawer';
import ShortVideoGlobalSettingsDrawer, {
    ShortVideoGlobalSettingsIcon,
} from './ShortVideoGlobalSettingsDrawer';

/** Tạm ẩn banner manifest info — bật lại khi cần. */
const SHOW_MANIFEST_INFO_BANNER = false;

const loadRemotionPlayerModule = () => import('./ShortVideoRemotionPlayer');

const ShortVideoRemotionPreview = React.lazy(() =>
    loadRemotionPlayerModule().then((mod) => ({
        default: mod.ShortVideoRemotionPreview,
    }))
);

const ShortVideoRemotionTimelineBar = React.lazy(() =>
    loadRemotionPlayerModule().then((mod) => ({
        default: mod.ShortVideoRemotionTimelineBar,
    }))
);

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

function allScenesHaveAudio(
    scenes: ShortVideoScriptScene[],
    sceneAudioMap: ReturnType<typeof parseShortVideoSceneAudioMap>
): boolean {
    if (scenes.length === 0) {
        return false;
    }
    return scenes.every((scene) => {
        const url = sceneAudioMap[scene.id]?.url?.trim() || '';
        return url.length > 0;
    });
}

function manifestFingerprint(manifest: ShortVideoRenderManifest): string {
    return JSON.stringify(manifest);
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
    const [globalSettingsOpen, setGlobalSettingsOpen] = React.useState(false);
    const [videoRendering, setVideoRendering] = React.useState(false);
    const savedManifestFingerprintRef = React.useRef('');
    const remotionPlayerRef = React.useRef<PlayerRef | null>(null);
    const [remotionPlayerInstance, setRemotionPlayerInstance] = React.useState<PlayerRef | null>(null);

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
    const scenesReadyForPreview = React.useMemo(
        () => allScenesHaveAudio(scenes, sceneAudioMap),
        [scenes, sceneAudioMap]
    );
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
        if (!open) {
            setSelectedSceneId('');
            setPost({});
            setError('');
            setManifest(null);
            setManifestError('');
            setManifestInfo('');
            savedManifestFingerprintRef.current = '';
            setSceneEditId('');
            setGlobalSettingsOpen(false);
            remotionPlayerRef.current = null;
            setRemotionPlayerInstance(null);
        }
    }, [open]);

    const applyManifestResult = React.useCallback(
        (nextManifest: ShortVideoRenderManifest | undefined, rebuilt?: boolean) => {
            const parsed = parseShortVideoRenderManifest(nextManifest);
            if (!parsed) {
                setManifest(null);
                savedManifestFingerprintRef.current = '';
                return;
            }
            setManifest(parsed);
            savedManifestFingerprintRef.current = manifestFingerprint(parsed);
            if (rebuilt) {
                setManifestInfo('Đang chạy whisper — manifest đã được làm mới');
            } else {
                setManifestInfo('');
            }
        },
        []
    );

    React.useEffect(() => {
        if (!open || loading || shortVideoId <= 0 || !scenesReadyForPreview) {
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
    }, [open, loading, shortVideoId, scenesReadyForPreview, applyManifestResult]);

    const handleSceneLayoutChange = React.useCallback(
        (sceneId: string, patch: Partial<ShortVideoManifestSceneLayout>) => {
            setManifest((prev) => {
                if (!prev) {
                    return prev;
                }
                return updateSceneLayoutInManifest(prev, sceneId, patch);
            });
        },
        []
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
            setManifestError('');
            try {
                const result = await saveShortVideoRenderManifest(
                    shortVideoId,
                    nextManifest
                );
                applyManifestResult(result.manifest ?? nextManifest, false);
                setGlobalSettingsOpen(false);
            } catch (err: unknown) {
                setManifestError(
                    err instanceof Error ? err.message : 'Lưu manifest thất bại'
                );
            } finally {
                setManifestSaving(false);
            }
        },
        [manifest, shortVideoId, applyManifestResult]
    );

    const activeTemplateLabel = React.useMemo(() => {
        if (!manifest?.template_id) {
            return '';
        }
        return getShortVideoRenderTemplate(manifest.template_id)?.label ?? '';
    }, [manifest?.template_id]);

    const handleSaveManifest = React.useCallback(async () => {
        if (!manifest || shortVideoId <= 0) {
            return;
        }
        setManifestSaving(true);
        setManifestError('');
        try {
            const result = await saveShortVideoRenderManifest(shortVideoId, manifest);
            applyManifestResult(result.manifest ?? manifest, false);
        } catch (err: unknown) {
            setManifestError(
                err instanceof Error ? err.message : 'Lưu manifest thất bại'
            );
        } finally {
            setManifestSaving(false);
        }
    }, [manifest, shortVideoId, applyManifestResult]);

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
            applyManifestResult(result.manifest, true);
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
    }, []);

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
        if (!scenesReadyForPreview || !manifest) {
            api.showMessage('Cần script, audio đầy đủ và manifest preview trước khi render', 'warning');
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

        const runRender = () => {
            setVideoRendering(true);
            apiAjaxRef.current({
                url: SHORT_VIDEO_RENDER_API_PATH,
                method: 'POST',
                data: { short_video_id: shortVideoId, id: shortVideoId },
                loading: false,
                success: (result: { success?: boolean; video_url?: string }) => {
                    if (!result?.success) {
                        return;
                    }
                    reloadPostDetail();
                    onRefreshPost?.();
                },
                finally: () => {
                    setVideoRendering(false);
                },
            });
        };

        if (manifestDirty) {
            setVideoRendering(true);
            saveShortVideoRenderManifest(shortVideoId, manifest)
                .then((saveResult) => {
                    applyManifestResult(saveResult.manifest ?? manifest, false);
                    runRender();
                })
                .catch((err: unknown) => {
                    api.showMessage(
                        err instanceof Error ? err.message : 'Lưu manifest trước render thất bại',
                        'error'
                    );
                    setVideoRendering(false);
                });
            return;
        }

        runRender();
    }, [
        shortVideoId,
        scenesReadyForPreview,
        manifest,
        manifestDirty,
        applyManifestResult,
        reloadPostDetail,
        onRefreshPost,
        api.showMessage,
    ]);

    const renderActionButton = (
        <LoadingButton
            variant="contained"
            loading={videoRendering}
            disabled={
                !scenesReadyForPreview
                || !manifest
                || manifestLoading
                || manifestRefreshing
                || manifestSaving
                || videoRendering
            }
            onClick={handleRenderVideo}
        >
            Render
        </LoadingButton>
    );

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

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            title={title}
            width={1600}
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
                                        Scenes
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
                                        <SceneListItem
                                            key={scene.id}
                                            scene={scene}
                                            index={index}
                                            manifest={manifest}
                                            selected={selectedSceneId === scene.id}
                                            audioUrl={
                                                sceneAudioMap[scene.id]?.url?.trim() || ''
                                            }
                                            whisperWords={
                                                renderSceneWordsMap[scene.id] ?? []
                                            }
                                            onSelect={() => handleOpenSceneEdit(scene.id)}
                                        />
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
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                    gap: 1,
                                    flexShrink: 0,
                                    mb: 2,
                                }}
                            >
                                {scenesReadyForPreview ? (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        disabled={manifestLoading || manifestRefreshing}
                                        onClick={handleRefreshManifest}
                                    >
                                        Làm mới manifest
                                    </Button>
                                ) : null}
                                {videoUrl ? (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleOpenFinalVideo}
                                    >
                                        Video
                                    </Button>
                                ) : null}
                            </Box>
                            {manifestError && (
                                <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                                    {manifestError}
                                </Alert>
                            )}
                            {SHOW_MANIFEST_INFO_BANNER && manifestInfo && !manifestError && (
                                <Alert severity="info" sx={{ mb: 2, flexShrink: 0 }}>
                                    {manifestInfo}
                                </Alert>
                            )}
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                }}
                            >
                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        py: 1,
                                    }}
                                    className="custom_scroll"
                                >
                                    {!scenesReadyForPreview ? (
                                        <Alert severity="warning" sx={{ maxWidth: 480, width: '100%' }}>
                                            Cần script và audio đầy đủ mọi scene trước khi xem preview Remotion
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
                                {manifest && !manifestLoading ? (
                                    <Suspense fallback={null}>
                                        <ShortVideoRemotionTimelineBar
                                            manifest={manifest}
                                            playerRef={remotionPlayerRef}
                                            playerInstance={remotionPlayerInstance}
                                            rightSlot={renderActionButton}
                                        />
                                    </Suspense>
                                ) : (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            alignItems: 'center',
                                            flexShrink: 0,
                                            py: 1.5,
                                            px: 2,
                                            borderTop: 1,
                                            borderColor: 'divider',
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        {renderActionButton}
                                    </Box>
                                )}
                            </Box>
                        </Box>
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
                refreshing={manifestRefreshing}
                dirty={manifestDirty}
                onSceneLayoutChange={handleSceneLayoutChange}
                onResetLayoutGroup={handleResetSceneLayoutGroup}
                onSave={handleSaveManifest}
                onRefresh={handleRefreshManifest}
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
    onSelect,
}: {
    scene: ShortVideoScriptScene;
    index: number;
    manifest: ShortVideoRenderManifest | null;
    selected: boolean;
    audioUrl: string;
    whisperWords: ShortVideoRenderWord[];
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
                        Chưa có audio — sinh audio VieNeu cho scene này
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
