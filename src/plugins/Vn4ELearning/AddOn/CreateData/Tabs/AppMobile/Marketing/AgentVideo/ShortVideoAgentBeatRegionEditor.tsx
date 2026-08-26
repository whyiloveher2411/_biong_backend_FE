import React from 'react';
import { keyframes } from '@emotion/react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
    Tab,
    Tabs,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MovieCreationIcon from '@mui/icons-material/MovieCreation';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import CheckIcon from '@mui/icons-material/Check';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LayersIcon from '@mui/icons-material/Layers';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import VideocamIcon from '@mui/icons-material/Videocam';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import EditIcon from '@mui/icons-material/Edit';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { LoadingButton } from '@mui/lab';
import useAjax from 'hook/useApi';
import { resolveAgentLocalVideoOpenUrl } from 'helpers/shortVideoVisualClips';
import { isKeyboardEditableTarget } from 'helpers/shortVideoEditorKeyboard';
import type { useAgentVideoContent } from './useAgentVideoContent';
import ShortVideoAgentImageAnimationControls from './ShortVideoAgentImageAnimationControls';
import ShortVideoAgentBeatAddPanel from './ShortVideoAgentBeatAddPanel';
import WhiteboardRegionTimeline from './WhiteboardRegionTimeline';
import { useBeatTimelineEffects } from './beatTimelineEffects/useBeatTimelineEffects';
import { getBeatTimelineEffectDefinition } from './beatTimelineEffects/registry';
import {
    getZoomOverlayCropRect,
    resolveZoomTransformAt,
    zoomRectToSvgAttrs,
    zoomTransformToCss,
} from './beatTimelineEffects/resolveZoomTransform';
import type { BeatTimelineEffectType } from './agentVideoApi';
import WhiteboardBeatTimingPreview, {
    WhiteboardBeatVideoPreview,
    type WhiteboardBeatVideoPreviewHandle,
} from './WhiteboardBeatTimingPreview';
import PlaceEntryDirectionPicker from './PlaceEntryDirectionPicker';
import { getBeatTimelineSegments, normalizeBeatQaStatus } from './agentVideoBeatMap';
import { resolveAgentVideoBeatSceneBudgetSec, resolveAgentVideoBeatTransitionDurationSec } from './agentVideoTimelineModel';
import RegionMediaSettingsPanel from './RegionMediaSettingsPanel';
import WhiteboardImageOverlayHandles from './WhiteboardImageOverlayHandles';
import WhiteboardRegionPathHandles from './WhiteboardRegionPathHandles';
import WhiteboardCutoutImagePreview from './WhiteboardCutoutImagePreview';
import {
    createDefaultBeatImageOverlay,
    snapAttentionFieldsToConstraints,
} from './regionAttentionTiming';
import { normalizeRegionTimingFields, WHITEBOARD_SCENE_INTRO_SEC } from './regionTimelineTiming';
import {
    autoSelectAgentWhiteboardRegion,
    sam2AutoRegionsAgentWhiteboard,
    buildPlaceEffectRegionUpdate,
    buildPlaceHandRegionUpdate,
    fetchWhiteboardTransitions,
    isPlaceEntryDirectionApplicable,
    isPlaceHandlessEffect,
    buildRegionDrawActionPatch,
    buildRegionPlaceDragInPatch,
    buildRegionPlaceInstantEntryPatch,
    buildOverlayDragInPatch,
    buildOverlayInstantEntryPatch,
    buildOverlayDrawActionPatch,
    resolveOverlayImageActionKey,
    resolveRegionImageActionKey,
    resolveOverlayEntryModeFromPlaceSettings,
    resolveRegionEntryModeFromPlaceSettings,
    normalizeNeonColor,
    normalizeDrawEffect,
    normalizePlaceEffect,
    normalizePlaceEntryDirection,
    normalizePlaceHand,
    normalizeCutoutShadow,
    normalizePlaceBorder,
    normalizePlaceBorderColor,
    normalizePlaceTornPaper,
    DRAW_EFFECT_OPTIONS,
    NEON_COLOR_OPTIONS,
    PLACE_BORDER_COLOR_OPTIONS,
    PLACE_EFFECT_OPTIONS,
    normalizeBeatImageOverlays,
    normalizeBeatRegionAttentionFields,
    uploadAgentVisualImage,
    type AgentWhiteboardBeatOverride,
    type BeatImageOverlay,
    type BeatRegion,
    type BeatRegionPoint,
    type BeatTimelineEffect,
    type WhiteboardTransitionOption,
} from './agentVideoApi';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

const EMPTY_BEAT_TIMELINE_EFFECTS: BeatTimelineEffect[] = [];

