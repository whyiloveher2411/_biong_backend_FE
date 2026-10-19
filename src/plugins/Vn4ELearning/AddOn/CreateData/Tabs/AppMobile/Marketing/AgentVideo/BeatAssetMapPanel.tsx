import React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    dispatchModel3dLocateAsset,
    getShortVideoModel3dBeatSlots,
    listShortVideoModel3ds,
    parseShortVideoModel3dApiMessage,
    saveShortVideoModel3dBeatAssetMap,
    type ShortVideoModel3d,
    type ShortVideoModel3dBeatAssetEntry,
    type ShortVideoModel3dBeatSlot,
} from 'helpers/marketingShortVideoModel3dApi';
import Model3dLibraryPickerDrawer from './Model3dLibraryPickerDrawer';

type Props = {
    shortVideoId: number;
    beatId: string;
    /**
     * Nội dung HTML beat hiện tại — đổi (user/AI cập nhật HTML) → panel tự tải lại
     * slot đã được BE quét tự động (không cần bấm «Quét lại»).
     */
    htmlSource?: string;
};

const AUTO = '__auto__';

function clipLabels(model: ShortVideoModel3d | null): string[] {
    if (!model) {
        return [];
    }
    return String(model.clips || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split('|').map((s) => s.trim());
            return parts[1] || parts[0] || '';
        })
        .filter(Boolean);
}

/**
 * Gán model thư viện cho từng asset slot trong HTML beat. Không gán → HTML tự fallback (Assets.has=false).
 * Chọn model qua drawer (không load hết ra ngoài).
 */
