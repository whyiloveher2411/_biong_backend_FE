import React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import {
    AVATAR_SLICE_ASSET_KEYS,
    AVATAR_SLICE_FIELD_LABELS,
    AvatarPanelRect,
    AvatarPanelsMap,
    AvatarSliceAssetKey,
    buildShortVideoAvatarAssets,
    fetchShortVideoAvatarLayoutPanels,
    fetchShortVideoAvatarSpriteFile,
} from './shortVideoAvatarGeminiWorkflow';

type Props = {
    open: boolean;
    onClose: () => void;
    avatarId: number;
    sourceFile: string;
    onBuilt: (payload: {
        post?: JsonFormat;
        composite_hints?: unknown;
        asset_count?: number;
        fields_synced?: string[];
        fields_failed?: Array<{ field: string; error?: string }>;
    }) => void;
    onError: (message: string) => void;
};

const KEY_COLORS: Record<AvatarSliceAssetKey, string> = {
    master: '#42a5f5',
    base_face: '#66bb6a',
    eyes_open: '#ffa726',
    eyes_half_blink: '#ffb74d',
    eyes_closed_blink: '#ffcc80',
    mouth_x: '#ab47bc',
    mouth_a: '#ba68c8',
    mouth_b: '#ce93d8',
    mouth_c: '#e1bee7',
    mouth_d: '#ec407a',
    mouth_e: '#f06292',
    mouth_f: '#f48fb1',
    mouth_g: '#f8bbd0',
};

