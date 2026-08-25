import React from 'react';
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';
import type { BeatRegionPoint } from './agentVideoApi';

type Props = {
    /** Ảnh upload / URL trực tiếp — ưu tiên hơn crop vùng. */
    imageUrl?: string | null;
    /** Ảnh beat gốc để crop theo polygon vùng. */
    beatImageUrl?: string | null;
    /** Điểm normalized 0–1 của vùng (cần ≥ 3). */
    regionPoints?: BeatRegionPoint[] | null;
    label?: string;
    onNotify?: (text: string, variant?: 'success' | 'warning' | 'error' | 'info') => void;
};

function polygonBBox(points: BeatRegionPoint[]): { minX: number; minY: number; w: number; h: number } {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
        minX,
        minY,
        w: Math.max(0.001, Math.max(...xs) - minX),
        h: Math.max(0.001, Math.max(...ys) - minY),
    };
}

/**
 * Ảnh /uploads/agent-renders/*: proxy qua API admin (đã có CORS + auth).
 * Chỉ dùng khi Copy.
 */
function resolveFetchableImageUrl(rawUrl: string): string {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) {
        return '';
    }
    const match = trimmed.match(/\/uploads\/agent-renders\/([^?#]+)/i);
    if (!match) {
        return trimmed;
    }
    const relPath = decodeURIComponent(match[1] || '').replace(/^\/+/, '');
    if (!relPath || relPath.includes('..')) {
        return trimmed;
    }
    const token = getAccessToken() ?? '';
    const url = new URL(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/stream-agent-local-image',
        ),
    );
    url.searchParams.set('path', relPath);
    if (token) {
        url.searchParams.set('access_token', token);
    }
    url.searchParams.set('v', String(Date.now()));
    return url.toString();
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Không tải được ảnh'));
        img.src = url;
    });
}

/** Fetch → blob (CORS) — chỉ cho Copy clipboard. */
async function loadImageViaFetch(url: string): Promise<{ img: HTMLImageElement; objectUrl: string; blob: Blob }> {
    const candidates = [resolveFetchableImageUrl(url)];
    if (candidates[0] !== url) {
        candidates.push(url);
    }
    let blob: Blob | null = null;
    let lastError: unknown = null;
    for (const candidate of candidates) {
        const isApiProxy = candidate.includes('stream-agent-local-image');
        const modes: Array<RequestCredentials> = isApiProxy ? ['include', 'omit'] : ['omit'];
        for (const credentials of modes) {
            try {
                const res = await fetch(candidate, {
                    mode: 'cors',
                    credentials,
                    cache: 'no-store',
                });
                if (!res.ok) {
                    lastError = new Error(`Fetch ảnh thất bại (${res.status})`);
                    continue;
                }
                blob = await res.blob();
                break;
            } catch (e) {
                lastError = e;
            }
        }
        if (blob) {
            break;
        }
    }
    if (!blob) {
        throw lastError instanceof Error ? lastError : new Error('Không tải được ảnh');
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
        const img = await loadHtmlImage(objectUrl);
        return { img, objectUrl, blob };
    } catch (e) {
        URL.revokeObjectURL(objectUrl);
        throw e;
    }
}