export default function BeatAssetMapPanel({ shortVideoId, beatId, htmlSource = '' }: Props) {
    const { showMessage } = useFloatingMessages();
    const [slots, setSlots] = React.useState<ShortVideoModel3dBeatSlot[]>([]);
    const [map, setMap] = React.useState<Record<string, ShortVideoModel3dBeatAssetEntry>>({});
    const [models, setModels] = React.useState<ShortVideoModel3d[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [pickSlot, setPickSlot] = React.useState<ShortVideoModel3dBeatSlot | null>(null);
    const [focusedSlot, setFocusedSlot] = React.useState<string>('');
    const [, setScannedAt] = React.useState<string>('');

    const locateSlot = (slotId: string) => {
        setFocusedSlot((prev) => {
            const next = prev === slotId ? '' : slotId;
            dispatchModel3dLocateAsset(shortVideoId, beatId, next);
            return next;
        });
    };

    const modelById = React.useMemo(() => {
        const out = new Map<number, ShortVideoModel3d>();
        models.forEach((m) => out.set(Number(m.id), m));
        return out;
    }, [models]);

    const reload = React.useCallback(() => {
        if (shortVideoId <= 0 || !beatId) {
            setSlots([]);
            return;
        }
        setLoading(true);
        setError(null);
        getShortVideoModel3dBeatSlots(shortVideoId, beatId)
            .then((res) => {
                setLoading(false);
                if (res?.success === false) {
                    setError(parseShortVideoModel3dApiMessage(res, 'Không đọc được asset trong HTML'));
                    setSlots([]);
                    return;
                }
                setSlots(Array.isArray(res?.slots) ? res.slots : []);
                setMap(res?.map && typeof res.map === 'object' ? res.map : {});
                setScannedAt(String(res?.scanned_at || ''));
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không đọc được asset trong HTML');
            });
    }, [shortVideoId, beatId]);

    React.useEffect(() => {
        reload();
    }, [reload]);

    // BE tự quét slot mỗi khi HTML beat đổi → HTML mới (user dán / AI fill) thì chỉ cần
    // tải lại danh sách slot đã quét, KHÔNG phải bấm «Quét lại» thủ công.
    const htmlSignature = React.useMemo(
        () => (String(htmlSource || '').trim() ? String(htmlSource).trim() : ''),
        [htmlSource],
    );
    const lastHtmlSignatureRef = React.useRef(htmlSignature);
    React.useEffect(() => {
        if (lastHtmlSignatureRef.current === htmlSignature) {
            return undefined;
        }
        lastHtmlSignatureRef.current = htmlSignature;
        // Debounce: HTML state đổi trước khi request lưu beat hoàn tất — chờ BE ghi
        // xong (đã quét slot) rồi mới tải lại để không đọc phải kết quả cũ.
        const timer = window.setTimeout(() => {
            reload();
        }, 800);
        return () => window.clearTimeout(timer);
    }, [htmlSignature, reload]);

    React.useEffect(() => {
        listShortVideoModel3ds()
            .then((res) => setModels(Array.isArray(res?.models) ? res.models : []))
            .catch(() => setModels([]));
    }, []);

    const persist = (next: Record<string, ShortVideoModel3dBeatAssetEntry>) => {
        setMap(next);
        if (shortVideoId <= 0 || !beatId) {
            return;
        }
        setSaving(true);
        saveShortVideoModel3dBeatAssetMap(shortVideoId, beatId, next)
            .then((res) => {
                setSaving(false);
                if (res?.success === false) {
                    showMessage(parseShortVideoModel3dApiMessage(res, 'Không lưu được map asset'), 'error');
                }
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được map asset', 'error');
            });
    };

    const setSlotModel = (slotId: string, modelId: number) => {
        const next = { ...map };
        if (modelId <= 0) {
            delete next[slotId];
        } else {
            next[slotId] = { model_id: modelId, clip_map: next[slotId]?.clip_map || {} };
        }
        persist(next);
    };

    const setSlotClip = (slotId: string, htmlClip: string, target: string) => {
        const entry = map[slotId];
        if (!entry) {
            return;
        }
        const clipMap = { ...(entry.clip_map || {}) };
        if (target === AUTO) {
            delete clipMap[htmlClip];
        } else {
            clipMap[htmlClip] = target;
        }
        persist({ ...map, [slotId]: { ...entry, clip_map: clipMap } });
    };

    return (
        <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                <ViewInArOutlinedIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2">Asset 3D</Typography>
                <Chip size="small" variant="outlined" label={`${slots.length} slot`} />
                {saving ? <CircularProgress size={14} /> : null}
                <Tooltip title="Quét lại asset từ HTML">
                    <span style={{ marginLeft: 'auto' }}>
                        <Button
                            size="small"
                            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
                            onClick={reload}
                            disabled={loading || saving}
                            sx={{ textTransform: 'none' }}
                        >
                            Quét lại
                        </Button>
                    </span>
                </Tooltip>
            </Stack>

            {error ? (
                <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                    {error}
                </Typography>
            ) : null}

            {loading ? (
                <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={20} />
                </Box>
            ) : null}

            {!loading && slots.length === 0 && !error ? (
                <Typography variant="caption" color="text.secondary">
                    HTML chưa dùng model asset nào.
                </Typography>
            ) : null}

            {!loading && slots.length > 0 ? (
                <Stack spacing={0.75}>
                    {slots.map((slot) => {
                        const entry = map[slot.id];
                        const modelId = entry?.model_id || 0;
                        const chosen = modelById.get(modelId) || null;
                        const isPersonModel = (chosen?.kind || 'prop') === 'person';
                        const clips = isPersonModel ? clipLabels(chosen) : [];
                        return (
                            <Box
                                key={slot.id}
                                sx={{
                                    border: '1px solid',
                                    borderColor: chosen ? 'primary.main' : 'divider',
                                    borderRadius: 1.5,
                                    p: 1,
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Chip size="small" color="primary" variant="outlined" label={slot.id} sx={{ fontWeight: 700 }} />
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={slot.kind === 'person' ? 'person' : (slot.kind === 'prop' ? 'prop' : 'model')}
                                    />
                                    {slot.clips.map((clip) => (
                                        <Chip key={clip} size="small" variant="outlined" label={clip} />
                                    ))}
                                    <Box sx={{ flex: 1, minWidth: 8 }} />

                                    {chosen ? (
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Box sx={{ width: 28, height: 28, borderRadius: 0.75, bgcolor: 'grey.100', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {chosen.thumbnail_url ? (
                                                    <Box component="img" src={chosen.thumbnail_url} alt={chosen.slug} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                ) : (
                                                    <ViewInArOutlinedIcon fontSize="small" color="disabled" />
                                                )}
                                            </Box>
                                            <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>{chosen.slug}</Typography>
                                            <Tooltip title={focusedSlot === slot.id ? 'Bỏ định vị' : 'Định vị (bay camera tới model)'}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color={focusedSlot === slot.id ? 'primary' : 'default'}
                                                        onClick={() => locateSlot(slot.id)}
                                                    >
                                                        <CenterFocusStrongOutlinedIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Đổi model">
                                                <span>
                                                    <IconButton size="small" onClick={() => setPickSlot(slot)} disabled={saving}>
                                                        <SwapHorizIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Bỏ gán (HTML tự fallback)">
                                                <span>
                                                    <IconButton size="small" color="error" onClick={() => setSlotModel(slot.id, 0)} disabled={saving}>
                                                        <CloseIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Tooltip title={focusedSlot === slot.id ? 'Bỏ định vị' : 'Định vị (nếu HTML có tag object cho slot này)'}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color={focusedSlot === slot.id ? 'primary' : 'default'}
                                                        onClick={() => locateSlot(slot.id)}
                                                    >
                                                        <CenterFocusStrongOutlinedIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Button
                                                size="small"
                                                variant="text"
                                                startIcon={<AddOutlinedIcon fontSize="small" />}
                                                onClick={() => setPickSlot(slot)}
                                                disabled={saving}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Gán model
                                            </Button>
                                        </Stack>
                                    )}
                                </Stack>

                                {chosen && clips.length > 0 && slot.clips.length > 0 ? (
                                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                        {slot.clips.map((htmlClip) => (
                                            <Stack key={htmlClip} direction="row" spacing={1} alignItems="center">
                                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }} noWrap>
                                                    {htmlClip}
                                                </Typography>
                                                <TextField
                                                    select
                                                    size="small"
                                                    value={entry?.clip_map?.[htmlClip] ?? AUTO}
                                                    onChange={(e) => setSlotClip(slot.id, htmlClip, e.target.value)}
                                                    sx={{ flex: 1, minWidth: 0 }}
                                                >
                                                    <MenuItem value={AUTO}>— Tự động (theo tên) —</MenuItem>
                                                    {clips.map((label) => (
                                                        <MenuItem key={label} value={label}>{label}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </Stack>
                                        ))}
                                    </Stack>
                                ) : null}
                            </Box>
                        );
                    })}
                </Stack>
            ) : null}

            <Model3dLibraryPickerDrawer
                open={Boolean(pickSlot)}
                onClose={() => setPickSlot(null)}
                models={models}
                mode="single"
                kind={pickSlot?.kind === 'person' || pickSlot?.kind === 'prop' ? pickSlot.kind : ''}
                title={pickSlot ? `Chọn model cho slot “${pickSlot.id}”` : 'Chọn model'}
                onPick={(id) => {
                    if (pickSlot) {
                        setSlotModel(pickSlot.id, id);
                    }
                }}
            />
        </Box>
    );
}
