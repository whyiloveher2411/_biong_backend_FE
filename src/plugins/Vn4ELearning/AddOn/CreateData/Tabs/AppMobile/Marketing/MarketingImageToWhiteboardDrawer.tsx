import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { getAdminApiPrefix, getApiHost } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';

type HandOption = {
    id: string;
    label: string;
    category?: string;
    kind?: string;
    thumb_url?: string;
    thumb_rel?: string;
    render_max_width?: number;
    anchor_x?: number | null;
    anchor_y?: number | null;
};

type BackgroundOption = {
    id: string;
    label: string;
    type?: 'solid' | 'image' | string;
    ink_mode?: 'marker' | 'chalk' | string;
    color?: number[];
    thumb_url?: string;
    thumb_rel?: string;
    file?: string;
};

type TransitionOption = {
    id: string;
    label: string;
    needs_asset?: boolean;
    thumb_url?: string;
    thumb_rel?: string;
};

type SourceMode = 'upload' | 'prompt';
type GenStyle = 'whiteboard' | 'sketch' | 'hybrid';
type AspectRatio = '16:9' | '9:16';
type VideoResolution = '720p' | '1080p';

type SceneConfig = {
    id: string;
    sourceMode: SourceMode;
    file: File | null;
    prompt: string;
    genStyle: GenStyle;
    boardTheme: string;
    hand: string;
    photoPlaceMode: 'draw' | 'drag' | 'instant';
    durationPreset: number | 'custom';
    customDuration: string;
    holdPreset: number | 'custom';
    customHold: string;
    colorPreset: number | 'custom';
    customColor: string;
    transitionDurationPreset: number | 'custom';
    customTransitionDuration: string;
};

const DURATION_PRESETS = [5, 8, 10, 15, 30, 45, 60] as const;
const DURATION_MIN = 3;
const DURATION_MAX = 120;
const INSTANT_DURATION_MIN = 0;
const HOLD_PRESETS = [0, 1, 2, 5, 10, 20] as const;
const HOLD_MIN = 0;
const HOLD_MAX = 120;
const COLOR_PRESETS = [0, 2, 5, 10, 15, 20] as const;
const COLOR_MIN = 0;
const COLOR_MAX = 120;
const TRANSITION_DURATION_PRESETS = [0.8, 1.2, 2, 3] as const;
const TRANSITION_DURATION_MIN = 0.3;
const TRANSITION_DURATION_MAX = 8;
const MAX_SCENES = 40;

const GEN_STYLES: { id: GenStyle; label: string }[] = [
    { id: 'hybrid', label: 'Hybrid' },
    { id: 'whiteboard', label: 'Whiteboard' },
    { id: 'sketch', label: 'Sketch' },
];
const ASPECT_OPTIONS: { id: AspectRatio; label: string }[] = [
    { id: '16:9', label: 'Ngang 16:9' },
    { id: '9:16', label: 'Dọc 9:16' },
];
const RESOLUTION_OPTIONS: { id: VideoResolution; label: string }[] = [
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
];

