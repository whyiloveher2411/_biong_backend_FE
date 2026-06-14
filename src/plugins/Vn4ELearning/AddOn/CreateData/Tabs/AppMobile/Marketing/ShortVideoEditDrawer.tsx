import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Typography,
} from '@mui/material';
import Button from 'components/atoms/Button';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import useAjax from 'hook/useApi';
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
import ShortVideoVoiceoverKaraoke from './ShortVideoVoiceoverKaraoke';

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

export default function ShortVideoEditDrawer({
    open,
    onClose,
    data,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const shortVideoId = Number(data?.post?.id || 0);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [post, setPost] = React.useState<DetailPost>({});
    const [selectedSceneId, setSelectedSceneId] = React.useState('');

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
        }
    }, [open]);

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
                            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Scenes
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {scenes.length} đoạn
                                </Typography>
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
                                            selected={selectedSceneId === scene.id}
                                            audioUrl={
                                                sceneAudioMap[scene.id]?.url?.trim() || ''
                                            }
                                            whisperWords={
                                                renderSceneWordsMap[scene.id] ?? []
                                            }
                                            onSelect={() => setSelectedSceneId(scene.id)}
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
                                    flexShrink: 0,
                                    mb: 2,
                                }}
                            >
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
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 0,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: '100%',
                                        maxWidth: 720,
                                        minHeight: 280,
                                        border: 2,
                                        borderStyle: 'dashed',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'background.paper',
                                        px: 3,
                                        py: 4,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        align="left"
                                    >
                                        Vùng chỉnh sửa video — cập nhật sau
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        </DrawerCustom>
    );
}

function SceneListItem({
    scene,
    index,
    selected,
    audioUrl,
    whisperWords,
    onSelect,
}: {
    scene: ShortVideoScriptScene;
    index: number;
    selected: boolean;
    audioUrl: string;
    whisperWords: ShortVideoRenderWord[];
    onSelect: () => void;
}) {
    const voiceover = scene.voiceover.trim();
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

    const showKaraoke = karaokeWords.length > 0;

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
                border: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                borderRadius: 1.5,
                p: 1.25,
                mb: 1,
                cursor: 'pointer',
                bgcolor: selected ? 'action.selected' : 'background.default',
                '&:hover': {
                    bgcolor: selected ? 'action.selected' : 'action.hover',
                },
                '&:focus-visible': {
                    outline: 2,
                    outlineColor: 'primary.main',
                    outlineOffset: 1,
                },
            }}
        >
            {showKaraoke ? (
                <Box sx={{ mb: 1 }}>
                    <ShortVideoVoiceoverKaraoke
                        words={karaokeWords}
                        currentTimeSec={currentTimeSec}
                        playbackActive={playbackActive}
                    />
                </Box>
            ) : (
                <Typography
                    variant="body2"
                    sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
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
                    <Typography variant="caption" color="text.secondary">
                        Chưa có audio — sinh audio VieNeu cho scene này
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