function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): AvatarPanelRect {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.max(1, Math.abs(b.x - a.x));
    const h = Math.max(1, Math.abs(b.y - a.y));
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function clampPoint(x: number, y: number, width: number, height: number) {
    return {
        x: Math.max(0, Math.min(width, x)),
        y: Math.max(0, Math.min(height, y)),
    };
}

export default function ShortVideoAvatarSpriteRegionScanner({
    open,
    onClose,
    avatarId,
    sourceFile,
    onBuilt,
    onError,
}: Props) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const imgRef = React.useRef<HTMLImageElement | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [building, setBuilding] = React.useState(false);
    const [imgSize, setImgSize] = React.useState({ width: 0, height: 0 });
    const [dataUrl, setDataUrl] = React.useState('');
    const [activeKey, setActiveKey] = React.useState<AvatarSliceAssetKey>('master');
    const [panels, setPanels] = React.useState<AvatarPanelsMap>({});
    const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
    const [dragCurrent, setDragCurrent] = React.useState<{ x: number; y: number } | null>(null);
    const [scale, setScale] = React.useState(1);

    const doneCount = AVATAR_SLICE_ASSET_KEYS.filter((k) => panels[k]).length;
    const allDone = doneCount === AVATAR_SLICE_ASSET_KEYS.length;

    const load = React.useCallback(async () => {
        if (!open || !sourceFile || !avatarId) {
            return;
        }
        setLoading(true);
        setPanels({});
        setDragStart(null);
        setDragCurrent(null);
        setActiveKey('master');
        try {
            const [sprite, layout] = await Promise.all([
                fetchShortVideoAvatarSpriteFile({ sourceFile }),
                fetchShortVideoAvatarLayoutPanels({ avatarId }).catch(() => ({
                    panels: null as AvatarPanelsMap | null,
                    source: null,
                })),
            ]);
            setDataUrl(sprite.data_url);
            setImgSize({ width: sprite.width, height: sprite.height });

            const fromLayout =
                layout.panels &&
                layout.source &&
                layout.source === sourceFile
                    ? layout.panels
                    : null;
            if (fromLayout) {
                setPanels(fromLayout);
            } else if (sprite.template_panels) {
                setPanels(sprite.template_panels);
            }
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Không tải được sprite');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [open, sourceFile, avatarId, onClose, onError]);

    React.useEffect(() => {
        void load();
    }, [load]);

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDragStart(null);
                setDragCurrent(null);
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                setPanels((prev) => {
                    const next = { ...prev };
                    delete next[activeKey];
                    return next;
                });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, activeKey]);

    const redraw = React.useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !imgSize.width) {
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        const maxW = Math.max(320, canvas.parentElement?.clientWidth || 800);
        const maxH = Math.max(280, (typeof window !== 'undefined' ? window.innerHeight : 800) - 220);
        const fit = Math.min(maxW / imgSize.width, maxH / imgSize.height, 1);
        setScale(fit);
        canvas.width = Math.round(imgSize.width * fit);
        canvas.height = Math.round(imgSize.height * fit);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const drawRect = (key: AvatarSliceAssetKey, rect: AvatarPanelRect, active: boolean) => {
            const color = KEY_COLORS[key];
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = active ? 3 : 1.5;
            ctx.setLineDash(active ? [] : [6, 4]);
            ctx.strokeRect(rect.x * fit, rect.y * fit, rect.w * fit, rect.h * fit);
            ctx.fillStyle = active ? `${color}33` : `${color}18`;
            ctx.fillRect(rect.x * fit, rect.y * fit, rect.w * fit, rect.h * fit);
            ctx.fillStyle = color;
            ctx.font = '12px sans-serif';
            ctx.fillText(key, rect.x * fit + 4, rect.y * fit + 14);
            ctx.restore();
        };

        for (const key of AVATAR_SLICE_ASSET_KEYS) {
            const rect = panels[key];
            if (rect) {
                drawRect(key, rect, key === activeKey);
            }
        }

        if (dragStart && dragCurrent) {
            const preview = normalizeRect(dragStart, dragCurrent);
            drawRect(activeKey, preview, true);
        }
    }, [imgSize, panels, activeKey, dragStart, dragCurrent]);

    React.useEffect(() => {
        if (!dataUrl) {
            return;
        }
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            redraw();
        };
        img.src = dataUrl;
    }, [dataUrl, redraw]);

    React.useEffect(() => {
        redraw();
    }, [redraw]);

    const toImagePoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !scale) {
            return { x: 0, y: 0 };
        }
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        return clampPoint(x, y, imgSize.width, imgSize.height);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (building || loading) {
            return;
        }
        const p = toImagePoint(e);
        setDragStart(p);
        setDragCurrent(p);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!dragStart) {
            return;
        }
        setDragCurrent(toImagePoint(e));
    };

    const handleMouseUp = () => {
        if (!dragStart || !dragCurrent) {
            setDragStart(null);
            setDragCurrent(null);
            return;
        }
        const rect = normalizeRect(dragStart, dragCurrent);
        if (rect.w >= 4 && rect.h >= 4) {
            setPanels((prev) => ({ ...prev, [activeKey]: rect }));
            const idx = AVATAR_SLICE_ASSET_KEYS.indexOf(activeKey);
            if (idx >= 0 && idx < AVATAR_SLICE_ASSET_KEYS.length - 1) {
                const nextKey = AVATAR_SLICE_ASSET_KEYS[idx + 1];
                if (!panels[nextKey]) {
                    setActiveKey(nextKey);
                }
            }
        }
        setDragStart(null);
        setDragCurrent(null);
    };

    const handleClearActive = () => {
        setPanels((prev) => {
            const next = { ...prev };
            delete next[activeKey];
            return next;
        });
    };

    const handleBuild = async () => {
        if (!allDone) {
            onError(`Còn thiếu ${AVATAR_SLICE_ASSET_KEYS.length - doneCount} vùng`);
            return;
        }
        const fullPanels = {} as Record<string, AvatarPanelRect>;
        for (const key of AVATAR_SLICE_ASSET_KEYS) {
            const p = panels[key];
            if (!p) {
                onError(`Thiếu vùng: ${key}`);
                return;
            }
            fullPanels[key] = p;
        }
        setBuilding(true);
        try {
            const result = await buildShortVideoAvatarAssets({
                avatarId,
                sourceFile,
                panels: fullPanels,
            });
            onBuilt(result);
            onClose();
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Build asset thất bại');
        } finally {
            setBuilding(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={building ? undefined : onClose}
            fullWidth
            maxWidth="xl"
            // Dialog portal ra body nhưng React vẫn bubble theo cây component
            // (ActionOnPost nằm trong TableRow navigate) — phải chặn.
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            disableEnforceFocus
        >
            <DialogTitle sx={{ pr: 6 }}>
                Quét vùng sprite — {sourceFile}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    disabled={building}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Stack alignItems="center" py={6} spacing={1}>
                        <CircularProgress size={28} />
                        <Typography variant="body2" color="text.secondary">
                            Đang tải sprite…
                        </Typography>
                    </Stack>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
                            gap: 1.5,
                            minHeight: 420,
                        }}
                    >
                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'auto',
                                maxHeight: { xs: 220, md: '70vh' },
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1 }}>
                                <Chip
                                    size="small"
                                    color={allDone ? 'success' : 'default'}
                                    label={`${doneCount}/13`}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Chọn field → kéo khung trên ảnh
                                </Typography>
                            </Stack>
                            <List dense disablePadding>
                                {AVATAR_SLICE_ASSET_KEYS.map((key) => {
                                    const rect = panels[key];
                                    const has = !!rect;
                                    return (
                                        <ListItemButton
                                            key={key}
                                            selected={activeKey === key}
                                            onClick={() => setActiveKey(key)}
                                            disabled={building}
                                        >
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    bgcolor: KEY_COLORS[key],
                                                    mr: 1,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <ListItemText
                                                primary={AVATAR_SLICE_FIELD_LABELS[key]}
                                                secondary={
                                                    has && rect
                                                        ? `${rect.w}×${rect.h}`
                                                        : 'chưa quét'
                                                }
                                                primaryTypographyProps={{ variant: 'body2' }}
                                                secondaryTypographyProps={{ variant: 'caption' }}
                                            />
                                            {has ? (
                                                <Chip size="small" label="OK" color="success" />
                                            ) : null}
                                        </ListItemButton>
                                    );
                                })}
                            </List>
                        </Box>
                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'auto',
                                bgcolor: '#111',
                                p: 1,
                                maxHeight: { xs: 360, md: '70vh' },
                            }}
                        >
                            <canvas
                                ref={canvasRef}
                                style={{
                                    display: 'block',
                                    cursor: building ? 'wait' : 'crosshair',
                                    maxWidth: '100%',
                                }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
                <Button
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handleClearActive}
                    disabled={building || loading || !panels[activeKey]}
                >
                    Xóa vùng đang chọn
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} disabled={building}>
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    startIcon={
                        building ? (
                            <CircularProgress size={14} color="inherit" />
                        ) : (
                            <ContentCutOutlinedIcon />
                        )
                    }
                    onClick={handleBuild}
                    disabled={building || loading || !allDone}
                >
                    Build asset ({doneCount}/13)
                </Button>
            </DialogActions>
        </Dialog>
    );
}
