import React from 'react';
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    AGENT_IMAGE_ANIMATION_OPTIONS,
    AGENT_IMAGE_ANIMATION_BEAT_OPTIONS,
    type AgentImageAnimationBeatValue,
    type AgentImageAnimationEffect,
    type AgentWhiteboardBeatOverride,
    type AgentWhiteboardConfig,
} from './agentVideoApi';

type Props = {
    beatId: string;
    imageUrl: string;
    clipAspect?: string;
    /** Hiệu ứng chung (toàn clip). */
    clipConfig?: AgentWhiteboardConfig | null;
    clipSaving?: boolean;
    onClipConfigChange?: (patch: Partial<AgentWhiteboardConfig>) => void;
    savedOverride?: AgentWhiteboardBeatOverride | null;
    saving?: boolean;
    onSave: (override: AgentWhiteboardBeatOverride) => Promise<boolean>;
};

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function parseRatio(value: unknown, fallback: number): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? clamp01(num) : fallback;
}

/**
 * Điều khiển chuyển động ảnh beat (whiteboard mode) — đồng thời là VIEWER ảnh chính:
 * - Hiển thị ảnh beat rõ ràng (thay cho box preview phía trên đã bỏ).
 * - Click vào ảnh → chọn điểm tập trung (auto-save ngay; 0-1, ratio ảnh gốc) —
 *   frame cuối của beat sẽ đưa điểm này ra giữa màn hình, không hở viền.
 * - Chọn hiệu ứng (mặc định Ngẫu nhiên, deck không trùng 2 beat liền kề).
 */
