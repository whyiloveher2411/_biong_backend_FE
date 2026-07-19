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
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { getImageUrl } from 'helpers/image';
import {
    AVATAR_COMPOSITE_EYE_KEYS,
    AVATAR_COMPOSITE_MOUTH_KEYS,
    AVATAR_COMPOSITE_STATE_KEYS,
    AVATAR_SLICE_FIELD_LABELS,
    AvatarCompositeHints,
    AvatarCompositeStateKey,
    AvatarCompositeStateTransform,
    DEFAULT_AVATAR_COMPOSITE_HINTS,
    buildShortVideoAvatarDemo,
    parseAvatarCompositeHints,
    resolveAvatarCompositeState,
    saveShortVideoAvatarCompositeHints,
    seedAvatarCompositeByState,
    updateAvatarCompositeState,
} from './shortVideoAvatarGeminiWorkflow';

type Props = {
    open: boolean;
    onClose: () => void;
    avatarId: number;
    post: JsonFormat | null;
    initialHints: AvatarCompositeHints;
    /** Đồng bộ hints realtime về parent (để Demo dùng đúng vị trí đang chỉnh). */
    onHintsChange?: (hints: AvatarCompositeHints) => void;
    onSaved: (payload: {
        post?: JsonFormat;
        composite_hints?: AvatarCompositeHints;
    }) => void;
    /** Demo build xong (từ nút trong editor — dùng đúng hints local). */
    onDemoBuilt?: (payload: {
        demo_url?: string;
        combo_count?: number;
        composite_hints?: AvatarCompositeHints;
        post?: JsonFormat;
    }) => void;
    onError: (message: string) => void;
};

