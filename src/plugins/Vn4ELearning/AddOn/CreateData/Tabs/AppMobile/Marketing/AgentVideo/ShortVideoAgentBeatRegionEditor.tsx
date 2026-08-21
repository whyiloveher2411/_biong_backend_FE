import React from 'react';
import { keyframes } from '@emotion/react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Slider,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SaveIcon from '@mui/icons-material/Save';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import VideocamIcon from '@mui/icons-material/Videocam';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { LoadingButton } from '@mui/lab';
import useAjax from 'hook/useApi';
import { resolveAgentLocalVideoOpenUrl } from 'helpers/shortVideoVisualClips';
import { isKeyboardEditableTarget } from 'helpers/shortVideoEditorKeyboard';
import type { useAgentVideoContent } from './useAgentVideoContent';
import ShortVideoAgentImageAnimationControls from './ShortVideoAgentImageAnimationControls';
import WhiteboardRegionTimeline from './WhiteboardRegionTimeline';
import { getBeatTimelineSegments } from './agentVideoBeatMap';
import { resolveAgentVideoBeatTransitionDurationSec } from './agentVideoTimelineModel';
import {
    autoSelectAgentWhiteboardRegion,
    fetchWhiteboardTransitions,
    isPlaceHandlessEffect,
    normalizeNeonColor,
    normalizePlaceEffect,
    normalizePlaceHand,
    NEON_COLOR_OPTIONS,
    PLACE_EFFECT_OPTIONS,
    type AgentWhiteboardBeatOverride,
    type BeatRegion,
    type BeatRegionPoint,
    type WhiteboardTransitionOption,
} from './agentVideoApi';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    beatId: string;
    imageUrl: string;
    onOpenBeatQa?: () => void;
};

const REGION_COLORS = [
    '#f44336',
    '#2196f3',
    '#4caf50',
    '#ff9800',
    '#9c27b0',
    '#00bcd4',
    '#795548',
    '#e91e63',
    '#3f51b5',
    '#8bc34a',
];

/** Ray casting — kiểm tra điểm (x,y) chuẩn hóa 0-1 có nằm trong polygon không. */
function pointInPolygon(x: number, y: number, points: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0];
        const yi = points[i][1];
        const xj = points[j][0];
        const yj = points[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
}

function polygonArea(points: [number, number][]): number {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area += points[j][0] * points[i][1] - points[i][0] * points[j][1];
    }
    return Math.abs(area) / 2;
}

function parseRatio(value: unknown, fallback: number): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : fallback;
}

/** Vùng cha = vùng NHỎ NHẤT chứa centroid của polygon mới (con nằm trong cha). */
function resolveParentRegion(
    pts: [number, number][],
    regions: BeatRegion[],
): string | null {
    if (pts.length === 0 || regions.length === 0) {
        return null;
    }
    const cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
    const cy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
    let bestId: string | null = null;
    let bestArea = Infinity;
    for (const region of regions) {
        if (!pointInPolygon(cx, cy, region.points)) {
            continue;
        }
        const area = polygonArea(region.points);
        if (area < bestArea) {
            bestArea = area;
            bestId = region.id;
        }
    }
    return bestId;
}

/**
 * CHA TRƯỚC CON TRONG TIMELINE: vùng con chỉ được chọn từ script SAU từ cuối
 * của vùng cha — con không bao giờ render trước cha. Hàm này TỰ ĐIỀU CHỈNH các
 * script word của vùng con vi phạm (nâng lên sau từ cuối cha) — đồng bộ với
 * backend marketing_short_video_agent_enforce_region_parent_child_order.
 * Trả danh sách MỚI (không mutate input).
 */
function enforceRegionChildOrder(list: BeatRegion[]): BeatRegion[] {
    if (list.length === 0) {
        return list;
    }
    const depth: Record<string, number> = {};
    const computeDepth = (id: string, seen: Set<string>): number => {
        if (depth[id] !== undefined) return depth[id];
        if (seen.has(id)) return 0;
        seen.add(id);
        const r = list.find((x) => x.id === id);
        const pid = r?.parent_id || null;
        depth[id] = pid ? 1 + computeDepth(pid, seen) : 0;
        return depth[id];
    };
    list.forEach((r) => computeDepth(r.id, new Set()));
    const sorted = [...list].sort((a, b) => (depth[a.id] ?? 0) - (depth[b.id] ?? 0));
    const byId: Record<string, BeatRegion> = {};
    sorted.forEach((r) => { byId[r.id] = r; });
    const fixed: BeatRegion[] = [];
    for (const r of sorted) {
        const next = { ...r };
        const pid = r.parent_id || null;
        if (pid && byId[pid]) {
            const parent = byId[pid];
            const pEnd = parent.script_end_word ?? -1;
            if (pEnd >= 0) {
                if (next.script_end_word != null && next.script_end_word <= pEnd) {
                    next.script_end_word = pEnd + 1;
                }
                if (next.script_start_word != null && next.script_start_word <= pEnd) {
                    next.script_start_word = pEnd + 1;
                }
            } else {
                // Cha chưa chọn từ (hoàn thành cuối beat) → con không được có
                // mốc riêng sớm hơn — buộc về cuối beat.
                next.script_end_word = null;
                next.script_start_word = null;
            }
            // THỜI GIAN (giây): con phải SAU cha — nếu cha có end_sec, con không
            // được bắt đầu/xong trước mốc đó.
            const pEndSec = parent.end_sec ?? -1;
            if (pEndSec >= 0) {
                if (next.end_sec != null && next.end_sec < pEndSec) {
                    next.end_sec = pEndSec;
                }
                if (next.start_sec != null && next.start_sec < pEndSec) {
                    next.start_sec = pEndSec;
                }
            } else if (next.end_sec != null || next.start_sec != null) {
                next.end_sec = null;
                next.start_sec = null;
            }
        }
        fixed.push(next);
        byId[r.id] = next;
    }
    return fixed;
}

/** Animation nhấp nháy khi vùng được chọn (bên danh sách vùng). */
const regionActivePulse = keyframes`
    0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.55); }
    70% { box-shadow: 0 0 0 9px rgba(33, 150, 243, 0); }
    100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
`;

