import React from 'react';
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    IconButton,
    LinearProgress,
    Slider,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopOutlinedIcon from '@mui/icons-material/StopOutlined';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';

const UPLOAD_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/upload-transition-asset';
const ASSET_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/asset';

type Props = {
    config?: Record<string, unknown>;
    post: Record<string, unknown>;
    name?: string;
    onReview?: (value: unknown, key: Record<string, unknown> | string) => void;
};

function formatSec(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const sec = Number(value);
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

async function uploadSfx(file: File): Promise<{ success?: boolean; file?: string; message?: unknown }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'sfx');
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(
        convertToURL(getAdminApiPrefix(), UPLOAD_PATH),
        { method: 'POST', headers, body: formData },
    );
    return response.json() as Promise<{ success?: boolean; file?: string; message?: unknown }>;
}

/**
 * Tải âm thanh qua fetch (Bearer header — chuẩn như mọi API khác) → blob URL.
 * Blob URL same-origin → <audio> và WebAudio KHÔNG gặp lỗi CORS nữa.
 */
async function loadSfxBlobUrl(fileName: string): Promise<string> {
    const base = convertToURL(
        getAdminApiPrefix(),
        `${ASSET_PATH}?file=${encodeURIComponent(fileName)}`,
    );
    const token = getAccessToken();
    const response = await fetch(base, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

export default React.memo(function SfxPicker(props: Props) {
    const { config, post, onReview } = props;

    const sfxFile = String(post.sfx_file || '');
    const sfxStart = post.sfx_start_sec === '' || post.sfx_start_sec === null || post.sfx_start_sec === undefined
        ? 0
        : Number(post.sfx_start_sec) || 0;
    const sfxEnd = post.sfx_end_sec === '' || post.sfx_end_sec === null || post.sfx_end_sec === undefined
        ? null
        : Number(post.sfx_end_sec) || null;
    const sfxVolume = post.sfx_volume === '' || post.sfx_volume === null || post.sfx_volume === undefined
        ? 0.85
        : Number(post.sfx_volume) || 0;

    const [duration, setDuration] = React.useState(0);
    const [uploading, setUploading] = React.useState(false);
    const [playing, setPlaying] = React.useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const gainNodeRef = React.useRef<GainNode | null>(null);
    const blobUrlRef = React.useRef<string | null>(null);

    const commit = (patch: Record<string, unknown>) => {
        if (!patch) return;
        if (patch.sfx_file !== undefined) post.sfx_file = patch.sfx_file;
        if (patch.sfx_start_sec !== undefined) post.sfx_start_sec = patch.sfx_start_sec;
        if (patch.sfx_end_sec !== undefined) post.sfx_end_sec = patch.sfx_end_sec;
        if (patch.sfx_volume !== undefined) post.sfx_volume = patch.sfx_volume;
        if (patch.sfx_loop !== undefined) post.sfx_loop = patch.sfx_loop;
        if (onReview) onReview(null, patch);
    };

    const applyPreviewVolume = React.useCallback((volume: number) => {
        const vol = Math.max(0, Number(volume) || 0);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = vol;
            return;
        }
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, vol));
        }
    }, []);

    const stopAudio = React.useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (gainNodeRef.current) {
            gainNodeRef.current = null;
        }
        if (audioCtxRef.current) {
            void audioCtxRef.current.close().catch(() => undefined);
            audioCtxRef.current = null;
        }
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
        setPlaying(false);
    }, []);

    React.useEffect(() => () => stopAudio(), [stopAudio]);

    const handleTogglePlay = () => {
        if (!sfxFile) return;
        if (playing) {
            stopAudio();
            return;
        }
        setPlaying(true);
        void (async () => {
            let blobUrl: string;
            try {
                blobUrl = await loadSfxBlobUrl(sfxFile);
            } catch {
                setPlaying(false);
                window.alert('Không tải được âm thanh preview — kiểm tra kết nối server');
                return;
            }
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
            }
            blobUrlRef.current = blobUrl;

            const audio = new Audio(blobUrl);
            audioRef.current = audio;

            // Preview theo đúng volume đang chọn (hỗ trợ cả >100% qua WebAudio GainNode)
            const volume = Math.max(0, Number(sfxVolume) || 0);
            const AudioCtx = window.AudioContext
                || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            let routed = false;
            if (AudioCtx) {
                try {
                    const ctx = new AudioCtx();
                    const source = ctx.createMediaElementSource(audio);
                    const gain = ctx.createGain();
                    gain.gain.value = volume;
                    source.connect(gain);
                    gain.connect(ctx.destination);
                    audioCtxRef.current = ctx;
                    gainNodeRef.current = gain;
                    if (ctx.state === 'suspended') {
                        void ctx.resume().catch(() => undefined);
                    }
                    routed = true;
                } catch {
                    routed = false;
                }
            }
            if (!routed) {
                audio.volume = Math.max(0, Math.min(1, volume));
            }

            const start = Math.max(0, sfxStart);
            audio.currentTime = start;
            audio.addEventListener('loadedmetadata', () => {
                if (Number.isFinite(audio.duration) && audio.duration > 0) {
                    setDuration(audio.duration);
                }
            });
            audio.addEventListener('timeupdate', () => {
                const end = sfxEnd !== null && sfxEnd > 0 ? sfxEnd : duration;
                if (end > 0 && audio.currentTime >= end) {
                    audio.pause();
                    audio.currentTime = start;
                }
            });
            const cleanup = () => {
                setPlaying(false);
                audioRef.current = null;
                gainNodeRef.current = null;
                if (audioCtxRef.current) {
                    void audioCtxRef.current.close().catch(() => undefined);
                    audioCtxRef.current = null;
                }
                if (blobUrlRef.current) {
                    URL.revokeObjectURL(blobUrlRef.current);
                    blobUrlRef.current = null;
                }
            };
            audio.addEventListener('ended', cleanup);
            audio.addEventListener('error', cleanup);
            audio.play().catch(cleanup);
        })();
    };

    const handleUpload = async (file: File) => {
        if (!file) return;
        setUploading(true);
        try {
            const result = await uploadSfx(file);
            if (result?.success && result.file) {
                commit({ sfx_file: String(result.file), sfx_start_sec: '', sfx_end_sec: '' });
                setDuration(0);
            } else {
                const msg = (result as { message?: unknown })?.message;
                window.alert(typeof msg === 'string' ? msg : 'Upload âm thanh thất bại');
            }
        } catch {
            window.alert('Upload âm thanh thất bại — kiểm tra kết nối server');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        stopAudio();
        setDuration(0);
        commit({ sfx_file: '', sfx_start_sec: '', sfx_end_sec: '', sfx_volume: 0.85 });
    };

    const endValue = sfxEnd !== null && sfxEnd > 0 ? Math.min(sfxEnd, duration || sfxEnd) : (duration || sfxEnd || 0);

    const handleRangeChange = (values: number[]) => {
        const a = Math.max(0, Math.min(Number(values[0]), Number(values[1])));
        const b = Math.max(Number(values[1]), a);
        commit({
            sfx_start_sec: a > 0 ? Number(a.toFixed(3)) : '',
            sfx_end_sec: (duration > 0 && b >= duration - 0.01) ? '' : Number(b.toFixed(3)),
        });
    };

    return (
        <Box>
            <FormLabel component="legend" sx={{ mb: 0.5, display: 'block' }}>
                {String((config?.title as string) || 'Âm thanh chuyển cảnh')}
            </FormLabel>

            {uploading && <LinearProgress sx={{ mb: 1 }} />}

            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <input
                    accept=".mp3,.wav,.ogg,.m4a,audio/*"
                    style={{ display: 'none' }}
                    id="wb-tx-sfx-input"
                    type="file"
                    onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) void handleUpload(f);
                        e.target.value = '';
                    }}
                />
                <label htmlFor="wb-tx-sfx-input">
                    <Button variant="contained" size="small" component="span" startIcon={<MusicNoteIcon />}>
                        Upload âm thanh
                    </Button>
                </label>
                {sfxFile && (
                    <React.Fragment>
                        <IconButton size="small" color="primary" onClick={handleTogglePlay} title={playing ? 'Dừng' : 'Nghe thử'}>
                            {playing ? <StopOutlinedIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                        </IconButton>
                        <IconButton size="small" onClick={handleRemove} title="Xóa âm thanh">
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 240, opacity: 0.75 }}>
                            {sfxFile}
                        </Typography>
                    </React.Fragment>
                )}
                {!sfxFile && (
                    <Typography variant="caption" color="textSecondary">
                        Chưa có âm thanh — chọn file mp3 (phát ngay khi hiệu ứng bắt đầu)
                    </Typography>
                )}
            </Box>

            {sfxFile && (
                <React.Fragment>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <GraphicEqOutlinedIcon sx={{ opacity: 0.6 }} fontSize="small" />
                        <Typography variant="caption" color="textSecondary">
                            Phát thử toàn bộ / theo khoảng đã chọn bên dưới
                        </Typography>
                    </Box>

                    {duration > 0 && (
                        <React.Fragment>
                            <Typography variant="caption" color="textSecondary" display="block">
                                Bắt đầu: {formatSec(sfxStart)} — Kết thúc: {formatSec(sfxEnd !== null && sfxEnd > 0 ? sfxEnd : duration)}
                                {' '}(tổng {formatSec(duration)})
                            </Typography>
                            <Slider
                                size="small"
                                min={0}
                                max={duration || 1}
                                step={0.01}
                                value={[sfxStart, endValue]}
                                onChange={(e, v) => {
                                    const arr = Array.isArray(v) ? v : [0, Number(v)];
                                    handleRangeChange(arr.map(Number));
                                }}
                                valueLabelDisplay="off"
                                sx={{ mt: 0.5 }}
                            />
                            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                Kéo 2 đầu để chọn khoảng phát (rỗng = toàn bộ thời gian)
                            </Typography>
                        </React.Fragment>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ minWidth: 72 }}>
                            Volume: {Math.round(sfxVolume * 100)}%
                        </Typography>
                        <Slider
                            size="small"
                            min={0}
                            max={1.5}
                            step={0.05}
                            value={sfxVolume}
                            onChange={(e, v) => {
                                const next = Number(Number(v).toFixed(2));
                                commit({ sfx_volume: next });
                                applyPreviewVolume(next);
                            }}
                            sx={{ flex: 1, maxWidth: 260 }}
                        />
                    </Box>

                    <FormControlLabel
                        control={(
                            <Checkbox
                                size="small"
                                checked={Boolean(post.sfx_loop)}
                                onChange={(e) => commit({ sfx_loop: e.target.checked ? 1 : 0 })}
                            />
                        )}
                        label="Lặp lại âm thanh đến hết hiệu ứng (nếu âm thanh ngắn)"
                    />
                </React.Fragment>
            )}

            {config?.note && (
                <FormHelperText>
                    <span dangerouslySetInnerHTML={{ __html: String(config.note) }} />
                </FormHelperText>
            )}
        </Box>
    );
});