const KEY_COLORS: Record<AvatarCompositeStateKey, string> = {
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

const HANDLE_SIZE = 12;
/** Bước dịch phím mũi tên / nút nudge (px trên ảnh gốc). */
const NUDGE_PX = 1;

function fieldUrl(post: JsonFormat | null | undefined, field: string): string {
    if (!post) {
        return '';
    }
    return getImageUrl(post[field] as string | undefined) || '';
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

type DragMode = 'move' | 'scale';

export default function ShortVideoAvatarCompositeEditor({
    open,
    onClose,
    avatarId,
    post,
    initialHints,
    onHintsChange,
    onSaved,
    onDemoBuilt,
    onError,
}: Props) {
    const stageRef = React.useRef<HTMLDivElement | null>(null);
    const [hints, setHints] = React.useState<AvatarCompositeHints>(() =>
        seedAvatarCompositeByState(initialHints),
    );
    const [activeKey, setActiveKey] = React.useState<AvatarCompositeStateKey>('eyes_open');
    const [visited, setVisited] = React.useState<Set<AvatarCompositeStateKey>>(() => new Set());
    const [saving, setSaving] = React.useState(false);
    const [demoBusy, setDemoBusy] = React.useState(false);
    const busy = saving || demoBusy;
    const hintsRef = React.useRef(hints);
    hintsRef.current = hints;
    const [baseSize, setBaseSize] = React.useState({ width: 0, height: 0 });
    const [fitScale, setFitScale] = React.useState(1);
    const [layerNatural, setLayerNatural] = React.useState<Record<string, { w: number; h: number }>>(
        {},
    );
    const [drafts, setDrafts] = React.useState<Record<string, string>>({});
    const dragRef = React.useRef<{
        mode: DragMode;
        startX: number;
        startY: number;
        startTransform: AvatarCompositeStateTransform;
        startLayerW: number;
        contentW: number;
        contentH: number;
    } | null>(null);
    const wasOpenRef = React.useRef(false);
    const onHintsChangeRef = React.useRef(onHintsChange);
    onHintsChangeRef.current = onHintsChange;
    const fitScaleRef = React.useRef(1);
    const contentBoxRef = React.useRef({ x: 0, y: 0, w: 1, h: 1 });
    const patchActiveRef = React.useRef<(patch: Partial<AvatarCompositeStateTransform>) => void>(
        () => undefined,
    );
    const activeTransformRef = React.useRef<AvatarCompositeStateTransform>(
        DEFAULT_AVATAR_COMPOSITE_HINTS.eyes,
    );
    const layerBoxRef = React.useRef({ left: 0, top: 0, w: 1, h: 1, cx: 0, cy: 0 });

    const baseUrl = fieldUrl(post, 'base_face') || fieldUrl(post, 'avatar');
    const activeTransform = resolveAvatarCompositeState(hints, activeKey);
    activeTransformRef.current = activeTransform;
    fitScaleRef.current = fitScale;
    const visitedCount = visited.size;
    const allVisited = visitedCount === AVATAR_COMPOSITE_STATE_KEYS.length;

    // Chỉ seed khi MỞ dialog — không reset khi parent re-render / loadDetail
    React.useEffect(() => {
        if (open && !wasOpenRef.current) {
            const seeded = seedAvatarCompositeByState(initialHints);
            setHints(seeded);
            setActiveKey('eyes_open');
            // Đã seed đủ 11 state → cho phép Lưu ngay (vẫn nên duyệt sidebar)
            setVisited(new Set(AVATAR_COMPOSITE_STATE_KEYS));
            setDrafts({});
            setLayerNatural({});
        }
        if (!open && wasOpenRef.current) {
            // Đóng dialog: ép sync hints local → parent (tránh mất chỉnh khi Demo ngoài)
            onHintsChangeRef.current?.(seedAvatarCompositeByState(hintsRef.current));
        }
        wasOpenRef.current = open;
    }, [open]);

    React.useEffect(() => {
        if (!open || !onHintsChangeRef.current) {
            return;
        }
        onHintsChangeRef.current(seedAvatarCompositeByState(hints));
    }, [open, hints]);

    React.useEffect(() => {
        if (!open || !activeKey) {
            return;
        }
        setVisited((prev) => {
            if (prev.has(activeKey)) {
                return prev;
            }
            const next = new Set(prev);
            next.add(activeKey);
            return next;
        });
    }, [open, activeKey]);

    const markVisited = React.useCallback((key: AvatarCompositeStateKey) => {
        setVisited((prev) => {
            if (prev.has(key)) {
                return prev;
            }
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    }, []);

    const updateFit = React.useCallback(() => {
        if (!baseSize.width || !stageRef.current) {
            return;
        }
        const maxW = Math.max(280, stageRef.current.clientWidth - 16);
        const maxH = Math.max(240, (typeof window !== 'undefined' ? window.innerHeight : 800) - 320);
        const fit = Math.min(maxW / baseSize.width, maxH / baseSize.height, 1);
        setFitScale(fit);
    }, [baseSize]);

    React.useEffect(() => {
        updateFit();
        window.addEventListener('resize', updateFit);
        return () => window.removeEventListener('resize', updateFit);
    }, [updateFit]);

    const contentBox = React.useMemo(() => {
        // WYSIWYG: neo theo toàn ảnh base_face (khớp demo faceW/faceH trên canvas)
        return { x: 0, y: 0, w: baseSize.width || 1, h: baseSize.height || 1 };
    }, [baseSize]);
    contentBoxRef.current = contentBox;

    const layerBox = React.useMemo(() => {
        const nat = layerNatural[activeKey];
        const aspect = nat && nat.w > 0 ? nat.h / nat.w : 0.35;
        const w = contentBox.w * activeTransform.scale_to_face_width;
        const h = Math.max(2, w * aspect);
        const cx =
            contentBox.x +
            contentBox.w * activeTransform.anchor_x_ratio +
            activeTransform.offset_x_px;
        const cy =
            contentBox.y +
            contentBox.h * activeTransform.anchor_y_ratio +
            activeTransform.offset_y_px;
        return {
            left: cx - w / 2,
            top: cy - h / 2,
            w,
            h,
            cx,
            cy,
        };
    }, [activeKey, activeTransform, contentBox, layerNatural]);
    layerBoxRef.current = layerBox;

    const onBaseLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setBaseSize({ width: img.naturalWidth, height: img.naturalHeight });
        // Lưu kích thước ảnh để demo scale offset_*_px (native → canvas)
        setHints((prev) => ({
            ...prev,
            content_bbox: {
                minX: 0,
                minY: 0,
                w: img.naturalWidth,
                h: img.naturalHeight,
            },
        }));
    };

    const onLayerLoad = (key: AvatarCompositeStateKey, e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setLayerNatural((prev) => ({
            ...prev,
            [key]: { w: img.naturalWidth, h: img.naturalHeight },
        }));
    };

    const patchActive = React.useCallback(
        (patch: Partial<AvatarCompositeStateTransform>) => {
            setHints((prev) => updateAvatarCompositeState(prev, activeKey, patch));
            markVisited(activeKey);
        },
        [activeKey, markVisited],
    );
    patchActiveRef.current = patchActive;

    const nudgeActive = React.useCallback(
        (dx: number, dy: number) => {
            setHints((prev) => {
                const cur = resolveAvatarCompositeState(prev, activeKey);
                return updateAvatarCompositeState(prev, activeKey, {
                    offset_x_px: Math.round(cur.offset_x_px + dx),
                    offset_y_px: Math.round(cur.offset_y_px + dy),
                });
            });
            markVisited(activeKey);
            setDrafts({});
        },
        [activeKey, markVisited],
    );

    React.useEffect(() => {
        if (!open || busy) {
            return undefined;
        }
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase() || '';
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
                return;
            }
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowLeft') {
                dx = -NUDGE_PX;
            } else if (e.key === 'ArrowRight') {
                dx = NUDGE_PX;
            } else if (e.key === 'ArrowUp') {
                dy = -NUDGE_PX;
            } else if (e.key === 'ArrowDown') {
                dy = NUDGE_PX;
            } else {
                return;
            }
            e.preventDefault();
            nudgeActive(dx, dy);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, busy, nudgeActive]);

    // Listener ổn định identity — tránh bị remove giữa chừng khi setState (bug kéo không ghi nhận)
    const onWindowPointerMove = React.useCallback((e: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) {
            return;
        }
        const scale = fitScaleRef.current || 1;
        const box = contentBoxRef.current;
        const dx = (e.clientX - drag.startX) / scale;
        const dy = (e.clientY - drag.startY) / scale;
        if (drag.mode === 'move') {
            const nextCx =
                box.x +
                box.w * drag.startTransform.anchor_x_ratio +
                drag.startTransform.offset_x_px +
                dx;
            const nextCy =
                box.y +
                box.h * drag.startTransform.anchor_y_ratio +
                drag.startTransform.offset_y_px +
                dy;
            patchActiveRef.current({
                anchor_x_ratio: clamp((nextCx - box.x) / box.w, -0.2, 1.2),
                anchor_y_ratio: clamp((nextCy - box.y) / box.h, -0.2, 1.2),
                offset_x_px: 0,
                offset_y_px: 0,
            });
            return;
        }
        const nextW = Math.max(8, drag.startLayerW + dx);
        const nextScale = clamp(nextW / drag.contentW, 0.04, 1.2);
        patchActiveRef.current({ scale_to_face_width: +nextScale.toFixed(4) });
    }, []);

    const onWindowPointerUp = React.useCallback(() => {
        if (!dragRef.current) {
            return;
        }
        dragRef.current = null;
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
    }, [onWindowPointerMove]);

    const startDrag = (mode: DragMode, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const box = contentBoxRef.current;
        const lb = layerBoxRef.current;
        dragRef.current = {
            mode,
            startX: e.clientX,
            startY: e.clientY,
            startTransform: { ...activeTransformRef.current },
            startLayerW: lb.w,
            contentW: box.w,
            contentH: box.h,
        };
        try {
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        } catch {
            /* ignore */
        }
        window.addEventListener('pointermove', onWindowPointerMove);
        window.addEventListener('pointerup', onWindowPointerUp);
        window.addEventListener('pointercancel', onWindowPointerUp);
    };

    React.useEffect(
        () => () => {
            window.removeEventListener('pointermove', onWindowPointerMove);
            window.removeEventListener('pointerup', onWindowPointerUp);
            window.removeEventListener('pointercancel', onWindowPointerUp);
        },
        [onWindowPointerMove, onWindowPointerUp],
    );

    const draftKey = (field: keyof AvatarCompositeStateTransform) => `${activeKey}.${field}`;

    const getFieldValue = (field: keyof AvatarCompositeStateTransform) => {
        const dk = draftKey(field);
        if (Object.prototype.hasOwnProperty.call(drafts, dk)) {
            return drafts[dk];
        }
        return String(activeTransform[field] ?? '');
    };

    const onFieldChange = (field: keyof AvatarCompositeStateTransform, raw: string) => {
        const dk = draftKey(field);
        setDrafts((prev) => ({ ...prev, [dk]: raw }));
        const trimmed = raw.trim();
        if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
            return;
        }
        const n = Number(trimmed);
        if (!Number.isFinite(n)) {
            return;
        }
        if (field === 'offset_x_px' || field === 'offset_y_px') {
            patchActive({ [field]: Math.round(n) });
        } else if (field !== 'relative_to') {
            patchActive({ [field]: n });
        }
    };

    const onFieldBlur = (field: keyof AvatarCompositeStateTransform) => {
        const dk = draftKey(field);
        const raw = drafts[dk];
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[dk];
            return next;
        });
        if (raw === undefined || field === 'relative_to') {
            return;
        }
        const n = Number(raw.trim());
        if (!Number.isFinite(n)) {
            return;
        }
        if (field === 'offset_x_px' || field === 'offset_y_px') {
            patchActive({ [field]: Math.round(n) });
        } else {
            patchActive({ [field]: n });
        }
    };

    const handleReset = () => {
        setHints(seedAvatarCompositeByState(DEFAULT_AVATAR_COMPOSITE_HINTS));
        setVisited(new Set(AVATAR_COMPOSITE_STATE_KEYS));
        setDrafts({});
        setActiveKey('eyes_open');
    };

    const handleSave = async () => {
        if (!avatarId) {
            onError('Chưa xác định avatar');
            return;
        }
        setSaving(true);
        try {
            const payload = seedAvatarCompositeByState(hints);
            onHintsChangeRef.current?.(payload);
            const result = await saveShortVideoAvatarCompositeHints({
                avatarId,
                compositeHints: payload,
            });
            onSaved({
                post: result.post,
                composite_hints: parseAvatarCompositeHints(result.composite_hints || payload),
            });
            onClose();
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Lưu composite thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleDemoNow = async () => {
        if (!avatarId) {
            onError('Chưa xác định avatar');
            return;
        }
        setDemoBusy(true);
        try {
            const payload = seedAvatarCompositeByState(hints);
            onHintsChangeRef.current?.(payload);
            const result = await buildShortVideoAvatarDemo({
                avatarId,
                compositeHints: payload,
                preferClientHints: true,
            });
            const closed = result.applied_eyes_closed_blink;
            onDemoBuilt?.({
                demo_url: result.demo_url,
                combo_count: result.combo_count,
                composite_hints: parseAvatarCompositeHints(result.composite_hints || payload),
                post: result.post,
            });
            if (!result.demo_url && !onDemoBuilt) {
                onError(
                    `Demo xong nhưng thiếu URL. eyes_closed ay=${closed?.anchor_y_ratio ?? '?'}`,
                );
            }
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Build demo thất bại');
        } finally {
            setDemoBusy(false);
        }
    };

    const selectKey = (key: AvatarCompositeStateKey) => {
        setActiveKey(key);
        setDrafts({});
    };

    const stageW = Math.round(baseSize.width * fitScale);
    const stageH = Math.round(baseSize.height * fitScale);

    let groupKeys: AvatarCompositeStateKey[] = [];
    if (activeKey.startsWith('eyes_')) {
        groupKeys = AVATAR_COMPOSITE_EYE_KEYS.slice() as AvatarCompositeStateKey[];
    } else {
        groupKeys = AVATAR_COMPOSITE_MOUTH_KEYS.slice() as AvatarCompositeStateKey[];
    }
    const ghostKeys: AvatarCompositeStateKey[] = groupKeys.filter(
        (k: AvatarCompositeStateKey) => k !== activeKey,
    );

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            fullWidth
            maxWidth="xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            disableEnforceFocus
        >
            <DialogTitle sx={{ pr: 6 }}>
                Quản lý composite — kéo / scale từng trạng thái
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    disabled={busy}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {!baseUrl ? (
                    <Typography color="error">
                        Thiếu base_face / master — hãy build asset trước.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
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
                                    color={allVisited ? 'success' : 'default'}
                                    label={`${visitedCount}/11`}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Chọn state → kéo / scale
                                </Typography>
                            </Stack>
                            <List dense disablePadding>
                                {AVATAR_COMPOSITE_STATE_KEYS.map((key) => {
                                    const done = visited.has(key);
                                    const url = fieldUrl(post, key);
                                    return (
                                        <ListItemButton
                                            key={key}
                                            selected={activeKey === key}
                                            onClick={() => selectKey(key)}
                                            disabled={busy || !url}
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
                                                primary={
                                                    AVATAR_SLICE_FIELD_LABELS[
                                                        key as keyof typeof AVATAR_SLICE_FIELD_LABELS
                                                    ] || key
                                                }
                                                secondary={url ? (done ? 'đã duyệt' : 'chưa duyệt') : 'thiếu ảnh'}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                                secondaryTypographyProps={{ variant: 'caption' }}
                                            />
                                            {done ? (
                                                <Chip size="small" label="OK" color="success" />
                                            ) : null}
                                        </ListItemButton>
                                    );
                                })}
                            </List>
                        </Box>

                        <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                                {(
                                    [
                                        ['scale_to_face_width', 'scale'],
                                        ['anchor_x_ratio', 'anchor X'],
                                        ['anchor_y_ratio', 'anchor Y'],
                                        ['offset_x_px', 'offset X'],
                                        ['offset_y_px', 'offset Y'],
                                    ] as const
                                ).map(([field, label]) => (
                                    <TextField
                                        key={field}
                                        label={label}
                                        size="small"
                                        type="text"
                                        inputMode="decimal"
                                        value={getFieldValue(field)}
                                        onChange={(e) => onFieldChange(field, e.target.value)}
                                        onBlur={() => onFieldBlur(field)}
                                        sx={{ width: 110 }}
                                        disabled={busy}
                                    />
                                ))}
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '28px 28px 28px',
                                        gridTemplateRows: '28px 28px 28px',
                                        gap: 0.25,
                                        ml: 0.5,
                                    }}
                                >
                                    <Box />
                                    <IconButton
                                        size="small"
                                        aria-label="lên"
                                        disabled={busy}
                                        onClick={() => nudgeActive(0, -NUDGE_PX)}
                                        sx={{ border: '1px solid', borderColor: 'divider', fontSize: 14 }}
                                    >
                                        ↑
                                    </IconButton>
                                    <Box />
                                    <IconButton
                                        size="small"
                                        aria-label="trái"
                                        disabled={busy}
                                        onClick={() => nudgeActive(-NUDGE_PX, 0)}
                                        sx={{ border: '1px solid', borderColor: 'divider', fontSize: 14 }}
                                    >
                                        ←
                                    </IconButton>
                                    <Box />
                                    <IconButton
                                        size="small"
                                        aria-label="phải"
                                        disabled={busy}
                                        onClick={() => nudgeActive(NUDGE_PX, 0)}
                                        sx={{ border: '1px solid', borderColor: 'divider', fontSize: 14 }}
                                    >
                                        →
                                    </IconButton>
                                    <Box />
                                    <IconButton
                                        size="small"
                                        aria-label="xuống"
                                        disabled={busy}
                                        onClick={() => nudgeActive(0, NUDGE_PX)}
                                        sx={{ border: '1px solid', borderColor: 'divider', fontSize: 14 }}
                                    >
                                        ↓
                                    </IconButton>
                                    <Box />
                                </Box>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Neo theo toàn ảnh base_face. Sau khi kéo lệch, bấm «Demo ngay» (ghi DB
                                rồi build — không dùng layout.json cũ). State: {activeKey} · anchor (
                                {activeTransform.anchor_x_ratio.toFixed(3)},{' '}
                                {activeTransform.anchor_y_ratio.toFixed(3)}) · scale{' '}
                                {activeTransform.scale_to_face_width.toFixed(3)}
                            </Typography>
                            <Box
                                ref={stageRef}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    overflow: 'auto',
                                    bgcolor: '#111',
                                    p: 1,
                                    maxHeight: { xs: 360, md: '62vh' },
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: stageW || '100%',
                                        height: stageH || 320,
                                        flexShrink: 0,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={baseUrl}
                                        alt="base face"
                                        onLoad={onBaseLoad}
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'fill',
                                            userSelect: 'none',
                                            pointerEvents: 'none',
                                        }}
                                        draggable={false}
                                    />
                                    {baseSize.width > 0 ? (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                width: '100%',
                                                height: '100%',
                                                border: '1px dashed rgba(76, 175, 80, 0.5)',
                                                pointerEvents: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    ) : null}
                                    {/* ghost cùng nhóm */}
                                    {ghostKeys.map((key: AvatarCompositeStateKey) => {
                                        const url = fieldUrl(post, key);
                                        if (!url) {
                                            return null;
                                        }
                                        const t = resolveAvatarCompositeState(hints, key);
                                        const nat = layerNatural[key];
                                        const aspect = nat && nat.w > 0 ? nat.h / nat.w : 0.35;
                                        const w = contentBox.w * t.scale_to_face_width;
                                        const h = Math.max(2, w * aspect);
                                        const cx =
                                            contentBox.x +
                                            contentBox.w * t.anchor_x_ratio +
                                            t.offset_x_px;
                                        const cy =
                                            contentBox.y +
                                            contentBox.h * t.anchor_y_ratio +
                                            t.offset_y_px;
                                        return (
                                            <img
                                                key={key}
                                                src={url}
                                                alt=""
                                                onLoad={(e: React.SyntheticEvent<HTMLImageElement>) =>
                                                    onLayerLoad(key, e)
                                                }
                                                style={{
                                                    position: 'absolute',
                                                    left: cx * fitScale,
                                                    top: cy * fitScale,
                                                    width: w * fitScale,
                                                    height: h * fitScale,
                                                    transform: 'translate(-50%, -50%)',
                                                    opacity: 0.22,
                                                    pointerEvents: 'none',
                                                    userSelect: 'none',
                                                }}
                                                draggable={false}
                                            />
                                        );
                                    })}
                                    {fieldUrl(post, activeKey) ? (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: layerBox.left * fitScale,
                                                top: layerBox.top * fitScale,
                                                width: layerBox.w * fitScale,
                                                height: layerBox.h * fitScale,
                                                border: '2px solid',
                                                borderColor: KEY_COLORS[activeKey],
                                                boxSizing: 'border-box',
                                                cursor: busy ? 'wait' : 'move',
                                                touchAction: 'none',
                                            }}
                                            onPointerDown={(e: React.PointerEvent) =>
                                                startDrag('move', e)
                                            }
                                        >
                                            <img
                                                src={fieldUrl(post, activeKey)}
                                                alt={activeKey}
                                                onLoad={(e: React.SyntheticEvent<HTMLImageElement>) =>
                                                    onLayerLoad(activeKey, e)
                                                }
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'fill',
                                                    display: 'block',
                                                    pointerEvents: 'none',
                                                    userSelect: 'none',
                                                }}
                                                draggable={false}
                                            />
                                            <Box
                                                onPointerDown={(e: React.PointerEvent) =>
                                                    startDrag('scale', e)
                                                }
                                                sx={{
                                                    position: 'absolute',
                                                    right: -HANDLE_SIZE / 2,
                                                    bottom: -HANDLE_SIZE / 2,
                                                    width: HANDLE_SIZE,
                                                    height: HANDLE_SIZE,
                                                    bgcolor: KEY_COLORS[activeKey],
                                                    border: '2px solid #fff',
                                                    borderRadius: '2px',
                                                    cursor: 'nwse-resize',
                                                    touchAction: 'none',
                                                }}
                                            />
                                        </Box>
                                    ) : (
                                        <Typography
                                            variant="body2"
                                            sx={{ color: '#fff', position: 'absolute', p: 2 }}
                                        >
                                            Thiếu ảnh {activeKey}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Stack>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
                <Button
                    startIcon={<RestartAltOutlinedIcon />}
                    onClick={handleReset}
                    disabled={busy}
                >
                    Reset
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} disabled={busy}>
                    Đóng
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleDemoNow}
                    disabled={busy || !baseUrl || !avatarId}
                    startIcon={
                        demoBusy ? <CircularProgress size={14} color="inherit" /> : undefined
                    }
                >
                    Demo ngay
                </Button>
                <Button
                    variant="contained"
                    startIcon={
                        saving ? (
                            <CircularProgress size={14} color="inherit" />
                        ) : (
                            <SaveOutlinedIcon />
                        )
                    }
                    onClick={handleSave}
                    disabled={busy || !baseUrl || !avatarId}
                >
                    Lưu ({visitedCount}/11)
                </Button>
            </DialogActions>
        </Dialog>
    );
}