async function blobToPng(blob: Blob): Promise<Blob> {
    if (blob.type === 'image/png') {
        return blob;
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
        const img = await loadHtmlImage(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, img.naturalWidth || img.width);
        canvas.height = Math.max(1, img.naturalHeight || img.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas không khả dụng');
        }
        ctx.drawImage(img, 0, 0);
        const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!png) {
            throw new Error('Không tạo được PNG');
        }
        return png;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function copyPngBlob(blob: Blob): Promise<void> {
    const png = await blobToPng(blob);
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Trình duyệt không hỗ trợ copy ảnh');
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

/** Vẽ cutout lên canvas — dùng cho preview (kể cả canvas tainted vẫn hiện đúng pixel). */
function paintRegionCutout(
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    points: BeatRegionPoint[],
): boolean {
    if (points.length < 3) {
        return false;
    }
    const iw = Math.max(1, img.naturalWidth || img.width);
    const ih = Math.max(1, img.naturalHeight || img.height);
    const bbox = polygonBBox(points);
    const pad = 2;
    const sx = Math.max(0, Math.floor(bbox.minX * iw) - pad);
    const sy = Math.max(0, Math.floor(bbox.minY * ih) - pad);
    const sw = Math.min(iw - sx, Math.ceil(bbox.w * iw) + pad * 2);
    const sh = Math.min(ih - sy, Math.ceil(bbox.h * ih) + pad * 2);
    const outW = Math.max(1, sw);
    const outH = Math.max(1, sh);
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return false;
    }
    ctx.clearRect(0, 0, outW, outH);
    ctx.beginPath();
    points.forEach((point, index) => {
        const x = point[0] * iw - sx;
        const y = point[1] * ih - sy;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    return true;
}

function cutoutBlobFromImage(img: HTMLImageElement, points: BeatRegionPoint[]): Promise<Blob> {
    const canvas = document.createElement('canvas');
    if (!paintRegionCutout(canvas, img, points)) {
        return Promise.reject(new Error('Vùng chưa đủ điểm'));
    }
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((out) => {
            if (!out) {
                reject(new Error('Không tạo được ảnh vùng (có thể bị chặn CORS)'));
                return;
            }
            resolve(out);
        }, 'image/png');
    });
}

async function renderRegionCutoutPng(beatImageUrl: string, points: BeatRegionPoint[]): Promise<Blob> {
    const loaded = await loadImageViaFetch(beatImageUrl);
    try {
        const blob = await cutoutBlobFromImage(loaded.img, points);
        URL.revokeObjectURL(loaded.objectUrl);
        return blob;
    } catch (e) {
        URL.revokeObjectURL(loaded.objectUrl);
        throw e;
    }
}

export default function WhiteboardCutoutImagePreview({
    imageUrl,
    beatImageUrl,
    regionPoints,
    label = 'Xem trước',
    onNotify,
}: Props) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const [directUrl, setDirectUrl] = React.useState<string>('');
    const [hasCanvasPreview, setHasCanvasPreview] = React.useState(false);
    const [error, setError] = React.useState<string>('');
    const [copied, setCopied] = React.useState(false);
    const [copying, setCopying] = React.useState(false);
    const [previewLoading, setPreviewLoading] = React.useState(false);

    const pointsKey = React.useMemo(
        () => (regionPoints && regionPoints.length >= 3
            ? regionPoints.map((point) => `${point[0].toFixed(4)},${point[1].toFixed(4)}`).join('|')
            : ''),
        [regionPoints],
    );

    // Preview vùng: vẽ canvas từ ảnh beat (không CORS / không stream) — đúng tỉ lệ pixel.
    React.useEffect(() => {
        let cancelled = false;
        setError('');
        setCopied(false);
        setDirectUrl('');
        setHasCanvasPreview(false);

        const direct = String(imageUrl || '').trim();
        if (direct) {
            setDirectUrl(direct);
            return undefined;
        }

        const beat = String(beatImageUrl || '').trim();
        const points = regionPoints && regionPoints.length >= 3 ? regionPoints : null;
        if (!beat || !points) {
            setError('Chưa có ảnh để xem trước');
            return undefined;
        }

        setPreviewLoading(true);
        const img = new Image();
        img.onload = () => {
            if (cancelled) return;
            const canvas = canvasRef.current;
            if (!canvas) {
                setPreviewLoading(false);
                return;
            }
            const ok = paintRegionCutout(canvas, img, points);
            setHasCanvasPreview(ok);
            if (!ok) {
                setError('Vùng chưa đủ điểm');
            }
            setPreviewLoading(false);
        };
        img.onerror = () => {
            if (!cancelled) {
                setError('Không tải được ảnh');
                setPreviewLoading(false);
            }
        };
        img.src = beat;

        return () => {
            cancelled = true;
        };
    }, [imageUrl, beatImageUrl, pointsKey, regionPoints]);

    const handleCopy = async () => {
        if (copying) return;
        setCopying(true);
        setCopied(false);
        try {
            let blob: Blob | null = null;
            const direct = String(imageUrl || '').trim();
            if (direct) {
                const loaded = await loadImageViaFetch(direct);
                URL.revokeObjectURL(loaded.objectUrl);
                blob = loaded.blob;
            } else if (beatImageUrl && regionPoints && regionPoints.length >= 3) {
                blob = await renderRegionCutoutPng(beatImageUrl, regionPoints);
            }
            if (!blob) {
                throw new Error('Chưa có ảnh để copy');
            }
            await copyPngBlob(blob);
            setCopied(true);
            onNotify?.('Đã copy ảnh vào clipboard', 'success');
            window.setTimeout(() => setCopied(false), 1600);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Không copy được ảnh';
            onNotify?.(msg, 'error');
        } finally {
            setCopying(false);
        }
    };

    const canCopy = (Boolean(directUrl) || hasCanvasPreview) && !error && !previewLoading;

    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 3,
                mb: 1,
                p: 1,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {label}
                </Typography>
                <Tooltip title={copied ? 'Đã copy' : 'Copy ảnh vào clipboard'}>
                    <span>
                        <IconButton
                            size="small"
                            color={copied ? 'success' : 'primary'}
                            disabled={!canCopy || copying}
                            onClick={() => { void handleCopy(); }}
                            aria-label="Copy ảnh vào clipboard"
                        >
                            {copying ? (
                                <CircularProgress size={16} />
                            ) : copied ? (
                                <CheckIcon fontSize="small" />
                            ) : (
                                <ContentCopyIcon fontSize="small" />
                            )}
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    minHeight: 120,
                    maxHeight: 200,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    backgroundImage:
                        'linear-gradient(45deg, #e0e0e0 25%, transparent 25%),'
                        + 'linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),'
                        + 'linear-gradient(45deg, transparent 75%, #e0e0e0 75%),'
                        + 'linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {previewLoading ? (
                    <CircularProgress size={22} />
                ) : error ? (
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1, textAlign: 'center' }}>
                        {error}
                    </Typography>
                ) : null}

                {/* Canvas luôn mount để paint; ẩn khi đang dùng ảnh upload / lỗi. */}
                <Box
                    component="canvas"
                    ref={canvasRef}
                    sx={{
                        display: !directUrl && hasCanvasPreview && !previewLoading && !error ? 'block' : 'none',
                        maxWidth: '100%',
                        maxHeight: 200,
                        width: 'auto',
                        height: 'auto',
                    }}
                />

                {directUrl ? (
                    <Box
                        component="img"
                        src={directUrl}
                        alt={label}
                        draggable={false}
                        sx={{
                            display: 'block',
                            maxWidth: '100%',
                            maxHeight: 200,
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                        }}
                    />
                ) : null}
            </Box>
        </Box>
    );
}