type Props = {
    state: AgentVideoState;
    beatId: string;
    imageUrl: string;
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
            // được bắt đầu/xong trước mốc đó. Cha chỉ có script_end_word (chưa
            // kéo end_sec) vẫn GIỮ start/end giây của con — nếu xóa thì lưu mất
            // mốc timeline user kéo → engine fallback cuối beat (vẽ sai thời gian).
            const pEndSec = parent.end_sec ?? -1;
            if (pEndSec >= 0) {
                if (next.end_sec != null && next.end_sec < pEndSec) {
                    next.end_sec = pEndSec;
                }
                if (next.start_sec != null && next.start_sec < pEndSec) {
                    next.start_sec = pEndSec;
                }
            } else if (pEnd < 0 && (next.end_sec != null || next.start_sec != null)) {
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
    subtitle,
    children,
    color,
}: {
    title: string;
    subtitle?: string;
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
                    mb: subtitle ? 0.25 : 0.5,
                }}
            >
                {title}
            </Typography>
            {subtitle ? (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ fontSize: 10, lineHeight: 1.35, mb: 0.5 }}
                >
                    {subtitle}
                </Typography>
            ) : null}
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
}: Props) {
    const currentOverride = state.agentWhiteboardBeatOverrides?.[beatId] || {};
    const savedRegions = Array.isArray(currentOverride.regions)
        ? currentOverride.regions.map(normalizeRegionTimingFields)
        : [];

    const savedOverlays = normalizeBeatImageOverlays(currentOverride.image_overlays);
    const savedOverlaysRef = React.useRef(savedOverlays);
    savedOverlaysRef.current = savedOverlays;

    const [regions, setRegions] = React.useState<BeatRegion[]>(savedRegions);
    const [imageOverlays, setImageOverlays] = React.useState<BeatImageOverlay[]>(savedOverlays);
    const [savedOverlaysSnapshot, setSavedOverlaysSnapshot] = React.useState<BeatImageOverlay[]>(
        savedOverlays.map((item) => ({ ...item })),
    );
    const [selectedOverlayId, setSelectedOverlayId] = React.useState<string>('');
    const overlayUploadRef = React.useRef<HTMLInputElement | null>(null);
    const [draftPoints, setDraftPoints] = React.useState<[number, number][]>([]);
    const [selectedRegionId, setSelectedRegionId] = React.useState<string>('');
    const [selectedEffectId, setSelectedEffectId] = React.useState<string>('');
    const [rightPanelTab, setRightPanelTab] = React.useState<'edit' | 'add'>('edit');
    const [playheadSec, setPlayheadSec] = React.useState(0);
    const [imgNatural, setImgNatural] = React.useState<{ w: number; h: number } | null>(null);
    const [imageError, setImageError] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [savingQa, setSavingQa] = React.useState(false);
    const [bgSampleMode, setBgSampleMode] = React.useState(false);
    const [bgSampleDraft, setBgSampleDraft] = React.useState<[number, number][]>([]);
    const [deleteMenuAnchor, setDeleteMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [deleteMenuTarget, setDeleteMenuTarget] = React.useState<{
        kind: 'region' | 'overlay' | 'effect';
        id: string;
    } | null>(null);
    // Chế độ tương tác với canvas ảnh: 'select' (mặc định — click vùng = chọn) /
    // 'add' (one-shot: click nút → vẽ 1 vùng → tự về select). bg_sample ưu tiên hơn.
    const [regionMode, setRegionMode] = React.useState<'select' | 'add'>('select');
    const [canvasMode, setCanvasMode] = React.useState<'edit' | 'preview'>('edit');
    /** Bấm BiRefNet → vẽ vùng mới; khi finishDraft xong thì auto refine vùng vừa tạo. */
    const [birefnetDrawMode, setBirefnetDrawMode] = React.useState(false);
    /** Union vào vùng đang chọn — vẽ B rồi A = A ∪ B. */
    const [addModeRegionId, setAddModeRegionId] = React.useState('');
    /** Subtract khỏi vùng đang chọn — vẽ B rồi A = A − B. */
    const [eraseModeRegionId, setEraseModeRegionId] = React.useState('');
    /** Token seek timeline (chọn vùng → về 0). */
    const [timelineSeekRequest, setTimelineSeekRequest] = React.useState<{ sec: number; token: number } | null>(null);
    const runBirefnetRefineOnRegionRef = React.useRef<(region: BeatRegion) => void>(() => {
        // 
    });
    const isDrawingNewRegion = regionMode === 'add';
    const isBooleanRegionEdit = Boolean(addModeRegionId || eraseModeRegionId);
    const isAddActive = isDrawingNewRegion || bgSampleMode || isBooleanRegionEdit;

    const clearBgSampleCanvasMode = React.useCallback(() => {
        setBgSampleMode(false);
        setBgSampleDraft([]);
    }, []);

    const clearBooleanRegionModes = React.useCallback(() => {
        setAddModeRegionId('');
        setEraseModeRegionId('');
    }, []);

    /** Bắt đầu phiên vẽ vùng mới (one-shot). */
    const handleStartAddRegion = React.useCallback(() => {
        clearBgSampleCanvasMode();
        clearBooleanRegionModes();
        setBirefnetDrawMode(false);
        setDraftPoints([]);
        setDraftIsDrag(false);
        setRegionMode('add');
    }, [clearBgSampleCanvasMode, clearBooleanRegionModes]);

    /** Hủy phiên thêm vùng → về chọn. */
    const handleCancelAddRegionSession = React.useCallback(() => {
        setDraftPoints([]);
        setDraftIsDrag(false);
        setBirefnetDrawMode(false);
        clearBooleanRegionModes();
        setRegionMode('select');
    }, [clearBooleanRegionModes]);

    /** Nút Thêm vùng: chưa add → bắt đầu; đang add → hủy về select. */
    const handleAddRegionButtonClick = React.useCallback(() => {
        if (regionMode === 'add') {
            handleCancelAddRegionSession();
            return;
        }
        handleStartAddRegion();
    }, [handleCancelAddRegionSession, handleStartAddRegion, regionMode]);

    // Phím E: select → bắt đầu thêm vùng; đang add → hủy về select.
    // Esc: đang add (hoặc có draft vẽ vùng mới) → hủy về select.
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target && isKeyboardEditableTarget(target)) {
                return;
            }
            if (canvasMode === 'preview') {
                return;
            }
            if (event.key === 'Escape') {
                if (regionMode !== 'add' && draftPoints.length === 0) {
                    return;
                }
                if (bgSampleMode) {
                    return;
                }
                event.preventDefault();
                handleCancelAddRegionSession();
                return;
            }
            if (event.key !== 'e' && event.key !== 'E') {
                return;
            }
            event.preventDefault();
            if (regionMode === 'add') {
                handleCancelAddRegionSession();
            } else {
                handleStartAddRegion();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        bgSampleMode,
        canvasMode,
        draftPoints.length,
        handleCancelAddRegionSession,
        handleStartAddRegion,
        regionMode,
    ]);

    // Refine vùng thành vật thể (GrabCut/ML) + giữ nền.
    const [keepBgBusy, setKeepBgBusy] = React.useState<string | null>(null);
    const [sam2Busy, setSam2Busy] = React.useState(false);
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
    const [drawHandDefaultId, setDrawHandDefaultId] = React.useState('but_chi');
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
                default_hand?: string;
                hands?: Array<{ id?: string; label?: string; thumb_url?: string }>;
            }) => {
                if (cancelled || !res?.success) return;
                setDrawHandDefaultId(String(res.default_hand || 'but_chi').trim() || 'but_chi');
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
    // Canvas zoom UI: phóng kích thước khung ảnh (không scale+clip trong box cố định).
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = React.useState<[number, number] | null>(null);

    // Chỉ reset khi drawer MỞ (transition open) — tránh effect chạy lại mỗi render
    // vì savedRegions là array mới mỗi render (reset draftPoints liên tục).
    const savedRegionsRef = React.useRef(savedRegions);
    savedRegionsRef.current = savedRegions;

    // BiRefNet (vẽ vùng → auto refine): gửi kèm full_points (polygon trước refine)
    // + object_points (contour vật) để backend lưu riêng; render dùng vật.
    const buildRegionsToSave = React.useCallback((): BeatRegion[] => (
        enforceRegionChildOrder(regions.map((r): BeatRegion => {
            const original = originalPointsByRegion[r.id];
            const base = normalizeBeatRegionAttentionFields(normalizeRegionTimingFields(r));
            const entryMode = resolveRegionEntryModeFromPlaceSettings(base);
            const withEntry = entryMode != null ? { ...base, entry_mode: entryMode } : base;
            const snapped = snapAttentionFieldsToConstraints(
                withEntry,
                beatWords,
                beatTimeline.beatStartSec,
                beatTimeline.beatDurationSec,
                sceneBudgetSec,
            );
            const timed = snapped ? { ...withEntry, ...snapped } : withEntry;
            if (!original) {
                return timed;
            }
            return {
                ...timed,
                full_points: original,
                object_points: base.points,
                select_mode: 'object' as BeatRegion['select_mode'],
            };
        }))
    ), [regions, originalPointsByRegion]);

    const buildOverlaysToSave = React.useCallback(
        (): BeatImageOverlay[] => imageOverlays.map((item) => {
            const withEntry = {
                ...item,
                entry_mode: resolveOverlayEntryModeFromPlaceSettings(item),
            };
            const snapped = snapAttentionFieldsToConstraints(
                withEntry,
                beatWords,
                beatTimeline.beatStartSec,
                beatTimeline.beatDurationSec,
                sceneBudgetSec,
            );
            return snapped ? { ...withEntry, ...snapped } : withEntry;
        }),
        [imageOverlays],
    );

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

    const beatQaStatus = normalizeBeatQaStatus(state.beatImage[beatId]?.qa_status);
    const isBeatApproved = beatQaStatus === 'approved';
    const handleToggleApproved = React.useCallback(async () => {
        if (!beatId || savingQa || state.savingImportHtml) {
            return;
        }
        const entry = state.beatImage[beatId];
        const current = normalizeBeatQaStatus(entry?.qa_status);
        const nextStatus = current === 'approved' ? '' : 'approved';
        setSavingQa(true);
        try {
            await state.handleSaveBeatQa(beatId, nextStatus, String(entry?.qa_refine_note || ''));
        } finally {
            setSavingQa(false);
        }
    }, [beatId, savingQa, state.beatImage, state.handleSaveBeatQa, state.savingImportHtml]);

    const resetDrawerState = React.useCallback(() => {
        const fresh = Array.isArray(savedRegionsRef.current) ? savedRegionsRef.current : [];
        // Khôi phục trạng thái "chỉ vật trong vùng" từ dữ liệu đã lưu:
        // object_points = contour vật (dùng làm points hiển thị), full_points
        // = toàn vùng thủ công (giữ để option đúng + rollback).
        const restoredOrig: Record<string, BeatRegionPoint[]> = {};
        const mapped = fresh.map((r) => {
            const timed = normalizeRegionTimingFields(r);
            if (Array.isArray(timed.object_points) && timed.object_points.length >= 3) {
                if (Array.isArray(timed.full_points) && timed.full_points.length >= 3) {
                    restoredOrig[timed.id] = timed.full_points;
                }
                return { ...timed, points: timed.object_points };
            }
            return timed;
        });
        setRegions(mapped);
        setSavedSnapshot(mapped.map((r) => ({ ...r })));
        const freshOverlays = (savedOverlaysRef.current || []).map((item) => ({ ...item }));
        setImageOverlays(freshOverlays);
        setSavedOverlaysSnapshot(freshOverlays.map((item) => ({ ...item })));
        setSelectedOverlayId('');
        setOriginalPointsByRegion(restoredOrig);
        setDraftPoints([]);
        setDraftIsDrag(false);
        setSelectedRegionId('');
        setSelectedEffectId('');
        setRightPanelTab('edit');
        setPlayheadSec(0);
        setImgNatural(null);
        setImageError(false);
        setBoxSize(null);
        setBgSampleMode(false);
        setBgSampleDraft([]);
        setDeleteMenuAnchor(null);
        setDeleteMenuTarget(null);
        setKeepBgBusy(null);
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
        || JSON.stringify(imageOverlays) !== JSON.stringify(savedOverlaysSnapshot)
        || draftPoints.length > 0
        || bgSampleDraft.length > 0
    ), [regions, savedSnapshot, imageOverlays, savedOverlaysSnapshot, draftPoints, bgSampleDraft]);
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
                    image_overlays: buildOverlaysToSave(),
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
    }, [pendingSwitch, state, regions, savedRegions, resetDrawerState, buildRegionsToSave, buildOverlaysToSave]);

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
    // bù scale ngược để dot/text luôn TRÒN và KHÔNG méo (kể cả khi canvas zoom).
    const svgScale = containRect
        ? {
            invW: 1000 / Math.max(1, containRect.w * zoom),
            invH: 1000 / Math.max(1, containRect.h * zoom),
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
    // vùng đỏ cuối beat + scene budget cho timeline hiệu ứng.
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

    const sceneBudgetSec = React.useMemo(
        () => resolveAgentVideoBeatSceneBudgetSec({
            beatDurationSec: beatTimeline.beatDurationSec,
            transitionDurationSec: beatTransitionDurationSec,
        }),
        [beatTimeline.beatDurationSec, beatTransitionDurationSec],
    );

    const savedTimelineEffects = React.useMemo(
        () => (
            Array.isArray(currentOverride.timeline_effects)
                ? currentOverride.timeline_effects
                : EMPTY_BEAT_TIMELINE_EFFECTS
        ),
        [currentOverride.timeline_effects],
    );

    const persistTimelineEffects = React.useCallback(async (effects: typeof savedTimelineEffects) => {
        return state.handleSaveWhiteboardBeatOverride(beatId, {
            ...(state.agentWhiteboardBeatOverrides?.[beatId] || {}),
            timeline_effects: effects,
            regions: buildRegionsToSave(),
            image_overlays: buildOverlaysToSave(),
        });
    }, [beatId, state, buildRegionsToSave, buildOverlaysToSave]);

    const {
        effects: timelineEffects,
        saving: savingTimelineEffects,
        addEffect,
        updateEffectLocal,
        commitEffect,
        scheduleEffectCommit,
        removeEffect,
        clearEffects,
        moveLayer,
    } = useBeatTimelineEffects({
        beatDurationSec: sceneBudgetSec,
        playheadSec,
        initialEffects: savedTimelineEffects,
        onPersist: persistTimelineEffects,
    });

    const selectedEffect = React.useMemo(
        () => timelineEffects.find((item) => item.id === selectedEffectId) || null,
        [timelineEffects, selectedEffectId],
    );

    const handleClearAllTimelineItems = React.useCallback(() => {
        const total = regions.length + imageOverlays.length + timelineEffects.length;
        if (total <= 0) {
            notify('Timeline đã trống', 'info');
            return;
        }
        if (!window.confirm(
            `Xóa tất cả ${total} mục trên timeline (vùng, ảnh thêm, hiệu ứng)?\nVùng/ảnh thêm cần bấm "Lưu vùng" để ghi DB.`,
        )) {
            return;
        }
        setRegions([]);
        setImageOverlays([]);
        setSelectedRegionId('');
        setSelectedOverlayId('');
        setSelectedEffectId('');
        setOriginalPointsByRegion({});
        setDraftPoints([]);
        setRegionMode('select');
        void clearEffects().then((ok) => {
            if (ok) {
                notify(`Đã xóa ${total} mục trên timeline`, 'success');
            } else {
                notify('Đã xóa vùng/ảnh thêm — xóa hiệu ứng thất bại', 'warning');
            }
        });
    }, [
        clearEffects,
        imageOverlays.length,
        notify,
        regions.length,
        timelineEffects.length,
    ]);

    const buildBeatOverridePayload = React.useCallback((): Partial<AgentWhiteboardBeatOverride> => ({
        regions: buildRegionsToSave(),
        image_overlays: buildOverlaysToSave(),
        timeline_effects: timelineEffects,
    }), [buildOverlaysToSave, buildRegionsToSave, timelineEffects]);

    const selectRegion = React.useCallback((id: string) => {
        setSelectedOverlayId('');
        setSelectedEffectId('');
        setSelectedRegionId(id);
        setRightPanelTab('edit');
        // Edit mode: về đầu timeline để thấy vùng được chọn (chưa bị che theo playhead).
        if (canvasMode === 'edit') {
            setPlayheadSec(0);
            playheadRef.current = { sec: 0, playing: false };
            videoPreviewRef.current?.seekTo(0, false);
            setTimelineSeekRequest((prev) => ({
                sec: 0,
                token: (prev?.token || 0) + 1,
            }));
        }
    }, [canvasMode]);

    const selectOverlay = React.useCallback((id: string) => {
        setSelectedRegionId('');
        setSelectedEffectId('');
        setSelectedOverlayId(id);
        setRightPanelTab('edit');
    }, []);

    const updateOverlay = React.useCallback((id: string, patch: Partial<BeatImageOverlay>) => {
        setImageOverlays((prev) => prev.map((item) => {
            if (item.id !== id) {
                return item;
            }
            const next = { ...item, ...patch };
            const snapped = snapAttentionFieldsToConstraints(
                next,
                beatWords,
                beatTimeline.beatStartSec,
                beatTimeline.beatDurationSec,
                sceneBudgetSec,
            );
            return snapped ? { ...next, ...snapped } : next;
        }));
    }, [beatTimeline.beatDurationSec, beatTimeline.beatStartSec, beatWords, sceneBudgetSec]);

    const focusDragRef = React.useRef<{ moved: boolean } | null>(null);
    const focusPendingPatchRef = React.useRef<{ focus_x: number; focus_y: number } | null>(null);

    const applyZoomFocus = React.useCallback((x: number, y: number, persistNow = false) => {
        if (selectedEffect?.type !== 'zoom') return;
        const clamped = {
            focus_x: Math.max(0, Math.min(1, x)),
            focus_y: Math.max(0, Math.min(1, y)),
        };
        updateEffectLocal(selectedEffect.id, clamped);
        focusPendingPatchRef.current = clamped;
        if (persistNow) {
            focusPendingPatchRef.current = null;
            void commitEffect(selectedEffect.id, clamped);
        }
    }, [commitEffect, selectedEffect, updateEffectLocal]);

    const commitPendingZoomFocus = React.useCallback(() => {
        if (!selectedEffect || selectedEffect.type !== 'zoom' || !focusPendingPatchRef.current) return;
        const patch = focusPendingPatchRef.current;
        focusPendingPatchRef.current = null;
        void commitEffect(selectedEffect.id, patch);
    }, [commitEffect, selectedEffect]);

    const selectEffect = React.useCallback((id: string) => {
        setSelectedRegionId('');
        setSelectedOverlayId('');
        setSelectedEffectId(id);
        setRightPanelTab('edit');
    }, []);

    const handleAddTimelineEffect = React.useCallback(async (type: BeatTimelineEffectType) => {
        const created = await addEffect(type);
        if (created) {
            selectEffect(created.id);
            notify(`Đã thêm hiệu ứng ${created.name || type}`, 'success');
        }
    }, [addEffect, notify, selectEffect]);

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
    const selectedOverlay = React.useMemo(
        () => imageOverlays.find((item) => item.id === selectedOverlayId) || null,
        [imageOverlays, selectedOverlayId],
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

    const startZoomFocusDrag = (
        event: { clientX: number; clientY: number; preventDefault?: () => void; stopPropagation?: () => void },
        initialPoint?: [number, number] | null,
    ): boolean => {
        if (selectedEffect?.type !== 'zoom') return false;
        event.preventDefault?.();
        event.stopPropagation?.();
        focusDragRef.current = { moved: false };
        const startPt = initialPoint ?? svgPointFromEvent(event);
        if (startPt) {
            applyZoomFocus(startPt[0], startPt[1], false);
        }
        const onWindowMove = (e: PointerEvent) => {
            const pt = svgPointFromEvent(e);
            if (!pt || selectedEffect?.type !== 'zoom') return;
            focusDragRef.current = { moved: true };
            applyZoomFocus(pt[0], pt[1], false);
        };
        const onWindowUp = () => {
            window.removeEventListener('pointermove', onWindowMove);
            window.removeEventListener('pointerup', onWindowUp);
            if (focusDragRef.current?.moved) {
                suppressClickRef.current = true;
                commitPendingZoomFocus();
            } else if (startPt) {
                applyZoomFocus(startPt[0], startPt[1], true);
            }
            focusDragRef.current = null;
        };
        window.addEventListener('pointermove', onWindowMove);
        window.addEventListener('pointerup', onWindowUp);
        return true;
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
        // Zoom đang chọn: kéo trên ảnh để đặt / di chuyển điểm focus (mặc định giữa ảnh).
        if (!isAddActive && selectedEffect?.type === 'zoom' && !focusMode) {
            if (startZoomFocusDrag(event)) {
                return;
            }
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
                selectRegion(hit.id);
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

    // Thêm vùng (union) / Xóa thừa (subtract) trên vùng đang chọn.
    const applyRegionBoolean = async (parentId: string, op: 'union' | 'subtract') => {
        if (draftPoints.length < 3) {
            notify('Vùng cần tối thiểu 3 điểm', 'warning');
            return;
        }
        const sid = Number(state.shortVideoId || 0);
        if (!imgNatural || sid <= 0) {
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
                sid,
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
                        ? `Đã thêm vùng vào "${parent.name || parent.id}" — bấm lại nút nếu muốn thêm tiếp`
                        : `Đã xóa thừa khỏi "${parent.name || parent.id}" — bấm lại nút nếu muốn xóa tiếp`,
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
            // One-shot: xong 1 lần thêm/xóa → về chế độ chọn vùng.
            setAddModeRegionId('');
            setEraseModeRegionId('');
            setRegionMode('select');
        }
    };

    const finishDraft = () => {
        if (eraseModeRegionId) {
            void applyRegionBoolean(eraseModeRegionId, 'subtract');
            return;
        }
        if (addModeRegionId) {
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
            action: 'place',
            entry_mode: 'instant',
            place_effect: 'none',
            place_shadow: true,
            start_sec: 0,
            parent_id: parentId,
            script_start_word: null,
            script_end_word: null,
        };
        const shouldRunBirefnet = birefnetDrawMode;
        setRegions((prev) => enforceRegionChildOrder([...prev, region]));
        setSelectedRegionId(region.id);
        setDraftPoints([]);
        setDraftIsDrag(false);
        setBirefnetDrawMode(false);
        // One-shot: lưu vùng xong → về chế độ chọn.
        setRegionMode('select');
        if (shouldRunBirefnet) {
            runBirefnetRefineOnRegionRef.current(region);
        }
    };

    const runBirefnetRefineOnRegion = React.useCallback(async (region: BeatRegion) => {
        if (sam2Busy) {
            return;
        }
        const sid = Number(state.shortVideoId || 0);
        if (sid <= 0 || !beatId || !imgNatural) {
            notify('Ảnh / shortVideoId chưa sẵn sàng', 'warning');
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
        setSam2Busy(true);
        notify('Đang tách vật lớn nhất trong vùng vừa vẽ (BiRefNet)…', 'info');
        try {
            const res = await sam2AutoRegionsAgentWhiteboard(sid, beatId, {
                engine: 'birefnet',
                rect,
                poly: region.points.map((pt): [number, number] => [
                    pt[0] * imgNatural.w,
                    pt[1] * imgNatural.h,
                ]),
            });
            const pts = (Array.isArray(res?.points) && res.points.length >= 3)
                ? res.points
                : (res?.regions?.[0]?.points || []);
            if (!res?.success || !Array.isArray(pts) || pts.length < 3) {
                notify(extractMessage(res?.message, 'BiRefNet không chọn được vật trong vùng'), 'warning');
                return;
            }
            const nextPts = pts.map((pt): BeatRegionPoint => [Number(pt[0]), Number(pt[1])]);
            setOriginalPointsByRegion((prev) => ({
                ...prev,
                [region.id]: region.points,
            }));
            setRegions((prev) => enforceRegionChildOrder(prev.map((r) => {
                if (r.id !== region.id) {
                    return r;
                }
                return {
                    ...r,
                    points: nextPts,
                    full_points: region.points,
                    object_points: nextPts,
                    select_mode: 'object' as const,
                };
            })));
            notify(`BiRefNet đã thu gọn vùng (${res.model || 'birefnet'})`, 'success');
        } catch (err) {
            notify(err instanceof Error ? err.message : 'BiRefNet gọi API thất bại', 'error');
        } finally {
            setSam2Busy(false);
        }
    }, [
        beatId,
        extractMessage,
        imgNatural,
        notify,
        originalPointsByRegion,
        sam2Busy,
        state.shortVideoId,
    ]);
    runBirefnetRefineOnRegionRef.current = (region) => {
        void runBirefnetRefineOnRegion(region);
    };

    /** Nút BiRefNet: bật chế độ vẽ vùng → khi đóng vùng sẽ auto tách lớp. */
    const handleBirefnetButtonClick = React.useCallback(() => {
        if (sam2Busy) {
            return;
        }
        if (regionMode === 'add' && birefnetDrawMode) {
            handleCancelAddRegionSession();
            return;
        }
        clearBgSampleCanvasMode();
        clearBooleanRegionModes();
        setDraftPoints([]);
        setDraftIsDrag(false);
        setBirefnetDrawMode(true);
        setRegionMode('add');
        notify('Vẽ vùng bao quanh vật — khi xong sẽ tự tách bằng BiRefNet', 'info');
    }, [
        birefnetDrawMode,
        clearBgSampleCanvasMode,
        clearBooleanRegionModes,
        handleCancelAddRegionSession,
        notify,
        regionMode,
        sam2Busy,
    ]);

    const handleCancelDraft = () => {
        if (bgSampleMode) {
            setBgSampleDraft([]);
            return;
        }
        setDraftPoints([]);
        setDraftIsDrag(false);
        setBirefnetDrawMode(false);
        clearBooleanRegionModes();
        // One-shot: hủy vẽ vùng mới → về chọn.
        if (regionMode === 'add') {
            setRegionMode('select');
        }
    };

    const handleToggleUnionOnSelected = React.useCallback(() => {
        if (!selectedRegionId) {
            return;
        }
        clearBgSampleCanvasMode();
        setBirefnetDrawMode(false);
        setRegionMode('select');
        setDraftPoints([]);
        setDraftIsDrag(false);
        setEraseModeRegionId('');
        setAddModeRegionId((prev) => {
            const next = prev === selectedRegionId ? '' : selectedRegionId;
            if (next) {
                notify('Thêm vùng: vẽ 1 phần cần nối — xong sẽ về chế độ chọn', 'info');
            }
            return next;
        });
    }, [clearBgSampleCanvasMode, notify, selectedRegionId]);

    const handleToggleSubtractOnSelected = React.useCallback(() => {
        if (!selectedRegionId) {
            return;
        }
        clearBgSampleCanvasMode();
        setBirefnetDrawMode(false);
        setRegionMode('select');
        setDraftPoints([]);
        setDraftIsDrag(false);
        setAddModeRegionId('');
        setEraseModeRegionId((prev) => {
            const next = prev === selectedRegionId ? '' : selectedRegionId;
            if (next) {
                notify('Xóa thừa: vẽ 1 phần cần bỏ — xong sẽ về chế độ chọn', 'info');
            }
            return next;
        });
    }, [clearBgSampleCanvasMode, notify, selectedRegionId]);

    // Đổi vùng chọn / bỏ chọn → tắt chế độ thêm/xóa thừa nếu không còn khớp.
    React.useEffect(() => {
        if (addModeRegionId && addModeRegionId !== selectedRegionId) {
            setAddModeRegionId('');
        }
        if (eraseModeRegionId && eraseModeRegionId !== selectedRegionId) {
            setEraseModeRegionId('');
        }
    }, [addModeRegionId, eraseModeRegionId, selectedRegionId]);

    const updateRegion = (id: string, patch: Partial<BeatRegion>) => {
        setRegions((prev) => {
            const next = prev.map((region) => {
                if (region.id !== id) {
                    return region;
                }
                const merged = { ...region, ...patch };
                const snapped = snapAttentionFieldsToConstraints(
                    merged,
                    beatWords,
                    beatTimeline.beatStartSec,
                    beatTimeline.beatDurationSec,
                    sceneBudgetSec,
                );
                return snapped ? { ...merged, ...snapped } : merged;
            });
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

    const handleOverlayUpload = React.useCallback(async (file: File) => {
        if (shortVideoId <= 0) {
            notify('Thiếu shortVideoId — không upload được ảnh', 'error');
            return;
        }
        try {
            const res = await uploadAgentVisualImage(shortVideoId, file);
            const url = String(res?.url || res?.preview_url || '').trim();
            if (!res?.success || !url) {
                notify('Upload ảnh thất bại', 'error');
                return;
            }
            const probeNatural = (): Promise<{ w: number; h: number } | null> =>
                new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        resolve(
                            img.naturalWidth > 0 && img.naturalHeight > 0
                                ? { w: img.naturalWidth, h: img.naturalHeight }
                                : null,
                        );
                    };
                    img.onerror = () => resolve(null);
                    img.src = url;
                });
            const natural = await probeNatural();
            const overlay = createDefaultBeatImageOverlay(
                url,
                beatTimeline.beatDurationSec,
                imageOverlays.length,
                {
                    overlayNaturalW: natural?.w,
                    overlayNaturalH: natural?.h,
                    beatNaturalW: imgNatural?.w,
                    beatNaturalH: imgNatural?.h,
                },
            );
            setImageOverlays((prev) => [...prev, overlay]);
            selectOverlay(overlay.id);
            notify('Đã thêm ảnh — kéo trên canvas để đặt vị trí', 'success');
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Upload ảnh thất bại', 'error');
        }
    }, [beatTimeline.beatDurationSec, imageOverlays.length, imgNatural, notify, selectOverlay, shortVideoId]);

    const handleRemoveOverlay = React.useCallback((id: string) => {
        setImageOverlays((prev) => prev.filter((item) => item.id !== id));
        if (selectedOverlayId === id) {
            setSelectedOverlayId('');
        }
    }, [selectedOverlayId]);

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
                ...buildBeatOverridePayload(),
            });
            if (saved) {
                setSavedSnapshot(regions.map((r) => ({ ...r })));
                setSavedOverlaysSnapshot(imageOverlays.map((item) => ({ ...item })));
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
            ...buildBeatOverridePayload(),
        });
        if (ok) {
            setSavedSnapshot(regions.map((r) => ({ ...r })));
            setSavedOverlaysSnapshot(imageOverlays.map((item) => ({ ...item })));
            return true;
        }
        return false;
    }, [beatId, state, buildBeatOverridePayload, regions, imageOverlays]);

    /** Lưu vùng nếu còn thay đổi chưa ghi DB — render luôn dùng override đã lưu. */
    const saveRegionsIfDirty = React.useCallback(async (): Promise<boolean> => {
        if (!isDirty) {
            return true;
        }
        setSaving(true);
        try {
            const ok = await state.handleSaveWhiteboardBeatOverride(beatId, {
                ...(state.agentWhiteboardBeatOverrides?.[beatId] || {}),
                ...buildBeatOverridePayload(),
            });
            if (!ok) {
                notify('Lưu vùng thất bại — chưa render', 'error');
                return false;
            }
            setSavedSnapshot(regions.map((r) => ({ ...r })));
            return true;
        } finally {
            setSaving(false);
        }
    }, [isDirty, beatId, state, buildRegionsToSave, regions, timelineEffects]);

    const handleRenderBeatVideo = React.useCallback(async () => {
        const saved = await saveRegionsIfDirty();
        if (!saved) {
            return;
        }
        await state.handleRenderWhiteboardBeat(beatId);
    }, [saveRegionsIfDirty, state, beatId]);

    const handleSetFocus = (x: number, y: number) => {
        void persistOverride({ focus_x: x, focus_y: y });
    };
    const handleResetFocus = () => {
        void persistOverride({ focus_x: 0.5, focus_y: 0.5 });
    };

    // Điểm tập trung hiện tại (0-1, ratio ảnh gốc) — hiển thị trên canvas.
    const focusX = parseRatio(currentOverride.focus_x, 0.5);
    const focusY = parseRatio(currentOverride.focus_y, 0.5);
    const effectFocusX = selectedEffect?.type === 'zoom' ? selectedEffect.focus_x : focusX;
    const effectFocusY = selectedEffect?.type === 'zoom' ? selectedEffect.focus_y : focusY;
    const timelineZoomPreview = resolveZoomTransformAt(playheadSec, timelineEffects, sceneBudgetSec);
    const timelineZoomCss = zoomTransformToCss(timelineZoomPreview);

    const selectedZoomOverlay = React.useMemo(() => {
        if (selectedEffect?.type !== 'zoom') return null;
        const overlay = getZoomOverlayCropRect(
            selectedEffect,
            playheadSec,
            sceneBudgetSec,
        );
        const cropSvg = zoomRectToSvgAttrs(overlay.rect);
        const phaseLabel = overlay.inRange
            ? (overlay.phase === 'in' ? ' · đang zoom in'
                : overlay.phase === 'hold' ? ' · đang giữ'
                    : overlay.phase === 'out' ? ' · đang zoom out' : '')
            : '';
        const label = `Phạm vi ×${overlay.scale.toFixed(2)} (${Math.round(overlay.rect.w * 100)}% ảnh)${phaseLabel}`;
        return {
            ...overlay,
            cropSvg,
            label,
            maskId: `zoom-crop-mask-${selectedEffect.id}`,
            dimOutside: !overlay.syncTimelinePreview,
            borderSolid: overlay.syncTimelinePreview && overlay.phase === 'hold',
        };
    }, [playheadSec, sceneBudgetSec, selectedEffect]);

    // Zoom / pan ảnh (Photoshop-like): layer ảnh + SVG cùng kích thước contain×zoom
    // + pan → vùng luôn bám đúng. Scroll chuột = zoom theo chuột; Space+kéo = pan.
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
        const z = Math.max(0.25, Math.min(8, nextZoom));
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

    // Đổi vùng / ảnh thêm → cuộn cột cài đặt về đầu để thấy preview.
    const settingsScrollRef = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
        settingsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [selectedRegionId, selectedOverlayId]);

    // Render video beat: trạng thái + báo khi xong.
    const beatRender = state.whiteboardBeatRenders?.[beatId] || null;
    const beatRenderStatus = String(beatRender?.status || '').trim();
    const isBeatRendering = (state.renderingWhiteboardBeatIds || []).includes(beatId)
        || beatRenderStatus === 'queued'
        || beatRenderStatus === 'processing';
    const beatVideoUrl = String(beatRender?.video_url || '').trim();
    const [beatVideoPreviewOpen, setBeatVideoPreviewOpen] = React.useState(false);
    const [renderConfirmOpen, setRenderConfirmOpen] = React.useState(false);
    const videoPreviewRef = React.useRef<WhiteboardBeatVideoPreviewHandle | null>(null);
    const playheadRef = React.useRef({ sec: 0, playing: false });
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
    const hasVideoPreview = Boolean(beatVideoPlayUrl);
    const previewActive = canvasMode === 'preview' && hasVideoPreview;
    const handleToggleCanvasMode = React.useCallback(() => {
        setCanvasMode((mode) => {
            if (mode === 'preview') {
                return 'edit';
            }
            return hasVideoPreview ? 'preview' : 'edit';
        });
    }, [hasVideoPreview]);
    // Shortcut 1 phím P: toggle Edit <-> Preview (cần đã có video beat).
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'q' && event.key !== 'Q') {
                return;
            }
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target && isKeyboardEditableTarget(target)) {
                return;
            }
            if (canvasMode === 'edit' && !hasVideoPreview) {
                return;
            }
            event.preventDefault();
            handleToggleCanvasMode();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [canvasMode, handleToggleCanvasMode, hasVideoPreview]);
    const handleOpenBeatImage = React.useCallback(() => {
        const raw = String(imageUrl || '').trim();
        if (!raw) {
            return;
        }
        let openUrl = raw;
        try {
            const u = new URL(raw, window.location.origin);
            u.searchParams.set('v', String(Date.now()));
            openUrl = u.toString();
        } catch {
            const sep = raw.includes('?') ? '&' : '?';
            openUrl = `${raw}${sep}v=${Date.now()}`;
        }
        // Dùng <a>.click() — ổn định hơn window.open (popup blocker / Electron).
        const anchor = document.createElement('a');
        anchor.href = openUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }, [imageUrl]);
    const canRenderBeatVideo = Boolean(imageUrl)
        && !isBeatRendering
        && !saving
        && !state.agentWhiteboardConfig?.assets_mode;
    const canOpenBeatVideo = Boolean(beatVideoPlayUrl) && !isBeatRendering;
    const handleRequestRenderBeatVideo = React.useCallback(() => {
        if (!canRenderBeatVideo) {
            return;
        }
        setRenderConfirmOpen(true);
    }, [canRenderBeatVideo]);
    const handleConfirmRenderBeatVideo = React.useCallback(() => {
        setRenderConfirmOpen(false);
        void handleRenderBeatVideo();
    }, [handleRenderBeatVideo]);
    // Shortcut 1 phím: I mở ảnh beat, R render, V mở video beat.
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            if (pendingSwitch || beatVideoPreviewOpen || renderConfirmOpen) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target && isKeyboardEditableTarget(target)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === 'i') {
                if (!imageUrl) {
                    return;
                }
                event.preventDefault();
                handleOpenBeatImage();
                return;
            }
            if (key === 'r') {
                if (!canRenderBeatVideo) {
                    return;
                }
                event.preventDefault();
                handleRequestRenderBeatVideo();
                return;
            }
            if (key === 'v') {
                if (!canOpenBeatVideo) {
                    return;
                }
                event.preventDefault();
                setBeatVideoPreviewOpen(true);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        beatVideoPreviewOpen,
        canOpenBeatVideo,
        canRenderBeatVideo,
        handleOpenBeatImage,
        handleRequestRenderBeatVideo,
        imageUrl,
        pendingSwitch,
        renderConfirmOpen,
    ]);
    // Shortcut: ←/→ beat trước/sau, S lưu, D đã ổn, ↑/↓ zoom.
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            if (pendingSwitch || beatVideoPreviewOpen || renderConfirmOpen) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target && isKeyboardEditableTarget(target)) {
                return;
            }
            const key = event.key;
            if (key === 'ArrowLeft') {
                if (event.repeat) {
                    return;
                }
                event.preventDefault();
                handleSeekAdjacentBeat(-1);
                return;
            }
            if (key === 'ArrowRight') {
                if (event.repeat) {
                    return;
                }
                event.preventDefault();
                handleSeekAdjacentBeat(1);
                return;
            }
            if (key === 's' || key === 'S') {
                if (event.repeat) {
                    return;
                }
                event.preventDefault();
                void handleSave();
                return;
            }
            if (key === 'd' || key === 'D') {
                if (event.repeat) {
                    return;
                }
                event.preventDefault();
                void handleToggleApproved();
                return;
            }
            if (key === 'ArrowUp' || key === 'ArrowDown') {
                event.preventDefault();
                const el = containerRef.current;
                if (!el) {
                    return;
                }
                const rect = el.getBoundingClientRect();
                const factor = key === 'ArrowUp' ? 1.15 : 1 / 1.15;
                handleZoomAt(zoom * factor, rect.width / 2, rect.height / 2);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        beatVideoPreviewOpen,
        handleSave,
        handleSeekAdjacentBeat,
        handleToggleApproved,
        handleZoomAt,
        pendingSwitch,
        renderConfirmOpen,
        zoom,
    ]);
    React.useEffect(() => {
        playheadRef.current = { sec: 0, playing: false };
        setCanvasMode('edit');
        setRenderConfirmOpen(false);
    }, [beatId]);
    React.useEffect(() => {
        if (!hasVideoPreview && canvasMode === 'preview') {
            setCanvasMode('edit');
        }
    }, [hasVideoPreview, canvasMode]);
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
                notify('Đã render xong video beat — bấm V hoặc "Mở video beat" để xem', 'success');
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
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        ref={measureBoxRef}
                        sx={{
                            flex: '1 1 0',
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
                        {!previewActive ? (
                        <Stack
                            spacing={0.75}
                            sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                zIndex: 5,
                            }}
                        >
                        <Stack direction="row" spacing={0.75} alignItems="center">
                        <Tooltip
                            placement="right"
                            title={isDrawingNewRegion
                                ? 'Đang vẽ vùng — lưu vùng hoặc Esc / E để hủy'
                                : 'Thêm vùng — click rồi vẽ trên ảnh (phím E)'}
                        >
                            <IconButton
                                size="small"
                                onClick={handleAddRegionButtonClick}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: isDrawingNewRegion ? 'primary.main' : 'rgba(0,0,0,0.55)',
                                    color: 'common.white',
                                    '&:hover': {
                                        bgcolor: isDrawingNewRegion ? 'primary.dark' : 'rgba(0,0,0,0.75)',
                                    },
                                }}
                            >
                                <AddCircleIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip
                            placement="right"
                            title={birefnetDrawMode
                                ? 'Đang vẽ vùng BiRefNet — đóng vùng để tách lớp, hoặc bấm lại để hủy'
                                : (sam2Busy
                                    ? 'Đang chạy BiRefNet…'
                                    : 'BiRefNet — bấm rồi vẽ vùng bao vật; khi xong tự tách vật lớn nhất')}
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={!imageUrl || sam2Busy}
                                    onClick={handleBirefnetButtonClick}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: birefnetDrawMode
                                            ? 'secondary.main'
                                            : (sam2Busy ? 'secondary.dark' : 'rgba(103,58,183,0.85)'),
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'rgba(103,58,183,1)' },
                                        '&.Mui-disabled': {
                                            color: 'rgba(255,255,255,0.38)',
                                            bgcolor: 'rgba(0,0,0,0.4)',
                                        },
                                    }}
                                >
                                    {sam2Busy ? (
                                        <CircularProgress size={18} sx={{ color: 'common.white' }} />
                                    ) : (
                                        <LayersIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                        {selectedRegionId ? (
                            <>
                                <Tooltip
                                    placement="right"
                                    title={addModeRegionId === selectedRegionId
                                        ? 'Đang thêm vùng — vẽ 1 phần rồi tự về chọn (bấm lại để hủy)'
                                        : 'Thêm vùng vào vùng đang chọn (1 lần)'}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={handleToggleUnionOnSelected}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: addModeRegionId === selectedRegionId
                                                ? 'success.main'
                                                : 'rgba(46,125,50,0.85)',
                                            color: 'common.white',
                                            '&:hover': { bgcolor: 'success.dark' },
                                        }}
                                    >
                                        <LibraryAddIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip
                                    placement="right"
                                    title={eraseModeRegionId === selectedRegionId
                                        ? 'Đang xóa thừa — vẽ 1 phần rồi tự về chọn (bấm lại để hủy)'
                                        : 'Xóa thừa khỏi vùng đang chọn (1 lần)'}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={handleToggleSubtractOnSelected}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: eraseModeRegionId === selectedRegionId
                                                ? 'error.main'
                                                : 'rgba(198,40,40,0.85)',
                                            color: 'common.white',
                                            '&:hover': { bgcolor: 'error.dark' },
                                        }}
                                    >
                                        <ContentCutIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        ) : null}
                        </Stack>
                        <Tooltip placement="right" title="Thêm ảnh">
                            <IconButton
                                size="small"
                                onClick={() => overlayUploadRef.current?.click()}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'rgba(0,137,123,0.85)',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: 'rgba(0,137,123,1)' },
                                }}
                            >
                                <AddPhotoAlternateIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <input
                            ref={overlayUploadRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) {
                                    void handleOverlayUpload(file);
                                }
                            }}
                        />
                        <ShortVideoAgentImageAnimationControls
                            variant="overlay"
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
                        </Stack>
                        ) : null}
                        {/* Zoom % + reset — cột phải cùng các IconButton 32px; scroll/↑↓ vẫn zoom */}
                        <Stack
                            spacing={0.75}
                            alignItems="flex-end"
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                zIndex: 5,
                            }}
                        >
                        <Tooltip placement="left" title="Đặt lại zoom 100% · Phóng/thu: ↑↓ hoặc scroll">
                            <Stack
                                alignItems="center"
                                spacing={0.25}
                                sx={{ width: 32 }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'common.white',
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        borderRadius: 1,
                                        px: 0.5,
                                        py: 0.15,
                                        fontVariantNumeric: 'tabular-nums',
                                        fontSize: 10,
                                        lineHeight: 1.2,
                                        minWidth: 32,
                                        textAlign: 'center',
                                    }}
                                >
                                    {Math.round(zoom * 100)}%
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={handleResetZoom}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
                                    }}
                                >
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Tooltip>
                        <Tooltip
                            placement="left"
                            title={canvasMode === 'preview'
                                ? 'Chuyển sang Edit — thêm / sửa vùng (Q)'
                                : (hasVideoPreview
                                    ? 'Chuyển sang Preview — xem video beat đã render (Q)'
                                    : 'Chưa có video beat — bấm Render video beat trước')}
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={canvasMode === 'edit' && !hasVideoPreview}
                                    onClick={handleToggleCanvasMode}
                                    sx={{
                                        bgcolor: canvasMode === 'preview'
                                            ? 'rgba(128,222,234,0.92)'
                                            : 'rgba(0,0,0,0.6)',
                                        color: canvasMode === 'preview' ? '#111' : 'common.white',
                                        '&:hover': {
                                            bgcolor: canvasMode === 'preview'
                                                ? '#80deea'
                                                : 'rgba(0,0,0,0.78)',
                                        },
                                        '&.Mui-disabled': {
                                            color: 'rgba(255,255,255,0.38)',
                                            bgcolor: 'rgba(0,0,0,0.4)',
                                        },
                                    }}
                                >
                                    {canvasMode === 'preview'
                                        ? <EditIcon fontSize="small" />
                                        : <VideocamIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                        {imageUrl ? (
                            <Tooltip placement="left" title="Mở ảnh beat (I)">
                                <IconButton
                                    size="small"
                                    onClick={handleOpenBeatImage}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
                                    }}
                                >
                                    <OpenInNewIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : null}
                        <Tooltip
                            placement="left"
                            title={isDirty
                                ? 'Render video beat (R) — xác nhận trước, sẽ tự lưu vùng nếu cần'
                                : 'Render video beat (R) — xác nhận trước'}
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={
                                        isBeatRendering
                                        || saving
                                        || !imageUrl
                                        || Boolean(state.agentWhiteboardConfig?.assets_mode)
                                    }
                                    onClick={handleRequestRenderBeatVideo}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
                                        '&.Mui-disabled': {
                                            color: 'rgba(255,255,255,0.38)',
                                            bgcolor: 'rgba(0,0,0,0.4)',
                                        },
                                    }}
                                >
                                    {isBeatRendering || saving ? (
                                        <CircularProgress size={18} sx={{ color: 'common.white' }} />
                                    ) : (
                                        <MovieCreationIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip placement="left" title="Mở video beat (V)">
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={isBeatRendering || !beatVideoPlayUrl}
                                    onClick={() => setBeatVideoPreviewOpen(true)}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
                                        '&.Mui-disabled': {
                                            color: 'rgba(255,255,255,0.38)',
                                            bgcolor: 'rgba(0,0,0,0.4)',
                                        },
                                    }}
                                >
                                    {isBeatRendering ? (
                                        <CircularProgress size={18} sx={{ color: 'common.white' }} />
                                    ) : (
                                        <PlayCircleOutlineIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                        </Stack>

                        {/* Layer nội dung: phóng THẬT kích thước khung (contain×zoom) + pan.
                            Không dùng scale()+overflow trong box cố định — tránh crop 1 góc. */}
                        {imageUrl && !imageError ? (
                            <>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: containRect ? containRect.x + pan.x : 0,
                                        top: containRect ? containRect.y + pan.y : 0,
                                        width: containRect ? containRect.w * zoom : 0,
                                        height: containRect ? containRect.h * zoom : 0,
                                        overflow: 'hidden',
                                        zIndex: 1,
                                    }}
                                >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: '100%',
                                        transform: timelineZoomCss !== 'none' ? timelineZoomCss : undefined,
                                        transformOrigin: 'center center',
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
                                            opacity: previewActive ? 0 : 1,
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
                                                    pointerEvents: previewActive ? 'none' : 'auto',
                                                }}
                                            >
                            {/* Điểm tập trung zoom — kéo hoặc click để đặt vị trí */}
                            <g style={{ opacity: previewActive ? 0.15 : 1 }}>
                                <circle
                                    cx={effectFocusX * 1000}
                                    cy={effectFocusY * 1000}
                                    r={selectedEffect?.type === 'zoom' ? 22 : 16}
                                    fill="none"
                                    stroke={selectedEffect?.type === 'zoom' ? '#7c4dff' : '#ff9800'}
                                    strokeWidth={2.5}
                                    strokeDasharray="5 3"
                                    style={{
                                        pointerEvents: selectedEffect?.type === 'zoom' && !previewActive && !isAddActive
                                            ? 'auto'
                                            : 'none',
                                        cursor: selectedEffect?.type === 'zoom' ? 'grab' : 'default',
                                    }}
                                    onPointerDown={(e) => { startZoomFocusDrag(e); }}
                                />
                                <circle
                                    cx={effectFocusX * 1000}
                                    cy={effectFocusY * 1000}
                                    r={4}
                                    fill={selectedEffect?.type === 'zoom' ? '#7c4dff' : '#ff9800'}
                                    stroke="#ffffff"
                                    strokeWidth={1.5}
                                    style={{ pointerEvents: 'none' }}
                                />
                            </g>
                            {regions.map((region, index) => {
                                const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                                const isSelected = selectedRegionId === region.id;
                                const isChild = Boolean(region.parent_id);
                                const showPathEdit = isSelected
                                    && !previewActive
                                    && !isAddActive
                                    && Boolean(containRect);
                                return (
                                    <g key={region.id}>
                                        <polygon
                                            points={svgPointsFor(region.points)}
                                            fill={color}
                                            fillOpacity={previewActive ? 0 : (isSelected ? 0.28 : 0.12)}
                                            stroke={color}
                                            strokeWidth={isSelected ? 2 : 1.25}
                                            strokeDasharray={isChild ? '6 3' : undefined}
                                            strokeLinejoin="round"
                                            style={{ pointerEvents: 'none' }}
                                            opacity={previewActive ? 0.55 : 1}
                                        />
                                        {/* Unselected: dot xem nếu ít đỉnh. Selected: path handles (kéo đỉnh/cạnh). */}
                                        {!previewActive && !isSelected && region.points.length <= 12
                                            ? region.points.map((point, pi) => (
                                                <g
                                                    key={`${region.id}-v${pi}`}
                                                    transform={svgScaleTpl(point[0], point[1])}
                                                    style={{ pointerEvents: 'none' }}
                                                >
                                                    <circle
                                                        r={3}
                                                        fill={color}
                                                        stroke="#ffffff"
                                                        strokeWidth={0.75}
                                                    />
                                                </g>
                                            ))
                                            : null}
                                        {showPathEdit && containRect ? (
                                            <WhiteboardRegionPathHandles
                                                regionId={region.id}
                                                points={region.points}
                                                color={color}
                                                zoom={zoom}
                                                containSize={{ w: containRect.w, h: containRect.h }}
                                                svgScale={svgScale}
                                                onChangePoints={(next) => updateRegion(region.id, { points: next })}
                                                onInteract={() => selectRegion(region.id)}
                                            />
                                        ) : null}
                                    </g>
                                );
                            })}
                            {/* Mẫu background RIÊNG của từng vùng — lặp lại fill nền vùng khi render */}
                            {!previewActive ? regions.map((region, index) => {
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
                            }) : null}
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
                        </Box>
                        {/* Overlay phạm vi zoom — cùng kích thước contain×zoom như ảnh beat */}
                        {selectedZoomOverlay && containRect && !previewActive ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: containRect.x + pan.x,
                                    top: containRect.y + pan.y,
                                    width: containRect.w * zoom,
                                    height: containRect.h * zoom,
                                    overflow: 'hidden',
                                    pointerEvents: 'none',
                                    zIndex: 4,
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        transform: selectedZoomOverlay.syncTimelinePreview && timelineZoomCss !== 'none'
                                            ? timelineZoomCss
                                            : undefined,
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    <svg
                                        viewBox="0 0 1000 1000"
                                        preserveAspectRatio="none"
                                        style={{ width: '100%', height: '100%', display: 'block' }}
                                    >
                                        {selectedZoomOverlay.dimOutside ? (
                                            <>
                                                <defs>
                                                    <mask id={selectedZoomOverlay.maskId}>
                                                        <rect x="0" y="0" width="1000" height="1000" fill="white" />
                                                        <rect
                                                            {...selectedZoomOverlay.cropSvg}
                                                            fill="black"
                                                            rx={8}
                                                            ry={8}
                                                        />
                                                    </mask>
                                                </defs>
                                                <rect
                                                    x="0"
                                                    y="0"
                                                    width="1000"
                                                    height="1000"
                                                    fill="rgba(0,0,0,0.38)"
                                                    mask={`url(#${selectedZoomOverlay.maskId})`}
                                                />
                                            </>
                                        ) : null}
                                        <rect
                                            {...selectedZoomOverlay.cropSvg}
                                            fill={selectedZoomOverlay.borderSolid
                                                ? 'rgba(124,77,255,0.06)'
                                                : 'rgba(124,77,255,0.08)'}
                                            stroke="#7c4dff"
                                            strokeWidth={selectedZoomOverlay.borderSolid ? 5 : 4}
                                            strokeDasharray={selectedZoomOverlay.borderSolid ? undefined : '16 8'}
                                            rx={8}
                                            ry={8}
                                        />
                                        {!selectedZoomOverlay.syncTimelinePreview || selectedZoomOverlay.phase !== 'hold' ? (
                                            <text
                                                x={selectedZoomOverlay.cropSvg.x + 10}
                                                y={Math.max(24, selectedZoomOverlay.cropSvg.y - 10)}
                                                fill="#ece1ff"
                                                fontSize={24}
                                                fontWeight={800}
                                                stroke="#4a148c"
                                                strokeWidth={0.5}
                                                paintOrder="stroke"
                                            >
                                                {selectedZoomOverlay.label}
                                            </text>
                                        ) : null}
                                    </svg>
                                </Box>
                            </Box>
                        ) : null}
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

                        {/* Check đã ổn + chuyển beat neo dưới PHẢI */}
                        <Stack
                            direction="column"
                            alignItems="flex-end"
                            spacing={0.75}
                            sx={{
                                position: 'absolute',
                                right: 10,
                                bottom: 10,
                                zIndex: 5,
                            }}
                        >
                            <Tooltip placement="left" title={isBeatApproved ? 'Bỏ đánh dấu đã ổn (D)' : 'Đánh dấu đã ổn (D)'}>
                            <span>
                            <Button
                                size="small"
                                disabled={savingQa || state.savingImportHtml}
                                onClick={() => { void handleToggleApproved(); }}
                                startIcon={savingQa ? (
                                    <CircularProgress size={14} sx={{ color: 'inherit' }} />
                                ) : isBeatApproved ? (
                                    <CheckBoxIcon sx={{ fontSize: 18 }} />
                                ) : (
                                    <CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />
                                )}
                                sx={{
                                    minWidth: 0,
                                    px: 1.25,
                                    py: 0.4,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    color: isBeatApproved ? '#fbcfe8' : 'common.white',
                                    bgcolor: isBeatApproved
                                        ? 'rgba(236,72,153,0.55)'
                                        : 'rgba(0,0,0,0.6)',
                                    border: isBeatApproved
                                        ? '1px solid rgba(244,114,182,0.95)'
                                        : '1px solid rgba(255,255,255,0.22)',
                                    borderRadius: 2,
                                    '&:hover': {
                                        bgcolor: isBeatApproved
                                            ? 'rgba(236,72,153,0.72)'
                                            : 'rgba(0,0,0,0.78)',
                                        borderColor: isBeatApproved
                                            ? 'rgba(251,207,232,0.98)'
                                            : 'rgba(255,255,255,0.45)',
                                    },
                                    '&.Mui-disabled': {
                                        color: 'rgba(255,255,255,0.55)',
                                        bgcolor: 'rgba(0,0,0,0.4)',
                                    },
                                }}
                            >
                                Đã ổn
                            </Button>
                            </span>
                            </Tooltip>
                            {beatSegments.length > 1 && activeSegmentIndex >= 0 ? (
                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    alignItems="center"
                                    sx={{
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        borderRadius: 2,
                                        p: 0.5,
                                    }}
                                >
                                    <Tooltip placement="left" title="Beat trước (←)">
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
                                    <Tooltip placement="left" title="Beat sau (→)">
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={activeSegmentIndex >= beatSegments.length - 1}
                                                onClick={() => handleSeekAdjacentBeat(1)}
                                                sx={{ color: 'common.white' }}
                                            >
                                                <ChevronRightIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Stack>
                            ) : null}
                        </Stack>

                        {!previewActive && containRect && boxSize ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: containRect.x + pan.x,
                                    top: containRect.y + pan.y,
                                    width: containRect.w * zoom,
                                    height: containRect.h * zoom,
                                    zIndex: 2,
                                    overflow: 'hidden',
                                    opacity: playheadSec > 0.02 ? 1 : 0,
                                    pointerEvents: 'none',
                                    transition: 'opacity 0.12s ease',
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: '100%',
                                        transform: timelineZoomCss !== 'none' ? timelineZoomCss : undefined,
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    <WhiteboardBeatTimingPreview
                                        imageUrl={imageUrl}
                                        regions={regions}
                                        imageOverlays={imageOverlays}
                                        playheadSec={playheadSec}
                                        durationSec={beatTimeline.beatDurationSec}
                                        sceneBudgetSec={sceneBudgetSec}
                                        beatStartSec={beatTimeline.beatStartSec}
                                        beatWords={beatWords}
                                        timelineEffects={[]}
                                    />
                                </Box>
                            </Box>
                        ) : null}
                        {/* Ảnh upload: cùng kích thước contain×zoom + pan như ảnh beat */}
                        {!previewActive && containRect && boxSize ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: containRect.x + pan.x,
                                    top: containRect.y + pan.y,
                                    width: containRect.w * zoom,
                                    height: containRect.h * zoom,
                                    overflow: 'hidden',
                                    zIndex: 4,
                                    pointerEvents: 'none',
                                }}
                            >
                                {imageOverlays.map((overlay) => (
                                    <WhiteboardImageOverlayHandles
                                        key={overlay.id}
                                        overlay={overlay}
                                        containRect={{
                                            left: 0,
                                            top: 0,
                                            width: containRect.w * zoom,
                                            height: containRect.h * zoom,
                                        }}
                                        selected={selectedOverlayId === overlay.id}
                                        onChange={(patch: Partial<BeatImageOverlay>) => updateOverlay(overlay.id, patch)}
                                        onSelect={() => selectOverlay(overlay.id)}
                                    />
                                ))}
                            </Box>
                        ) : null}

                        {previewActive ? (
                            <WhiteboardBeatVideoPreview
                                ref={videoPreviewRef}
                                videoUrl={beatVideoPlayUrl}
                                beatWindowSec={beatTimeline.beatDurationSec}
                                videoIntroSec={regions.length > 0
                                    ? WHITEBOARD_SCENE_INTRO_SEC.withRegions
                                    : WHITEBOARD_SCENE_INTRO_SEC.default}
                                initialSec={playheadRef.current.sec}
                                initialPlaying={playheadRef.current.playing}
                            />
                        ) : null}

                        {/* Box điều khiển neo dưới TRÁI: đặt điểm tập trung / đặt lại giữa / hủy vẽ / lưu vùng */}
                        {!previewActive ? (
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
                            <Tooltip
                                placement="right"
                                title={focusMode
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
                                <Tooltip placement="right" title="Đặt lại điểm tập trung giữa ảnh">
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
                                <Tooltip placement="right" title="Hủy vẽ">
                                    <IconButton
                                        size="small"
                                        onClick={handleCancelDraft}
                                        sx={{ color: 'common.white' }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            <Tooltip placement="right" title="Lưu vùng (S)">
                                <span>
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
                                </span>
                            </Tooltip>
                        </Stack>
                        ) : null}
                    </Box>

                    {/* Thanh thời gian render theo vùng (audio bar) — dưới box ảnh */}
                    <WhiteboardRegionTimeline
                        regions={regions}
                        beatDurationSec={beatTimeline.beatDurationSec}
                        effectTimelineDurationSec={sceneBudgetSec}
                        beatStartSec={beatTimeline.beatStartSec}
                        beatWords={beatWords}
                        colorFor={colorFor}
                        onChangeRegion={updateRegion}
                        onSelectRegion={selectRegion}
                        selectedRegionId={selectedRegionId}
                        timelineEffects={timelineEffects}
                        selectedEffectId={selectedEffectId}
                        onPreviewEffect={(id, patch) => { updateEffectLocal(id, patch); }}
                        onCommitEffect={(id, patch) => { void commitEffect(id, patch); }}
                        onSelectEffect={selectEffect}
                        onSwitchToEditTab={() => setRightPanelTab('edit')}
                        audioUrl={state.audioFileUrl || ''}
                        maxWidth={boxSize ? boxSize.w : undefined}
                        transitionDurationSec={beatTransitionDurationSec}
                        shortVideoId={shortVideoId}
                        beatId={beatId}
                        onCopyError={(msg) => notify(msg, 'error')}
                        onPlayheadChange={(sec, isPlaying) => {
                            setPlayheadSec(sec);
                            playheadRef.current = { sec, playing: isPlaying };
                            videoPreviewRef.current?.seekTo(sec, isPlaying);
                        }}
                        seekRequest={timelineSeekRequest}
                        sceneBudgetSec={sceneBudgetSec}
                        imageOverlays={imageOverlays}
                        selectedOverlayId={selectedOverlayId}
                        onChangeOverlay={updateOverlay}
                        onSelectOverlay={selectOverlay}
                        onRequestDeleteRegion={(id, el) => {
                            setDeleteMenuTarget({ kind: 'region', id });
                            setDeleteMenuAnchor(el);
                        }}
                        onRequestDeleteOverlay={(id, el) => {
                            setDeleteMenuTarget({ kind: 'overlay', id });
                            setDeleteMenuAnchor(el);
                        }}
                        onRequestDeleteEffect={(id, el) => {
                            setDeleteMenuTarget({ kind: 'effect', id });
                            setDeleteMenuAnchor(el);
                        }}
                        onRequestDeleteAllTimelineItems={handleClearAllTimelineItems}
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

                    {/* Dialog xác nhận render video beat */}
                    <Dialog
                        open={renderConfirmOpen}
                        onClose={() => setRenderConfirmOpen(false)}
                        maxWidth="xs"
                        fullWidth
                    >
                        <DialogTitle>Render video beat?</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" color="text.secondary">
                                Bước này có thể mất vài phút — engine sẽ vẽ tay, ghép audio và
                                xuất video cho beat hiện tại.
                                {isDirty
                                    ? ' Vùng chưa lưu sẽ được lưu tự động trước khi render.'
                                    : ''}
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button
                                onClick={() => setRenderConfirmOpen(false)}
                                sx={{ textTransform: 'none' }}
                            >
                                Hủy
                            </Button>
                            <LoadingButton
                                variant="contained"
                                color="primary"
                                loading={isBeatRendering || saving}
                                onClick={handleConfirmRenderBeatVideo}
                                sx={{ textTransform: 'none' }}
                            >
                                Bắt đầu render
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
                    <Tabs
                        value={rightPanelTab}
                        onChange={(_, value: 'edit' | 'add') => setRightPanelTab(value)}
                        variant="fullWidth"
                        sx={{ minHeight: 36, mb: 0.5, borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab value="edit" label="Chỉnh sửa" sx={{ minHeight: 36, py: 0.5, textTransform: 'none', fontWeight: 700 }} />
                        <Tab value="add" label="Thêm" sx={{ minHeight: 36, py: 0.5, textTransform: 'none', fontWeight: 700 }} />
                    </Tabs>

                    {rightPanelTab === 'add' ? (
                        <ShortVideoAgentBeatAddPanel
                            onAddEffect={(type) => { void handleAddTimelineEffect(type); }}
                            saving={savingTimelineEffects}
                        />
                    ) : (
                    <>
                    {selectedEffect ? (() => {
                        const def = getBeatTimelineEffectDefinition(selectedEffect.type);
                        const SettingsPanel = def?.SettingsPanel;
                        if (!SettingsPanel) return null;
                        return (
                            <Box
                                sx={{
                                    mb: 1.5,
                                    p: 1.25,
                                    borderRadius: 2,
                                    border: 1,
                                    borderColor: def.timelineColor,
                                    borderLeft: `4px solid ${def.timelineColor}`,
                                    bgcolor: 'background.default',
                                }}
                            >
                                <SettingsPanel
                                    effect={selectedEffect}
                                    beatDurationSec={sceneBudgetSec}
                                    allEffects={timelineEffects}
                                    saving={savingTimelineEffects}
                                    onChange={(patch) => {
                                        updateEffectLocal(selectedEffect.id, patch);
                                        scheduleEffectCommit(selectedEffect.id, patch);
                                    }}
                                    onDelete={() => {
                                        setDeleteMenuTarget({ kind: 'effect', id: selectedEffect.id });
                                        setDeleteMenuAnchor(null);
                                    }}
                                    onMoveLayer={(direction) => { void moveLayer(selectedEffect.id, direction); }}
                                />
                            </Box>
                        );
                    })() : null}

                    {!selectedEffect && bgSampleMode ? (
                        <Typography variant="caption" color="secondary.main" display="block" sx={{ mb: 0.5 }}>
                            Đang chọn <strong>background</strong> cho vùng đang chọn: <strong>click 1 phát</strong>
                            vào vị trí có màu/chi tiết nền trên ảnh bên trái → tự tạo ô mẫu nhỏ. Mẫu này lặp lại
                            fill nền vùng đó (thay vì tile trắng). Kéo chuột = vẽ vùng mẫu tay.
                        </Typography>
                    ) : null}
                    {!selectedEffect && !hasRegions ? (
                        <Typography variant="caption" color="text.secondary">
                            Chưa có vùng nào — vẽ trên ảnh bên trái.
                        </Typography>
                    ) : !selectedEffect && !selectedRegion && !selectedOverlay ? (
                        <Typography variant="caption" color="text.secondary">
                            Chưa chọn vùng, ảnh thêm hoặc hiệu ứng — click trên ảnh / timeline bên dưới.
                        </Typography>
                    ) : null}

                    {!selectedEffect && selectedOverlay ? (
                        <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider', borderLeft: '4px solid #00897b' }}>
                            <WhiteboardCutoutImagePreview
                                imageUrl={selectedOverlay.image_url}
                                label="Ảnh thêm"
                                onNotify={notify}
                            />
                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                                <TextField
                                    size="small"
                                    value={selectedOverlay.name || ''}
                                    onChange={(e) => updateOverlay(selectedOverlay.id, { name: e.target.value })}
                                    sx={{ flex: 1, '& .MuiInputBase-root': { fontSize: 13 } }}
                                />
                                <IconButton
                                    size="small"
                                    color="error"
                                    title="Xóa ảnh"
                                    onClick={(event) => {
                                        setDeleteMenuTarget({ kind: 'overlay', id: selectedOverlay.id });
                                        setDeleteMenuAnchor(event.currentTarget);
                                    }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                            <RegionSection title="Hành động với ảnh">
                                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                                    {([
                                        {
                                            key: 'instant' as const,
                                            label: 'Đặt tại chỗ',
                                            color: 'secondary' as const,
                                            patch: () => buildOverlayInstantEntryPatch(),
                                        },
                                        {
                                            key: 'draw' as const,
                                            label: 'Vẽ tay',
                                            color: 'primary' as const,
                                            patch: () => buildOverlayDrawActionPatch(selectedOverlay),
                                        },
                                        {
                                            key: 'drag_in' as const,
                                            label: 'Đưa vào',
                                            color: 'secondary' as const,
                                            patch: () => buildOverlayDragInPatch(selectedOverlay),
                                        },
                                    ]).map((opt) => {
                                        const active = resolveOverlayImageActionKey(selectedOverlay) === opt.key;
                                        return (
                                            <Button
                                                key={opt.key}
                                                size="small"
                                                variant="outlined"
                                                color={opt.color}
                                                startIcon={active ? <CheckIcon /> : null}
                                                onClick={() => updateOverlay(selectedOverlay.id, opt.patch())}
                                                sx={{
                                                    textTransform: 'none',
                                                    flex: '1 1 28%',
                                                    minWidth: 88,
                                                    ...(active
                                                        ? { borderColor: `${opt.color}.main`, bgcolor: 'action.selected' }
                                                        : {}),
                                                }}
                                            >
                                                {opt.label}
                                            </Button>
                                        );
                                    })}
                                </Stack>
                            </RegionSection>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1, width: '100%' }}>
                                <Switch
                                    size="small"
                                    checked={Boolean(selectedOverlay.hold_to_end)}
                                    onChange={(event) =>
                                        updateOverlay(selectedOverlay.id, { hold_to_end: event.target.checked })
                                    }
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" fontWeight={700} display="block">
                                        Giữ đến cuối beat
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, lineHeight: 1.3 }}>
                                        Tắt: ẩn khi hết thanh thời gian. Bật: ở lại sau khi đặt xong
                                    </Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1, width: '100%' }}>
                                <Switch
                                    size="small"
                                    checked={selectedOverlay.repeat !== false}
                                    onChange={(event) =>
                                        updateOverlay(selectedOverlay.id, { repeat: event.target.checked })
                                    }
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" fontWeight={700} display="block">
                                        Lặp GIF
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, lineHeight: 1.3 }}>
                                        Bật: animation lặp liên tục. Tắt: chạy 1 lần rồi giữ frame cuối
                                    </Typography>
                                </Box>
                            </Stack>
                            {resolveOverlayImageActionKey(selectedOverlay) === 'draw' && drawHandOptions.length > 0 ? (
                                <RegionSection title="Kiểu tay vẽ">
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, justifyContent: 'space-between' }}>
                                        {drawHandOptions.map((opt) => {
                                            const isDefault = opt.id === drawHandDefaultId;
                                            const current = String(selectedOverlay.draw_hand || '').trim();
                                            const active = isDefault ? current === '' || current === opt.id : current === opt.id;
                                            return (
                                                <Box
                                                    key={opt.id}
                                                    onClick={() =>
                                                        updateOverlay(
                                                            selectedOverlay.id,
                                                            isDefault ? { draw_hand: null } : { draw_hand: opt.id },
                                                        )
                                                    }
                                                    title={isDefault ? `${opt.label} (mặc định)` : opt.label}
                                                    sx={{
                                                        width: 'calc((100% / 3) - 6px)',
                                                        border: '1px solid',
                                                        borderColor: active ? 'primary.main' : 'divider',
                                                        borderRadius: 1.5,
                                                        overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        bgcolor: active ? 'action.selected' : 'transparent',
                                                    }}
                                                >
                                                    <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.05)' }}>
                                                        {opt.thumb_url ? (
                                                            <Box component="img" src={opt.thumb_url} alt={opt.label} draggable={false} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        ) : (
                                                            <AutoAwesomeIcon sx={{ fontSize: 30, color: active ? 'primary.main' : 'text.disabled' }} />
                                                        )}
                                                    </Box>
                                                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', px: 0.5, py: 0.4, fontSize: 10 }}>
                                                        {opt.label}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </RegionSection>
                            ) : null}
                            {resolveOverlayImageActionKey(selectedOverlay) === 'draw' ? (
                                <RegionSection title="Hiệu ứng sau khi vẽ xong">
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                        {DRAW_EFFECT_OPTIONS.map((opt) => {
                                            const active = normalizeDrawEffect(selectedOverlay.place_effect) === opt.value;
                                            return (
                                                <Button
                                                    key={opt.value}
                                                    size="small"
                                                    variant="outlined"
                                                    color={active ? 'warning' : 'inherit'}
                                                    startIcon={active ? <CheckIcon /> : null}
                                                    onClick={() => updateOverlay(selectedOverlay.id, { place_effect: opt.value })}
                                                    sx={{ textTransform: 'none', flex: '1 1 45%', fontSize: 11 }}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </Stack>
                                </RegionSection>
                            ) : null}
                            {resolveOverlayImageActionKey(selectedOverlay) === 'drag_in' ? (
                                <RegionSection title="Hiệu ứng sau khi render ảnh" subtitle="Chỉ hiện tạm thời khi đặt ảnh">
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                        {PLACE_EFFECT_OPTIONS.map((opt) => {
                                            const active = normalizePlaceEffect(selectedOverlay.place_effect) === opt.value;
                                            return (
                                                <Button
                                                    key={opt.value}
                                                    size="small"
                                                    variant="outlined"
                                                    color={active ? 'warning' : 'inherit'}
                                                    startIcon={active ? <CheckIcon /> : null}
                                                    onClick={() => updateOverlay(
                                                        selectedOverlay.id,
                                                        buildPlaceEffectRegionUpdate(opt.value) as Partial<BeatImageOverlay>,
                                                    )}
                                                    sx={{ textTransform: 'none', flex: '1 1 45%', fontSize: 11 }}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </Stack>
                                </RegionSection>
                            ) : null}
                            {(
                                resolveOverlayImageActionKey(selectedOverlay) === 'draw'
                                    ? normalizeDrawEffect(selectedOverlay.place_effect)
                                    : resolveOverlayImageActionKey(selectedOverlay) === 'drag_in'
                                        ? normalizePlaceEffect(selectedOverlay.place_effect)
                                        : 'none'
                            ) === 'neon_border' ? (
                                <RegionSection title="Màu đèn neon chạy viền">
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                                        {NEON_COLOR_OPTIONS.map((opt) => {
                                            const active = normalizeNeonColor(selectedOverlay.place_effect_color) === opt.value;
                                            return (
                                                <Box
                                                    key={opt.value}
                                                    onClick={() => updateOverlay(selectedOverlay.id, { place_effect_color: opt.value })}
                                                    title={opt.label}
                                                    sx={{
                                                        width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                                                        background: `linear-gradient(135deg, ${opt.swatch}, ${opt.swatch}cc)`,
                                                        border: '2px solid',
                                                        borderColor: active ? 'warning.main' : 'divider',
                                                    }}
                                                />
                                            );
                                        })}
                                    </Stack>
                                </RegionSection>
                            ) : null}
                            <RegionSection title="Style cutout" subtitle="Gắn cố định trên ảnh thêm">
                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75, width: '100%' }}>
                                    <Switch
                                        size="small"
                                        checked={normalizeCutoutShadow(
                                            resolveOverlayImageActionKey(selectedOverlay) === 'draw' ? 'draw' : 'place',
                                            selectedOverlay.place_shadow,
                                        )}
                                        onChange={(event) => updateOverlay(selectedOverlay.id, { place_shadow: event.target.checked })}
                                    />
                                    <Typography variant="caption" fontWeight={700}>Bóng đổ dưới ảnh</Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75, width: '100%' }}>
                                    <Switch
                                        size="small"
                                        checked={normalizePlaceBorder(selectedOverlay.place_border)}
                                        onChange={(event) => updateOverlay(selectedOverlay.id, {
                                            place_border: event.target.checked,
                                            ...(event.target.checked && !selectedOverlay.place_border_color
                                                ? { place_border_color: 'white' }
                                                : {}),
                                        })}
                                    />
                                    <Typography variant="caption" fontWeight={700}>Thêm viền</Typography>
                                </Stack>
                                {normalizePlaceBorder(selectedOverlay.place_border) ? (
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
                                        {PLACE_BORDER_COLOR_OPTIONS.map((opt) => {
                                            const active = normalizePlaceBorderColor(selectedOverlay.place_border_color) === opt.value;
                                            return (
                                                <Box
                                                    key={opt.value}
                                                    onClick={() => updateOverlay(selectedOverlay.id, { place_border_color: opt.value })}
                                                    sx={{
                                                        width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                                                        background: `linear-gradient(135deg, ${opt.swatch}, ${opt.swatch}cc)`,
                                                        border: '2px solid',
                                                        borderColor: active ? 'warning.main' : 'divider',
                                                    }}
                                                />
                                            );
                                        })}
                                    </Stack>
                                ) : null}
                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
                                    <Switch
                                        size="small"
                                        checked={normalizePlaceTornPaper(selectedOverlay.place_torn_paper)}
                                        onChange={(event) => updateOverlay(selectedOverlay.id, { place_torn_paper: event.target.checked })}
                                    />
                                    <Typography variant="caption" fontWeight={700}>Viền giấy xé</Typography>
                                </Stack>
                            </RegionSection>
                            {resolveOverlayImageActionKey(selectedOverlay) === 'drag_in'
                                && !isPlaceHandlessEffect(normalizePlaceEffect(selectedOverlay.place_effect))
                                && placeHandOptions.length > 0 ? (
                                <RegionSection title="Kiểu tay đưa ảnh vào">
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                                        {placeHandOptions.map((opt) => {
                                            const isDefault = opt.id === placeHandDefaultId;
                                            const current = normalizePlaceHand(selectedOverlay.place_hand);
                                            const active = isDefault ? current === '' : current === opt.id;
                                            return (
                                                <Box
                                                    key={opt.id}
                                                    onClick={() => updateOverlay(
                                                        selectedOverlay.id,
                                                        isDefault
                                                            ? { place_hand: null }
                                                            : { place_hand: opt.id },
                                                    )}
                                                    sx={{
                                                        width: 'calc((100% / 3) - 6px)',
                                                        border: '1px solid',
                                                        borderColor: active ? 'secondary.main' : 'divider',
                                                        borderRadius: 1.5,
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <Box sx={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.05)' }}>
                                                        {opt.thumb_url ? (
                                                            <Box component="img" src={opt.thumb_url} alt={opt.label} draggable={false} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        ) : null}
                                                    </Box>
                                                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontSize: 10, py: 0.3 }}>
                                                        {opt.label}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </RegionSection>
                            ) : null}
                            {resolveOverlayImageActionKey(selectedOverlay) === 'drag_in'
                                && isPlaceEntryDirectionApplicable(
                                    normalizePlaceEffect(selectedOverlay.place_effect),
                                    selectedOverlay.place_hand,
                                ) ? (
                                <RegionSection title="Hướng đưa ảnh vào">
                                    <PlaceEntryDirectionPicker
                                        value={normalizePlaceEntryDirection(selectedOverlay.place_entry_direction)}
                                        onChange={(dir) => updateOverlay(selectedOverlay.id, { place_entry_direction: dir })}
                                    />
                                </RegionSection>
                            ) : null}
                            <RegionMediaSettingsPanel
                                source={selectedOverlay}
                                beatWords={beatWords}
                                beatStartSec={beatTimeline.beatStartSec}
                                beatDurationSec={beatTimeline.beatDurationSec}
                                sceneBudgetSec={sceneBudgetSec}
                                onPatch={(patch) => updateOverlay(selectedOverlay.id, patch as Partial<BeatImageOverlay>)}
                            />
                        </Box>
                    ) : null}

                    {!selectedEffect && !selectedOverlay && parentRegion ? (
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<ChevronLeftIcon />}
                            onClick={() => selectRegion(parentRegion.id)}
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

                    {!selectedEffect && (selectedRegion ? [selectedRegion] : []).map((region) => {
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
                                <WhiteboardCutoutImagePreview
                                    beatImageUrl={imageUrl}
                                    regionPoints={region.points}
                                    label="Ảnh vùng"
                                    onNotify={notify}
                                />
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
                                            setDeleteMenuTarget({ kind: 'region', id: region.id });
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

                                {/* 1. Hành động với ảnh: Đặt tại chỗ | Vẽ tay | Đưa vào */}
                                <RegionSection title="Hành động với ảnh">
                                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                                        {([
                                            {
                                                key: 'instant' as const,
                                                label: 'Đặt tại chỗ',
                                                color: 'secondary' as const,
                                                patch: () => buildRegionPlaceInstantEntryPatch(),
                                            },
                                            {
                                                key: 'draw' as const,
                                                label: 'Vẽ tay',
                                                color: 'primary' as const,
                                                patch: () => buildRegionDrawActionPatch(region),
                                            },
                                            {
                                                key: 'drag_in' as const,
                                                label: 'Đưa vào',
                                                color: 'secondary' as const,
                                                patch: () => buildRegionPlaceDragInPatch(region),
                                            },
                                        ]).map((opt) => {
                                            const active = resolveRegionImageActionKey(region) === opt.key;
                                            return (
                                                <Button
                                                    key={opt.key}
                                                    size="small"
                                                    variant="outlined"
                                                    color={opt.color}
                                                    startIcon={active ? <CheckIcon /> : null}
                                                    onClick={() => updateRegion(region.id, opt.patch())}
                                                    sx={{
                                                        textTransform: 'none',
                                                        flex: '1 1 28%',
                                                        minWidth: 88,
                                                        ...(active
                                                            ? {
                                                                borderColor: `${opt.color}.main`,
                                                                bgcolor: 'action.selected',
                                                            }
                                                            : {}),
                                                    }}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </Stack>
                                </RegionSection>

                                {/* 1a. KIỂU TAY VẼ (chỉ vùng draw): chọn bút/tay vẽ
                                vùng — đồng bộ whiteboard/pencil/meta.json.
                                Giống kiểu tay đưa ảnh: không có ô "Mặc định" riêng;
                                bút chì (meta default) có badge và được chọn sẵn. */}
                                {region.action === 'draw' && drawHandOptions.length > 0 ? (
                                    <RegionSection title="Kiểu tay vẽ">
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, justifyContent: 'space-between' }}>
                                            {drawHandOptions.map((opt) => {
                                                const isDefault = opt.id === drawHandDefaultId;
                                                const current = String(region.draw_hand || '').trim();
                                                const active = isDefault ? current === '' || current === opt.id : current === opt.id;
                                                return (
                                                    <Box
                                                        key={opt.id}
                                                        onClick={() =>
                                                            updateRegion(
                                                                region.id,
                                                                isDefault ? { draw_hand: null } : { draw_hand: opt.id },
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

                                {/* 1b. Hiệu ứng SAU KHI VẼ TAY (chỉ vùng draw) —
                                subset: loang / quét sáng / neon / không (mặc định). */}
                                {region.action === 'draw' ? (
                                    <RegionSection title="Hiệu ứng sau khi vẽ xong">
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                            {DRAW_EFFECT_OPTIONS.map((opt) => {
                                                const active = normalizeDrawEffect(region.place_effect) === opt.value;
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

                                {/* 2. Hiệu ứng khi ĐƯA VÀO (chỉ drag_in) — instant chỉ dùng gây chú ý */}
                                {region.action === 'place' && resolveRegionImageActionKey(region) === 'drag_in' ? (
                                    <RegionSection
                                        title="Hiệu ứng sau khi render ảnh"
                                        subtitle="Chỉ hiện tạm thời khi đặt ảnh — tắt sau animation"
                                    >
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                            {PLACE_EFFECT_OPTIONS.map((opt) => {
                                                const active = normalizePlaceEffect(region.place_effect) === opt.value;
                                                return (
                                                    <Button
                                                        key={opt.value}
                                                        size="small"
                                                        variant="outlined"
                                                        color={active ? 'warning' : 'inherit'}
                                                        startIcon={active ? <CheckIcon /> : null}
                                                        onClick={() => updateRegion(region.id, buildPlaceEffectRegionUpdate(opt.value))}
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

                                {/* 2a. MÀU ĐÈN NEON CHẠY VIỀN (draw hoặc drag_in khi chọn neon_border) */}
                                {(region.action === 'draw'
                                    || (region.action === 'place' && resolveRegionImageActionKey(region) === 'drag_in'))
                                    && (
                                        region.action === 'place'
                                            ? normalizePlaceEffect(region.place_effect)
                                            : normalizeDrawEffect(region.place_effect)
                                    ) === 'neon_border' ? (
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

                                {/* Style cutout cố định (place + draw) — mở rộng thêm option sau */}
                                {region.action === 'place' || region.action === 'draw' ? (
                                    <RegionSection
                                        title="Style cutout"
                                        subtitle="Gắn cố định trên ảnh — giữ nguyên suốt beat, không mất sau render"
                                    >
                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75, width: '100%' }}>
                                            <Switch
                                                size="small"
                                                checked={normalizeCutoutShadow(region.action, region.place_shadow)}
                                                onChange={(event) =>
                                                    updateRegion(region.id, { place_shadow: event.target.checked })
                                                }
                                            />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" fontWeight={700} display="block">
                                                    Bóng đổ dưới ảnh
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, lineHeight: 1.3 }}>
                                                    {region.action === 'draw'
                                                        ? 'Mặc định tắt trên vùng vẽ — bật khi cần bóng'
                                                        : 'Mặc định bật — tắt khi bóng không hợp nền'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: normalizePlaceBorder(region.place_border) ? 0.75 : 0.75, width: '100%' }}>
                                            <Switch
                                                size="small"
                                                checked={normalizePlaceBorder(region.place_border)}
                                                onChange={(event) =>
                                                    updateRegion(region.id, {
                                                        place_border: event.target.checked,
                                                        ...(event.target.checked && !region.place_border_color
                                                            ? { place_border_color: 'white' }
                                                            : {}),
                                                    })
                                                }
                                            />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" fontWeight={700} display="block">
                                                    Thêm viền
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, lineHeight: 1.3 }}>
                                                    Viền màu quanh ảnh cutout
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        {normalizePlaceBorder(region.place_border) ? (
                                            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
                                                {PLACE_BORDER_COLOR_OPTIONS.map((opt) => {
                                                    const active = normalizePlaceBorderColor(region.place_border_color) === opt.value;
                                                    return (
                                                        <Box
                                                            key={opt.value}
                                                            onClick={() => updateRegion(region.id, { place_border_color: opt.value })}
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
                                        ) : null}
                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
                                            <Switch
                                                size="small"
                                                checked={normalizePlaceTornPaper(region.place_torn_paper)}
                                                onChange={(event) =>
                                                    updateRegion(region.id, { place_torn_paper: event.target.checked })
                                                }
                                            />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" fontWeight={700} display="block">
                                                    Viền giấy xé
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, lineHeight: 1.3 }}>
                                                    Mép xé lồi lõm (dày/mỏng) + vân giấy + bóng mềm
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </RegionSection>
                                ) : null}

                                {/* 2b. KIỂU TAY ĐƯA ẢNH VÀO (chỉ vùng place có dùng tay —
                                zoom_out_bounce/pop_in_bounce ảnh tự nảy, không cần tay).
                                Có bao nhiêu ảnh bàn tay thì có bấy nhiêu kiểu; kiểu mặc
                                định (meta.json 'default') có nhãn "Mặc định" và được chọn
                                sẵn khi vùng chưa đặt kiểu. */}
                                {region.action === 'place' && resolveRegionImageActionKey(region) === 'drag_in' && !isPlaceHandlessEffect(normalizePlaceEffect(region.place_effect)) ? (
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
                                                                isDefault
                                                                    ? buildPlaceHandRegionUpdate(null)
                                                                    : buildPlaceHandRegionUpdate(opt.id),
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

                                {/* 2c. HƯỚNG ĐƯA ẢNH VÀO (chỉ vùng place có tay kéo —
                                không áp dụng thu nhỏ-nảy / phóng to-nảy / nam châm). */}
                                {region.action === 'place'
                                    && resolveRegionImageActionKey(region) === 'drag_in'
                                    && isPlaceEntryDirectionApplicable(
                                        normalizePlaceEffect(region.place_effect),
                                        region.place_hand,
                                    ) ? (
                                    <RegionSection
                                        title="Hướng đưa ảnh vào"
                                        subtitle="Chọn cạnh hoặc góc — giữa = ngẫu nhiên"
                                    >
                                        <PlaceEntryDirectionPicker
                                            value={normalizePlaceEntryDirection(region.place_entry_direction)}
                                            onChange={(dir) =>
                                                updateRegion(region.id, {
                                                    place_entry_direction: dir,
                                                })
                                            }
                                        />
                                    </RegionSection>
                                ) : null}

                                {(region.action === 'place' || region.action === 'draw') ? (
                                    <RegionMediaSettingsPanel
                                        source={region}
                                        beatWords={beatWords}
                                        beatStartSec={beatTimeline.beatStartSec}
                                        beatDurationSec={beatTimeline.beatDurationSec}
                                        sceneBudgetSec={sceneBudgetSec}
                                        onPatch={(patch) => updateRegion(region.id, patch as Partial<BeatRegion>)}
                                    />
                                ) : null}

                                {/* Chỉnh hình: kéo đỉnh/cạnh; Thêm vùng / Xóa thừa trên toolbar cạnh BiRefNet. */}
                                {/* Nền vùng: mẫu background riêng + giữ nền (inpaint) */}
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
                    {!selectedEffect && selectedRegion && childRegions.length > 0 ? (
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
                                            onClick={() => selectRegion(child.id)}
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
                    </>
                    )}
                </Box>
            </Box>

            {/* Dropdown xác nhận xóa vùng / ảnh / hiệu ứng */}
            <Menu
                open={Boolean(deleteMenuTarget)}
                anchorEl={deleteMenuAnchor}
                anchorReference={deleteMenuAnchor ? 'anchorEl' : 'anchorPosition'}
                anchorPosition={{ top: 96, left: typeof window !== 'undefined' ? window.innerWidth - 280 : 400 }}
                onClose={() => {
                    setDeleteMenuAnchor(null);
                    setDeleteMenuTarget(null);
                }}
                slotProps={{
                    root: { style: { zIndex: 1600 } },
                    paper: { sx: { minWidth: 240, zIndex: 1600 } },
                }}
            >
                <MenuItem
                    onClick={() => {
                        setDeleteMenuAnchor(null);
                        setDeleteMenuTarget(null);
                    }}
                >
                    Hủy
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const target = deleteMenuTarget;
                        setDeleteMenuAnchor(null);
                        setDeleteMenuTarget(null);
                        if (!target) {
                            return;
                        }
                        if (target.kind === 'region') {
                            handleDeleteRegion(target.id);
                        } else if (target.kind === 'overlay') {
                            handleRemoveOverlay(target.id);
                        } else {
                            void removeEffect(target.id).then((ok) => {
                                if (ok) {
                                    setSelectedEffectId('');
                                }
                            });
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