export default function ShortVideoAgentImageAnimationControls({
    beatId,
    imageUrl,
    clipAspect = '9:16',
    clipConfig = null,
    clipSaving = false,
    onClipConfigChange,
    savedOverride,
    saving = false,
    onSave,
}: Props) {
    // Hiệu ứng riêng: mặc định 'common' = theo tiêu chuẩn chung.
    const effect = String(savedOverride?.image_animation_effect || 'common') as AgentImageAnimationBeatValue;
    // Hiệu ứng chung: mặc định 'random'.
    const clipEffect = String(clipConfig?.image_animation_effect || 'random') as AgentImageAnimationEffect;
    const focusX = parseRatio(savedOverride?.focus_x, 0.5);
    const focusY = parseRatio(savedOverride?.focus_y, 0.5);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [imgNatural, setImgNatural] = React.useState<{ w: number; h: number } | null>(null);
    const [boxSize, setBoxSize] = React.useState<{ w: number; h: number } | null>(null);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }
        const update = () => {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setBoxSize({ w: rect.width, h: rect.height });
            }
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(container);
        return () => observer.disconnect();
    }, [imageUrl]);

    const aspect = clipAspect === '16:9' ? 16 / 9 : 9 / 16;

    const containRect = React.useMemo(() => {
        if (!imgNatural || !boxSize || imgNatural.w <= 0 || imgNatural.h <= 0) {
            return null;
        }
        const scale = Math.min(boxSize.w / imgNatural.w, boxSize.h / imgNatural.h);
        const w = imgNatural.w * scale;
        const h = imgNatural.h * scale;
        return {
            x: (boxSize.w - w) / 2,
            y: (boxSize.h - h) / 2,
            w,
            h,
        };
    }, [imgNatural, boxSize]);

    const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = containRect;
        if (!rect) {
            return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        const bx = event.clientX - bounds.left;
        const by = event.clientY - bounds.top;
        if (bx < rect.x || bx > rect.x + rect.w || by < rect.y || by > rect.y + rect.h) {
            return;
        }
        const fx = clamp01((bx - rect.x) / rect.w);
        const fy = clamp01((by - rect.y) / rect.h);
        void onSave({
            ...(savedOverride || {}),
            focus_x: fx,
            focus_y: fy,
        });
    };

    const handleEffectChange = (value: AgentImageAnimationBeatValue) => {
        void onSave({
            ...(savedOverride || {}),
            image_animation_effect: value,
        });
    };

    const handleClipEffectChange = (value: AgentImageAnimationEffect) => {
        onClipConfigChange?.({ image_animation_effect: value });
    };

    const handleResetFocus = () => {
        void onSave({
            ...(savedOverride || {}),
            focus_x: 0.5,
            focus_y: 0.5,
        });
    };

    const dotLeft = containRect ? containRect.x + focusX * containRect.w : `${focusX * 100}%`;
    const dotTop = containRect ? containRect.y + focusY * containRect.h : `${focusY * 100}%`;

    return (
        <Box
            sx={{
                mt: 1.5,
                width: '100%',
                maxWidth: 480,
                mx: 'auto',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                px: 1.5,
                py: 1.25,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    Chuyển động ảnh beat
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={saving}
                    onClick={handleResetFocus}
                    sx={{ flexShrink: 0 }}
                >
                    Đặt lại giữa
                </Button>
            </Box>

            {typeof onClipConfigChange === 'function' ? (
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel id={`anim-clip-label-${beatId}`}>Hiệu ứng chung (mọi beat)</InputLabel>
                    <Select
                        labelId={`anim-clip-label-${beatId}`}
                        label="Hiệu ứng chung (mọi beat)"
                        value={clipEffect}
                        disabled={clipSaving}
                        onChange={(event) => {
                            handleClipEffectChange(event.target.value as AgentImageAnimationEffect);
                        }}
                    >
                        {AGENT_IMAGE_ANIMATION_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            ) : null}

            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel id={`anim-label-${beatId}`}>Hiệu ứng riêng beat này</InputLabel>
                <Select
                    labelId={`anim-label-${beatId}`}
                    label="Hiệu ứng riêng beat này"
                    value={effect}
                    disabled={saving}
                    onChange={(event) => {
                        handleEffectChange(event.target.value as AgentImageAnimationBeatValue);
                    }}
                >
                    {AGENT_IMAGE_ANIMATION_BEAT_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Điểm tập trung: click vào ảnh — frame cuối sẽ đưa điểm này ra giữa màn hình
            </Typography>

            <Box
                ref={containerRef}
                onClick={handleImageClick}
                sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: `${aspect}`,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'common.black',
                    cursor: 'crosshair',
                    userSelect: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <img
                    src={imageUrl}
                    alt=""
                    draggable={false}
                    onLoad={(event) => {
                        const el = event.currentTarget;
                        setImgNatural({ w: el.naturalWidth || 0, h: el.naturalHeight || 0 });
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        pointerEvents: 'none',
                    }}
                />
                {containRect ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: containRect.x,
                            top: containRect.y,
                            width: containRect.w,
                            height: containRect.h,
                            border: '1px dashed rgba(255,255,255,0.55)',
                            borderRadius: 0.5,
                            pointerEvents: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                ) : null}
                <Tooltip title={`Điểm tập trung (${(focusX * 100).toFixed(0)}%, ${(focusY * 100).toFixed(0)}%)`}>
                    <Box
                        sx={{
                            position: 'absolute',
                            left: typeof dotLeft === 'number' ? dotLeft - 12 : dotLeft,
                            top: typeof dotTop === 'number' ? dotTop - 12 : dotTop,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: '2.5px solid #fff',
                            boxShadow: '0 0 0 2px rgba(33,150,243,0.85), 0 2px 6px rgba(0,0,0,0.5)',
                            bgcolor: 'rgba(33,150,243,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <Box
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: '#fff',
                            }}
                        />
                    </Box>
                </Tooltip>
                {saving ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(0,0,0,0.35)',
                        }}
                    >
                        <CircularProgress size={22} color="inherit" />
                    </Box>
                ) : null}
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, textAlign: 'right' }}>
                Hiệu ứng riêng ưu tiên hơn hiệu ứng chung; random: mỗi beat khác nhau, không trùng 2 beat liền kề
            </Typography>
        </Box>
    );
}