/** Nhóm thiết lập 1 vùng — tiêu đề + khung riêng để dễ phân biệt các nhóm. */
function RegionSection({
    title,
    children,
    color,
}: {
    title: string;
    children: React.ReactNode;
    color?: string;
}) {
    return (
        <Box sx={{ mb: 1.25 }}>
            <Typography
                variant="caption"
                display="block"
                sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: color || 'text.secondary',
                    mb: 0.5,
                }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 0.75,
                    bgcolor: 'background.default',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

export default function ShortVideoAgentBeatRegionEditor({
    state,
    beatId,
    imageUrl,
    onOpenBeatQa,
}: Props) {
    const currentOverride = state.agentWhiteboardBeatOverrides?.[beatId] || {};
    const savedRegions = Array.isArray(currentOverride.regions) ? currentOverride.regions : [];

    const [regions, setRegions] = React.useState<BeatRegion[]>(savedRegions);
    const [draftPoints, setDraftPoints] = React.useState<[number, number][]>([]);
    const [selectedRegionId, setSelectedRegionId] = React.useState<string>('');
    const [imgNatural, setImgNatural] = React.useState<{ w: number; h: number } | null>(null);
    const [imageError, setImageError] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [bgSampleMode, setBgSampleMode] = React.useState(false);
    const [bgSampleDraft, setBgSampleDraft] = React.useState<[number, number][]>([]);
    const [deleteMenuAnchor, setDeleteMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [deleteMenuRegionId, setDeleteMenuRegionId] = React.useState<string>('');
    // Chế độ Xóa thừa: đang xóa vùng thừa cho vùng A (vẽ vùng nào → tự thành erase của A).
    const [eraseModeRegionId, setEraseModeRegionId] = React.useState<string>('');

    // Chế độ Thêm vùng: ngược với Xóa thừa — đang thêm vùng cho vùng A
    // (vẽ vùng nào → tự hợp (union) vào A).
    const [addModeRegionId, setAddModeRegionId] = React.useState<string>('');

    // Chế độ tương tác với canvas ảnh: 'select' (mặc định — click vùng = chọn,
    // setting vùng đó hiện ở cột phải; click ngoài vùng = đặt điểm tập trung) /
    // 'add' (click/kéo = vẽ vùng mới). Các chế độ boolean (thêm/xóa/bg) vẫn ưu tiên hơn.
    const [regionMode, setRegionMode] = React.useState<'select' | 'add'>('select');
    const isAddActive = regionMode === 'add'
        || Boolean(addModeRegionId || eraseModeRegionId || bgSampleMode);
    const handleToggleRegionMode = React.useCallback(() => {
        setAddModeRegionId('');
        setEraseModeRegionId('');
        setBgSampleMode(false);
        setBgSampleDraft([]);
        setDraftPoints([]);
        setDraftIsDrag(false);
        setRegionMode((mode) => (mode === 'add' ? 'select' : 'add'));
    }, []);

    // Shortcut phím E: toggle nhanh Thêm vùng <-> Chọn vùng.
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'e' && event.key !== 'E') {
                return;
            }
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target && isKeyboardEditableTarget(target)) {
                return;
            }
            event.preventDefault();
            handleToggleRegionMode();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleToggleRegionMode]);

    // Refine vùng thành vật thể (GrabCut/ML) + giữ nền.
    const [refiningRegionId, setRefiningRegionId] = React.useState<string | null>(null);
    const [keepBgBusy, setKeepBgBusy] = React.useState<string | null>(null);
    // Points GỐC của vùng trước khi refine — để revert về "toàn vùng".
    const [originalPointsByRegion, setOriginalPointsByRegion] = React.useState<
        Record<string, BeatRegionPoint[]>
    >({});

    const [hoveredDraftPoint, setHoveredDraftPoint] = React.useState<number | null>(null);
    // Kiểu tay ĐƯA ẢNH VÀO — danh sách từ whiteboard/keo-anh/meta.json.
    const [placeHandOptions, setPlaceHandOptions] = React.useState<
        { id: string; label: string; thumb_url?: string }[]
    >([]);
    const [placeHandDefaultId, setPlaceHandDefaultId] = React.useState('');
    // Kiểu tay VẼ (vùng action='draw') — danh sách từ whiteboard/pencil/meta.json.
    const [drawHandOptions, setDrawHandOptions] = React.useState<
        { id: string; label: string; thumb_url?: string }[]
    >([]);
    // Notice nội bộ hiển thị TRONG drawer (floating message bị che bởi DrawerCustom).
    const [notice, setNotice] = React.useState<{
        variant: 'success' | 'warning' | 'error' | 'info';
        text: string;
    } | null>(null);
    const notify = React.useCallback((text: string, variant: 'success' | 'warning' | 'error' | 'info' = 'info') => {
        window.showMessage(text, variant);
        // setNotice({ variant, text });
    }, []);

    // Danh sách kiểu tay ĐƯA ẢNH VÀO (whiteboard/keo-anh/meta.json).
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;
    React.useEffect(() => {
        let cancelled = false;
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/hands',
            method: 'POST',
            data: { category: 'keo-anh' },
            loading: false,
            success: (res: {
                success?: boolean;
                default_hand?: string;
                hands?: Array<{ id?: string; label?: string; thumb_url?: string }>;
            }) => {
                if (cancelled || !res?.success) return;
                setPlaceHandDefaultId(String(res.default_hand || '').trim());
                setPlaceHandOptions(
                    Array.isArray(res.hands)
                        ? res.hands
                            .filter((h): h is { id: string; label: string; thumb_url?: string } => Boolean(h?.id))
                            .map((h) => ({
                                id: h.id,
                                label: String(h.label || h.id),
                                thumb_url: String(h.thumb_url || ''),
                            }))
                        : [],
                );
            },
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Danh sách kiểu tay VẼ (whiteboard/pencil/meta.json — bút chì, bút lông...).
    React.useEffect(() => {
        let cancelled = false;
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/hands',
            method: 'POST',
            data: { category: 'pencil' },
            loading: false,
            success: (res: {
                success?: boolean;
                hands?: Array<{ id?: string; label?: string; thumb_url?: string }>;
            }) => {
                if (cancelled || !res?.success) return;
                setDrawHandOptions(
                    Array.isArray(res.hands)
                        ? res.hands
                            .filter((h): h is { id: string; label: string; thumb_url?: string } => Boolean(h?.id))
                            .map((h) => ({
                                id: h.id,
                                label: String(h.label || h.id),
                                thumb_url: String(h.thumb_url || ''),
                            }))
                        : [],
                );
            },
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // apiMessage trả {content, options} — lấy text để hiển thị (không "[object Object]").
    const extractMessage = React.useCallback((msg: unknown, fallback: string): string => {
        if (typeof msg === 'string' && msg.trim()) {
            return msg;
        }
        if (msg && typeof msg === 'object') {
            const content = (msg as { content?: unknown }).content;
            if (typeof content === 'string' && content.trim()) {
                return content;
            }
        }
        return fallback;
    }, []);

    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const imgRef = React.useRef<HTMLImageElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [boxSize, setBoxSize] = React.useState<{ w: number; h: number } | null>(null);
    const [cursorPos, setCursorPos] = React.useState<[number, number] | null>(null);

    // Chỉ reset khi drawer MỞ (transition open) — tránh effect chạy lại mỗi render
    // vì savedRegions là array mới mỗi render (reset draftPoints liên tục).
    const savedRegionsRef = React.useRef(savedRegions);
    savedRegionsRef.current = savedRegions;

    // "Chỉ vật trong vùng": gửi kèm full_points (toàn vùng thủ công — FE giữ
    // trong originalPointsByRegion) + object_points (contour vật) để backend
    // lưu riêng: UI mở lại hiển thị đúng option, render dùng vật, rollback về
    // "toàn vùng" bất kỳ lúc nào.
    const buildRegionsToSave = React.useCallback((): BeatRegion[] => (
        enforceRegionChildOrder(regions.map((r): BeatRegion => {
            const original = originalPointsByRegion[r.id];
            if (!original) {
                return r;
            }
            return {
                ...r,
                full_points: original,
                object_points: r.points,
                select_mode: 'object' as BeatRegion['select_mode'],
            };
        }))
    ), [regions, originalPointsByRegion]);

    // Prev/Next beat ngay trong drawer: seek timeline đến GIỮA beat kế/cũ —
    // ảnh + vùng mới tự load (giống nút cột giữa của VideoPreview).
    const beatSegments = React.useMemo(
        () => getBeatTimelineSegments(state.beatMapReady ? state.beatMap : null),
        [state.beatMapReady, state.beatMap],
    );
    const activeSegmentIndex = React.useMemo(() => {
        if (!beatId) {
            return -1;
        }
        return beatSegments.findIndex((segment) => segment.beatId === beatId);
    }, [beatId, beatSegments]);
    const handleSeekAdjacentBeat = React.useCallback((delta: -1 | 1) => {
        if (activeSegmentIndex < 0) {
            return;
        }
        const target = beatSegments[activeSegmentIndex + delta];
        if (!target) {
            return;
        }
        const midSec = (target.startSec + target.endSec) / 2;
        if (typeof state.handleSeekBeatPlayback === 'function') {
            state.handleSeekBeatPlayback(target.beatId, midSec);
        }
    }, [activeSegmentIndex, beatSegments, state.handleSeekBeatPlayback]);

    const resetDrawerState = React.useCallback(() => {
        const fresh = Array.isArray(savedRegionsRef.current) ? savedRegionsRef.current : [];
        // Khôi phục trạng thái "chỉ vật trong vùng" từ dữ liệu đã lưu:
        // object_points = contour vật (dùng làm points hiển thị), full_points
        // = toàn vùng thủ công (giữ để option đúng + rollback).
        const restoredOrig: Record<string, BeatRegionPoint[]> = {};
        const mapped = fresh.map((r) => {
            if (Array.isArray(r.object_points) && r.object_points.length >= 3) {
                if (Array.isArray(r.full_points) && r.full_points.length >= 3) {
                    restoredOrig[r.id] = r.full_points;
                }
                return { ...r, points: r.object_points };
            }
            return r;
        });
        setRegions(mapped);
        setSavedSnapshot(mapped.map((r) => ({ ...r })));
        setOriginalPointsByRegion(restoredOrig);
        setDraftPoints([]);
        setDraftIsDrag(false);
        setSelectedRegionId('');
        setImgNatural(null);
        setImageError(false);
        setBoxSize(null);
        setBgSampleMode(false);
        setBgSampleDraft([]);
        setDeleteMenuAnchor(null);
        setDeleteMenuRegionId('');
        setKeepBgBusy(null);
        setRefiningRegionId(null);
        setEraseModeRegionId('');
        setAddModeRegionId('');
        setRegionMode('select');
        setFocusMode(false);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setSpaceDown(false);
        wasBeatRenderingRef.current = false;
        setNotice(null);
    }, []);
    // Editor gắn cố định trên workspace: reset khi ĐỔI BEAT (nút prev/next,
    // seek timeline, focus beat từ timeline) — nếu không, vùng của beat cũ
    // vẫn còn hiển thị trên ảnh beat mới. Khi CÓ thay đổi chưa lưu → hiện
    // dialog xác nhận Lưu / Chuyển không lưu / Ở lại.
    const prevBeatIdRef = React.useRef(beatId);
    const [pendingSwitch, setPendingSwitch] = React.useState<{ from: string; to: string } | null>(null);
    const [switchSaving, setSwitchSaving] = React.useState(false);
    React.useEffect(() => {
        if (prevBeatIdRef.current !== beatId) {
            if (isDirtyRef.current) {
                setPendingSwitch({ from: prevBeatIdRef.current, to: beatId });
                return;
            }
            resetDrawerState();
            prevBeatIdRef.current = beatId;
        }
    }, [beatId, resetDrawerState]);

    // Vùng chưa lưu: đối chiếu regions hiện tại với snapshot lần lưu/reset gần
    // nhất (+ draft đang vẽ). Snapshot cập nhật trong resetDrawerState và sau
    // mỗi lần lưu thành công.
    const [savedSnapshot, setSavedSnapshot] = React.useState<BeatRegion[]>(savedRegions);
    const isDirty = React.useMemo(() => (
        JSON.stringify(regions) !== JSON.stringify(savedSnapshot)
        || draftPoints.length > 0
        || bgSampleDraft.length > 0
    ), [regions, savedSnapshot, draftPoints, bgSampleDraft]);
    const isDirtyRef = React.useRef(isDirty);
    isDirtyRef.current = isDirty;

    const handleConfirmSwitch = React.useCallback(async (saveFirst: boolean) => {
        if (!pendingSwitch) {
            return;
        }
        if (saveFirst) {
            setSwitchSaving(true);
            try {
                const ok = await state.handleSaveWhiteboardBeatOverride(pendingSwitch.from, {
                    ...(state.agentWhiteboardBeatOverrides?.[pendingSwitch.from] || {}),
                    regions: buildRegionsToSave(),
                });
                if (!ok) {
                    notify('Lưu thất bại — vẫn đang ở beat cũ', 'error');
                    return;
                }
            } finally {
                setSwitchSaving(false);
            }
        }
        savedRegionsRef.current = savedRegions;
        resetDrawerState();
        prevBeatIdRef.current = pendingSwitch.to;
        setPendingSwitch(null);
    }, [pendingSwitch, state, regions, savedRegions, resetDrawerState, buildRegionsToSave]);

    const handleCancelSwitch = React.useCallback(() => {
        if (!pendingSwitch) {
            return;
        }
        // Seek ngược về beat cũ — beatId prop sẽ quay lại, effect thấy không đổi.
        const seg = beatSegments.find((segment) => segment.beatId === pendingSwitch.from);
        if (seg && typeof state.handleSeekBeatPlayback === 'function') {
            state.handleSeekBeatPlayback(pendingSwitch.from, (seg.startSec + seg.endSec) / 2);
        }
        setPendingSwitch(null);
    }, [pendingSwitch, beatSegments, state]);

    // Đo kích thước vùng hiển thị ảnh — callback ref chạy ngay khi node có size
    // (kể cả trước effect), kèm ResizeObserver cho thay đổi sau đó.
    const measureBoxRef = React.useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (node) {
            const rect = node.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setBoxSize({ w: rect.width, h: rect.height });
            }
        }
    }, []);

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

    // Ảnh cached có thể load xong trước khi React gắn onLoad → probe complete.
    // Poll nhẹ vài lần để bắt trường hợp load chậm/treo → ép reload 1 lần.
    React.useEffect(() => {
        if (!imageUrl || imgNatural || imageError) {
            return undefined;
        }
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
            setImageError(false);
            return undefined;
        }
        const timer = window.setInterval(() => {
            const el = imgRef.current;
            if (!el) {
                return;
            }
            if (el.complete) {
                if (el.naturalWidth > 0 && el.naturalHeight > 0) {
                    setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
                } else {
                    setImageError(true);
                }
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [imageUrl, imgNatural, imageError]);

    const containRect = React.useMemo(() => {
        if (!imgNatural || !boxSize || imgNatural.w <= 0 || imgNatural.h <= 0) {
            return null;
        }
        const scale = Math.min(boxSize.w / imgNatural.w, boxSize.h / imgNatural.h);
        const w = imgNatural.w * scale;
        const h = imgNatural.h * scale;
        return { x: (boxSize.w - w) / 2, y: (boxSize.h - h) / 2, w, h };
    }, [imgNatural, boxSize]);

    // SVG viewBox 1000x1000 bị kéo giãn theo box (preserveAspectRatio none) →
    // bù scale ngược để dot/text luôn TRÒN và KHÔNG méo.
    const svgScale = containRect
        ? {
            invW: 1000 / Math.max(1, containRect.w),
            invH: 1000 / Math.max(1, containRect.h),
        }
        : null;
    const svgScaleTpl = (x: number, y: number) => (
        svgScale
            ? `translate(${(x * 1000).toFixed(2)}, ${(y * 1000).toFixed(2)}) scale(${svgScale.invW.toFixed(6)}, ${svgScale.invH.toFixed(6)})`
            : `translate(${(x * 1000).toFixed(2)}, ${(y * 1000).toFixed(2)})`
    );

    // Lấy từ trong phạm vi beat (window) từ whisper words toàn video.
    const beatWords = React.useMemo(() => {
        const all = Array.isArray(state.whisperWords)
            ? state.whisperWords.map((w, index) => ({ ...w, index }))
            : [];
        if (all.length === 0) {
            return all;
        }
        const section = state.beatMap?.sections?.find((sec) => sec.id === beatId);
        const start = Number(section?.startSec ?? 0);
        const dur = Number(section?.durationSec ?? 0);
        const end = Number(section?.endSec ?? (start + dur));
        if (!(end > start)) {
            return all;
        }
        return all.filter((w) => Number(w.start) >= start - 0.1 && Number(w.end) <= end + 0.1);
    }, [beatId, state.beatMap?.sections, state.whisperWords]);

    // Thời lượng + mốc bắt đầu của beat (scene-relative) cho thanh thời gian render.
    // QUAN TRỌNG: beatDurationSec = ĐÚNG durationSec của beat (window audio script).
    // KHÔNG cộng dồn endSec + durationSec (sẽ làm timeline dài gấp đôi, vượt khỏi
    // phạm vi audio của beat).
    const beatTimeline = React.useMemo(() => {
        const section = state.beatMap?.sections?.find((sec) => sec.id === beatId);
        const start = Number(section?.startSec ?? 0);
        const dur = Number(section?.durationSec ?? 0);
        const end = Number(section?.endSec ?? (start + dur));
        const durationSec = dur > 0 ? dur : Math.max(0.1, end - start);
        return {
            beatStartSec: start,
            beatDurationSec: durationSec,
        };
    }, [beatId, state.beatMap?.sections]);

    // Danh mục transition (có effect_duration_sec THỰC TẾ từ asset) — dùng tính
    // vùng đỏ cuối beat trên timeline vùng khớp thời lượng render thật.
    const [whiteboardTransitions, setWhiteboardTransitions] = React.useState<
        WhiteboardTransitionOption[]
    >([]);
    React.useEffect(() => {
        let cancelled = false;
        const apply = (res: { transitions: WhiteboardTransitionOption[] }) => {
            if (!cancelled) {
                setWhiteboardTransitions(res.transitions);
            }
        };
        fetchWhiteboardTransitions().then(apply).catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    // Thời lượng chuyển cảnh cuối beat này (0 = beat cuối/'none' → không vẽ box
    // đỏ) — mirror logic PHP resolve_whiteboard_scene_params_for_beat.
    const beatTransitionDurationSec = React.useMemo(() => {
        const sections = state.beatMap?.sections || [];
        if (sections.length === 0) {
            return 0;
        }
        const index = sections.findIndex((sec) => sec.id === beatId);
        if (index < 0) {
            return 0;
        }
        return resolveAgentVideoBeatTransitionDurationSec({
            isLastBeat: index >= sections.length - 1,
            config: state.agentWhiteboardConfig ?? null,
            override: state.agentWhiteboardBeatOverrides?.[beatId] ?? null,
            transitions: whiteboardTransitions,
        });
    }, [
        beatId,
        state.agentWhiteboardBeatOverrides,
        state.agentWhiteboardConfig,
        state.beatMap?.sections,
        whiteboardTransitions,
    ]);

    const colorFor = (index: number) => REGION_COLORS[index % REGION_COLORS.length];

    // Sắp xếp cha trước con (dùng cho hit-test canvas + thứ tự vùng con).
    const sortedRegions = React.useMemo(() => {
        const out: BeatRegion[] = [];
        const visited = new Set<string>();
        const visit = (r: BeatRegion) => {
            if (visited.has(r.id)) {
                return;
            }
            visited.add(r.id);
            out.push(r);
            regions
                .filter((c) => c.parent_id === r.id)
                .forEach(visit);
        };
        regions.filter((r) => !r.parent_id).forEach(visit);
        regions.forEach(visit);
        return out;
    }, [regions]);

    // Cột phải chỉ hiển thị setting của vùng ĐANG CHỌN (không liệt kê hết).
    const selectedRegion = React.useMemo(
        () => regions.find((r) => r.id === selectedRegionId) || null,
        [regions, selectedRegionId],
    );
    const parentRegion = React.useMemo(
        () => (selectedRegion?.parent_id
            ? regions.find((r) => r.id === selectedRegion.parent_id) || null
            : null),
        [regions, selectedRegion],
    );
    // Vùng con của vùng đang chọn — mỗi vùng 1 dòng + nút Chọn.
    const childRegions = React.useMemo(
        () => (selectedRegion
            ? sortedRegions.filter((r) => r.parent_id === selectedRegion.id)
            : []),
        [sortedRegions, selectedRegion],
    );

    const svgPointFromEvent = (event: { clientX: number; clientY: number }): [number, number] | null => {
        const svg = svgRef.current;
        if (!svg) {
            return null;
        }
        const rect = svg.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return null;
        }
        return [
            Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
            Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
        ];
    };

    // Drag-draw: click giữ chuột → kéo → vùng hình thành từ điểm đầu nối với
    // điểm hiện tại của chuột (điểm đầu luôn kết nối điểm cuối). Thả chuột = xong.
    const [dragging, setDragging] = React.useState(false);
    const [draftIsDrag, setDraftIsDrag] = React.useState(false);
    const dragStartRef = React.useRef<[number, number] | null>(null);
    const dragActiveRef = React.useRef(false);
    const lastDragPtRef = React.useRef<[number, number] | null>(null);
    const suppressClickRef = React.useRef(false);

    const handleSvgMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
        if (event.button !== 0) {
            return;
        }
        // Space + kéo = pan ảnh (mọi chế độ, giống Photoshop).
        if (spaceDown) {
            panDragRef.current = {
                sx: event.clientX,
                sy: event.clientY,
                px: pan.x,
                py: pan.y,
            };
            suppressClickRef.current = true;
            const onWinMove = (e: MouseEvent) => {
                const d = panDragRef.current;
                if (!d) {
                    return;
                }
                setPan(clampPan(d.px + (e.clientX - d.sx), d.py + (e.clientY - d.sy), zoom));
            };
            const onWinUp = () => {
                panDragRef.current = null;
                window.removeEventListener('mousemove', onWinMove);
                window.removeEventListener('mouseup', onWinUp);
            };
            window.addEventListener('mousemove', onWinMove);
            window.addEventListener('mouseup', onWinUp);
            return;
        }
        // Chế độ CHỌN: click-kéo TRỰC TIẾP di chuyển ảnh (không cần space);
        // click đơn (không kéo) vẫn chọn vùng / đặt điểm tập trung.
        if (!isAddActive) {
            const startX = event.clientX;
            const startY = event.clientY;
            const d = { sx: startX, sy: startY, px: pan.x, py: pan.y };
            panDragRef.current = d;
            suppressClickRef.current = false;
            let panned = false;
            const onWinMove = (e: MouseEvent) => {
                const dx = e.clientX - d.sx;
                const dy = e.clientY - d.sy;
                if (!panned && Math.hypot(dx, dy) < 4) {
                    return;
                }
                panned = true;
                setPan(clampPan(d.px + dx, d.py + dy, zoom));
            };
            const onWinUp = () => {
                if (panned) {
                    suppressClickRef.current = true;
                }
                panDragRef.current = null;
                window.removeEventListener('mousemove', onWinMove);
                window.removeEventListener('mouseup', onWinUp);
            };
            window.addEventListener('mousemove', onWinMove);
            window.addEventListener('mouseup', onWinUp);
            return;
        }
        const pt = svgPointFromEvent(event);
        if (!pt) {
            return;
        }
        dragStartRef.current = pt;
        dragActiveRef.current = false;
        suppressClickRef.current = false;
        lastDragPtRef.current = pt;
        setDragging(true);

        // Kéo ra NGOÀI ảnh vẫn tiếp tục vẽ: theo dõi mousemove/mouseup ở window,
        // điểm được clamp vào giới hạn ảnh (0-1) qua svgPointFromEvent.
        const onWindowMove = (e: MouseEvent) => {
            const np = svgPointFromEvent(e);
            if (np) {
                handleSvgMouseMove(e as unknown as React.MouseEvent<SVGSVGElement>);
            }
        };
        const onWindowUp = () => {
            window.removeEventListener('mousemove', onWindowMove);
            window.removeEventListener('mouseup', onWindowUp);
            handleSvgMouseUp();
        };
        window.addEventListener('mousemove', onWindowMove);
        window.addEventListener('mouseup', onWindowUp);
    };

    const handleSvgMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
        const pt = svgPointFromEvent(event);
        if (!pt) {
            return;
        }
        setCursorPos(pt);
        if (!dragging) {
            return;
        }
        if (!dragActiveRef.current) {
            const start = dragStartRef.current;
            if (!start) {
                return;
            }
            if (Math.hypot(pt[0] - start[0], pt[1] - start[1]) > 0.004) {
                // Vượt ngưỡng → chuyển sang chế độ kéo: điểm đầu + trail điểm.
                dragActiveRef.current = true;
                lastDragPtRef.current = pt;
                setDraftIsDrag(true);
                if (bgSampleMode) {
                    setBgSampleDraft([start, pt]);
                } else {
                    setDraftPoints([start, pt]);
                }
            }
            return;
        }
        const last = lastDragPtRef.current;
        if (last && Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 0.004) {
            lastDragPtRef.current = pt;
            if (bgSampleMode) {
                setBgSampleDraft((prev) => [...prev, pt]);
            } else {
                setDraftPoints((prev) => [...prev, pt]);
            }
        }
    };

    const handleSvgMouseUp = () => {
        if (!dragging) {
            return;
        }
        setDragging(false);
        if (dragActiveRef.current) {
            // Kéo xong → tự hoàn tất vùng; chặn onClick thừa sau mouseup.
            suppressClickRef.current = true;
            finishDraft();
        }
        dragStartRef.current = null;
        dragActiveRef.current = false;
        lastDragPtRef.current = null;
    };

    const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        const pt = svgPointFromEvent(event);
        if (!pt) {
            return;
        }
        const [x, y] = pt;
        // Đang bật "đặt điểm tập trung" → click chỗ nào đặt focus chỗ đó (ưu tiên
        // mọi chế độ); ngược lại chế độ chọn: click vào vùng → chọn (setting
        // vùng đó hiện ở cột phải).
        if (focusMode) {
            handleSetFocus(x, y);
            return;
        }
        if (!isAddActive) {
            const hit = [...sortedRegions].reverse().find((r) => pointInPolygon(x, y, r.points));
            if (hit) {
                setSelectedRegionId(hit.id);
            }
            return;
        }
        if (bgSampleMode && bgSampleDraft.length === 0) {
            // UX đơn giản: click 1 phát → tự tạo ô vuông mẫu (0.03) quanh điểm
            // làm bg_sample — không cần vẽ nhiều điểm.
            const half = 0.015;
            const pts: [number, number][] = [
                [x - half, y - half],
                [x + half, y - half],
                [x + half, y + half],
                [x - half, y + half],
            ];
            const targetId = selectedRegionId;
            if (targetId) {
                updateRegion(targetId, { bg_sample: { points: pts } });
                notify('Đã lấy mẫu background — mẫu sẽ lặp lại fill nền vùng này', 'success');
            } else {
                notify('Hãy chọn 1 vùng trước (bấm Chọn background trên vùng đó)', 'warning');
            }
            setBgSampleDraft([]);
            setBgSampleMode(false);
            return;
        }
        const activeDraft = bgSampleMode ? bgSampleDraft : draftPoints;

        if (activeDraft.length === 0) {
            if (bgSampleMode) {
                setBgSampleDraft([[x, y]]);
            } else {
                setDraftIsDrag(false);
                setDraftPoints([[x, y]]);
            }
            return;
        }
        // Click gần điểm đầu (trong vòng nhắc r20 + dung sai) → đóng kín vùng.
        const first = activeDraft[0];
        const px = (first[0] - x) * (svgRef.current?.getBoundingClientRect().width || 1);
        const py = (first[1] - y) * (svgRef.current?.getBoundingClientRect().height || 1);
        if (Math.hypot(px, py) < 26) {
            finishDraft();
            return;
        }
        if (bgSampleMode) {
            setBgSampleDraft((prev) => [...prev, [x, y]]);
        } else {
            setDraftIsDrag(false);
            setDraftPoints((prev) => [...prev, [x, y]]);
        }
    };

    // Thêm vùng / Xóa thừa: vẽ vùng B xong → áp boolean (union/subtract) vào vùng A.
    const applyRegionBoolean = async (parentId: string, op: 'union' | 'subtract') => {
        if (draftPoints.length < 3) {
            notify('Vùng cần tối thiểu 3 điểm', 'warning');
            return;
        }
        if (!imgNatural || shortVideoId <= 0) {
            notify('Ảnh/shortVideoId chưa sẵn sàng — thử lại', 'warning');
            return;
        }
        const parent = regions.find((r) => r.id === parentId);
        if (!parent) {
            if (op === 'union') {
                setAddModeRegionId('');
            } else {
                setEraseModeRegionId('');
            }
            return;
        }
        const toPx = (pt: [number, number]): [number, number] => [
            pt[0] * imgNatural.w,
            pt[1] * imgNatural.h,
        ];
        try {
            const res = await autoSelectAgentWhiteboardRegion(
                shortVideoId,
                beatId,
                op,
                {
                    polyA: parent.points.map(toPx),
                    polyB: draftPoints.map(toPx),
                },
            );
            if (res?.success && Array.isArray(res.points) && res.points.length >= 3) {
                updateRegion(parent.id, { points: res.points as [number, number][] });
                notify(
                    op === 'union'
                        ? `Đã thêm vùng — vùng "${parent.name}" mở rộng thêm. Vẽ tiếp để thêm nữa.`
                        : `Đã bỏ vùng thừa — vùng "${parent.name}" tự thu gọn. Vẽ tiếp để bỏ thêm.`,
                    'success',
                );
            } else {
                notify(
                    extractMessage(
                        res?.message,
                        op === 'union' ? 'Không thêm được vùng — thử lại' : 'Không trừ được vùng thừa — thử lại',
                    ),
                    'warning',
                );
            }
        } catch (error) {
            notify(error instanceof Error ? error.message : String(error), 'error');
        } finally {
            setDraftPoints([]);
            setDraftIsDrag(false);
        }
    };

    const finishDraft = () => {
        if (eraseModeRegionId) {
            // Chế độ XÓA THỪA: vẽ vùng B xong → vùng A (cha) TỰ THU GỌN (A = A - B).
            void applyRegionBoolean(eraseModeRegionId, 'subtract');
            return;
        }
        if (addModeRegionId) {
            // Chế độ THÊM VÙNG: vẽ vùng B xong → vùng A (cha) TỰ MỞ RỘNG (A = A ∪ B).
            void applyRegionBoolean(addModeRegionId, 'union');
            return;
        }
        if (bgSampleMode) {
            if (bgSampleDraft.length < 3) {
                notify('Vùng background cần tối thiểu 3 điểm', 'warning');
                return;
            }
            // Gán mẫu background cho vùng ĐANG CHỌN (nút Chọn background của vùng đó).
            const targetId = selectedRegionId;
            if (!targetId) {
                notify('Hãy chọn 1 vùng trước (bấm Chọn background trên vùng đó)', 'warning');
                return;
            }
            updateRegion(targetId, { bg_sample: { points: [...bgSampleDraft] } });
            setBgSampleDraft([]);
            setBgSampleMode(false);
            return;
        }
        if (draftPoints.length < 3) {
            notify('Vùng cần tối thiểu 3 điểm', 'warning');
            return;
        }
        const parentId = resolveParentRegion(draftPoints, regions);
        const region: BeatRegion = {
            id: `region-${Date.now()}`,
            name: `Vùng ${regions.length + 1}`,
            points: [...draftPoints],
            action: 'draw',
            parent_id: parentId,
            script_start_word: null,
            script_end_word: null,
        };
        setRegions((prev) => enforceRegionChildOrder([...prev, region]));
        setSelectedRegionId(region.id);
        setDraftPoints([]);
        setDraftIsDrag(false);
    };

    const handleCancelDraft = () => {
        if (bgSampleMode) {
            setBgSampleDraft([]);
        } else {
            setDraftPoints([]);
            setDraftIsDrag(false);
        }
    };

    const updateRegion = (id: string, patch: Partial<BeatRegion>) => {
        setRegions((prev) => {
            const next = prev.map((region) => (
                region.id === id ? { ...region, ...patch } : region
            ));
            // CHA TRƯỚC CON: sau mỗi thay đổi, tự nâng script word của vùng con
            // nếu nó SỚM HƠN từ cuối của vùng cha — con không bao giờ render trước cha.
            return enforceRegionChildOrder(next);
        });
    };

    const handleDeleteRegion = (id: string) => {
        setRegions((prev) => prev.filter((region) => region.id !== id));
        if (selectedRegionId === id) {
            setSelectedRegionId('');
        }
        if (eraseModeRegionId === id) {
            setEraseModeRegionId('');
        }
        if (addModeRegionId === id) {
            setAddModeRegionId('');
        }
    };

    const handleStartBgSampleForRegion = (regionId: string) => {
        setSelectedRegionId(regionId);
        setBgSampleMode(true);
        setBgSampleDraft([]);
    };

    const handleClearRegionBgSample = (regionId: string) => {
        updateRegion(regionId, { bg_sample: null });
        setBgSampleDraft([]);
        setBgSampleMode(false);
    };

    const shortVideoId = Number(state.shortVideoId || 0);

    // Bật/tắt "Giữ nền": tạo ảnh nền đã vá (inpaint) cho vùng — render hiển thị
    // nền này thay vì tile. Giữ nguyên bg_sample cũ nếu có.
    const handleToggleKeepBackground = async (region: BeatRegion, keep: boolean) => {
        if (keep) {
            if (region.background_image) {
                return;
            }
            if (keepBgBusy || shortVideoId <= 0) {
                return;
            }
            if (!imgNatural) {
                notify('Ảnh chưa sẵn sàng — thử lại', 'warning');
                return;
            }
            // Bbox bao vùng (tính từ points vùng × kích thước ảnh gốc) — GrabCut
            // theo đúng vùng đã chọn → mask vật → inpaint nền.
            const xs = region.points.map((p) => p[0]);
            const ys = region.points.map((p) => p[1]);
            const pad = 0.02;
            const rect: [number, number, number, number] = [
                Math.max(0, Math.min(...xs) - pad) * imgNatural.w,
                Math.max(0, Math.min(...ys) - pad) * imgNatural.h,
                Math.min(1, Math.max(...xs) + pad) * imgNatural.w,
                Math.min(1, Math.max(...ys) + pad) * imgNatural.h,
            ];
            setKeepBgBusy(region.id);
            try {
                const res = await autoSelectAgentWhiteboardRegion(
                    shortVideoId,
                    beatId,
                    'bbox',
                    { rect },
                    true,
                );
                if (res?.success && res.background_image_url) {
                    updateRegion(region.id, { background_image: res.background_image_url });
                    notify('Đã tạo ảnh nền đã vá cho vùng — render sẽ giữ nền thay vì tile', 'success');
                } else {
                    notify(extractMessage(res?.message, 'Không tạo được ảnh nền'), 'warning');
                }
            } finally {
                setKeepBgBusy(null);
            }
        } else {
            updateRegion(region.id, { background_image: null });
        }
    };

    // "Chỉ vật trong vùng": thu gọn polygon vùng thành vật thể bên trong (GrabCut/ML).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dùng trong JSX buttons
    const handleRefineRegionToObject = async (region: BeatRegion) => {
        if (refiningRegionId) {
            return;
        }
        if (shortVideoId <= 0) {
            notify('Thiếu shortVideoId — không gọi được API', 'error');
            return;
        }
        if (!imgNatural) {
            notify('Ảnh chưa sẵn sàng — thử lại', 'warning');
            return;
        }
        if (originalPointsByRegion[region.id]) {
            return;
        }
        const xs = region.points.map((pt) => pt[0]);
        const ys = region.points.map((pt) => pt[1]);
        const pad = 0.02;
        const rect: [number, number, number, number] = [
            Math.max(0, Math.min(...xs) - pad) * imgNatural.w,
            Math.max(0, Math.min(...ys) - pad) * imgNatural.h,
            Math.min(1, Math.max(...xs) + pad) * imgNatural.w,
            Math.min(1, Math.max(...ys) + pad) * imgNatural.h,
        ];
        setRefiningRegionId(region.id);
        try {
            const res = await autoSelectAgentWhiteboardRegion(
                shortVideoId,
                beatId,
                'bbox',
                {
                    rect,
                    poly: region.points.map((pt): [number, number] => [
                        pt[0] * imgNatural.w,
                        pt[1] * imgNatural.h,
                    ]),
                },
            );
            if (res?.success && Array.isArray(res.points) && res.points.length >= 3) {
                const candidates = Array.isArray(res.candidates)
                    ? res.candidates.map((c) => ({ ...c, points: (c.points || []) as [number, number][] }))
                    : [];
                if (candidates.length === 0) {
                    candidates.push({
                        points: res.points as [number, number][],
                        area: res.area,
                    });
                }
                setOriginalPointsByRegion((prev) => ({
                    ...prev,
                    [region.id]: region.points,
                }));
                updateRegion(region.id, { points: res.points as [number, number][] });
                notify(`Đã thu gọn vùng thành vật thể (${res.points.length} điểm)`, 'success');
                return;
            } else {
                notify(
                    extractMessage(res?.message, 'Không chọn được vật trong vùng — hãy vẽ vùng sát vật thể hơn'),
                    'warning',
                );
            }
        } catch (error) {
            notify(error instanceof Error ? error.message : String(error), 'error');
        } finally {
            setRefiningRegionId(null);
        }
    };

    // Gọi lại API với candidate/alpha — cập nhật preview trong dialog.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dùng trong Dialog JSX
    // "Toàn vùng": khôi phục polygon ban đầu trước khi refine.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dùng trong JSX buttons
    const handleRestoreRegionPoints = (region: BeatRegion) => {
        const original = originalPointsByRegion[region.id];
        if (!original) {
            return;
        }
        updateRegion(region.id, { points: original });
        setOriginalPointsByRegion((prev) => {
            const next = { ...prev };
            delete next[region.id];
            return next;
        });
        notify('Đã khôi phục vùng đã chọn (toàn vùng)', 'success');
    };

    const handleSave = async () => {
        if (saving) {
            return;
        }
        // Validate: vùng con phải nằm trong vùng cha (bbox).
        for (const region of regions) {
            if (!region.parent_id) {
                continue;
            }
            const parent = regions.find((item) => item.id === region.parent_id);
            if (!parent) {
                notify(`Vùng "${region.name}" có vùng cha không tồn tại`, 'error');
                return;
            }
            const childMinX = Math.min(...region.points.map((p) => p[0]));
            const childMaxX = Math.max(...region.points.map((p) => p[0]));
            const childMinY = Math.min(...region.points.map((p) => p[1]));
            const childMaxY = Math.max(...region.points.map((p) => p[1]));
            const parentMinX = Math.min(...parent.points.map((p) => p[0]));
            const parentMaxX = Math.max(...parent.points.map((p) => p[0]));
            const parentMinY = Math.min(...parent.points.map((p) => p[1]));
            const parentMaxY = Math.max(...parent.points.map((p) => p[1]));
            const inside = childMinX >= parentMinX - 0.01
                && childMaxX <= parentMaxX + 0.01
                && childMinY >= parentMinY - 0.01
                && childMaxY <= parentMaxY + 0.01;
            if (!inside) {
                notify(
                    `Vùng con "${region.name}" phải nằm hoàn toàn trong vùng cha "${parent.name}"`,
                    'error',
                );
                return;
            }
            if (region.bg_sample && region.bg_sample.points.length < 3) {
                notify(`Background của vùng "${region.name}" cần tối thiểu 3 điểm`, 'error');
                return;
            }
        }

        setSaving(true);
        try {
            const saved = await state.handleSaveWhiteboardBeatOverride(beatId, {
                ...currentOverride,
                regions: buildRegionsToSave(),
            });
            if (saved) {
                setSavedSnapshot(regions.map((r) => ({ ...r })));
                notify(`Đã lưu ${regions.length} vùng cho beat ${beatId}`, 'success');
            }
        } finally {
            setSaving(false);
        }
    };

    // Lưu override KHÔNG làm mất vùng đang edit: luôn gửi kèm regions hiện tại.
    const persistOverride = React.useCallback(async (patch: Partial<AgentWhiteboardBeatOverride>) => {
        const ok = await state.handleSaveWhiteboardBeatOverride(beatId, {
            ...(state.agentWhiteboardBeatOverrides?.[beatId] || {}),
            ...patch,
            regions: buildRegionsToSave(),
        });
        if (ok) {
            setSavedSnapshot(regions.map((r) => ({ ...r })));
            return true;
        }
        return false;
    }, [beatId, state, buildRegionsToSave, regions]);

    const handleSetFocus = (x: number, y: number) => {
        void persistOverride({ focus_x: x, focus_y: y });
    };
    const handleResetFocus = () => {
        void persistOverride({ focus_x: 0.5, focus_y: 0.5 });
    };

    // Điểm tập trung hiện tại (0-1, ratio ảnh gốc) — hiển thị trên canvas.
    const focusX = parseRatio(currentOverride.focus_x, 0.5);
    const focusY = parseRatio(currentOverride.focus_y, 0.5);

    // Zoom / pan ảnh (Photoshop-like): transform cùng layer chứa ảnh + SVG → vùng
    // luôn bám đúng. Scroll chuột = zoom theo chuột; Space+click-drag = pan.
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [spaceDown, setSpaceDown] = React.useState(false);
    // Chế độ ĐẶT ĐIỂM TẬP TRUNG: bật → click chỗ nào đặt focus chỗ đó (+ hiện
    // nút đặt lại giữa); tắt → click không đặt focus.
    const [focusMode, setFocusMode] = React.useState(false);
    const panDragRef = React.useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

    const clampPan = React.useCallback((x: number, y: number, z: number) => {
        const vw = boxSize?.w ?? 0;
        const vh = boxSize?.h ?? 0;
        if (!containRect || vw <= 0 || vh <= 0) {
            return { x, y };
        }
        const cw = containRect.w * z;
        const ch = containRect.h * z;
        const minX = -(containRect.x + cw);
        const maxX = vw - containRect.x;
        const minY = -(containRect.y + ch);
        const maxY = vh - containRect.y;
        if (minX > maxX || minY > maxY) {
            return { x: 0, y: 0 };
        }
        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y)),
        };
    }, [boxSize, containRect]);

    const handleZoomAt = React.useCallback((nextZoom: number, cx: number, cy: number) => {
        if (!containRect || boxSize?.w == null) {
            return;
        }
        const z = Math.max(1, Math.min(8, nextZoom));
        if (Math.abs(z - zoom) < 0.001) {
            return;
        }
        const c = {
            x: (cx - (containRect.x + pan.x)) / zoom,
            y: (cy - (containRect.y + pan.y)) / zoom,
        };
        setZoom(z);
        setPan(clampPan(cx - containRect.x - c.x * z, cy - containRect.y - c.y * z, z));
    }, [containRect, boxSize, zoom, pan, clampPan]);

    const handleResetZoom = React.useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // Kéo slider zoom: giữ pan hiện tại, chỉ clamp theo zoom mới.
    const handleZoomSlider = React.useCallback((_event: Event, value: number | number[]) => {
        const z = Array.isArray(value) ? value[0] : value;
        setZoom(z);
        setPan((p) => clampPan(p.x, p.y, z));
    }, [clampPan]);

    // Scroll chuột = zoom theo vị trí chuột (không cần Ctrl/Cmd; pinch trackpad
    // vẫn hoạt động vì gửi wheel kèm ctrlKey). preventDefault chặn scroll trang.
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return undefined;
        }
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) {
                return;
            }
            const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
            handleZoomAt(zoom * factor, event.clientX - rect.left, event.clientY - rect.top);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [zoom, handleZoomAt]);

    // Space giữ = chế độ pan tay (giống Photoshop).
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code !== 'Space') {
                return;
            }
            if (isKeyboardEditableTarget(event.target)) {
                return;
            }
            if (event.repeat) {
                return;
            }
            event.preventDefault();
            setSpaceDown(true);
        };
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.code !== 'Space') {
                return;
            }
            setSpaceDown(false);
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    // Đổi vùng chọn → cuộn cột cài đặt (phải) về đầu để thấy card vùng mới.
    const settingsScrollRef = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
        settingsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [selectedRegionId]);

    // Render video beat: trạng thái + báo khi xong.
    const beatRender = state.whiteboardBeatRenders?.[beatId] || null;
    const beatRenderStatus = String(beatRender?.status || '').trim();
    const isBeatRendering = (state.renderingWhiteboardBeatIds || []).includes(beatId)
        || beatRenderStatus === 'queued'
        || beatRenderStatus === 'processing';
    const beatVideoUrl = String(beatRender?.video_url || '').trim();
    const [beatVideoPreviewOpen, setBeatVideoPreviewOpen] = React.useState(false);
    // URL phát được: endpoint stream yêu cầu access_token — resolve như BeatQaPanel.
    const beatVideoPlayUrl = React.useMemo(() => {
        if (!beatVideoUrl) {
            return '';
        }
        const resolved = resolveAgentLocalVideoOpenUrl(beatVideoUrl);
        if (!resolved) {
            return '';
        }
        const stamp = String(beatRender?.updated_at || '').trim();
        if (!stamp) {
            return resolved;
        }
        const sep = resolved.includes('?') ? '&' : '?';
        return `${resolved}${sep}v=${encodeURIComponent(stamp)}`;
    }, [beatVideoUrl, beatRender?.updated_at]);
    const wasBeatRenderingRef = React.useRef(false);
    React.useEffect(() => {
        if (isBeatRendering) {
            wasBeatRenderingRef.current = true;
            return;
        }
        if (wasBeatRenderingRef.current) {
            wasBeatRenderingRef.current = false;
            if (beatRenderStatus === 'failed') {
                notify(
                    `Render video beat thất bại: ${String(beatRender?.error || 'thử lại').trim()}`,
                    'error',
                );
            } else if (beatVideoUrl) {
                notify('Đã render xong video beat — bấm "Mở video beat" để xem', 'success');
            }
        }
    }, [isBeatRendering, beatRenderStatus, beatVideoUrl, beatRender?.error]);

    const svgPointsFor = (points: [number, number][]) => (
        points.map((p) => `${(p[0] * 1000).toFixed(2)},${(p[1] * 1000).toFixed(2)}`).join(' ')
    );

    const hasRegions = regions.length > 0;
    const totalDraftPoints = bgSampleMode ? bgSampleDraft.length : draftPoints.length;
    const liveDraft = bgSampleMode ? bgSampleDraft : draftPoints;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                position: 'relative',
                overflow: 'hidden',
                gap: 1.5,
                px: 2,
                pt: 2,
                pb: 2,
            }}
        >
            {/* Header: tên beat + mở ảnh + nút QA/Version/Video beat */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    Chọn vùng ảnh beat — {beatId}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    {imageUrl ? (
                        <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<OpenInNewIcon />}
                            component="a"
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textTransform: 'none' }}
                        >
                            Mở ảnh beat
                        </Button>
                    ) : null}
                    <LoadingButton
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<VideocamIcon />}
                        loading={isBeatRendering}
                        disabled={isBeatRendering || !imageUrl || Boolean(state.agentWhiteboardConfig?.assets_mode)}
                        onClick={() => { void state.handleRenderWhiteboardBeat(beatId); }}
                        sx={{ textTransform: 'none' }}
                    >
                        Render video beat
                    </LoadingButton>
                    <LoadingButton
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<OpenInNewIcon />}
                        loading={isBeatRendering}
                        disabled={isBeatRendering || !beatVideoPlayUrl}
                        onClick={() => setBeatVideoPreviewOpen(true)}
                        sx={{ textTransform: 'none' }}
                    >
                        Mở video beat
                    </LoadingButton>
                    <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        startIcon={<FactCheckIcon />}
                        onClick={() => onOpenBeatQa?.()}
                        sx={{ textTransform: 'none' }}
                    >
                        QA · Version · Video beat
                    </Button>
                </Stack>
            </Box>

            {notice ? (
                <Alert
                    severity={notice.variant}
                    onClose={() => setNotice(null)}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        right: 8,
                        zIndex: 1300,
                        boxShadow: 4,
                        '& .MuiAlert-message': { maxHeight: 120, overflowY: 'auto' },
                    }}
                >
                    {notice.text}
                </Alert>
            ) : null}

            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    flex: '1 1 auto',
                    minHeight: 0,
                    alignItems: 'stretch',
                    overflow: 'hidden',
                }}
            >
                {/* Cột trái: ảnh + vẽ vùng */}
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                        overflow: 'auto',
                    }}
                >
                    <Box
                        ref={measureBoxRef}
                        sx={{
                            flex: '1 1 auto',
                            minHeight: 320,
                            width: '100%',
                            position: 'relative',
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: 1,
                            borderColor: 'divider',
                            bgcolor: 'common.black',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                        }}
                    >
                        {/* img luôn mount để onLoad/onError chạy — containRect phụ thuộc imgNatural */}
                        <Tooltip title={isAddActive
                            ? 'Đang THÊM VÙNG — click/kéo để vẽ vùng mới (phím E để chuyển sang chọn vùng).'
                            : 'Đang CHỌN VÙNG — click vào vùng để chọn, click ngoài vùng để đặt điểm tập trung (phím E để chuyển sang thêm vùng).'}
                        >
                            <IconButton
                                size="small"
                                onClick={handleToggleRegionMode}
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    zIndex: 5,
                                    bgcolor: isAddActive ? 'primary.main' : 'rgba(0,0,0,0.55)',
                                    color: 'common.white',
                                    '&:hover': {
                                        bgcolor: isAddActive ? 'primary.dark' : 'rgba(0,0,0,0.75)',
                                    },
                                }}
                            >
                                {isAddActive ? <AddCircleIcon fontSize="small" /> : <TouchAppIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        {/* Thanh zoom (slider) — góc trên PHẢI box ảnh; scroll chuột = zoom / Space+kéo để pan */}
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                zIndex: 5,
                                bgcolor: 'rgba(0,0,0,0.6)',
                                borderRadius: 2,
                                px: 1.25,
                                py: 0.5,
                                width: 220,
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'common.white',
                                    minWidth: 40,
                                    textAlign: 'right',
                                    fontVariantNumeric: 'tabular-nums',
                                    flexShrink: 0,
                                }}
                            >
                                {Math.round(zoom * 100)}%
                            </Typography>
                            <Slider
                                size="small"
                                min={1}
                                max={8}
                                step={0.05}
                                value={zoom}
                                onChange={handleZoomSlider}
                                sx={{
                                    flex: 1,
                                    color: 'primary.light',
                                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                                }}
                            />
                            <Tooltip title="Đặt lại zoom 100%">
                                <IconButton
                                    size="small"
                                    onClick={handleResetZoom}
                                    sx={{ color: 'common.white', flexShrink: 0 }}
                                >
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>

                        {/* Layer nội dung: ảnh + SVG cùng transform (zoom/pan) → vùng không lệch */}
                        {imageUrl && !imageError ? (
                            <>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: containRect ? containRect.x + pan.x : 0,
                                        top: containRect ? containRect.y + pan.y : 0,
                                        width: containRect ? containRect.w : 0,
                                        height: containRect ? containRect.h : 0,
                                        transform: `scale(${zoom})`,
                                        transformOrigin: '0 0',
                                    }}
                                >
                                    <Box
                                        component="img"
                                        ref={imgRef}
                                        src={imageUrl}
                                        alt={`Beat ${beatId}`}
                                        draggable={false}
                                        onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                            const img = e.currentTarget;
                                            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                                                setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
                                                setImageError(false);
                                            }
                                        }}
                                        onError={() => setImageError(true)}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'fill',
                                            display: 'block',
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                            WebkitUserSelect: 'none',
                                        }}
                                    />
                                    {containRect ? (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                            }}
                                        >
                                            <svg
                                                ref={svgRef}
                                                viewBox="0 0 1000 1000"
                                                preserveAspectRatio="none"
                                                onClick={handleSvgClick}
                                                onMouseDown={handleSvgMouseDown}
                                                onMouseMove={handleSvgMouseMove}
                                                onMouseUp={handleSvgMouseUp}
                                                onMouseLeave={() => {
                                                    setCursorPos(null);
                                                    // Không kết thúc vùng khi kéo ra ngoài ảnh —
                                                    // window mousemove tiếp tục vẽ, điểm clamp vào biên.
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    cursor: spaceDown ? 'grabbing' : isAddActive ? 'crosshair' : 'grab',
                                                }}
                                            >
                            {/* Điểm tập trung — click ngoài vùng (chế độ chọn) để đặt lại */}
                            <g style={{ pointerEvents: 'none' }}>
                                <circle
                                    cx={focusX * 1000}
                                    cy={focusY * 1000}
                                    r={16}
                                    fill="none"
                                    stroke="#ff9800"
                                    strokeWidth={2.5}
                                    strokeDasharray="5 3"
                                />
                                <circle
                                    cx={focusX * 1000}
                                    cy={focusY * 1000}
                                    r={4}
                                    fill="#ff9800"
                                    stroke="#ffffff"
                                    strokeWidth={1.5}
                                />
                            </g>
                            {regions.map((region, index) => {
                                const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                                const isSelected = selectedRegionId === region.id;
                                const isChild = Boolean(region.parent_id);
                                return (
                                    <g key={region.id}>
                                        <polygon
                                            points={svgPointsFor(region.points)}
                                            fill={color}
                                            fillOpacity={isSelected ? 0.45 : 0.18}
                                            stroke={color}
                                            strokeWidth={isSelected ? 4 : 2}
                                            strokeDasharray={isChild ? '8 4' : undefined}
                                            strokeLinejoin="round"
                                            style={{ pointerEvents: 'none' }}
                                        />
                                        {/* Điểm đã đánh dấu (đỉnh vùng đã lưu) — dot tròn nhỏ, border mảnh.
                                            Vùng vẽ bằng kéo (nhiều điểm trail) → bỏ dot, chỉ giữ border. */}
                                        {region.points.length <= 12 ? region.points.map((point, pi) => (
                                            <g
                                                key={`${region.id}-v${pi}`}
                                                transform={svgScaleTpl(point[0], point[1])}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                <circle
                                                    r={5}
                                                    fill={color}
                                                    stroke="#ffffff"
                                                    strokeWidth={1}
                                                />
                                            </g>
                                        )) : null}
                                    </g>
                                );
                            })}
                            {/* Mẫu background RIÊNG của từng vùng — lặp lại fill nền vùng khi render */}
                            {regions.map((region, index) => {
                                const bgSample = region.bg_sample;
                                if (!bgSample || bgSample.points.length < 3) {
                                    return null;
                                }
                                const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                                return (
                                    <g key={`${region.id}-bg`} style={{ pointerEvents: 'none' }}>
                                        <polygon
                                            points={svgPointsFor(bgSample.points)}
                                            fill="#9c27b0"
                                            fillOpacity={0.24}
                                            stroke="#9c27b0"
                                            strokeWidth={2}
                                            strokeDasharray="3 3"
                                            strokeLinejoin="round"
                                        />
                                        <g transform={svgScaleTpl(bgSample.points[0][0], bgSample.points[0][1])}>
                                            <text
                                                y={-8}
                                                textAnchor="middle"
                                                dominantBaseline="bottom"
                                                fontSize={10.5}
                                                fontWeight={800}
                                                fill={color}
                                                stroke="#ffffff"
                                                strokeWidth={3}
                                                paintOrder="stroke"
                                                style={{ userSelect: 'none' }}
                                            >
                                                BG
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                            {liveDraft.length > 0 ? (
                                <>
                                    {/* Live vùng đang vẽ: nối điểm cuối về điểm 1 (đóng kín) +
                                        theo cursor — fill màu trong suốt để thấy vùng sẽ tạo */}
                                    <polygon
                                        points={svgPointsFor([
                                            ...liveDraft,
                                            ...(cursorPos ? [cursorPos] : []),
                                        ])}
                                        fill={bgSampleMode ? 'rgba(156,39,176,0.25)' : 'rgba(255,235,59,0.22)'}
                                        stroke={bgSampleMode ? '#9c27b0' : '#ffeb3b'}
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                        strokeLinejoin="round"
                                    />
                                    {/* Đoạn từ điểm cuối về điểm đầu khi đã đủ 2+ điểm */}
                                    {!draftIsDrag && liveDraft.length >= 2 ? (
                                        <line
                                            x1={liveDraft[liveDraft.length - 1][0] * 1000}
                                            y1={liveDraft[liveDraft.length - 1][1] * 1000}
                                            x2={liveDraft[0][0] * 1000}
                                            y2={liveDraft[0][1] * 1000}
                                            stroke={bgSampleMode ? '#9c27b0' : '#ffeb3b'}
                                            strokeWidth={2}
                                            strokeDasharray="6 4"
                                        />
                                    ) : null}
                                    {/* Chế độ kéo (drag-draw): chỉ vẽ border — KHÔNG tạo điểm đỉnh
                                        để tránh trail điểm làm border dày */}
                                    {!draftIsDrag ? (
                                        <>
                                            {/* Ghim từng điểm + số thứ tự — dot tròn, border mảnh,
                                                hover đổi cursor pointer để nhận biết click vào điểm cũ */}
                                            {liveDraft.map((point, index) => {
                                                const hovered = hoveredDraftPoint === index;
                                                return (
                                                    <g
                                                        key={`pt-${index}`}
                                                        transform={svgScaleTpl(point[0], point[1])}
                                                        style={{ cursor: 'pointer' }}
                                                        onMouseEnter={() => setHoveredDraftPoint(index)}
                                                        onMouseLeave={() => setHoveredDraftPoint(null)}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            // Click điểm 1 → hoàn tất vùng; điểm khác → không tạo điểm mới.
                                                            if (index === 0) {
                                                                finishDraft();
                                                            }
                                                        }}
                                                    >
                                                        <circle
                                                            r={hovered ? 10 : 8}
                                                            fill="#ffeb3b"
                                                            stroke="#ffffff"
                                                            strokeWidth={hovered ? 1.8 : 1.2}
                                                        />
                                                        <text
                                                            y={0.5}
                                                            textAnchor="middle"
                                                            dominantBaseline="middle"
                                                            fontSize={10}
                                                            fontWeight={800}
                                                            fill="#1a1a1a"
                                                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                                                        >
                                                            {index + 1}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                            {/* Vòng nhắc điểm 1 — click vào đây để hoàn tất vùng */}
                                            <g
                                                transform={svgScaleTpl(liveDraft[0][0], liveDraft[0][1])}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                <circle
                                                    r={16}
                                                    fill="none"
                                                    stroke={bgSampleMode ? '#9c27b0' : '#ffeb3b'}
                                                    strokeWidth={1.5}
                                                    strokeDasharray="4 4"
                                                />
                                            </g>
                                        </>
                                    ) : null}
                                </>
                            ) : null}
                                </svg>
                            </Box>
                        ) : null}
                        </Box>
                        {!containRect ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}
                            >
                                <Typography variant="caption" color="rgba(255,255,255,0.6)">
                                    Đang tải ảnh…
                                </Typography>
                            </Box>
                        ) : null}
                            </>
                        ) : imageError ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1,
                                    p: 2,
                                    textAlign: 'center',
                                    bgcolor: 'rgba(0,0,0,0.55)',
                                }}
                            >
                                <Typography variant="subtitle2" color="error">
                                    Không load được ảnh beat
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    component="a"
                                    href={imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ textTransform: 'none' }}
                                >
                                    Mở ảnh trong tab mới
                                </Button>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1,
                                    p: 2,
                                    textAlign: 'center',
                                    bgcolor: 'rgba(0,0,0,0.55)',
                                }}
                            >
                                <Typography variant="subtitle2" color="text.secondary">
                                    Beat chưa có ảnh
                                </Typography>
                            </Box>
                        )}

                        {/* Box chuyển beat neo dưới PHẢI (dùng nhiều) */}
                        {beatSegments.length > 1 && activeSegmentIndex >= 0 ? (
                            <Stack
                                direction="row"
                                spacing={0.75}
                                alignItems="center"
                                sx={{
                                    position: 'absolute',
                                    right: 10,
                                    bottom: 10,
                                    zIndex: 5,
                                    bgcolor: 'rgba(0,0,0,0.6)',
                                    borderRadius: 2,
                                    p: 0.5,
                                }}
                            >
                                <Tooltip title="Beat trước">
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={activeSegmentIndex <= 0}
                                            onClick={() => handleSeekAdjacentBeat(-1)}
                                            sx={{ color: 'common.white' }}
                                        >
                                            <ChevronLeftIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Beat sau">
                                    <IconButton
                                        size="small"
                                        disabled={activeSegmentIndex >= beatSegments.length - 1}
                                        onClick={() => handleSeekAdjacentBeat(1)}
                                        sx={{ color: 'common.white' }}
                                    >
                                        <ChevronRightIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        ) : null}

                        {/* Box điều khiển neo dưới TRÁI: đặt điểm tập trung / đặt lại giữa / hủy vẽ / lưu vùng */}
                        <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{
                                position: 'absolute',
                                left: 10,
                                bottom: 10,
                                zIndex: 5,
                                bgcolor: 'rgba(0,0,0,0.6)',
                                borderRadius: 2,
                                p: 0.5,
                            }}
                        >
                            <Tooltip title={focusMode
                                ? 'Đang ĐẶT ĐIỂM TẬP TRUNG — click chỗ nào đặt focus chỗ đó (click để tắt).'
                                : 'Bật ĐẶT ĐIỂM TẬP TRUNG — click chỗ nào đặt focus chỗ đó.'}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => setFocusMode((mode) => !mode)}
                                    sx={{
                                        color: focusMode ? '#ffb74d' : 'common.white',
                                        bgcolor: focusMode ? 'rgba(255,183,77,0.18)' : 'transparent',
                                    }}
                                >
                                    <MyLocationIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            {focusMode ? (
                                <Tooltip title="Đặt lại điểm tập trung giữa ảnh">
                                    <IconButton
                                        size="small"
                                        onClick={handleResetFocus}
                                        sx={{ color: 'common.white' }}
                                    >
                                        <CenterFocusStrongIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {totalDraftPoints > 0 ? (
                                <Tooltip title="Hủy vẽ">
                                    <IconButton
                                        size="small"
                                        onClick={handleCancelDraft}
                                        sx={{ color: 'common.white' }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            <LoadingButton
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<SaveIcon />}
                                loading={saving}
                                disabled={state.savingWhiteboardBeatOverride}
                                onClick={() => { void handleSave(); }}
                                sx={{ textTransform: 'none', ml: 0.5 }}
                            >
                                Lưu vùng
                            </LoadingButton>
                        </Stack>
                    </Box>

                    {/* Thanh thời gian render theo vùng (audio bar) — dưới box ảnh */}
                    <WhiteboardRegionTimeline
                        regions={regions}
                        beatDurationSec={beatTimeline.beatDurationSec}
                        beatStartSec={beatTimeline.beatStartSec}
                        beatWords={beatWords}
                        colorFor={colorFor}
                        onChangeRegion={updateRegion}
                        onSelectRegion={(id) => setSelectedRegionId(id)}
                        selectedRegionId={selectedRegionId}
                        audioUrl={state.audioFileUrl || ''}
                        maxWidth={boxSize ? boxSize.w : undefined}
                        transitionDurationSec={beatTransitionDurationSec}
                    />

                    {/* Dialog xác nhận đổi beat khi có vùng chưa lưu */}
                    <Dialog
                        open={Boolean(pendingSwitch)}
                        onClose={handleCancelSwitch}
                        maxWidth="xs"
                        fullWidth
                    >
                        <DialogTitle>Bạn chưa lưu vùng của beat này</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" color="text.secondary">
                                Vùng đang sửa chưa được lưu. Lưu trước khi chuyển beat, hoặc chuyển
                                sang beat khác và bỏ các thay đổi này.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={handleCancelSwitch} sx={{ textTransform: 'none' }}>
                                Ở lại beat này
                            </Button>
                            <Button
                                color="error"
                                onClick={() => { void handleConfirmSwitch(false); }}
                                sx={{ textTransform: 'none' }}
                            >
                                Chuyển không lưu
                            </Button>
                            <LoadingButton
                                variant="contained"
                                color="success"
                                loading={switchSaving}
                                onClick={() => { void handleConfirmSwitch(true); }}
                                sx={{ textTransform: 'none' }}
                            >
                                Lưu rồi chuyển
                            </LoadingButton>
                        </DialogActions>
                    </Dialog>

                    {/* Popup xem video beat */}
                    <Dialog
                        open={beatVideoPreviewOpen}
                        onClose={() => setBeatVideoPreviewOpen(false)}
                        maxWidth="lg"
                        fullWidth
                    >
                        <DialogTitle>Video beat — {beatId}</DialogTitle>
                        <DialogContent
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            {beatVideoPlayUrl ? (
                                <video
                                    key={beatVideoPlayUrl}
                                    controls
                                    autoPlay
                                    playsInline
                                    src={beatVideoPlayUrl}
                                    style={{
                                        width: '100%',
                                        maxHeight: '78vh',
                                        borderRadius: 8,
                                        background: '#000',
                                        display: 'block',
                                    }}
                                >
                                    <track kind="captions" />
                                </video>
                            ) : (
                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                    Chưa có video beat — bấm "Render video beat" trước.
                                </Typography>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={() => setBeatVideoPreviewOpen(false)} sx={{ textTransform: 'none' }}>
                                Đóng
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>

                {/* Cột phải: setting vùng đang chọn (không liệt kê hết các vùng) */}
                <Box
                    ref={settingsScrollRef}
                    sx={{
                        width: 340,
                        flexShrink: 0,
                        minHeight: 0,
                        maxHeight: '100%',
                        alignSelf: 'stretch',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        pr: 0.5,
                        '&::-webkit-scrollbar': { width: 10 },
                        '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 2 },
                        '&::-webkit-scrollbar-thumb': {
                            bgcolor: 'primary.light',
                            borderRadius: 2,
                            border: '2px solid transparent',
                            backgroundClip: 'padding-box',
                        },
                        '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'primary.main' },
                    }}
                >
                    <Box
                        sx={{
                            mb: 1.5,
                            p: 1.25,
                            borderRadius: 2,
                            border: 1,
                            borderColor: 'divider',
                            bgcolor: 'background.default',
                        }}
                    >
                        <ShortVideoAgentImageAnimationControls
                            beatId={beatId}
                            imageUrl={imageUrl}
                            clipAspect={state.agentClipAspect}
                            clipConfig={state.agentWhiteboardConfig || null}
                            clipSaving={state.savingWhiteboardConfig}
                            onClipConfigChange={(patch) => {
                                state.handleAgentWhiteboardConfigChange(patch);
                            }}
                            savedOverride={state.agentWhiteboardBeatOverrides?.[beatId] || null}
                            saving={state.savingWhiteboardBeatOverride}
                            withoutImage
                            onSave={(override) => persistOverride(override)}
                        />
                    </Box>
                    {bgSampleMode ? (
                        <Typography variant="caption" color="secondary.main" display="block" sx={{ mb: 0.5 }}>
                            Đang chọn <strong>background</strong> cho vùng đang chọn: <strong>click 1 phát</strong>
                            vào vị trí có màu/chi tiết nền trên ảnh bên trái → tự tạo ô mẫu nhỏ. Mẫu này lặp lại
                            fill nền vùng đó (thay vì tile trắng). Kéo chuột = vẽ vùng mẫu tay.
                        </Typography>
                    ) : null}
                    {!hasRegions ? (
                        <Typography variant="caption" color="text.secondary">
                            Chưa có vùng nào — vẽ trên ảnh bên trái.
                        </Typography>
                    ) : !selectedRegion ? (
                        <Typography variant="caption" color="text.secondary">
                            Chưa chọn vùng nào — click vào vùng trên ảnh (hoặc thanh thời gian bên dưới ảnh)
                            để hiển thị setting riêng của vùng đó.
                        </Typography>
                    ) : null}

                    {/* Đang chọn vùng con → nút quay lại setting vùng cha */}
                    {parentRegion ? (
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<ChevronLeftIcon />}
                            onClick={() => setSelectedRegionId(parentRegion.id)}
                            title={`Về setting vùng cha "${parentRegion.name}"`}
                            sx={{
                                textTransform: 'none',
                                justifyContent: 'flex-start',
                                alignSelf: 'flex-start',
                                mb: 0.5,
                            }}
                        >
                            Vùng cha: {parentRegion.name}
                        </Button>
                    ) : null}

                    {/* CHỈ hiển thị setting của vùng đang chọn (không liệt kê các vùng khác) */}
                    {(selectedRegion ? [selectedRegion] : []).map((region) => {
                        const index = Math.max(0, regions.findIndex((item) => item.id === region.id));
                        const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                        const isSelected = selectedRegionId === region.id;
                        const childCount = childRegions.length;
                        return (
                            <Box
                                key={region.id}
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: color,
                                    borderLeft: `4px solid ${color}`,
                                    bgcolor: 'action.selected',
                                    ...(isSelected ? {
                                        animation: `${regionActivePulse} 0.7s ease-out`,
                                    } : {}),
                                }}
                            >
                                {/* Thanh tiêu đề vùng: tên + xóa */}
                                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                                    <TextField
                                        size="small"
                                        value={region.name}
                                        onChange={(e) => updateRegion(region.id, { name: e.target.value })}
                                        sx={{ flex: 1, '& .MuiInputBase-root': { fontSize: 13 } }}
                                    />
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={(event) => {
                                            setDeleteMenuRegionId(region.id);
                                            setDeleteMenuAnchor(event.currentTarget);
                                        }}
                                        title="Xóa vùng"
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Stack>

                                {/* VÙNG CHA HIỆN NGAY (chỉ vùng có vùng con): phần thừa
                                hiện nguyên ảnh từ đầu — vùng con vẫn animate. */}
                                {childCount > 0 ? (
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
                                        <Switch
                                            size="small"
                                            checked={Boolean(region.parent_leftover_instant)}
                                            onChange={(event) =>
                                                updateRegion(region.id, { parent_leftover_instant: event.target.checked })
                                            }
                                        />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" fontWeight={700} display="block">
                                                Vùng cha hiện ngay từ đầu
                                            </Typography>
                                        </Box>
                                    </Stack>
                                ) : null}

                                {/* 1. Hành động render: Vẽ tay / Đưa vào */}
                                <RegionSection title="Hành động với ảnh">
                                    <Stack direction="row" spacing={1}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={region.action === 'draw' ? <CheckIcon /> : null}
                                        onClick={() => updateRegion(region.id, { action: 'draw' })}
                                        sx={{
                                            textTransform: 'none',
                                            flex: 1,
                                            ...(region.action === 'draw'
                                                ? { borderColor: 'primary.main', bgcolor: 'action.selected' }
                                                : {}),
                                        }}
                                    >
                                        Vẽ tay
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="secondary"
                                        startIcon={region.action === 'place' ? <CheckIcon /> : null}
                                        onClick={() => {
                                            if (region.action !== 'place') {
                                                updateRegion(region.id, {
                                                    action: 'place',
                                                    place_effect: normalizePlaceEffect(region.place_effect),
                                                });
                                            }
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            flex: 1,
                                            ...(region.action === 'place'
                                                ? { borderColor: 'secondary.main', bgcolor: 'action.selected' }
                                                : {}),
                                        }}
                                    >
                                        Đưa vào
                                    </Button>
                                    </Stack>
                                </RegionSection>

                                {/* 1a. KIỂU TAY VẼ (chỉ vùng draw): chọn bút/tay vẽ
                                vùng — đồng bộ whiteboard/pencil/meta.json.
                                "Mặc định" = tay theo setting toàn beat (config.hand). */}
                                {region.action === 'draw' && drawHandOptions.length > 0 ? (
                                    <RegionSection title="Kiểu tay vẽ">
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, justifyContent: 'flex-start' }}>
                                            {[
                                                { id: '', label: 'Mặc định', thumb_url: '' },
                                                ...drawHandOptions,
                                            ].map((opt) => {
                                                const isDefault = opt.id === '';
                                                const current = String(region.draw_hand || '').trim();
                                                const active = isDefault ? current === '' : current === opt.id;
                                                return (
                                                    <Box
                                                        key={opt.id || '__default__'}
                                                        onClick={() =>
                                                            updateRegion(
                                                                region.id,
                                                                isDefault ? { draw_hand: null } : { draw_hand: opt.id },
                                                            )
                                                        }
                                                        title={isDefault ? 'Tay mặc định của beat (setting toàn beat)' : opt.label}
                                                        sx={{
                                                            width: 'calc((100% / 3) - 6px)',
                                                            border: '1px solid',
                                                            borderColor: active ? 'primary.main' : 'divider',
                                                            borderRadius: 1.5,
                                                            overflow: 'hidden',
                                                            cursor: 'pointer',
                                                            bgcolor: active ? 'action.selected' : 'transparent',
                                                            '&:hover': { borderColor: 'primary.light' },
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                height: 64,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                bgcolor: 'rgba(0,0,0,0.05)',
                                                                position: 'relative',
                                                            }}
                                                        >
                                                            {opt.thumb_url ? (
                                                                <Box
                                                                    component="img"
                                                                    src={opt.thumb_url}
                                                                    alt={opt.label}
                                                                    draggable={false}
                                                                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                                                                />
                                                            ) : (
                                                                <AutoAwesomeIcon
                                                                    sx={{ fontSize: 30, color: active ? 'primary.main' : 'text.disabled' }}
                                                                />
                                                            )}
                                                            {active ? (
                                                                <Box
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        top: 3,
                                                                        right: 3,
                                                                        width: 16,
                                                                        height: 16,
                                                                        borderRadius: '50%',
                                                                        bgcolor: 'primary.main',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                                                                </Box>
                                                            ) : null}
                                                        </Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block',
                                                                textAlign: 'center',
                                                                px: 0.5,
                                                                py: 0.4,
                                                                fontSize: 10,
                                                                lineHeight: 1.25,
                                                                color: active ? 'primary.main' : 'text.secondary',
                                                                fontWeight: active ? 700 : 400,
                                                            }}
                                                        >
                                                            {opt.label}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    </RegionSection>
                                ) : null}

                                {/* 2. Hiệu ứng khi ĐƯA VÀO (chỉ vùng place) */}
                                {region.action === 'place' ? (
                                    <RegionSection title="Hiệu ứng sau khi đưa ảnh vào">
                                        <Stack direction="row"  sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                            {PLACE_EFFECT_OPTIONS.map((opt) => {
                                                const active = normalizePlaceEffect(region.place_effect) === opt.value;
                                                return (
                                                    <Button
                                                        key={opt.value}
                                                        size="small"
                                                        variant="outlined"
                                                        color={active ? 'warning' : 'inherit'}
                                                        startIcon={active ? <CheckIcon /> : null}
                                                        onClick={() => updateRegion(region.id, { place_effect: opt.value })}
                                                        title={opt.description}
                                                        sx={{
                                                            textTransform: 'none',
                                                            flex: '1 1 45%',
                                                            fontSize: 11,
                                                            py: 0.25,
                                                            mt: 0.5,
                                                            minHeight: 0,
                                                            ...(active
                                                                ? { borderColor: 'warning.main', bgcolor: 'action.selected' }
                                                                : {}),
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </Button>
                                                );
                                            })}
                                        </Stack>
                                    </RegionSection>
                                ) : null}

                                {/* 2a. MÀU ĐÈN NEON CHẠY VIỀN (chỉ khi chọn hiệu ứng neon_border) */}
                                {region.action === 'place' && normalizePlaceEffect(region.place_effect) === 'neon_border' ? (
                                    <RegionSection title="Màu đèn neon chạy viền">
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                                            {NEON_COLOR_OPTIONS.map((opt) => {
                                                const active = normalizeNeonColor(region.place_effect_color) === opt.value;
                                                return (
                                                    <Box
                                                        key={opt.value}
                                                        onClick={() => updateRegion(region.id, { place_effect_color: opt.value })}
                                                        title={opt.label}
                                                        sx={{
                                                            width: 34,
                                                            height: 34,
                                                            borderRadius: '50%',
                                                            cursor: 'pointer',
                                                            background: `linear-gradient(135deg, ${opt.swatch}, ${opt.swatch}cc)`,
                                                            border: '2px solid',
                                                            borderColor: active ? 'warning.main' : 'divider',
                                                            boxShadow: active ? `0 0 8px ${opt.swatch}aa` : 'none',
                                                            '&:hover': { borderColor: 'warning.light' },
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Stack>
                                    </RegionSection>
                                ) : null}

                                {/* 2b. KIỂU TAY ĐƯA ẢNH VÀO (chỉ vùng place có dùng tay —
                                zoom_out_bounce/pop_in_bounce ảnh tự nảy, không cần tay).
                                Có bao nhiêu ảnh bàn tay thì có bấy nhiêu kiểu; kiểu mặc
                                định (meta.json 'default') có nhãn "Mặc định" và được chọn
                                sẵn khi vùng chưa đặt kiểu. */}
                                {region.action === 'place' && !isPlaceHandlessEffect(normalizePlaceEffect(region.place_effect)) ? (
                                    <RegionSection title="Kiểu tay đưa ảnh vào">
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, justifyContent: 'space-between' }}>
                                            {placeHandOptions.map((opt) => {
                                                const isDefault = opt.id === placeHandDefaultId;
                                                const current = normalizePlaceHand(region.place_hand);
                                                const active = isDefault ? current === '' : current === opt.id;
                                                return (
                                                    <Box
                                                        key={opt.id}
                                                        onClick={() =>
                                                            updateRegion(
                                                                region.id,
                                                                isDefault ? { place_hand: null } : { place_hand: opt.id },
                                                            )
                                                        }
                                                        title={
                                                            isDefault
                                                                ? `${opt.label} (mặc định)`
                                                                : opt.label
                                                        }
                                                        sx={{
                                                            width: 'calc((100% / 3) - 6px)',
                                                            border: '1px solid',
                                                            borderColor: active ? 'secondary.main' : 'divider',
                                                            borderRadius: 1.5,
                                                            overflow: 'hidden',
                                                            cursor: 'pointer',
                                                            bgcolor: active ? 'action.selected' : 'transparent',
                                                            '&:hover': { borderColor: 'secondary.light' },
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                height: 64,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                bgcolor: 'rgba(0,0,0,0.05)',
                                                                position: 'relative',
                                                            }}
                                                        >
                                                            {opt.thumb_url ? (
                                                                <Box
                                                                    component="img"
                                                                    src={opt.thumb_url}
                                                                    alt={opt.label}
                                                                    draggable={false}
                                                                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                                                                />
                                                            ) : (
                                                                <AutoAwesomeIcon
                                                                    sx={{ fontSize: 30, color: active ? 'secondary.main' : 'text.disabled' }}
                                                                />
                                                            )}
                                                            {isDefault ? (
                                                                <Box
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        top: 3,
                                                                        left: 3,
                                                                        px: 0.5,
                                                                        py: 0.15,
                                                                        borderRadius: 1,
                                                                        bgcolor: 'primary.main',
                                                                        color: '#fff',
                                                                        fontSize: 8,
                                                                        lineHeight: 1.2,
                                                                        fontWeight: 700,
                                                                    }}
                                                                >
                                                                    Mặc định
                                                                </Box>
                                                            ) : null}
                                                            {active ? (
                                                                <Box
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        top: 3,
                                                                        right: 3,
                                                                        width: 16,
                                                                        height: 16,
                                                                        borderRadius: '50%',
                                                                        bgcolor: 'secondary.main',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                                                                </Box>
                                                            ) : null}
                                                        </Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block',
                                                                textAlign: 'center',
                                                                px: 0.5,
                                                                py: 0.4,
                                                                fontSize: 10,
                                                                lineHeight: 1.25,
                                                                color: active ? 'secondary.main' : 'text.secondary',
                                                                fontWeight: active ? 700 : 400,
                                                            }}
                                                        >
                                                            {opt.label}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    </RegionSection>
                                ) : null}

                                {/* 3. Tinh chỉnh vùng: Thêm vùng / Xóa thừa */}
                                <RegionSection title="Tinh chỉnh vùng">
                                    <Stack direction="row" spacing={1}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="success"
                                        startIcon={addModeRegionId === region.id ? <CheckIcon /> : null}
                                        onClick={() => {
                                            setAddModeRegionId(addModeRegionId === region.id ? '' : region.id);
                                            if (addModeRegionId !== region.id) {
                                                setEraseModeRegionId('');
                                            }
                                        }}
                                        title="Thêm vùng: vào chế độ — vẽ các vùng cần thêm (ngược với Xóa thừa): phần vẽ được nối liền vào vùng hiện tại"
                                        sx={{
                                            textTransform: 'none',
                                            flex: 1,
                                            ...(addModeRegionId === region.id
                                                ? { borderColor: 'success.main', bgcolor: 'action.selected' }
                                                : {}),
                                        }}
                                    >
                                        {addModeRegionId === region.id ? 'Đang thêm vùng' : 'Thêm vùng'}
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={eraseModeRegionId === region.id ? <CheckIcon /> : null}
                                        onClick={() => {
                                            setEraseModeRegionId(
                                                eraseModeRegionId === region.id ? '' : region.id,
                                            );
                                            if (eraseModeRegionId !== region.id) {
                                                setAddModeRegionId('');
                                            }
                                        }}
                                        title="Xóa vùng thừa: vào chế độ — vẽ các vùng cần bỏ (phần đó hiển thị ảnh gốc, không đưa vào/vẽ)"
                                        sx={{
                                            textTransform: 'none',
                                            flex: 1,
                                            ...(eraseModeRegionId === region.id
                                                ? { borderColor: 'error.main', bgcolor: 'action.selected' }
                                                : {}),
                                        }}
                                    >
                                        {eraseModeRegionId === region.id ? 'Đang xóa thừa' : 'Xóa thừa'}
                                    </Button>
                                    </Stack>
                                </RegionSection>

                                {/* 4. Phạm vi vùng: Toàn vùng / Chỉ vật trong vùng */}
                                <RegionSection title="Phạm vi vùng">
                                    <Stack direction="row" spacing={1}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={!originalPointsByRegion[region.id] ? <CheckIcon /> : null}
                                        onClick={() => {
                                            if (originalPointsByRegion[region.id]) {
                                                handleRestoreRegionPoints(region);
                                            }
                                        }}
                                        title="Dùng toàn bộ vùng đã vẽ (mặc định) — khôi phục nếu đang thu gọn thành vật"
                                        sx={{
                                            textTransform: 'none',
                                            flex: 1,
                                            ...(!originalPointsByRegion[region.id]
                                                ? { borderColor: 'primary.main', bgcolor: 'action.selected' }
                                                : {}),
                                        }}
                                    >
                                        Toàn vùng
                                    </Button>
                                    <LoadingButton
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        loading={refiningRegionId === region.id}
                                        startIcon={originalPointsByRegion[region.id] ? <CheckIcon /> : null}
                                        onClick={() => { void handleRefineRegionToObject(region); }}
                                        title="Thu gọn vùng thành đúng vật thể bên trong vùng (GrabCut/ML)"
                                        sx={{
                                            textTransform: 'none',
                                            flex: 1,
                                            ...(originalPointsByRegion[region.id]
                                                ? { borderColor: 'primary.main', bgcolor: 'action.selected' }
                                                : {}),
                                        }}
                                    >
                                        Chỉ vật trong vùng
                                    </LoadingButton>
                                    </Stack>
                                </RegionSection>

                                {/* 5. Nền vùng: mẫu background riêng + giữ nền (inpaint) */}
                                <RegionSection title="Nền vùng">
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                        <Button
                                            size="small"
                                            variant={bgSampleMode && isSelected ? 'contained' : 'outlined'}
                                            color="secondary"
                                            onClick={() => handleStartBgSampleForRegion(region.id)}
                                            title="Chọn 1 vùng nhỏ background trên ảnh — lặp lại fill nền vùng này khi render"
                                            sx={{ textTransform: 'none', fontSize: 11, py: 0.25, minHeight: 0, flex: 1 }}
                                        >
                                            {region.bg_sample && region.bg_sample.points.length >= 3
                                                ? 'Đổi bg'
                                                : 'Chọn background'}
                                        </Button>
                                        {region.bg_sample && region.bg_sample.points.length >= 3 ? (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleClearRegionBgSample(region.id)}
                                                title="Xóa background riêng của vùng này"
                                                sx={{ textTransform: 'none', fontSize: 11, py: 0.25, minHeight: 0 }}
                                            >
                                                Xóa bg
                                            </Button>
                                        ) : null}
                                    </Stack>
                                    <Stack direction="row" spacing={1} sx={{ mt: 0.75, alignItems: 'center' }}>
                                        <LoadingButton
                                            size="small"
                                            variant={region.background_image ? 'contained' : 'outlined'}
                                            color="success"
                                            startIcon={<WallpaperIcon />}
                                            loading={keepBgBusy === region.id}
                                            onClick={() => {
                                                void handleToggleKeepBackground(region, !region.background_image);
                                            }}
                                            title="Tạo ảnh nền đã vá (bỏ vật thể, nền giữ nguyên) — render hiển thị nền này cho vùng thay vì tile"
                                            sx={{ textTransform: 'none', flex: 1, fontSize: 11, py: 0.25, minHeight: 0 }}
                                        >
                                            {region.background_image ? 'Đang giữ nền' : 'Giữ nền'}
                                        </LoadingButton>
                                        {region.background_image ? (
                                            <Box
                                                component="img"
                                                src={region.background_image}
                                                alt="nền đã vá"
                                                sx={{
                                                    width: 44,
                                                    height: 44,
                                                    objectFit: 'cover',
                                                    borderRadius: 0.75,
                                                    border: 1,
                                                    borderColor: 'divider',
                                                }}
                                            />
                                        ) : null}
                                    </Stack>
                                </RegionSection>
                            </Box>
                        );
                    })}

                    {/* Vùng con của vùng đang chọn: mỗi vùng 1 dòng + nút Chọn
                        → click chuyển setting sang vùng con đó */}
                    {selectedRegion && childRegions.length > 0 ? (
                        <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                                Vùng con ({childRegions.length})
                            </Typography>
                            {childRegions.map((child) => {
                                const childColor = child.action === 'erase'
                                    ? '#f44336'
                                    : colorFor(Math.max(0, regions.findIndex((item) => item.id === child.id)));
                                return (
                                    <Stack
                                        key={child.id}
                                        direction="row"
                                        alignItems="center"
                                        spacing={0.75}
                                        sx={{
                                            p: 0.5,
                                            pl: 1,
                                            mb: 0.5,
                                            borderRadius: 1,
                                            border: 1,
                                            borderColor: 'divider',
                                            borderLeft: `3px solid ${childColor}`,
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            title={child.name}
                                            sx={{
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {child.name}
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => setSelectedRegionId(child.id)}
                                            title={`Chọn "${child.name}" — hiển thị setting của vùng con này`}
                                            sx={{
                                                textTransform: 'none',
                                                fontSize: 11,
                                                py: 0.15,
                                                px: 1.25,
                                                minHeight: 0,
                                                flexShrink: 0,
                                            }}
                                        >
                                            Chọn
                                        </Button>
                                    </Stack>
                                );
                            })}
                        </Box>
                    ) : null}

                    <Divider sx={{ my: 0.5 }} />
                </Box>
            </Box>

            {/* Dropdown xác nhận xóa vùng */}
            <Menu
                open={Boolean(deleteMenuAnchor)}
                anchorEl={deleteMenuAnchor}
                onClose={() => setDeleteMenuAnchor(null)}
                slotProps={{
                    root: { style: { zIndex: 1600 } },
                    paper: { sx: { minWidth: 240, zIndex: 1600 } },
                }}
            >
                <MenuItem onClick={() => setDeleteMenuAnchor(null)}>
                    Hủy
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const rid = deleteMenuRegionId;
                        setDeleteMenuAnchor(null);
                        setDeleteMenuRegionId('');
                        if (rid) {
                            handleDeleteRegion(rid);
                        }
                    }}
                    sx={{ color: 'error.main', fontWeight: 600 }}
                >
                    Xóa
                </MenuItem>
            </Menu>
        </Box>
    );
}