type StatusResponse = {
    success?: boolean;
    status?: string;
    video_url?: string;
    preview_url?: string;
    video_rel?: string;
    has_video?: boolean;
    result?: {
        video_url?: string;
        video_rel?: string;
    };
    message?: unknown;
    error_log?: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

function newSceneId(): string {
    return `scene_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyScene(defaults?: Partial<SceneConfig>): SceneConfig {
    return {
        id: newSceneId(),
        sourceMode: 'upload',
        file: null,
        prompt: '',
        genStyle: 'whiteboard',
        boardTheme: defaults?.boardTheme ?? 'whiteboard',
        hand: defaults?.hand ?? '',
        photoPlaceMode: defaults?.photoPlaceMode ?? 'draw',
        durationPreset: defaults?.durationPreset ?? 8,
        customDuration: defaults?.customDuration ?? '20',
        holdPreset: defaults?.holdPreset ?? 1,
        customHold: defaults?.customHold ?? '5',
        colorPreset: defaults?.colorPreset ?? 0,
        customColor: defaults?.customColor ?? '5',
        transitionDurationPreset: defaults?.transitionDurationPreset ?? 1.2,
        customTransitionDuration: defaults?.customTransitionDuration ?? '2',
    };
}

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string; error_log?: string };
    if (typeof r.message === 'string' && r.message.trim()) return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return r.message.content;
    }
    if (typeof r.error_log === 'string' && r.error_log.trim()) return r.error_log;
    return 'Yêu cầu thất bại';
}

function resolveUploadThumbUrl(item: { thumb_rel?: string; thumb_url?: string }): string {
    const apiHost = getApiHost().replace(/\/+$/, '');
    const rel = String(item.thumb_rel || '').trim().replace(/^\//, '');
    const raw = String(item.thumb_url || '').trim();

    // Giữ ?v= từ API (filemtime) — KHÔNG dùng Date.now() (mỗi keystroke sẽ chớp ảnh)
    let version = '';
    if (raw) {
        try {
            const u = new URL(raw, apiHost);
            version = u.searchParams.get('v') || '';
            if (!rel && u.pathname.includes('/uploads/')) {
                return version
                    ? `${apiHost}${u.pathname}?v=${version}`
                    : `${apiHost}${u.pathname}`;
            }
        } catch {
            if (!rel) return raw;
        }
    }

    if (rel) {
        return version ? `${apiHost}/${rel}?v=${version}` : `${apiHost}/${rel}`;
    }
    return raw;
}

function resolveHandThumbUrl(hand: HandOption): string {
    return resolveUploadThumbUrl(hand);
}

function resolveBgThumbUrl(bg: BackgroundOption): string {
    if (bg.type === 'image') {
        return resolveUploadThumbUrl(bg);
    }
    return '';
}

function bgSwatchCss(bg: BackgroundOption): string {
    const c = Array.isArray(bg.color) && bg.color.length >= 3 ? bg.color : [255, 255, 255];
    return `rgb(${Number(c[0]) | 0}, ${Number(c[1]) | 0}, ${Number(c[2]) | 0})`;
}

/** URL phát được trên <video> — ưu tiên API host + video_rel (tránh APP_URL lệch). */
function resolveWhiteboardVideoUrl(jobId: number, res: StatusResponse): string | null {
    const apiHost = getApiHost().replace(/\/+$/, '');
    const rel = String(res.video_rel || res.result?.video_rel || '').trim().replace(/^\//, '');
    if (rel) {
        return `${apiHost}/${rel}?v=${Date.now()}`;
    }
    const raw = String(res.preview_url || res.video_url || res.result?.video_url || '').trim();
    if (raw) {
        try {
            const u = new URL(raw, apiHost);
            if (u.pathname.includes('/uploads/')) {
                return `${apiHost}${u.pathname}?v=${Date.now()}`;
            }
            return raw;
        } catch {
            return raw;
        }
    }
    if (jobId > 0) {
        return `${apiHost}/uploads/marketing-whiteboard/${jobId}/output.mp4?v=${Date.now()}`;
    }
    return null;
}

function resolveSceneDurationSec(scene: SceneConfig): number | null {
    const instant = scene.photoPlaceMode === 'instant';
    const min = instant ? INSTANT_DURATION_MIN : DURATION_MIN;
    if (scene.durationPreset === 'custom') {
        const n = Math.round(Number(scene.customDuration));
        if (!Number.isFinite(n) || n < min || n > DURATION_MAX) {
            return null;
        }
        return n;
    }
    return scene.durationPreset;
}

function resolveSceneHoldSec(scene: SceneConfig): number | null {
    if (scene.holdPreset === 'custom') {
        const n = Number(scene.customHold);
        if (!Number.isFinite(n) || n < HOLD_MIN || n > HOLD_MAX) {
            return null;
        }
        return Math.round(n * 10) / 10;
    }
    return scene.holdPreset;
}

function resolveSceneColorSec(scene: SceneConfig): number | null {
    if (scene.photoPlaceMode === 'instant' || scene.photoPlaceMode === 'drag') {
        return 0;
    }
    if (scene.colorPreset === 'custom') {
        const n = Number(scene.customColor);
        if (!Number.isFinite(n) || n < COLOR_MIN || n > COLOR_MAX) {
            return null;
        }
        return Math.round(n * 10) / 10;
    }
    return scene.colorPreset;
}

function resolveSceneTransitionDurationSec(scene: SceneConfig): number | null {
    if (scene.transitionDurationPreset === 'custom') {
        const n = Number(scene.customTransitionDuration);
        if (
            !Number.isFinite(n) ||
            n < TRANSITION_DURATION_MIN ||
            n > TRANSITION_DURATION_MAX
        ) {
            return null;
        }
        return Math.round(n * 10) / 10;
    }
    return scene.transitionDurationPreset;
}

function validateScene(
    scene: SceneConfig,
    index: number,
    sceneCount = 1
): string | null {
    const label = `Cảnh ${index + 1}`;
    const instant = scene.photoPlaceMode === 'instant';
    if (scene.sourceMode === 'upload' && !scene.file) {
        return `${label}: chọn ảnh trước`;
    }
    if (scene.sourceMode === 'prompt' && !scene.prompt.trim()) {
        return `${label}: nhập prompt để sinh ảnh`;
    }
    if (!instant && !scene.hand) {
        return `${label}: chọn kiểu bàn tay`;
    }
    if (!scene.boardTheme) {
        return `${label}: chọn nền bảng`;
    }
    if (resolveSceneDurationSec(scene) == null) {
        return instant
            ? `${label}: thời gian vẽ (instant) phải từ ${INSTANT_DURATION_MIN}–${DURATION_MAX} giây`
            : `${label}: thời gian vẽ tùy chỉnh phải từ ${DURATION_MIN}–${DURATION_MAX} giây`;
    }
    const hold = resolveSceneHoldSec(scene);
    if (hold == null) {
        return `${label}: thời gian chờ tùy chỉnh phải từ ${HOLD_MIN}–${HOLD_MAX} giây`;
    }
    if (instant && hold < 0.05) {
        return `${label}: Không vẽ tay cần hold ≥ 0.05s`;
    }
    if (resolveSceneColorSec(scene) == null) {
        return `${label}: thời gian tô màu tùy chỉnh phải từ ${COLOR_MIN}–${COLOR_MAX} giây`;
    }
    if (index < sceneCount - 1 && resolveSceneTransitionDurationSec(scene) == null) {
        return `${label}: thời lượng chuyển cảnh phải từ ${TRANSITION_DURATION_MIN}–${TRANSITION_DURATION_MAX} giây`;
    }
    return null;
}

function isSceneReady(scene: SceneConfig, sceneCount = 1, index = 0): boolean {
    return validateScene(scene, index, sceneCount) === null;
}

async function enqueueWhiteboard(opts: {
    aspect: AspectRatio;
    resolution: VideoResolution;
    transition?: string;
    scenes: SceneConfig[];
}): Promise<{ success?: boolean; job_id?: number; message?: unknown }> {
    const formData = new FormData();
    formData.append('aspect', opts.aspect);
    formData.append('resolution', opts.resolution);
    formData.append('scene_count', String(opts.scenes.length));
    if (opts.scenes.length >= 2 && opts.transition) {
        formData.append('transition', opts.transition);
    }
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const scenesPayload = opts.scenes.map((sc, i) => {
        const durationSec = resolveSceneDurationSec(sc);
        const holdSec = resolveSceneHoldSec(sc);
        const colorSec = resolveSceneColorSec(sc);
        const row: Record<string, string | number> = {
            source_mode: sc.sourceMode,
            duration_sec: sc.photoPlaceMode === 'instant'
                ? (durationSec ?? 0)
                : (durationSec ?? 8),
            hold_sec: holdSec ?? 1,
            color_sec: sc.photoPlaceMode === 'instant' || sc.photoPlaceMode === 'drag'
                ? 0
                : (colorSec ?? 0),
            hand_style: sc.hand,
            board_theme: sc.boardTheme,
            gen_style: sc.genStyle,
            photo_place_mode: sc.photoPlaceMode,
            prompt: sc.sourceMode === 'prompt' ? sc.prompt.trim() : '',
        };
        if (i < opts.scenes.length - 1) {
            row.transition_duration_sec = resolveSceneTransitionDurationSec(sc) ?? 1.2;
        }
        return row;
    });
    formData.append('scenes', JSON.stringify(scenesPayload));

    opts.scenes.forEach((sc, i) => {
        if (sc.sourceMode === 'upload' && sc.file) {
            formData.append(`scene_${i}_image`, sc.file);
        }
    });

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/enqueue',
        ),
        { method: 'POST', headers, body: formData },
    );
    const result = await response.json();
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Enqueue thất bại');
    }
    return result;
}

export default function MarketingImageToWhiteboardDrawer({ open, onClose }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [scenes, setScenes] = React.useState<SceneConfig[]>(() => [createEmptyScene()]);
    const [activeSceneIndex, setActiveSceneIndex] = React.useState(0);
    const [aspect, setAspect] = React.useState<AspectRatio>('16:9');
    const [resolution, setResolution] = React.useState<VideoResolution>('1080p');
    const [transition, setTransition] = React.useState<string>('erase');
    const [transitions, setTransitions] = React.useState<TransitionOption[]>([]);
    const [transitionsLoading, setTransitionsLoading] = React.useState(false);
    const [backgrounds, setBackgrounds] = React.useState<BackgroundOption[]>([]);
    const [backgroundsLoading, setBackgroundsLoading] = React.useState(false);
    const [hands, setHands] = React.useState<HandOption[]>([]);
    const [handsLoading, setHandsLoading] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [jobId, setJobId] = React.useState<number | null>(null);
    const [jobStatus, setJobStatus] = React.useState<string | null>(null);
    const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [info, setInfo] = React.useState<string | null>(null);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    const activeScene = scenes[activeSceneIndex] ?? scenes[0];
    const allScenesReady = scenes.every((sc, i) => isSceneReady(sc, scenes.length, i));

    const updateActiveScene = React.useCallback(
        (patch: Partial<SceneConfig>) => {
            setScenes((prev) =>
                prev.map((sc, i) => (i === activeSceneIndex ? { ...sc, ...patch } : sc)),
            );
        },
        [activeSceneIndex],
    );

    const addScene = () => {
        if (scenes.length >= MAX_SCENES) return;
        const base = scenes[0];
        setScenes((prev) => [
            ...prev,
            createEmptyScene({
                hand: base?.hand,
                boardTheme: base?.boardTheme,
                photoPlaceMode: base?.photoPlaceMode,
                durationPreset: base?.durationPreset,
                customDuration: base?.customDuration,
                holdPreset: base?.holdPreset,
                customHold: base?.customHold,
                colorPreset: base?.colorPreset,
                customColor: base?.customColor,
                transitionDurationPreset: base?.transitionDurationPreset,
                customTransitionDuration: base?.customTransitionDuration,
            }),
        ]);
        setActiveSceneIndex(scenes.length);
    };

    const removeActiveScene = () => {
        if (scenes.length <= 1) return;
        const nextIndex = Math.min(activeSceneIndex, scenes.length - 2);
        setScenes((prev) => prev.filter((_, i) => i !== activeSceneIndex));
        setActiveSceneIndex(nextIndex);
    };

    React.useEffect(() => {
        if (!open) {
            setLoading(false);
            setError(null);
            setInfo(null);
        }
    }, [open]);

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }
        let cancelled = false;
        setHandsLoading(true);
        setBackgroundsLoading(true);
        setTransitionsLoading(true);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/hands',
            method: 'POST',
            data: { category: 'pencil' },
            loading: false,
            success: (res: {
                success?: boolean;
                hands?: HandOption[];
                default_hand?: string;
                message?: unknown;
            }) => {
                if (cancelled) return;
                setHandsLoading(false);
                if (!res?.success) {
                    setError(parseApiMessage(res) || 'Không tải được danh sách bàn tay');
                    return;
                }
                const list = Array.isArray(res.hands) ? res.hands.filter((h) => h?.id) : [];
                setHands(list);
                const preferred = String(res.default_hand || list[0]?.id || '').trim();
                if (preferred) {
                    setScenes((prev) =>
                        prev.map((sc) => {
                            if (sc.hand && list.some((h) => h.id === sc.hand)) return sc;
                            return { ...sc, hand: preferred };
                        }),
                    );
                }
                if (list.length === 0) {
                    setError('Chưa có asset trong whiteboard/pencil — thêm file PNG vào thư mục đó');
                }
            },
        });

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/backgrounds',
            method: 'POST',
            data: {},
            loading: false,
            success: (res: {
                success?: boolean;
                backgrounds?: BackgroundOption[];
                default_background?: string;
                message?: unknown;
            }) => {
                if (cancelled) return;
                setBackgroundsLoading(false);
                if (!res?.success) {
                    setError(parseApiMessage(res) || 'Không tải được danh sách nền bảng');
                    return;
                }
                const list = Array.isArray(res.backgrounds)
                    ? res.backgrounds.filter((b) => b?.id)
                    : [];
                setBackgrounds(list);
                const preferred = String(
                    res.default_background || list[0]?.id || 'whiteboard',
                ).trim();
                setScenes((prev) =>
                    prev.map((sc) => {
                        if (sc.boardTheme && list.some((b) => b.id === sc.boardTheme)) return sc;
                        return { ...sc, boardTheme: preferred };
                    }),
                );
            },
        });

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/transitions',
            method: 'POST',
            data: {},
            loading: false,
            success: (res: {
                success?: boolean;
                transitions?: TransitionOption[];
                default_transition?: string;
                message?: unknown;
            }) => {
                if (cancelled) return;
                setTransitionsLoading(false);
                if (!res?.success) {
                    return;
                }
                const list = Array.isArray(res.transitions)
                    ? res.transitions.filter((t) => t?.id)
                    : [];
                setTransitions(list);
                const preferred = String(res.default_transition || list[0]?.id || 'erase').trim();
                setTransition((prev) => {
                    if (prev && list.some((t) => t.id === prev)) return prev;
                    return preferred || 'erase';
                });
            },
        });

        return () => {
            cancelled = true;
        };
    }, [open]);

    React.useEffect(() => {
        const file = activeScene?.file ?? null;
        if (!file) {
            setPreviewUrl(null);
            return undefined;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [activeScene?.file, activeSceneIndex]);

    React.useEffect(() => {
        if (!open || !jobId || !loading) {
            return undefined;
        }
        let cancelled = false;
        const poll = () => {
            apiAjaxRef.current({
                url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/status',
                method: 'POST',
                data: { job_id: jobId },
                loading: false,
                success: (res: StatusResponse) => {
                    if (cancelled) return;
                    if (!res?.success) {
                        setError(parseApiMessage(res));
                        return;
                    }
                    const status = String(res.status || '');
                    setJobStatus(status);
                    const errLog =
                        typeof res.error_log === 'string' ? res.error_log.trim() : '';
                    if (status === 'completed') {
                        const url = resolveWhiteboardVideoUrl(jobId, res);
                        setLoading(false);
                        if (!url) {
                            setError('Job đã completed nhưng không tìm thấy file MP4');
                            return;
                        }
                        setVideoUrl(url);
                        setError(null);
                        setInfo('Đã tạo video whiteboard — xem preview bên dưới');
                        window.setTimeout(() => {
                            videoRef.current?.play()?.catch(() => undefined);
                        }, 200);
                        return;
                    }
                    if (status === 'failed') {
                        setLoading(false);
                        setError(parseApiMessage(res) || errLog || 'Job thất bại');
                        return;
                    }
                    // pending/processing có error_log = đang retry — hiện để user không tưởng treo
                    if (errLog) {
                        setInfo(
                            `Đang chờ worker retry (${status}). Lần thử trước: ${errLog}`
                        );
                    }
                },
                error: (err: unknown) => {
                    if (cancelled) return;
                    setError(parseApiMessage(err));
                },
            });
        };
        poll();
        const timer = window.setInterval(poll, 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [open, jobId, loading]);

    const handleGenerate = async () => {
        for (let i = 0; i < scenes.length; i++) {
            const err = validateScene(scenes[i], i, scenes.length);
            if (err) {
                setError(err);
                setActiveSceneIndex(i);
                return;
            }
        }
        setLoading(true);
        setError(null);
        setInfo(null);
        setVideoUrl(null);
        setJobStatus('pending');
        setJobId(null);
        try {
            const res = await enqueueWhiteboard({
                aspect,
                resolution,
                transition: scenes.length >= 2 ? transition : undefined,
                scenes,
            });
            if (!res?.success || !res.job_id) {
                setLoading(false);
                setError(parseApiMessage(res));
                return;
            }
            setJobId(Number(res.job_id));
            setInfo(parseApiMessage(res) || 'Đã đưa vào hàng đợi — chờ worker xử lý');
        } catch (err) {
            setLoading(false);
            setError(err instanceof Error ? err.message : 'Enqueue thất bại');
        }
    };

    if (!activeScene) {
        return null;
    }

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Image → Whiteboard"
            width={560}
            activeOnClose
            restDialogContent={{
                sx: {
                    pt: 2.5,
                    px: 3,
                    pb: 2,
                    backgroundColor: 'body.background',
                },
            }}
        >
            <Stack spacing={2.5} sx={{ pb: 1 }}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                    Upload ảnh whiteboard đã xử lý, hoặc sinh ảnh từ prompt (Z-Image) — chỉ animate
                    vẽ tay, không convert lại. Hỗ trợ tối đa {MAX_SCENES} cảnh. Cần worker đang
                    chạy.
                </Alert>

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {info && !error && (
                    <Alert
                        severity={info.includes('Lần thử trước') ? 'warning' : 'success'}
                        onClose={() => setInfo(null)}
                    >
                        {info}
                    </Alert>
                )}

                <Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                    >
                        1. Tỉ lệ & độ phân giải
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                        {ASPECT_OPTIONS.map((o) => (
                            <Chip
                                key={o.id}
                                label={o.label}
                                size="small"
                                color={aspect === o.id ? 'primary' : 'default'}
                                variant={aspect === o.id ? 'filled' : 'outlined'}
                                onClick={() => setAspect(o.id)}
                                sx={{ textTransform: 'none' }}
                            />
                        ))}
                    </Stack>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {RESOLUTION_OPTIONS.map((o) => (
                            <Chip
                                key={o.id}
                                label={o.label}
                                size="small"
                                color={resolution === o.id ? 'primary' : 'default'}
                                variant={resolution === o.id ? 'filled' : 'outlined'}
                                onClick={() => setResolution(o.id)}
                                sx={{ textTransform: 'none' }}
                            />
                        ))}
                    </Stack>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.75 }}
                    >
                        {aspect === '16:9'
                            ? resolution === '1080p'
                                ? 'YouTube ngang ~1920×1080'
                                : 'YouTube ngang 1280×720'
                            : resolution === '1080p'
                              ? 'Shorts/TikTok dọc ~1080×1920'
                              : 'Shorts/TikTok dọc 720×1280'}
                    </Typography>
                </Box>

                {scenes.length >= 2 && (
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                        >
                            2. Hiệu ứng chuyển cảnh
                        </Typography>
                        {transitionsLoading && <LinearProgress sx={{ mb: 1 }} />}
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                            {(transitions.length > 0
                                ? transitions
                                : [
                                    { id: 'camera_pan', label: 'Camera pan' },
                                    { id: 'erase', label: 'Xóa bảng' },
                                    { id: 'slide', label: 'Tay kéo' },
                                    { id: 'ink_pop', label: 'Loang màu nước' },
                                    { id: 'fade', label: 'Cắt / Fade' },
                                    { id: 'page_flip', label: 'Lật trang' },
                                    { id: 'paper_tear', label: 'Xé giấy' },
                                    { id: 'paint_stroke', label: 'Quét cọ' },
                                    { id: 'random', label: 'Ngẫu nhiên' },
                                ]
                            ).map((t) => (
                                <Chip
                                    key={t.id}
                                    label={t.label || t.id}
                                    size="small"
                                    color={transition === t.id ? 'primary' : 'default'}
                                    variant={transition === t.id ? 'filled' : 'outlined'}
                                    onClick={() => setTransition(t.id)}
                                    sx={{ textTransform: 'none' }}
                                />
                            ))}
                        </Stack>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.75, lineHeight: 1.35 }}
                        >
                            {transition === 'random'
                                ? 'Ngẫu nhiên: mỗi khoảng chuyển rút 1 hiệu ứng, không lặp trong vòng; hết danh sách thì xáo lại. Nên bật «Không vẽ tay» trên mọi cảnh để test reveal ảnh 2.'
                                : '≥2 cảnh. Với «Không vẽ tay»: mọi hiệu ứng (kể cả xóa bảng) lộ ảnh 2 — xóa bảng = lau ảnh 1, lớp dưới là ảnh 2.'}
                        </Typography>
                    </Box>
                )}

                <Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                    >
                        {scenes.length >= 2 ? '3. Cảnh' : '2. Cảnh'}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={0.75}
                        useFlexGap
                        flexWrap="wrap"
                        alignItems="center"
                        sx={{ mb: 1.5 }}
                    >
                        {scenes.map((sc, i) => (
                            <Chip
                                key={sc.id}
                                label={`Cảnh ${i + 1}`}
                                size="small"
                                color={activeSceneIndex === i ? 'primary' : 'default'}
                                variant={activeSceneIndex === i ? 'filled' : 'outlined'}
                                onClick={() => setActiveSceneIndex(i)}
                                sx={{ textTransform: 'none' }}
                            />
                        ))}
                        <IconButton
                            size="small"
                            onClick={addScene}
                            disabled={scenes.length >= MAX_SCENES}
                            aria-label="Thêm cảnh"
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                        {scenes.length > 1 && (
                            <IconButton
                                size="small"
                                onClick={removeActiveScene}
                                aria-label="Xóa cảnh hiện tại"
                                color="error"
                                sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                    >
                        Nguồn ảnh — Cảnh {activeSceneIndex + 1}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                        <Chip
                            label="Upload ảnh"
                            size="small"
                            color={activeScene.sourceMode === 'upload' ? 'primary' : 'default'}
                            variant={activeScene.sourceMode === 'upload' ? 'filled' : 'outlined'}
                            onClick={() => updateActiveScene({ sourceMode: 'upload' })}
                            sx={{ textTransform: 'none' }}
                        />
                        <Chip
                            label="Sinh từ prompt"
                            size="small"
                            color={activeScene.sourceMode === 'prompt' ? 'primary' : 'default'}
                            variant={activeScene.sourceMode === 'prompt' ? 'filled' : 'outlined'}
                            onClick={() => updateActiveScene({ sourceMode: 'prompt' })}
                            sx={{ textTransform: 'none' }}
                        />
                    </Stack>

                    {activeScene.sourceMode === 'upload' ? (
                        <>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 1 }}
                            >
                                Ảnh whiteboard đã xử lý — chỉ animate vẽ tay
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                sx={{ textTransform: 'none' }}
                            >
                                Chọn ảnh
                                <input
                                    hidden
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        updateActiveScene({ file: f });
                                        setVideoUrl(null);
                                        setError(null);
                                        e.target.value = '';
                                    }}
                                />
                            </Button>
                            {activeScene.file && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 0.75 }}
                                >
                                    {activeScene.file.name} (
                                    {Math.round(activeScene.file.size / 1024)} KB)
                                </Typography>
                            )}
                            {previewUrl && (
                                <Box
                                    component="img"
                                    src={previewUrl}
                                    alt="preview"
                                    sx={{
                                        mt: 1.5,
                                        maxWidth: '100%',
                                        maxHeight: 220,
                                        objectFit: 'contain',
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <TextField
                                multiline
                                minRows={3}
                                fullWidth
                                size="small"
                                label="Prompt"
                                placeholder="Ví dụ: một cô gái đứng bên hồ nước lúc hoàng hôn"
                                value={activeScene.prompt}
                                onChange={(e) => updateActiveScene({ prompt: e.target.value })}
                                inputProps={{ maxLength: 2000 }}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 600, display: 'block', mt: 1.5, mb: 1 }}
                            >
                                Phong cách sinh
                            </Typography>
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                {GEN_STYLES.map((s) => (
                                    <Chip
                                        key={s.id}
                                        label={s.label}
                                        size="small"
                                        color={
                                            activeScene.genStyle === s.id ? 'primary' : 'default'
                                        }
                                        variant={
                                            activeScene.genStyle === s.id ? 'filled' : 'outlined'
                                        }
                                        onClick={() => updateActiveScene({ genStyle: s.id })}
                                        sx={{ textTransform: 'none' }}
                                    />
                                ))}
                            </Stack>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.75 }}
                            >
                                {activeScene.genStyle === 'hybrid'
                                    ? 'Z-Image sinh collage ảnh thật + marker; tay vẽ doodle rồi reveal vùng ảnh/màu'
                                    : activeScene.genStyle === 'whiteboard'
                                      ? 'Z-Image sinh ảnh marker whiteboard, rồi animate vẽ tay (không convert lại)'
                                      : 'Z-Image sinh ảnh pencil sketch, rồi animate vẽ tay'}
                            </Typography>
                        </>
                    )}

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}
                    >
                        Nền bảng
                    </Typography>
                    {backgroundsLoading && <LinearProgress sx={{ mb: 1 }} />}
                    {!backgroundsLoading && backgrounds.length === 0 && (
                        <Typography variant="caption" color="error">
                            Không có nền trong whiteboard/background
                        </Typography>
                    )}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: 1,
                        }}
                    >
                        {backgrounds.map((bg) => {
                            const selected = activeScene.boardTheme === bg.id;
                            const thumb = resolveBgThumbUrl(bg);
                            return (
                                <Box
                                    key={bg.id}
                                    component="button"
                                    type="button"
                                    onClick={() => updateActiveScene({ boardTheme: bg.id })}
                                    sx={{
                                        m: 0,
                                        p: 1,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        border: '2px solid',
                                        borderColor: selected ? 'primary.main' : 'divider',
                                        borderRadius: 1.5,
                                        bgcolor: selected ? 'action.selected' : 'background.paper',
                                        font: 'inherit',
                                        color: 'inherit',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            aspectRatio: '16 / 10',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            bgcolor: bgSwatchCss(bg),
                                            mb: 0.75,
                                            backgroundImage: thumb ? `url(${thumb})` : undefined,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{ fontWeight: 600, display: 'block' }}
                                    >
                                        {bg.label || bg.id}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.75 }}
                    >
                        {(() => {
                            const cur = backgrounds.find((b) => b.id === activeScene.boardTheme);
                            if (!cur) return 'Chọn nền bảng từ meta.json';
                            return cur.ink_mode === 'chalk'
                                ? 'Chalk: nét đen upload → phấn sáng trên nền'
                                : 'Marker: giữ nét đen trên nền';
                        })()}
                    </Typography>

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}
                    >
                        Ảnh thật (hybrid) — cách đưa ảnh
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                        <Chip
                            label="Không vẽ tay"
                            size="small"
                            color={activeScene.photoPlaceMode === 'instant' ? 'primary' : 'default'}
                            variant={activeScene.photoPlaceMode === 'instant' ? 'filled' : 'outlined'}
                            onClick={() => updateActiveScene({
                                photoPlaceMode: 'instant',
                                durationPreset: 0,
                                colorPreset: 0,
                                holdPreset: typeof activeScene.holdPreset === 'number' && activeScene.holdPreset >= 1
                                    ? activeScene.holdPreset
                                    : 2,
                            })}
                            sx={{ textTransform: 'none' }}
                        />
                        <Chip
                            label="Vẽ tô ảnh"
                            size="small"
                            color={activeScene.photoPlaceMode === 'draw' ? 'primary' : 'default'}
                            variant={activeScene.photoPlaceMode === 'draw' ? 'filled' : 'outlined'}
                            onClick={() => updateActiveScene({
                                photoPlaceMode: 'draw',
                                durationPreset: activeScene.durationPreset === 0 ? 8 : activeScene.durationPreset,
                            })}
                            sx={{ textTransform: 'none' }}
                        />
                        <Chip
                            label="Kéo ảnh vào"
                            size="small"
                            color={activeScene.photoPlaceMode === 'drag' ? 'primary' : 'default'}
                            variant={activeScene.photoPlaceMode === 'drag' ? 'filled' : 'outlined'}
                            onClick={() => updateActiveScene({
                                photoPlaceMode: 'drag',
                                colorPreset: 0,
                                durationPreset: activeScene.durationPreset === 0 ? 8 : activeScene.durationPreset,
                            })}
                            sx={{ textTransform: 'none' }}
                        />
                    </Stack>
                    {scenes.length >= 2 && (
                        <Button
                            size="small"
                            variant="text"
                            sx={{ textTransform: 'none', mb: 1, px: 0 }}
                            onClick={() => {
                                setScenes((prev) => prev.map((sc) => ({
                                    ...sc,
                                    photoPlaceMode: 'instant' as const,
                                    durationPreset: 0,
                                    colorPreset: 0,
                                    holdPreset: typeof sc.holdPreset === 'number' && sc.holdPreset >= 1
                                        ? sc.holdPreset
                                        : 2,
                                })));
                            }}
                        >
                            Áp dụng «Không vẽ tay» cho mọi cảnh
                        </Button>
                    )}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1 }}
                    >
                        {activeScene.photoPlaceMode === 'instant'
                            ? 'Frame đầu = ảnh đầy đủ, không tay vẽ. Dùng ≥2 cảnh + hiệu ứng chuyển cảnh để test reveal ảnh 2.'
                            : activeScene.photoPlaceMode === 'drag'
                                ? 'Kéo cutout ảnh thật vào khung trước, rồi vẽ doodle. Thời gian tô màu = 0.'
                                : 'Tô ảnh thật bằng brush sau khi vẽ outline (mặc định).'}
                    </Typography>

                    {activeScene.photoPlaceMode !== 'instant' ? (
                        <>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}
                    >
                        Thời gian vẽ
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {DURATION_PRESETS.map((d) => (
                            <Chip
                                key={d}
                                label={`${d}s`}
                                size="small"
                                color={activeScene.durationPreset === d ? 'primary' : 'default'}
                                variant={
                                    activeScene.durationPreset === d ? 'filled' : 'outlined'
                                }
                                onClick={() => updateActiveScene({ durationPreset: d })}
                                sx={{ textTransform: 'none' }}
                            />
                        ))}
                        <Chip
                            label="Tùy chỉnh"
                            size="small"
                            color={
                                activeScene.durationPreset === 'custom' ? 'primary' : 'default'
                            }
                            variant={
                                activeScene.durationPreset === 'custom' ? 'filled' : 'outlined'
                            }
                            onClick={() => updateActiveScene({ durationPreset: 'custom' })}
                            sx={{ textTransform: 'none' }}
                        />
                    </Stack>
                    {activeScene.durationPreset === 'custom' && (
                        <TextField
                            size="small"
                            type="number"
                            label="Giây vẽ"
                            value={activeScene.customDuration}
                            onChange={(e) => updateActiveScene({ customDuration: e.target.value })}
                            inputProps={{ min: DURATION_MIN, max: DURATION_MAX, step: 1 }}
                            helperText={`${DURATION_MIN}–${DURATION_MAX} giây`}
                            sx={{ mt: 1.25, width: 140 }}
                        />
                    )}
                        </>
                    ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
                            Instant: duration vẽ = 0 — độ dài cảnh ≈ thời gian chờ (hold) bên dưới.
                        </Typography>
                    )}

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}
                    >
                        {activeScene.photoPlaceMode === 'instant'
                            ? 'Thời gian giữ ảnh (hold)'
                            : 'Thời gian chờ (sau vẽ, không tay)'}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {HOLD_PRESETS.map((d) => (
                            <Chip
                                key={`hold-${d}`}
                                label={`${d}s`}
                                size="small"
                                color={activeScene.holdPreset === d ? 'primary' : 'default'}
                                variant={activeScene.holdPreset === d ? 'filled' : 'outlined'}
                                onClick={() => updateActiveScene({ holdPreset: d })}
                                sx={{ textTransform: 'none' }}
                            />
                        ))}
                        <Chip
                            label="Tùy chỉnh"
                            size="small"
                            color={activeScene.holdPreset === 'custom' ? 'primary' : 'default'}
                            variant={
                                activeScene.holdPreset === 'custom' ? 'filled' : 'outlined'
                            }
                            onClick={() => updateActiveScene({ holdPreset: 'custom' })}
                            sx={{ textTransform: 'none' }}
                        />
                    </Stack>
                    {activeScene.holdPreset === 'custom' && (
                        <TextField
                            size="small"
                            type="number"
                            label="Giây chờ"
                            value={activeScene.customHold}
                            onChange={(e) => updateActiveScene({ customHold: e.target.value })}
                            inputProps={{ min: HOLD_MIN, max: HOLD_MAX, step: 1 }}
                            helperText={`${HOLD_MIN}–${HOLD_MAX} giây`}
                            sx={{ mt: 1.25, width: 140 }}
                        />
                    )}

                    {activeScene.photoPlaceMode === 'draw' && (
                        <>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}
                    >
                        Thời gian tô màu
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1 }}
                    >
                        0 = chỉ mực một màu
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {COLOR_PRESETS.map((d) => (
                            <Chip
                                key={`color-${d}`}
                                label={`${d}s`}
                                size="small"
                                color={activeScene.colorPreset === d ? 'primary' : 'default'}
                                variant={activeScene.colorPreset === d ? 'filled' : 'outlined'}
                                onClick={() => updateActiveScene({ colorPreset: d })}
                                sx={{ textTransform: 'none' }}
                            />
                        ))}
                        <Chip
                            label="Tùy chỉnh"
                            size="small"
                            color={activeScene.colorPreset === 'custom' ? 'primary' : 'default'}
                            variant={
                                activeScene.colorPreset === 'custom' ? 'filled' : 'outlined'
                            }
                            onClick={() => updateActiveScene({ colorPreset: 'custom' })}
                            sx={{ textTransform: 'none' }}
                        />
                    </Stack>
                    {activeScene.colorPreset === 'custom' && (
                        <TextField
                            size="small"
                            type="number"
                            label="Giây tô màu"
                            value={activeScene.customColor}
                            onChange={(e) => updateActiveScene({ customColor: e.target.value })}
                            inputProps={{ min: COLOR_MIN, max: COLOR_MAX, step: 1 }}
                            helperText={`${COLOR_MIN}–${COLOR_MAX} giây`}
                            sx={{ mt: 1.25, width: 140 }}
                        />
                    )}
                        </>
                    )}

                    {scenes.length >= 2 && activeSceneIndex < scenes.length - 1 && (
                        <>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}
                            >
                                Chuyển sang cảnh kế (giây)
                            </Typography>
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                {TRANSITION_DURATION_PRESETS.map((d) => (
                                    <Chip
                                        key={`tx-${d}`}
                                        label={`${d}s`}
                                        size="small"
                                        color={
                                            activeScene.transitionDurationPreset === d
                                                ? 'primary'
                                                : 'default'
                                        }
                                        variant={
                                            activeScene.transitionDurationPreset === d
                                                ? 'filled'
                                                : 'outlined'
                                        }
                                        onClick={() =>
                                            updateActiveScene({ transitionDurationPreset: d })
                                        }
                                        sx={{ textTransform: 'none' }}
                                    />
                                ))}
                                <Chip
                                    label="Tùy chỉnh"
                                    size="small"
                                    color={
                                        activeScene.transitionDurationPreset === 'custom'
                                            ? 'primary'
                                            : 'default'
                                    }
                                    variant={
                                        activeScene.transitionDurationPreset === 'custom'
                                            ? 'filled'
                                            : 'outlined'
                                    }
                                    onClick={() =>
                                        updateActiveScene({ transitionDurationPreset: 'custom' })
                                    }
                                    sx={{ textTransform: 'none' }}
                                />
                            </Stack>
                            {activeScene.transitionDurationPreset === 'custom' && (
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Giây chuyển"
                                    value={activeScene.customTransitionDuration}
                                    onChange={(e) =>
                                        updateActiveScene({
                                            customTransitionDuration: e.target.value,
                                        })
                                    }
                                    inputProps={{
                                        min: TRANSITION_DURATION_MIN,
                                        max: TRANSITION_DURATION_MAX,
                                        step: 0.1,
                                    }}
                                    helperText={`${TRANSITION_DURATION_MIN}–${TRANSITION_DURATION_MAX} giây`}
                                    sx={{ mt: 1.25, width: 140 }}
                                />
                            )}
                        </>
                    )}

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}
                    >
                        Kiểu bàn tay
                    </Typography>
                    {handsLoading && <LinearProgress sx={{ mb: 1 }} />}
                    {!handsLoading && hands.length === 0 && (
                        <Typography variant="caption" color="error">
                            Không có tay nào trong whiteboard/pencil
                        </Typography>
                    )}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: 1,
                        }}
                    >
                        {hands.map((h) => {
                            const selected = activeScene.hand === h.id;
                            const thumb = resolveHandThumbUrl(h);
                            return (
                                <Box
                                    key={h.id}
                                    component="button"
                                    type="button"
                                    onClick={() => updateActiveScene({ hand: h.id })}
                                    sx={{
                                        m: 0,
                                        p: 1,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        borderRadius: 1.5,
                                        border: '2px solid',
                                        borderColor: selected ? 'primary.main' : 'divider',
                                        backgroundColor: selected
                                            ? 'action.selected'
                                            : 'background.paper',
                                        transition: 'border-color 0.15s ease',
                                        '&:hover': {
                                            borderColor: selected
                                                ? 'primary.main'
                                                : 'text.secondary',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: 120,
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            backgroundColor: '#111',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mb: 0.75,
                                        }}
                                    >
                                        {thumb ? (
                                            <Box
                                                component="img"
                                                src={thumb}
                                                alt={h.label}
                                                sx={{
                                                    maxWidth: '100%',
                                                    maxHeight: 120,
                                                    width: 'auto',
                                                    height: 'auto',
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="caption" color="grey.500">
                                                No img
                                            </Typography>
                                        )}
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: selected ? 700 : 500,
                                            display: 'block',
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {h.label || h.id}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<BrushOutlinedIcon />}
                    onClick={handleGenerate}
                    disabled={loading || hands.length === 0 || !allScenesReady}
                    sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                >
                    {loading ? 'Đang tạo…' : 'Tạo video whiteboard'}
                </Button>

                {loading && (
                    <Box>
                        <LinearProgress />
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.75, display: 'block' }}
                        >
                            Job #{jobId || '…'} — {jobStatus || 'pending'} (poll mỗi 3s).
                            Multi-cảnh có thể mất vài phút; nếu thấy thông báo retry ở trên thì
                            worker đã lỗi và đang thử lại.
                        </Typography>
                    </Box>
                )}

                {videoUrl && (
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'success.light',
                            backgroundColor: 'background.paper',
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Kết quả — xem video
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1 }}
                        >
                            {aspect} · {resolution} · {scenes.length} cảnh
                            {scenes.length >= 2
                                ? ` · ${
                                      transitions.find((t) => t.id === transition)?.label ||
                                      transition
                                  }`
                                : ''}
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                width: '100%',
                                backgroundColor: 'action.hover',
                                borderRadius: 1,
                                py: 1.5,
                                px: 1,
                            }}
                        >
                            <Box
                                component="video"
                                ref={videoRef}
                                key={`${videoUrl}-${aspect}-${resolution}`}
                                src={videoUrl}
                                controls
                                playsInline
                                preload="metadata"
                                sx={{
                                    display: 'block',
                                    aspectRatio: aspect === '16:9' ? '16 / 9' : '9 / 16',
                                    objectFit: 'contain',
                                    backgroundColor: '#fff',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    ...(aspect === '9:16'
                                        ? {
                                              height: 440,
                                              width: 'auto',
                                              maxWidth: '100%',
                                          }
                                        : {
                                              width: '100%',
                                              maxWidth: 480,
                                              height: 'auto',
                                              maxHeight: 280,
                                          }),
                                }}
                            />
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            <Button
                                size="small"
                                variant="outlined"
                                href={videoUrl}
                                download={`whiteboard-${jobId || 'out'}.mp4`}
                                target="_blank"
                                rel="noopener noreferrer"
                                startIcon={<DownloadOutlinedIcon fontSize="small" />}
                                sx={{ textTransform: 'none' }}
                            >
                                Tải MP4
                            </Button>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ alignSelf: 'center' }}
                            >
                                Job #{jobId}
                            </Typography>
                        </Stack>
                    </Box>
                )}
            </Stack>
        </DrawerCustom>
    );
}
