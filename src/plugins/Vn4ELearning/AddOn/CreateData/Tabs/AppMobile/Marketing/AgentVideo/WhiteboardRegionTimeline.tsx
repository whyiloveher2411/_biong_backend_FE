import React from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
    IconButton,
    Tooltip,
    Stack,
    Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import VerifiedIcon from '@mui/icons-material/Verified';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { LoadingButton } from '@mui/lab';
import type { BeatImageLayer, BeatImageOverlay, BeatRegion, BeatTimelineEffect, BeatZoomEffect } from './agentVideoApi';
import { WHITEBOARD_MIN_LAYER_SLOT_SEC } from './whiteboardImageLayers';
import { attentionEffectTimelineLabel, getAgentWhiteboardBeatRenderTimeline, isRegionAttentionEnabled, isOverlayInstantEntry, isRegionPlaceInstantEntry, renderPlaceEffectAfterSec } from './agentVideoApi';
import {
    regionTimingPatchFromDrag,
    resolveRegionEndSec,
    resolveRegionStartSec,
} from './regionTimelineTiming';
import {
    attentionEarliestStartSec,
    attentionPatchFromDrag,
    overlayTimingPatchFromDrag,
    resolveAttentionWindow,
    resolveOverlayEndSec,
    resolveOverlayStartSec,
} from './regionAttentionTiming';
import { getBeatTimelineEffectDefinition } from './beatTimelineEffects/registry';
import { isBeatZoomEffect } from './beatTimelineEffects/effects/zoom/definition';
import {
    getZoomPhaseBounds,
    normalizeZoomPhaseBounds,
    shiftZoomPhaseBounds,
} from './beatTimelineEffects/effects/zoom/zoomPhases';

/**
 * TIMELINE RENDER THEO VÙNG — layout NHIỀU DÒNG (mỗi vùng 1 dòng).
 *
 * - MỖI VÙNG 1 DÒNG riêng, sắp cây (cha → các con ngay dưới → các vùng khác),
 *   kéo tay trái/phải trên dải màu để đặt bắt đầu / xong render (min 1s).
 * - UI giới hạn chiều cao: thu gọn = 5 dòng (1 audio + 4 track), mở rộng = 10 dòng
 *   (1 audio + 9 track); dòng thừa cuộn dọc để box ảnh phía trên không bị co quá nhỏ.
 * - THANH AUDIO (hàng đầu) SẠCH — chỉ thước giây + vạch từ + playhead đỏ dọc,
 *   KHÔNG có mảnh màu vùng trên thanh audio.
 * - Click tên vùng / dải = chọn vùng (đồng bộ ảnh + scroll quản lý).
 * - Audio script: CHỈ highlight từ trong khoảng render của vùng đang chọn
 *   (bỏ highlight theo script_end_word cũ); từ đang phát màu ĐỎ.
 * - user-select: none toàn thanh (không bị bôi đen khi kéo).
 */

type Word = { index: number; text: string; start: number };
type TimelineSelectMeta = {
    shiftKey?: boolean;
    doubleClick?: boolean;
};

export type ManualBeatAdjSlot = {
    relation: 'prev' | 'current' | 'next';
    order: number;
    confirmed: boolean;
    color: { bg: string; border: string; label: string };
    words: Word[];
    /** Token index của đoạn whisper khớp dài nhất với nội dung beat (chuẩn hóa cả 2) — dùng để tô màu. */
    hintWordIndexes: number[];
};

export type ManualBeatAdjSession = {
    open: boolean;
    content: string;
    /** Đúng 3 slot: [prev?, current, next?] — slot prev/next có thể null. */
    slots: ManualBeatAdjSlot[];
    selection: { start: number; end: number } | null;
    confirming: boolean;
    canSeekPrev: boolean;
    canSeekNext: boolean;
    beatLabel: string;
    startSec: number;
    endSec: number;
};

type Props = {
    regions: BeatRegion[];
    beatDurationSec: number;
    /** Trục thời gian hiệu ứng (= scene budget, beat − transition). Mặc định = beatDurationSec. */
    effectTimelineDurationSec?: number;
    beatStartSec: number;
    beatWords: Word[];
    colorFor: (index: number) => string;
    onChangeRegion: (id: string, patch: Partial<BeatRegion>) => void;
    onSelectRegion?: (id: string, meta?: TimelineSelectMeta) => void;
    selectedRegionId?: string;
    /** Multi-select (Shift+click) — highlight thêm các item đang chọn để Group. */
    multiSelectedKeys?: string[];
    audioUrl?: string;
    maxWidth?: number;
    /** Thời lượng chuyển cảnh cuối beat (giây THỰC TẾ) — 0/không có = ẩn box đỏ. */
    transitionDurationSec?: number;
    shortVideoId?: number;
    beatId?: string;
    /** Beat hiện tại (1-based) — hiển thị trên audio script. */
    beatCurrent?: number;
    /** Tổng số beat — hiển thị cùng beatCurrent dạng current/total. */
    beatTotal?: number;
    onCopyError?: (message: string) => void;
    /** Playhead scene-relative (0 → beatDuration) + đang phát — đồng bộ preview phía trên. */
    onPlayheadChange?: (sec: number, playing: boolean) => void;
    /**
     * Khi `token` đổi — timeline seek tới `sec` (vd chọn vùng → về 0).
     * Parent tăng token mỗi lần cần seek.
     */
    seekRequest?: { sec: number; token: number } | null;
    timelineEffects?: BeatTimelineEffect[];
    selectedEffectId?: string;
    /** Cập nhật UI local khi kéo — không gọi API. */
    onPreviewEffect?: (id: string, patch: Partial<BeatTimelineEffect>) => void;
    /** Lưu effect sau khi thả chuột / kết thúc chỉnh timeline. */
    onCommitEffect?: (id: string, patch: Partial<BeatTimelineEffect>) => void;
    onSelectEffect?: (id: string, meta?: TimelineSelectMeta) => void;
    onSwitchToEditTab?: () => void;
    /** Scene budget — clamp attention window. */
    sceneBudgetSec?: number;
    imageOverlays?: BeatImageOverlay[];
    selectedOverlayId?: string;
    onChangeOverlay?: (id: string, patch: Partial<BeatImageOverlay>) => void;
    onSelectOverlay?: (id: string, meta?: TimelineSelectMeta) => void;
    onRequestDeleteRegion?: (id: string, anchor: HTMLElement) => void;
    onRequestDeleteOverlay?: (id: string, anchor: HTMLElement) => void;
    onRequestDeleteEffect?: (id: string, anchor: HTMLElement) => void;
    /** Xóa tất cả item trên timeline (vùng + ảnh thêm + hiệu ứng). */
    onRequestDeleteAllTimelineItems?: () => void;
    /** Đang xem bên trong 1 group — thay Replay bằng Quay lại. */
    /**
     * Lớp ảnh của beat (multi-image per beat) — hiện thành hàng slot trên cùng.
     * <= 1 lớp: không hiện hàng nào (beat 1 ảnh như trước).
     */
    imageLayers?: BeatImageLayer[];
    activeLayerId?: string;
    onSelectLayer?: (layerId: string) => void;
    /** Commit slot sau khi thả chuột (kéo liên tục chỉ preview trong timeline). */
    onCommitLayerSlots?: (layers: BeatImageLayer[]) => void;
    timelineViewMode?: 'main' | 'group';
    onExitGroupView?: () => void;
    /** Tách group đang xem — mọi member mất group_id, về timeline chính. */
    onUngroupActiveGroup?: () => void;
    /**
     * Phiên điều chỉnh timeline beat thủ công (video 2s). Khi có prop này, audio script
     * hiển thị nút "Điều chỉnh timeline" bên phải; khi `open`, audio script đổi sang
     * chế độ chọn từ n-1/n/n+1 và thêm dòng Xác nhận/Hủy dưới thanh timeline.
     */
    manualBeatAdj?: ManualBeatAdjSession | null;
    onManualBeatAdjToggleOpen?: () => void;
    onManualBeatAdjTokenClick?: (tokenIndex: number) => void;
    onManualBeatAdjConfirm?: () => void;
    onManualBeatAdjClose?: () => void;
    onManualBeatAdjSeekActive?: (delta: -1 | 1) => void;
};

type EffectDragHandle = 'start' | 'end' | 'body' | 'zoom_in_end' | 'hold_end';

type DragState = {
    id: string;
    handle: EffectDragHandle | 'start' | 'end' | 'body';
    startX: number;
    origStartSec: number;
    origEndSec: number;
    kind: 'region' | 'effect' | 'attention' | 'overlay' | 'overlay_attention' | 'layer';
    origZoomInEndSec?: number;
    origHoldEndSec?: number;
    pendingEffectPatch?: Partial<BeatTimelineEffect>;
};

const HANDLE_W = 12;
const PHASE_HANDLE_W = 8;
const ROW_H = 26;
const AUDIO_ROW_H = 30;
const LABEL_W = 118;
const MIN_DUR = 1.0;
/** Màu hàng slot lớp ảnh (multi-image per beat). */
const LAYER_ROW_COLOR = '#ffb300';
/** Thu gọn: 5 dòng (1 audio + 4 track). Mở rộng: 10 dòng (1 audio + 9 track). */
const MAX_VISIBLE_TIMELINE_ROWS_COLLAPSED = 5;
const MAX_VISIBLE_TIMELINE_ROWS_EXPANDED = 10;
const TIMELINE_EXPANDED_STORAGE_KEY = 'biong.whiteboard.regionTimeline.expanded';

/** Chuẩn hóa từ để so khớp đầu/cuối: chữ thường, bỏ dấu tiếng Việt, bỏ kí tự/dấu câu. */
function normalizeHintWord(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}
const SYNTHETIC_GROUP_ID_PREFIX = '__group__:';

function parseSyntheticGroupId(id: string): string | null {
    const text = String(id || '');
    if (!text.startsWith(SYNTHETIC_GROUP_ID_PREFIX)) {
        return null;
    }
    const groupId = text.slice(SYNTHETIC_GROUP_ID_PREFIX.length).trim();
    return groupId || null;
}

function readStoredTimelineExpanded(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return window.localStorage.getItem(TIMELINE_EXPANDED_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeStoredTimelineExpanded(expanded: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(TIMELINE_EXPANDED_STORAGE_KEY, expanded ? '1' : '0');
    } catch {
        // Timeline vẫn hoạt động khi trình duyệt chặn localStorage.
    }
}

export default function WhiteboardRegionTimeline({
    regions,
    beatDurationSec,
    effectTimelineDurationSec,
    beatStartSec,
    beatWords,
    colorFor,
    onChangeRegion,
    onSelectRegion,
    selectedRegionId,
    audioUrl,
    maxWidth,
    transitionDurationSec = 0,
    shortVideoId = 0,
    beatId = '',
    beatCurrent = 0,
    beatTotal = 0,
    onCopyError,
    onPlayheadChange,
    seekRequest = null,
    timelineEffects = [],
    selectedEffectId,
    onPreviewEffect,
    onCommitEffect,
    onSelectEffect,
    onSwitchToEditTab,
    sceneBudgetSec: sceneBudgetSecProp,
    imageOverlays = [],
    selectedOverlayId,
    onChangeOverlay,
    onSelectOverlay,
    multiSelectedKeys = [],
    imageLayers = [],
    activeLayerId = '',
    onSelectLayer,
    onCommitLayerSlots,
    onRequestDeleteRegion,
    onRequestDeleteOverlay,
    onRequestDeleteEffect,
    onRequestDeleteAllTimelineItems,
    timelineViewMode = 'main',
    onExitGroupView,
    onUngroupActiveGroup,
    manualBeatAdj = null,
    onManualBeatAdjToggleOpen,
    onManualBeatAdjTokenClick,
    onManualBeatAdjConfirm,
    onManualBeatAdjClose,
    onManualBeatAdjSeekActive,
}: Props) {
    const duration = Math.max(0.1, beatDurationSec);
    const effectDuration = Math.max(0.1, effectTimelineDurationSec ?? duration);
    const sceneBudget = Math.max(0.1, sceneBudgetSecProp ?? effectDuration);
    const transitionDur = Math.max(0, Math.min(duration, Number(transitionDurationSec) || 0));
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const dragRef = React.useRef<DragState | null>(null);
    const scrubRef = React.useRef(false);

    // ---- Audio playback ----
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = React.useState(false);
    const [playhead, setPlayhead] = React.useState(0);
    const [copied, setCopied] = React.useState(false);
    const [copying, setCopying] = React.useState(false);
    const [ungroupConfirmOpen, setUngroupConfirmOpen] = React.useState(false);
    /** false = thu gọn (max 5 dòng), true = mở rộng (max 10 dòng). Persist localStorage. */
    const [timelineExpanded, setTimelineExpanded] = React.useState(readStoredTimelineExpanded);
    /** Slot lớp ảnh đang kéo (preview) — commit khi thả chuột. */
    const [layerSlotDraft, setLayerSlotDraft] = React.useState<BeatImageLayer[] | null>(null);

    React.useEffect(() => {
        if (timelineViewMode !== 'group') {
            setUngroupConfirmOpen(false);
        }
    }, [timelineViewMode]);
    const rafRef = React.useRef<number>(0);
    const onPlayheadChangeRef = React.useRef(onPlayheadChange);
    onPlayheadChangeRef.current = onPlayheadChange;
    const playingRef = React.useRef(false);
    playingRef.current = playing;

    const emitPlayhead = (sec: number, isPlaying: boolean) => {
        onPlayheadChangeRef.current?.(sec, isPlaying);
    };

    React.useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;
        const stop = () => setPlaying(false);
        audio.addEventListener('ended', stop);
        audio.addEventListener('pause', stop);
        return () => {
            audio.removeEventListener('ended', stop);
            audio.removeEventListener('pause', stop);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    React.useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.pause();
        setPlaying(false);
        setPlayhead(0);
        emitPlayhead(0, false);
    }, [beatStartSec, beatDurationSec]);

    const updatePlayhead = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const t = Math.max(beatStartSec, Math.min(beatStartSec + duration, audio.currentTime));
        const local = t - beatStartSec;
        setPlayhead(local);
        emitPlayhead(local, true);
        if (t >= beatStartSec + duration - 0.02) {
            audio.pause();
            setPlaying(false);
            emitPlayhead(local, false);
            return;
        }
        rafRef.current = requestAnimationFrame(updatePlayhead);
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
            setPlaying(false);
            emitPlayhead(playhead, false);
            return;
        }
        const cur = audio.currentTime;
        if (cur < beatStartSec - 0.05 || cur > beatStartSec + duration + 0.05) {
            audio.currentTime = beatStartSec;
        }
        void audio.play().then(() => {
            setPlaying(true);
            emitPlayhead(Math.max(0, audio.currentTime - beatStartSec), true);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(updatePlayhead);
        }).catch(() => setPlaying(false));
    };

    const seekToSec = (sec: number) => {
        const audio = audioRef.current;
        const next = Math.max(0, Math.min(duration, sec));
        if (audio && audioUrl) {
            audio.currentTime = Math.max(0, beatStartSec + next);
        }
        setPlayhead(next);
        emitPlayhead(next, playingRef.current);
    };

    React.useEffect(() => {
        if (!seekRequest || seekRequest.token <= 0) {
            return;
        }
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
        }
        setPlaying(false);
        seekToSec(seekRequest.sec);
        emitPlayhead(Math.max(0, Math.min(duration, seekRequest.sec)), false);
        // Chỉ theo token — tránh loop khi seekRequest object đổi reference.
    }, [seekRequest?.token]);

    const replay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = beatStartSec;
        setPlayhead(0);
        emitPlayhead(0, true);
        void audio.play().then(() => {
            setPlaying(true);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(updatePlayhead);
        }).catch(() => setPlaying(false));
    };

    // ---- Timing helpers ----
    const startSecOf = (region: BeatRegion): number => (
        resolveRegionStartSec(region, beatWords, beatStartSec, duration)
    );
    const endSecOf = (region: BeatRegion): number => (
        resolveRegionEndSec(region, beatWords, beatStartSec, duration)
    );
    const ancestorEndMax = (id: string, seen = new Set<string>()): number => {
        const region = regions.find((r) => r.id === id);
        if (!region || seen.has(id)) return 0;
        seen.add(id);
        const pid = region.parent_id || null;
        const parent = pid ? regions.find((r) => r.id === pid) : null;
        const parentEnd = parent ? endSecOf(parent) : 0;
        return Math.max(parentEnd, pid ? ancestorEndMax(pid, seen) : 0);
    };
    const minStartOf = (region: BeatRegion): number => {
        if (!region.parent_id) return 0;
        return Math.min(ancestorEndMax(region.id), duration);
    };

    // Sắp CÂY: cha → các con (đệ quy) → các vùng khác.
    const orderedRegions = React.useMemo(() => {
        const out: BeatRegion[] = [];
        const visited = new Set<string>();
        const visit = (r: BeatRegion) => {
            if (visited.has(r.id)) return;
            visited.add(r.id);
            out.push(r);
            regions.filter((c) => c.parent_id === r.id).forEach(visit);
        };
        regions.filter((r) => !r.parent_id).forEach(visit);
        regions.forEach(visit);
        return out;
    }, [regions]);

    const orderedEffects = React.useMemo(() => (
        [...timelineEffects].sort((a, b) => a.layer - b.layer || a.start_sec - b.start_sec)
    ), [timelineEffects]);

    const effectStartSecOf = (effect: BeatTimelineEffect) => Math.max(0, Math.min(effectDuration, effect.start_sec));
    const effectEndSecOf = (effect: BeatTimelineEffect) => Math.max(0, Math.min(effectDuration, effect.end_sec));

    const previewEffect = (id: string, patch: Partial<BeatTimelineEffect>) => {
        onPreviewEffect?.(id, patch);
    };

    const storeEffectDragPatch = (drag: DragState, patch: Partial<BeatTimelineEffect>) => {
        drag.pendingEffectPatch = { ...(drag.pendingEffectPatch || {}), ...patch };
        previewEffect(drag.id, patch);
    };

    const commitEffect = (id: string, start: number, end: number) => {
        let s = Math.max(0, Math.min(duration, start));
        let e = Math.max(0, Math.min(duration, end));
        if (e - s < MIN_DUR) {
            if (start >= duration - MIN_DUR) s = Math.max(0, e - MIN_DUR);
            else e = Math.min(duration, s + MIN_DUR);
        }
        if (e <= s) e = Math.min(duration, s + MIN_DUR);
        const patch = {
            start_sec: Math.round(s * 100) / 100,
            end_sec: Math.round(e * 100) / 100,
        };
        if (dragRef.current?.kind === 'effect') {
            storeEffectDragPatch(dragRef.current, patch);
            return;
        }
        previewEffect(id, patch);
    };

    const commitZoomEffect = (
        id: string,
        patch: Partial<Pick<BeatZoomEffect, 'start_sec' | 'end_sec' | 'zoom_in_end_sec' | 'hold_end_sec'>>,
    ) => {
        const effect = timelineEffects.find((item) => item.id === id);
        if (!effect || !isBeatZoomEffect(effect)) return;
        const merged = { ...effect, ...patch };
        const phases = normalizeZoomPhaseBounds(
            merged.start_sec,
            merged.end_sec,
            merged.zoom_in_end_sec,
            merged.hold_end_sec,
            effectDuration,
        );
        const normalized = {
            start_sec: phases.start,
            end_sec: phases.end,
            zoom_in_end_sec: phases.zoomInEnd,
            hold_end_sec: phases.holdEnd,
        };
        if (dragRef.current?.kind === 'effect') {
            storeEffectDragPatch(dragRef.current, normalized);
            return;
        }
        previewEffect(id, normalized);
    };

    const multiSelectedSet = React.useMemo(() => new Set(multiSelectedKeys), [multiSelectedKeys]);
    const isItemMultiSelected = (kind: 'region' | 'overlay' | 'effect', id: string) => (
        multiSelectedSet.has(`${kind}:${id}`)
    );

    const handleEffectPointerDown = (
        e: React.PointerEvent,
        id: string,
        handle: EffectDragHandle,
    ) => {
        e.preventDefault();
        e.stopPropagation();
        const effect = timelineEffects.find((item) => item.id === id);
        if (!effect) return;
        onSelectEffect?.(id, { shiftKey: e.shiftKey });
        onSwitchToEditTab?.();
        const drag: DragState = {
            id,
            handle,
            kind: 'effect',
            startX: e.clientX,
            origStartSec: effectStartSecOf(effect),
            origEndSec: effectEndSecOf(effect),
        };
        if (isBeatZoomEffect(effect)) {
            const phases = getZoomPhaseBounds(effect, effectDuration);
            drag.origZoomInEndSec = phases.zoomInEnd;
            drag.origHoldEndSec = phases.holdEnd;
        }
        dragRef.current = drag;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const secToPct = (sec: number) => (sec / duration) * 100;
    const posToSec = (clientX: number): number => {
        const el = trackRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
    };

    const commit = (id: string, start: number, end: number) => {
        let s = Math.max(0, Math.min(duration, start));
        let e = Math.max(0, Math.min(duration, end));
        if (e - s < MIN_DUR) {
            if (start >= duration - MIN_DUR) s = Math.max(0, e - MIN_DUR);
            else e = Math.min(duration, s + MIN_DUR);
        }
        const region = regions.find((r) => r.id === id);
        if (!region) return;
        const minStart = minStartOf(region);
        if (s < minStart) s = minStart;
        if (e < minStart) e = minStart;
        if (e <= s) e = Math.min(duration, s + MIN_DUR);
        // Beat nhiều lớp ảnh: vùng chỉ tồn tại trong slot của lớp chứa nó.
        if (hasLayerRows) {
            const slot = effectiveLayers.find((layer) => layer.id === activeLayerId);
            if (slot && slot.end_sec > slot.start_sec) {
                s = Math.max(slot.start_sec, Math.min(slot.end_sec, s));
                e = Math.max(slot.start_sec, Math.min(slot.end_sec, e));
                if (e <= s) {
                    e = Math.min(slot.end_sec, s + MIN_DUR);
                }
            }
        }
        onChangeRegion(id, regionTimingPatchFromDrag(s, e));
    };

    const commitAttention = (
        id: string,
        start: number,
        end: number,
        kind: 'region' | 'overlay',
        handle: 'start' | 'end' | 'body' = 'end',
        origSpanSec?: number,
    ) => {
        const source = kind === 'region'
            ? regions.find((r) => r.id === id)
            : imageOverlays.find((o) => o.id === id);
        if (!source) return;
        const minStart = attentionEarliestStartSec(source, beatWords, beatStartSec, duration);
        let s = start;
        let e = end;
        if (handle === 'body' && origSpanSec != null && s < minStart) {
            s = minStart;
            e = s + origSpanSec;
        }
        const patch = attentionPatchFromDrag(s, e, sceneBudget, minStart);
        if (kind === 'region') {
            onChangeRegion(id, patch);
            return;
        }
        onChangeOverlay?.(id, patch);
    };

    const commitOverlayTiming = (id: string, start: number, end: number) => {
        onChangeOverlay?.(id, overlayTimingPatchFromDrag(start, end, duration));
    };

    /**
     * SLOT LỚP ẢNH: các slot lấp kín beat window liên tiếp, không chồng nhau —
     * kéo mốc của lớp nào thì lớp kề bị đẩy theo để giữ liền mạch.
     */
    const effectiveLayers = layerSlotDraft || imageLayers;
    const hasLayerRows = effectiveLayers.length > 1;

    const computeLayerSlots = (
        layerId: string,
        handle: 'start' | 'end' | 'body',
        start: number,
        end: number,
    ): BeatImageLayer[] | null => {
        const index = imageLayers.findIndex((layer) => layer.id === layerId);
        if (index < 0) {
            return null;
        }
        const next = imageLayers.map((layer) => ({ ...layer }));
        const min = WHITEBOARD_MIN_LAYER_SLOT_SEC;
        if (handle === 'start' || handle === 'body') {
            if (index === 0) {
                next[0].start_sec = 0;
            } else {
                const lower = next[index - 1].start_sec + min;
                const upper = next[index].end_sec - min;
                const value = Math.max(lower, Math.min(upper, start));
                next[index].start_sec = value;
                next[index - 1].end_sec = value;
            }
        }
        if (handle === 'end' || handle === 'body') {
            if (index === next.length - 1) {
                next[index].end_sec = duration;
            } else {
                const lower = next[index].start_sec + min;
                const upper = next[index + 1].end_sec - min;
                const value = Math.max(lower, Math.min(upper, end));
                next[index].end_sec = value;
                next[index + 1].start_sec = value;
            }
        }
        return next;
    };

    const handleLayerPointerDown = (
        e: React.PointerEvent,
        layerId: string,
        handle: 'start' | 'end' | 'body',
    ) => {
        e.preventDefault();
        e.stopPropagation();
        const layer = imageLayers.find((item) => item.id === layerId);
        if (!layer) return;
        onSelectLayer?.(layerId);
        if (handle === 'body') {
            return;
        }
        dragRef.current = {
            id: layerId,
            handle,
            kind: 'layer',
            startX: e.clientX,
            origStartSec: layer.start_sec,
            origEndSec: layer.end_sec,
        };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const handleAttentionPointerDown = (
        e: React.PointerEvent,
        id: string,
        handle: 'start' | 'end' | 'body',
        kind: 'region' | 'overlay',
    ) => {
        e.preventDefault();
        e.stopPropagation();
        const source = kind === 'region'
            ? regions.find((r) => r.id === id)
            : imageOverlays.find((o) => o.id === id);
        if (!source) return;
        if (kind === 'region') {
            onSelectRegion?.(id, { shiftKey: e.shiftKey });
        } else {
            onSelectOverlay?.(id, { shiftKey: e.shiftKey });
            onSwitchToEditTab?.();
        }
        const win = resolveAttentionWindow(source, beatWords, beatStartSec, duration, sceneBudget);
        if (!win.enabled) return;
        dragRef.current = {
            id,
            handle,
            kind: kind === 'region' ? 'attention' : 'overlay_attention',
            startX: e.clientX,
            origStartSec: win.start,
            origEndSec: win.end,
        };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const handleOverlayPointerDown = (
        e: React.PointerEvent,
        id: string,
        handle: 'start' | 'end' | 'body',
    ) => {
        e.preventDefault();
        e.stopPropagation();
        const overlay = imageOverlays.find((o) => o.id === id);
        if (!overlay) return;
        onSelectOverlay?.(id, { shiftKey: e.shiftKey });
        onSwitchToEditTab?.();
        dragRef.current = {
            id,
            handle,
            kind: 'overlay',
            startX: e.clientX,
            origStartSec: resolveOverlayStartSec(overlay),
            origEndSec: resolveOverlayEndSec(overlay, duration),
        };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const handlePointerDown = (e: React.PointerEvent, id: string, handle: 'start' | 'end' | 'body') => {
        e.preventDefault();
        e.stopPropagation();
        const region = regions.find((r) => r.id === id);
        if (!region) return;
        // UX: click-giữ + kéo vùng nào → TỰ ĐỘNG chọn vùng đó (không cần thả chuột
        // rồi bấm lại) — vùng đang kéo luôn là vùng đang quản lý.
        // Phải truyền shiftKey ở đây: pointerdown chạy trước click; nếu bỏ sót thì
        // multi-select bị reset trước khi click kịp gửi shift.
        if (onSelectRegion) onSelectRegion(id, { shiftKey: e.shiftKey });
        dragRef.current = {
            id, handle,
            kind: 'region',
            startX: e.clientX,
            origStartSec: startSecOf(region),
            origEndSec: endSecOf(region),
        };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (scrubRef.current) {
            seekToSec(posToSec(e.clientX));
            return;
        }
        const drag = dragRef.current;
        if (!drag) return;
        const dx = posToSec(e.clientX) - posToSec(drag.startX);
        let s = drag.origStartSec;
        let end = drag.origEndSec;
        if (drag.kind === 'effect' && drag.origZoomInEndSec != null && drag.origHoldEndSec != null) {
            const origSpan = Math.max(0.001, drag.origEndSec - drag.origStartSec);
            const relIn = (drag.origZoomInEndSec - drag.origStartSec) / origSpan;
            const relHold = (drag.origHoldEndSec - drag.origStartSec) / origSpan;
            if (drag.handle === 'body') {
                const bounds = shiftZoomPhaseBounds(
                    {
                        start: drag.origStartSec,
                        zoomInEnd: drag.origZoomInEndSec,
                        holdEnd: drag.origHoldEndSec,
                        end: drag.origEndSec,
                    },
                    dx,
                    effectDuration,
                );
                commitZoomEffect(drag.id, {
                    start_sec: bounds.start,
                    end_sec: bounds.end,
                    zoom_in_end_sec: bounds.zoomInEnd,
                    hold_end_sec: bounds.holdEnd,
                });
                return;
            }
            if (drag.handle === 'zoom_in_end') {
                commitZoomEffect(drag.id, { zoom_in_end_sec: drag.origZoomInEndSec + dx });
                return;
            }
            if (drag.handle === 'hold_end') {
                commitZoomEffect(drag.id, { hold_end_sec: drag.origHoldEndSec + dx });
                return;
            }
            if (drag.handle === 'start') {
                s = drag.origStartSec + dx;
                const newSpan = drag.origEndSec - s;
                commitZoomEffect(drag.id, {
                    start_sec: s,
                    end_sec: drag.origEndSec,
                    zoom_in_end_sec: s + relIn * newSpan,
                    hold_end_sec: s + relHold * newSpan,
                });
                return;
            }
            if (drag.handle === 'end') {
                end = drag.origEndSec + dx;
                const newSpan = end - drag.origStartSec;
                commitZoomEffect(drag.id, {
                    start_sec: drag.origStartSec,
                    end_sec: end,
                    zoom_in_end_sec: drag.origStartSec + relIn * newSpan,
                    hold_end_sec: drag.origStartSec + relHold * newSpan,
                });
                return;
            }
        }
        if (drag.handle === 'body') { s = drag.origStartSec + dx; end = drag.origEndSec + dx; }
        else if (drag.handle === 'start') { s = drag.origStartSec + dx; }
        else { end = drag.origEndSec + dx; }
        if (drag.kind === 'effect') commitEffect(drag.id, s, end);
        else if (drag.kind === 'attention') {
            commitAttention(
                drag.id,
                s,
                end,
                'region',
                drag.handle === 'body' || drag.handle === 'start' || drag.handle === 'end' ? drag.handle : 'end',
                drag.origEndSec - drag.origStartSec,
            );
        }
        else if (drag.kind === 'overlay_attention') {
            commitAttention(
                drag.id,
                s,
                end,
                'overlay',
                drag.handle === 'body' || drag.handle === 'start' || drag.handle === 'end' ? drag.handle : 'end',
                drag.origEndSec - drag.origStartSec,
            );
        }
        else if (drag.kind === 'overlay') commitOverlayTiming(drag.id, s, end);
        else if (drag.kind === 'layer') {
            const handle = drag.handle === 'start' || drag.handle === 'end' ? drag.handle : 'body';
            const next = computeLayerSlots(drag.id, handle, s, end);
            if (next) {
                setLayerSlotDraft(next);
            }
        }
        else commit(drag.id, s, end);
    };

    const endDrag = (e?: React.PointerEvent) => {
        const drag = dragRef.current;
        if (drag?.kind === 'effect' && drag.pendingEffectPatch && onCommitEffect) {
            onCommitEffect(drag.id, drag.pendingEffectPatch);
        }
        if (drag?.kind === 'layer') {
            if (layerSlotDraft) {
                onCommitLayerSlots?.(layerSlotDraft);
            }
            setLayerSlotDraft(null);
        }
        if (e) (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        dragRef.current = null;
        scrubRef.current = false;
    };

    const handleWordClick = (word: Word) => {
        const t = Math.max(0, Math.min(duration, word.start - beatStartSec));
        seekToSec(t);
        const region = selectedRegionId ? regions.find((r) => r.id === selectedRegionId) : undefined;
        if (!region) return;
        const minStart = minStartOf(region);
        const currentStart = region.start_sec != null ? startSecOf(region) : Math.max(minStart, t - 1.0);
        const s = Math.max(minStart, Math.min(t, currentStart));
        const e = Math.round(Math.max(s + MIN_DUR, t) * 100) / 100;
        onChangeRegion(region.id, regionTimingPatchFromDrag(s, e));
    };

    // Khoảng thời gian đang chọn (vùng hoặc hiệu ứng) — highlight audio script + thanh audio.
    const selectedRegionObj = selectedRegionId ? regions.find((r) => r.id === selectedRegionId) : undefined;
    const selectedEffectObj = selectedEffectId
        ? timelineEffects.find((item) => item.id === selectedEffectId)
        : undefined;
    const selectedRange = selectedRegionObj
        ? { start: startSecOf(selectedRegionObj), end: endSecOf(selectedRegionObj), kind: 'region' as const }
        : selectedEffectObj
            ? { start: effectStartSecOf(selectedEffectObj), end: effectEndSecOf(selectedEffectObj), kind: 'effect' as const }
            : null;

    // Copy JSON timeline từ SERVER (override đã lưu → scene payload engine render).
    const copyTimelineJson = async () => {
        if (copying) return;
        const writeClipboard = (json: string) => {
            const done = () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
            };
            if (navigator.clipboard?.writeText) {
                void navigator.clipboard.writeText(json).then(done).catch(() => setCopied(false));
            } else {
                const ta = document.createElement('textarea');
                ta.value = json;
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); done(); } catch { /* noop */ }
                document.body.removeChild(ta);
            }
        };

        const sid = Number(shortVideoId || 0);
        const bid = String(beatId || '').trim();
        if (sid <= 0 || !bid) {
            onCopyError?.('Thiếu shortVideoId / beatId — không gọi được API server');
            return;
        }

        setCopying(true);
        try {
            const res = await getAgentWhiteboardBeatRenderTimeline(sid, bid);
            if (!res?.success || !res.timeline) {
                onCopyError?.(
                    typeof res?.message === 'string' && res.message
                        ? res.message
                        : 'Không lấy được timeline từ server',
                );
                return;
            }
            writeClipboard(JSON.stringify(res.timeline, null, 2));
        } catch (e) {
            onCopyError?.(e instanceof Error ? e.message : String(e));
        } finally {
            setCopying(false);
        }
    };

    const layerRowCount = hasLayerRows ? effectiveLayers.length : 0;
    const trackRowCount = layerRowCount
        + orderedRegions.length
        + orderedEffects.length
        + imageOverlays.length;
    const maxVisibleRows = timelineExpanded
        ? MAX_VISIBLE_TIMELINE_ROWS_EXPANDED
        : MAX_VISIBLE_TIMELINE_ROWS_COLLAPSED;
    const maxTrackRowsVisible = maxVisibleRows - 1;
    const timelineScrollBodyMaxH = maxTrackRowsVisible * ROW_H;
    const scrollBodyHeight = Math.min(trackRowCount * ROW_H, timelineScrollBodyMaxH);
    const needsTrackScroll = trackRowCount > maxTrackRowsVisible;

    return (
        <>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', pb: 0.5, userSelect: 'none', flexShrink: 0 }}>
            <audio ref={audioRef} src={audioUrl || undefined} preload="auto" style={{ display: 'none' }} />
            <Box sx={{ width: '100%', maxWidth: maxWidth || '100%', userSelect: 'none' }}>
                {/* Từ như đoạn văn xuống dòng */}
                <Box
                    sx={{
                        maxHeight: manualBeatAdj?.open ? 180 : 52,
                        overflowY: 'auto',
                        mb: manualBeatAdj?.open ? 0.75 : 0.5,
                        border: manualBeatAdj?.open ? '1px solid' : '1px solid',
                        borderColor: manualBeatAdj?.open ? 'divider' : 'divider',
                        borderRadius: 1,
                        p: 0.5,
                        bgcolor: 'background.paper',
                        lineHeight: 1.9,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        display: 'flex',
                        alignItems: manualBeatAdj?.open ? 'stretch' : 'flex-start',
                        gap: 0.75,
                    }}
                >
                    {beatCurrent > 0 && beatTotal > 0 ? (
                        <Chip
                            size="small"
                            label={`${beatCurrent}/${beatTotal}`}
                            title={`Beat ${beatCurrent} / ${beatTotal}`}
                            sx={{
                                height: 20,
                                flexShrink: 0,
                                mt: '2px',
                                fontWeight: 800,
                                fontSize: 11,
                                fontVariantNumeric: 'tabular-nums',
                                '& .MuiChip-label': { px: 0.75 },
                            }}
                        />
                    ) : null}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                    {manualBeatAdj?.open ? (
                        <Stack direction="column" spacing={0.75} sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                {manualBeatAdj.content}
                            </Typography>
                            <Divider />
                            <Box sx={{ display: 'block', minWidth: 0, lineHeight: 1.9 }}>
                                {manualBeatAdj.slots.map((slot) => {
                                    const selStart = manualBeatAdj.selection?.start;
                                    const selEnd = manualBeatAdj.selection?.end;
                                    const hasSelection = selStart != null && selEnd != null;
                                    const isCurrentSlot = slot.relation === 'current';
                                    const audioNormWords = slot.words.map((w) => normalizeHintWord(w.text));
                                    const contentNormWords = manualBeatAdj.content.trim().split(/\s+/).map(normalizeHintWord);
                                    let pref = 0;
                                    for (; pref < Math.min(audioNormWords.length, contentNormWords.length); pref += 1) {
                                        if (audioNormWords[pref] !== contentNormWords[pref]) break;
                                    }
                                    const fullMatch = pref === contentNormWords.length && contentNormWords.length > 0;
                                    let blueEnd = pref;
                                    let purpleStart = audioNormWords.length;
                                    const purpleEnd = audioNormWords.length;
                                    if (fullMatch) {
                                        const fullLen = Math.min(audioNormWords.length, contentNormWords.length);
                                        blueEnd = Math.ceil(fullLen / 2);
                                        purpleStart = blueEnd;
                                    } else {
                                        let suff = 0;
                                        for (; suff < Math.min(audioNormWords.length, contentNormWords.length) - pref; suff += 1) {
                                            if (audioNormWords[audioNormWords.length - 1 - suff] !== contentNormWords[contentNormWords.length - 1 - suff]) break;
                                        }
                                        purpleStart = audioNormWords.length - suff;
                                    }
                                    const isRunBlue = (wi: number) => isCurrentSlot && wi < blueEnd;
                                    const isRunPurple = (wi: number) => isCurrentSlot && wi >= purpleStart && wi < purpleEnd;
                                    return slot.words.map((word, wi) => {
                                        const isStart = selStart === word.index;
                                        const isEnd = selEnd === word.index;
                                        const inSelection = hasSelection && word.index >= (selStart ?? -1) && word.index <= (selEnd ?? Infinity);
                                        const isHintStart = isRunBlue(wi);
                                        const isHintEnd = isRunPurple(wi);
                                        const matchRun = isHintStart || isHintEnd;
                                        const t = Math.max(0, Math.min(duration, word.start - beatStartSec));
                                        const isPlayhead = Math.abs(playhead - t) < 0.12;
                                        const baseColor = slot.relation === 'next'
                                            ? '#c62828'
                                            : slot.relation === 'prev'
                                                ? '#2e7d32'
                                                : '#000000';
                                        const wordColor = inSelection
                                            ? '#ffffff'
                                            : (matchRun ? '#ffffff' : baseColor);
                                        return (
                                            <Box
                                                component="span"
                                                key={word.index}
                                                onClick={() => onManualBeatAdjTokenClick?.(word.index)}
                                                sx={{
                                                    display: 'inline-block',
                                                    cursor: 'pointer',
                                                    px: 0.45,
                                                    py: 0.05,
                                                    mr: 0.45,
                                                    borderRadius: 0.5,
                                                    fontSize: 13,
                                                    fontWeight: isStart || isEnd ? 900 : (inSelection || isPlayhead ? 700 : 400),
                                                    opacity: isCurrentSlot ? 1 : 0.6,
                                                    color: wordColor,
                                                    bgcolor: inSelection
                                                        ? (isStart ? '#00c853' : isEnd ? '#d50000' : '#1976d2')
                                                        : (isHintEnd ? '#9c27b0' : isHintStart ? '#1976d2' : 'transparent'),
                                                    textDecoration: isCurrentSlot && !inSelection ? 'underline' : 'none',
                                                    textDecorationThickness: 2,
                                                    textDecorationColor: matchRun ? '#ffffff' : '#000000',
                                                    textUnderlineOffset: 2,
                                                    userSelect: 'none',
                                                    WebkitUserSelect: 'none',
                                                }}
                                            >
                                                {word.text}
                                            </Box>
                                        );
                                    });
                                })}
                            </Box>
                        </Stack>
                    ) : beatWords.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                            Chưa có whisper — kéo các điểm trên thanh để đặt thời gian render theo giây.
                        </Typography>
                    ) : (
                        beatWords.map((word) => {
                            const wi = word.index ?? 0;
                            const t = Math.max(0, Math.min(duration, word.start - beatStartSec));
                            const isCurrent = Math.abs(playhead - t) < 0.12;
                            const inRange = selectedRange
                                ? t >= selectedRange.start - 0.1 && t <= selectedRange.end + 0.1
                                : false;
                            return (
                                <Box
                                    component="span"
                                    key={wi}
                                    onClick={() => handleWordClick(word)}
                                    sx={{
                                        display: 'inline-block',
                                        cursor: 'pointer',
                                        borderRadius: 0.5,
                                        px: 0.35,
                                        py: 0.05,
                                        mr: 0.3,
                                        fontSize: 12,
                                        fontWeight: (isCurrent || inRange) ? 800 : 400,
                                        color: isCurrent ? '#f50057' : (inRange ? '#fff' : 'text.primary'),
                                        bgcolor: inRange ? 'primary.main' : 'transparent',
                                        '&:hover': { bgcolor: 'primary.light', color: '#fff' },
                                        userSelect: 'none',
                                        WebkitUserSelect: 'none',
                                    }}
                                    title={`«${word.text}» @ ${t.toFixed(2)}s — bấm để chạy audio${selectedRange ? ' (trong khoảng đang chọn)' : ''}`}
                                >
                                    {word.text}
                                </Box>
                            );
                        })
                    )}
                    </Box>
                    {manualBeatAdj && !manualBeatAdj.open ? (
                        <Box sx={{ flexShrink: 0, alignSelf: 'flex-start', mt: '2px' }}>
                            <Tooltip title="Điều chỉnh timeline beat thủ công: bấm từ BẮT ĐẦU rồi từ KẾT THÚC trên đoạn nói (whisper) và Xác nhận.">
                                <Button
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    onClick={onManualBeatAdjToggleOpen}
                                    startIcon={<EditIcon fontSize="small" />}
                                    sx={{ textTransform: 'none', fontSize: 11, py: 0.25, whiteSpace: 'nowrap' }}
                                >
                                    Điều chỉnh timeline
                                </Button>
                            </Tooltip>
                        </Box>
                    ) : null}
                </Box>

                {/* Timeline nhiều dòng (kiểu CapCut) — thu gọn 5 / mở rộng 10 dòng, phần dư cuộn */}
                <Box sx={{ display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.paper', position: 'relative' }}>
                    {/* Hàng audio cố định */}
                    <Box sx={{ display: 'flex', flexShrink: 0 }}>
                        <Box sx={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.04)' }}>
                            <Box sx={{ height: AUDIO_ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'space-around', px: 0.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                            {timelineViewMode === 'group' ? (
                                <Tooltip title="Quay lại timeline chính">
                                    <IconButton
                                        size="small"
                                        onClick={() => onExitGroupView?.()}
                                        sx={{ p: 0.4 }}
                                        aria-label="Quay lại timeline chính"
                                    >
                                        <ArrowBackIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {timelineViewMode === 'group' ? (
                                <Tooltip title="Tách group — mọi item về timeline chính, không còn thuộc group">
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={() => setUngroupConfirmOpen(true)}
                                            disabled={!onUngroupActiveGroup}
                                            sx={{ p: 0.4 }}
                                            aria-label="Tách group"
                                        >
                                            <CallSplitIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            ) : null}
                            <Tooltip title={playing ? 'Dừng' : 'Phát audio beat'}>
                                <IconButton size="small" onClick={togglePlay} disabled={!audioUrl} sx={{ p: 0.4 }}>
                                    {playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
                                </IconButton>
                            </Tooltip>
                            {timelineViewMode !== 'group' ? (
                                <Tooltip title="Phát lại từ đầu beat">
                                    <IconButton size="small" onClick={replay} disabled={!audioUrl} sx={{ p: 0.4 }}>
                                        <ReplayIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {timelineViewMode !== 'group' ? (
                                <Tooltip title={
                                    copied
                                        ? 'Đã copy JSON timeline server!'
                                        : (copying
                                            ? 'Đang lấy timeline từ server…'
                                            : 'Copy JSON timeline đầy đủ (vùng + hiệu ứng + scene params)')
                                }>
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={() => { void copyTimelineJson(); }}
                                            disabled={copying}
                                            sx={{ p: 0.4, color: copied ? 'success.main' : 'inherit' }}
                                        >
                                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            ) : null}
                            <Tooltip title={timelineExpanded
                                ? 'Thu gọn timeline (tối đa 5 dòng)'
                                : 'Mở rộng timeline (tối đa 10 dòng)'}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setTimelineExpanded((v) => {
                                            const next = !v;
                                            writeStoredTimelineExpanded(next);
                                            return next;
                                        });
                                    }}
                                    sx={{
                                        p: 0.4,
                                        color: timelineExpanded ? 'primary.main' : 'inherit',
                                    }}
                                    aria-label={timelineExpanded ? 'Thu gọn timeline' : 'Mở rộng timeline'}
                                    aria-pressed={timelineExpanded}
                                >
                                    {timelineExpanded
                                        ? <UnfoldLessIcon sx={{ fontSize: 16 }} />
                                        : <UnfoldMoreIcon sx={{ fontSize: 16 }} />}
                                </IconButton>
                            </Tooltip>
                            {onRequestDeleteAllTimelineItems ? (
                                <Tooltip title={trackRowCount > 0
                                    ? (timelineViewMode === 'group'
                                        ? 'Xóa tất cả item trong group đang xem'
                                        : 'Xóa tất cả vùng / ảnh thêm / hiệu ứng trên timeline')
                                    : 'Timeline trống'}
                                >
                                    <span>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            disabled={trackRowCount <= 0}
                                            onClick={onRequestDeleteAllTimelineItems}
                                            sx={{ p: 0.4 }}
                                            aria-label="Xóa tất cả timeline"
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            ) : null}
                            </Box>
                        </Box>
                        <Box
                            ref={trackRef}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                position: 'relative',
                                height: AUDIO_ROW_H,
                                px: HANDLE_W / 2,
                                pl: 1,
                                overflow: 'hidden',
                                bgcolor: 'rgba(0,0,0,0.03)',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                cursor: 'ew-resize',
                            }}
                            onPointerDown={(e) => {
                                scrubRef.current = true;
                                seekToSec(posToSec(e.clientX));
                                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                            }}
                            onPointerMove={handlePointerMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                            title="Kéo thanh audio để xem preview beat tại thời điểm đó"
                        >
                            {selectedRange ? (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 2,
                                        bottom: 2,
                                        left: `${secToPct(selectedRange.start)}%`,
                                        width: `${Math.max(0.01, secToPct(selectedRange.end) - secToPct(selectedRange.start))}%`,
                                        bgcolor: selectedRange.kind === 'effect'
                                            ? 'rgba(124,77,255,0.22)'
                                            : 'rgba(25,118,210,0.18)',
                                        border: '1px solid',
                                        borderColor: selectedRange.kind === 'effect'
                                            ? 'rgba(124,77,255,0.55)'
                                            : 'rgba(25,118,210,0.45)',
                                        borderRadius: 0.5,
                                        pointerEvents: 'none',
                                        zIndex: 0,
                                    }}
                                />
                            ) : null}
                            {Array.from({ length: Math.max(1, Math.ceil(duration)) }).map((_, i) => (
                                <React.Fragment key={i}>
                                    <Box sx={{ position: 'absolute', left: `${(i / duration) * 100}%`, top: 5, height: 16, width: 1, bgcolor: 'rgba(0,0,0,0.25)' }} />
                                    <Typography sx={{ position: 'absolute', left: `${(i / duration) * 100}%`, top: 2, transform: 'translateX(2px)', fontSize: 9, color: 'text.secondary', fontWeight: 700 }}>
                                        {i}s
                                    </Typography>
                                </React.Fragment>
                            ))}
                            {beatWords.map((word) => {
                                const t = (word.start - beatStartSec) / duration;
                                if (t < 0 || t > 1) return null;
                                return <Box key={`tick-${word.index}`} sx={{ position: 'absolute', left: `${t * 100}%`, top: 22, height: 5, width: 1, bgcolor: 'rgba(0,0,0,0.40)' }} />;
                            })}
                        </Box>
                    </Box>

                    {/* Các dòng vùng / hiệu ứng — cuộn khi vượt quá số dòng track cho phép */}
                    {trackRowCount > 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            maxHeight: timelineScrollBodyMaxH,
                            height: scrollBodyHeight,
                            overflowY: needsTrackScroll ? 'auto' : 'hidden',
                            overflowX: 'hidden',
                            '&::-webkit-scrollbar': { width: 8 },
                            '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0,0,0,0.04)' },
                            '&::-webkit-scrollbar-thumb': {
                                bgcolor: 'rgba(0,0,0,0.22)',
                                borderRadius: 1,
                            },
                            '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(0,0,0,0.35)' },
                        }}
                    >
                    <Box sx={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.04)' }}>
                        {/* Slot lớp ảnh — chỉ hiện khi beat có nhiều lớp */}
                        {hasLayerRows ? effectiveLayers.map((layer, index) => {
                            const isActive = layer.id === activeLayerId;
                            return (
                                <Box
                                    key={`layer_label_${layer.id}`}
                                    onClick={() => onSelectLayer?.(layer.id)}
                                    sx={{
                                        height: ROW_H,
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 0.5,
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        borderLeft: `3px solid ${LAYER_ROW_COLOR}`,
                                        bgcolor: isActive ? `${LAYER_ROW_COLOR}26` : 'transparent',
                                        cursor: 'pointer',
                                    }}
                                    title={`Lớp ảnh ${index + 1} — click để mở lớp này trên canvas`}
                                >
                                    <Typography variant="caption" sx={{
                                        fontSize: 10.5,
                                        fontWeight: 800,
                                        color: '#111',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {layer.name || `Lớp ảnh ${index + 1}`}
                                    </Typography>
                                </Box>
                            );
                        }) : null}
                        {/* Các dòng vùng */}
                        {orderedRegions.map((region) => {
                            const index = regions.findIndex((r) => r.id === region.id);
                            const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                            const isSel = region.id === selectedRegionId || isItemMultiSelected('region', region.id);
                            const syntheticGroupId = parseSyntheticGroupId(region.id);
                            const isSyntheticGroup = Boolean(syntheticGroupId);
                            return (
                                <Box
                                    key={region.id}
                                    onClick={(event) => onSelectRegion?.(region.id, { shiftKey: event.shiftKey })}
                                    onDoubleClick={() => {
                                        onSelectRegion?.(region.id, { doubleClick: true });
                                    }}
                                    sx={{
                                        height: ROW_H, display: 'flex', alignItems: 'center', px: 0.5,
                                        borderTop: '1px solid', borderColor: 'divider',
                                        borderLeft: `3px solid ${color}`,
                                        bgcolor: isSel ? `${color}26` : 'transparent',
                                        cursor: 'pointer',
                                        // Vùng con: thụt cả hàng (icon xóa + tên) để phân biệt.
                                        pl: (!isSyntheticGroup && region.parent_id) ? 1.75 : 0.5,
                                    }}
                                    title={isSyntheticGroup
                                        ? `Group — click chọn cả group, double-click để vào group`
                                        : `Click chọn · Shift+click chọn nhiều · Double-click vào group (nếu có)`}
                                >
                                    {!isSyntheticGroup ? (
                                        <IconButton
                                            size="small"
                                            color="error"
                                            title="Xóa vùng"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onRequestDeleteRegion?.(region.id, event.currentTarget);
                                            }}
                                            sx={{ p: 0.15, mr: 0.25, flexShrink: 0 }}
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    ) : null}
                                    <Typography variant="caption" sx={{
                                        fontSize: 10.5, fontWeight: 800, color: '#111',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {region.name || 'Vùng'}
                                    </Typography>
                                </Box>
                            );
                        })}
                        {orderedEffects.map((effect) => {
                            const def = getBeatTimelineEffectDefinition(effect.type);
                            const color = def?.timelineColor || '#7c4dff';
                            const isSel = effect.id === selectedEffectId || isItemMultiSelected('effect', effect.id);
                            return (
                                <Box
                                    key={effect.id}
                                    onClick={(event) => {
                                        onSelectEffect?.(effect.id, { shiftKey: event.shiftKey });
                                        onSwitchToEditTab?.();
                                    }}
                                    onDoubleClick={() => {
                                        onSelectEffect?.(effect.id, { doubleClick: true });
                                    }}
                                    sx={{
                                        height: ROW_H,
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 0.5,
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        borderLeft: `3px solid ${color}`,
                                        bgcolor: isSel ? `${color}26` : 'transparent',
                                        cursor: 'pointer',
                                    }}
                                    title={`Click chọn · Shift+click chọn nhiều · Double-click vào group (nếu có) — ${def?.label || effect.type}`}
                                >
                                    <IconButton
                                        size="small"
                                        color="error"
                                        title="Xóa hiệu ứng"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onRequestDeleteEffect?.(effect.id, event.currentTarget);
                                        }}
                                        sx={{ p: 0.15, mr: 0.25, flexShrink: 0 }}
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <Typography variant="caption" sx={{
                                        fontSize: 10.5,
                                        fontWeight: 800,
                                        color: '#111',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {effect.name || def?.label || effect.type}
                                    </Typography>
                                </Box>
                            );
                        })}
                        {imageOverlays.map((overlay) => {
                            const isSel = overlay.id === selectedOverlayId || isItemMultiSelected('overlay', overlay.id);
                            return (
                                <Box
                                    key={overlay.id}
                                    onClick={(event) => {
                                        onSelectOverlay?.(overlay.id, { shiftKey: event.shiftKey });
                                        onSwitchToEditTab?.();
                                    }}
                                    onDoubleClick={() => {
                                        onSelectOverlay?.(overlay.id, { doubleClick: true });
                                    }}
                                    sx={{
                                        height: ROW_H,
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 0.5,
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        borderLeft: '3px solid #00897b',
                                        bgcolor: isSel ? 'rgba(0,137,123,0.15)' : 'transparent',
                                        cursor: 'pointer',
                                    }}
                                    title={`${overlay.name || overlay.id} — Click chọn · Shift+click chọn nhiều · Double-click vào group (nếu có)`}
                                >
                                    <IconButton
                                        size="small"
                                        color="error"
                                        title="Xóa ảnh"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onRequestDeleteOverlay?.(overlay.id, event.currentTarget);
                                        }}
                                        sx={{ p: 0.15, mr: 0.25, flexShrink: 0 }}
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <Typography variant="caption" sx={{
                                        fontSize: 10.5,
                                        fontWeight: 800,
                                        color: '#111',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {overlay.name || 'Ảnh thêm'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Cột track — các dòng vùng / hiệu ứng */}
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            position: 'relative',
                            px: HANDLE_W / 2,
                            pl: 1,
                            overflow: 'hidden',
                            bgcolor: 'rgba(0,0,0,0.02)',
                            cursor: 'ew-resize',
                            minHeight: trackRowCount * ROW_H,
                        }}
                        onPointerDown={(e) => {
                            scrubRef.current = true;
                            seekToSec(posToSec(e.clientX));
                            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                        }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                    >
                        {/* Dòng slot lớp ảnh — kéo mốc để đổi lúc ảnh xuất hiện */}
                        {hasLayerRows ? effectiveLayers.map((layer, index) => {
                            const isActive = layer.id === activeLayerId;
                            const left = secToPct(layer.start_sec);
                            const width = Math.max(0.01, secToPct(layer.end_sec) - left);
                            return (
                                <Box
                                    key={`layer_row_${layer.id}`}
                                    sx={{
                                        position: 'relative',
                                        height: ROW_H,
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Box
                                        onPointerDown={(e) => handleLayerPointerDown(e, layer.id, 'body')}
                                        sx={{
                                            position: 'absolute',
                                            top: 4,
                                            bottom: 4,
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            borderRadius: 0.75,
                                            bgcolor: isActive ? `${LAYER_ROW_COLOR}66` : `${LAYER_ROW_COLOR}33`,
                                            border: '1px solid',
                                            borderColor: LAYER_ROW_COLOR,
                                            display: 'flex',
                                            alignItems: 'center',
                                            px: 0.5,
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                        }}
                                        title={`Lớp ảnh ${index + 1}: ${layer.start_sec.toFixed(2)}s → ${layer.end_sec.toFixed(2)}s`}
                                    >
                                        <Typography variant="caption" sx={{ fontSize: 9.5, fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>
                                            {`Ảnh ${index + 1} · ${layer.start_sec.toFixed(1)}–${layer.end_sec.toFixed(1)}s`}
                                        </Typography>
                                    </Box>
                                    {index > 0 ? (
                                        <Box
                                            onPointerDown={(e) => handleLayerPointerDown(e, layer.id, 'start')}
                                            sx={{
                                                position: 'absolute',
                                                top: 2,
                                                bottom: 2,
                                                left: `calc(${left}% - ${HANDLE_W / 2}px)`,
                                                width: HANDLE_W,
                                                cursor: 'col-resize',
                                                bgcolor: LAYER_ROW_COLOR,
                                                borderRadius: 0.5,
                                                opacity: 0.9,
                                            }}
                                            title="Kéo để đổi thời điểm ảnh này xuất hiện"
                                        />
                                    ) : null}
                                    {index < effectiveLayers.length - 1 ? (
                                        <Box
                                            onPointerDown={(e) => handleLayerPointerDown(e, layer.id, 'end')}
                                            sx={{
                                                position: 'absolute',
                                                top: 2,
                                                bottom: 2,
                                                left: `calc(${left + width}% - ${HANDLE_W / 2}px)`,
                                                width: HANDLE_W,
                                                cursor: 'col-resize',
                                                bgcolor: LAYER_ROW_COLOR,
                                                borderRadius: 0.5,
                                                opacity: 0.9,
                                            }}
                                            title="Kéo để đổi thời điểm ảnh kế tiếp xuất hiện"
                                        />
                                    ) : null}
                                </Box>
                            );
                        }) : null}
                        {/* Dòng từng vùng — dải màu + tay kéo */}
                        {orderedRegions.map((region) => {
                            const index = regions.findIndex((r) => r.id === region.id);
                            const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                            const isSel = region.id === selectedRegionId || isItemMultiSelected('region', region.id);
                            const syntheticGroupId = parseSyntheticGroupId(region.id);
                            const isSyntheticGroup = Boolean(syntheticGroupId);
                            const start = startSecOf(region);
                            const end = endSecOf(region);
                            const left = secToPct(start);
                            const width = Math.max(0.01, secToPct(end) - left);
                            return (
                                <Box key={region.id} sx={{ position: 'relative', height: ROW_H, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Box
                                        onPointerDown={(e) => handlePointerDown(e, region.id, 'body')}
                                        onDoubleClick={() => {
                                            onSelectRegion?.(region.id, { doubleClick: true });
                                        }}
                                        sx={{
                                            position: 'absolute', top: 3, bottom: 3,
                                            left: `${left}%`, width: `${width}%`,
                                            borderRadius: 1, bgcolor: color,
                                            opacity: isSel ? 0.9 : 0.6,
                                            border: `2px solid ${color}`,
                                            outline: isSel ? '2px solid rgba(25,118,210,0.85)' : 'none',
                                            outlineOffset: 1,
                                            cursor: 'grab', boxSizing: 'border-box', zIndex: 1,
                                        }}
                                        title={isSyntheticGroup
                                            ? `${region.name} — kéo để dịch cả group, double-click để vào group`
                                            : `${region.name} — kéo giữa để di chuyển · Shift+click chọn nhiều · Double-click vào group (nếu có)`}
                                    >
                                        {width > 6 ? (
                                            <Typography sx={{
                                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: '#fff',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.75)', overflow: 'hidden', whiteSpace: 'nowrap',
                                            }}>
                                                {region.name}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    {!isSyntheticGroup ? (
                                        <>
                                            <Box
                                                onPointerDown={(e) => handlePointerDown(e, region.id, 'start')}
                                                sx={{
                                                    position: 'absolute', top: 1, bottom: 1,
                                                    left: `calc(${left}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                                    bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                                    cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color, zIndex: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                                }}
                                                title="Kéo = thời điểm BẮT ĐẦU render"
                                            >
                                                <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                            </Box>
                                            <Box
                                                onPointerDown={(e) => handlePointerDown(e, region.id, 'end')}
                                                sx={{
                                                    position: 'absolute', top: 1, bottom: 1,
                                                    left: `calc(${secToPct(end)}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                                    bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                                    cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color, zIndex: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                                }}
                                                title="Kéo = thời điểm render XONG"
                                            >
                                                <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                            </Box>
                                        </>
                                    ) : null}
                                    {/* HIỆU ỨNG SAU RENDER: place (full) hoặc draw
                                        (subset) — khoảng cố định engine chạy
                                        NGAY SAU bar vùng. Instant: không stripe
                                        (render ép none dù data còn place_effect). */}
                                    {!isSyntheticGroup && (region.action === 'place' || region.action === 'draw')
                                        && !(region.action === 'place' && isRegionPlaceInstantEntry(region))
                                        ? (() => {
                                        const fxSec = renderPlaceEffectAfterSec(region);
                                        if (!(fxSec > 0.01)) return null;
                                        const extStart = Math.min(end, duration);
                                        const extEnd = Math.min(duration, extStart + fxSec);
                                        const extLeft = secToPct(extStart);
                                        const extWidth = secToPct(extEnd) - extLeft;
                                        if (!(extWidth > 0)) return null;
                                        const fxLabel = region.action === 'draw'
                                            ? (region.place_effect || 'none')
                                            : (region.place_effect || 'loang');
                                        return (
                                            <Box
                                                key={`${region.id}-fx`}
                                                sx={{
                                                    position: 'absolute', top: 3, bottom: 3,
                                                    left: `${extLeft}%`, width: `${extWidth}%`,
                                                    borderRadius: 1,
                                                    background: `repeating-linear-gradient(45deg, ${color}59 0 6px, ${color}1f 6px 12px)`,
                                                    border: `1.5px dashed ${color}`,
                                                    borderLeft: `3px solid ${color}`,
                                                    zIndex: 1, pointerEvents: 'none',
                                                    overflow: 'hidden', boxSizing: 'border-box',
                                                }}
                                                title={`Hiệu ứng "${fxLabel}" chạy ~${fxSec}s sau khi ${region.action === 'draw' ? 'vẽ' : 'đặt ảnh'} xong`}
                                            >
                                                {extWidth >= 7 ? (
                                                    <Typography sx={{
                                                        position: 'absolute', inset: 0, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 8.5, fontWeight: 800, color: '#fff',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                                                        overflow: 'hidden', whiteSpace: 'nowrap',
                                                    }}>
                                                        {`+${Math.round(fxSec * 10) / 10}s`}
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                        );
                                    })() : null}
                                    {!isSyntheticGroup && (() => {
                                        if (region.action === 'erase') return null;
                                        if (!isRegionAttentionEnabled(region.attention_start_sec, region.attention_end_sec)) {
                                            return null;
                                        }
                                        const win = resolveAttentionWindow(
                                            region,
                                            beatWords,
                                            beatStartSec,
                                            duration,
                                            sceneBudget,
                                        );
                                        if (!win.enabled) return null;
                                        const attLeft = secToPct(win.start);
                                        const attWidth = Math.max(0.01, secToPct(win.end) - attLeft);
                                        const attLabel = attentionEffectTimelineLabel(win.type);
                                        return (
                                            <Box
                                                key={`${region.id}-attention`}
                                                onPointerDown={(e) => handleAttentionPointerDown(e, region.id, 'body', 'region')}
                                                sx={{
                                                    position: 'absolute', top: 3, bottom: 3,
                                                    left: `${attLeft}%`, width: `${attWidth}%`,
                                                    borderRadius: 1,
                                                    background: 'repeating-linear-gradient(-45deg, rgba(236,64,122,0.35) 0 5px, rgba(236,64,122,0.12) 5px 10px)',
                                                    border: '1.5px solid rgba(236,64,122,0.75)',
                                                    zIndex: 2, cursor: 'grab', boxSizing: 'border-box',
                                                }}
                                                title={`Gây chú ý · ${attLabel || 'chú ý'} — kéo giữa để dịch, kéo cạnh để đổi thời gian (không sớm hơn lúc ảnh + hiệu ứng sau ảnh kết thúc)`}
                                            >
                                                {attWidth >= 8 && attLabel ? (
                                                    <Typography sx={{
                                                        position: 'absolute', inset: 0, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 8, fontWeight: 800, color: '#fff',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                                                    }}>
                                                        {attLabel}
                                                    </Typography>
                                                ) : null}
                                                <Box
                                                    onPointerDown={(e) => handleAttentionPointerDown(e, region.id, 'start', 'region')}
                                                    sx={{
                                                        position: 'absolute', top: 1, bottom: 1,
                                                        left: `calc(0% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                                        bgcolor: '#fff', border: '2px solid #ec407a', borderRadius: 1,
                                                        cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#ec407a', zIndex: 3,
                                                    }}
                                                >
                                                    <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                                </Box>
                                                <Box
                                                    onPointerDown={(e) => handleAttentionPointerDown(e, region.id, 'end', 'region')}
                                                    sx={{
                                                        position: 'absolute', top: 1, bottom: 1,
                                                        left: `calc(100% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                                        bgcolor: '#fff', border: '2px solid #ec407a', borderRadius: 1,
                                                        cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#ec407a', zIndex: 3,
                                                    }}
                                                >
                                                    <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                                </Box>
                                            </Box>
                                        );
                                    })()}
                                </Box>
                            );
                        })}

                        {orderedEffects.map((effect) => {
                            const def = getBeatTimelineEffectDefinition(effect.type);
                            const color = def?.timelineColor || '#7c4dff';
                            const isSel = effect.id === selectedEffectId || isItemMultiSelected('effect', effect.id);
                            const start = effectStartSecOf(effect);
                            const end = effectEndSecOf(effect);
                            const left = secToPct(start);
                            const width = Math.max(0.01, secToPct(end) - left);
                            const isZoom = isBeatZoomEffect(effect);
                            const phases = isZoom ? getZoomPhaseBounds(effect, effectDuration) : null;
                            const barStart = phases?.start ?? start;
                            const barEnd = phases?.end ?? end;
                            const barSpan = Math.max(0.001, barEnd - barStart);
                            const zoomInPct = phases ? ((phases.zoomInEnd - barStart) / barSpan) * 100 : 33.33;
                            const holdPct = phases ? ((phases.holdEnd - phases.zoomInEnd) / barSpan) * 100 : 33.33;
                            return (
                                <Box key={effect.id} sx={{ position: 'relative', height: ROW_H, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Box
                                        onPointerDown={(e) => handleEffectPointerDown(e, effect.id, 'body')}
                                        onDoubleClick={() => {
                                            onSelectEffect?.(effect.id, { doubleClick: true });
                                        }}
                                        sx={{
                                            position: 'absolute', top: 3, bottom: 3,
                                            left: `${left}%`, width: `${width}%`,
                                            borderRadius: 1,
                                            bgcolor: color,
                                            opacity: isSel ? 0.95 : 0.72,
                                            border: `2px solid ${color}`,
                                            outline: isSel ? '2px solid rgba(25,118,210,0.85)' : 'none',
                                            outlineOffset: 1,
                                            cursor: 'grab',
                                            boxSizing: 'border-box',
                                            zIndex: 2,
                                            overflow: 'hidden',
                                            display: 'flex',
                                        }}
                                        title={`${effect.name || def?.label || 'Hiệu ứng'} — kéo để di chuyển`}
                                    >
                                        {isZoom && phases ? (
                                            <>
                                                <Box sx={{
                                                    flex: `0 0 ${zoomInPct}%`,
                                                    bgcolor: 'rgba(255,255,255,0.28)',
                                                    backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 3px, transparent 3px 6px)',
                                                }} title="Zoom in" />
                                                <Box sx={{
                                                    flex: `0 0 ${holdPct}%`,
                                                    bgcolor: 'rgba(255,255,255,0.12)',
                                                }} title="Giữ zoom" />
                                                <Box sx={{
                                                    flex: 1,
                                                    bgcolor: 'rgba(0,0,0,0.18)',
                                                    backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.2) 0 3px, transparent 3px 6px)',
                                                }} title="Zoom out" />
                                            </>
                                        ) : (
                                            <Box sx={{
                                                flex: 1,
                                                backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 4px, transparent 4px 8px)',
                                            }} />
                                        )}
                                        {width > 6 ? (
                                            <Typography sx={{
                                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: '#fff',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.75)', overflow: 'hidden', whiteSpace: 'nowrap',
                                                pointerEvents: 'none',
                                            }}>
                                                {effect.name || def?.label || effect.type}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    {isZoom && phases ? (
                                        <>
                                            <Box
                                                onPointerDown={(e) => handleEffectPointerDown(e, effect.id, 'zoom_in_end')}
                                                sx={{
                                                    position: 'absolute', top: 5, bottom: 5,
                                                    left: `calc(${secToPct(phases.zoomInEnd)}% - ${PHASE_HANDLE_W / 2}px)`,
                                                    width: PHASE_HANDLE_W,
                                                    bgcolor: '#fffde7',
                                                    border: `1.5px solid ${color}`,
                                                    borderRadius: 0.5,
                                                    cursor: 'ew-resize',
                                                    zIndex: 4,
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                                                }}
                                                title="Kéo = ranh giới zoom in / giữ"
                                            />
                                            <Box
                                                onPointerDown={(e) => handleEffectPointerDown(e, effect.id, 'hold_end')}
                                                sx={{
                                                    position: 'absolute', top: 5, bottom: 5,
                                                    left: `calc(${secToPct(phases.holdEnd)}% - ${PHASE_HANDLE_W / 2}px)`,
                                                    width: PHASE_HANDLE_W,
                                                    bgcolor: '#fffde7',
                                                    border: `1.5px solid ${color}`,
                                                    borderRadius: 0.5,
                                                    cursor: 'ew-resize',
                                                    zIndex: 4,
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                                                }}
                                                title="Kéo = ranh giới giữ / zoom out"
                                            />
                                        </>
                                    ) : null}
                                    <Box
                                        onPointerDown={(e) => handleEffectPointerDown(e, effect.id, 'start')}
                                        sx={{
                                            position: 'absolute', top: 1, bottom: 1,
                                            left: `calc(${left}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                            bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                            cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color, zIndex: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                        }}
                                        title="Kéo = bắt đầu hiệu ứng"
                                    >
                                        <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                    </Box>
                                    <Box
                                        onPointerDown={(e) => handleEffectPointerDown(e, effect.id, 'end')}
                                        sx={{
                                            position: 'absolute', top: 1, bottom: 1,
                                            left: `calc(${secToPct(end)}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                            bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                            cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color, zIndex: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                        }}
                                        title="Kéo = kết thúc hiệu ứng"
                                    >
                                        <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                    </Box>
                                </Box>
                            );
                        })}

                        {imageOverlays.map((overlay) => {
                            const color = '#00897b';
                            const isSel = overlay.id === selectedOverlayId || isItemMultiSelected('overlay', overlay.id);
                            const start = resolveOverlayStartSec(overlay);
                            const end = resolveOverlayEndSec(overlay, duration);
                            const left = secToPct(start);
                            const width = Math.max(0.01, secToPct(end) - left);
                            const fxSec = isOverlayInstantEntry(overlay)
                                ? 0
                                : renderPlaceEffectAfterSec(overlay);
                            return (
                                <Box key={overlay.id} sx={{ position: 'relative', height: ROW_H, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Box
                                        onPointerDown={(e) => handleOverlayPointerDown(e, overlay.id, 'body')}
                                        onDoubleClick={() => {
                                            onSelectOverlay?.(overlay.id, { doubleClick: true });
                                        }}
                                        sx={{
                                            position: 'absolute', top: 3, bottom: 3,
                                            left: `${left}%`, width: `${width}%`,
                                            borderRadius: 1, bgcolor: color,
                                            opacity: isSel ? 0.9 : 0.65,
                                            border: `2px solid ${color}`,
                                            outline: isSel ? '2px solid rgba(25,118,210,0.85)' : 'none',
                                            outlineOffset: 1,
                                            cursor: 'grab', boxSizing: 'border-box', zIndex: 1,
                                        }}
                                        title={`${overlay.name || 'Ảnh thêm'} — kéo để di chuyển · Shift+click chọn nhiều · Double-click vào group (nếu có)`}
                                    >
                                        {width > 6 ? (
                                            <Typography sx={{
                                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: '#fff',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.75)', overflow: 'hidden', whiteSpace: 'nowrap',
                                            }}>
                                                {overlay.name || 'Ảnh'}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    <Box
                                        onPointerDown={(e) => handleOverlayPointerDown(e, overlay.id, 'start')}
                                        sx={{
                                            position: 'absolute', top: 1, bottom: 1,
                                            left: `calc(${left}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                            bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                            cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color, zIndex: 3,
                                        }}
                                    >
                                        <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                    </Box>
                                    <Box
                                        onPointerDown={(e) => handleOverlayPointerDown(e, overlay.id, 'end')}
                                        sx={{
                                            position: 'absolute', top: 1, bottom: 1,
                                            left: `calc(${secToPct(end)}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                            bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                            cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color, zIndex: 3,
                                        }}
                                    >
                                        <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                    </Box>
                                    {fxSec > 0.01 ? (() => {
                                        const extStart = Math.min(end, duration);
                                        const extEnd = Math.min(duration, extStart + fxSec);
                                        const extLeft = secToPct(extStart);
                                        const extWidth = secToPct(extEnd) - extLeft;
                                        if (!(extWidth > 0)) return null;
                                        return (
                                            <Box
                                                key={`${overlay.id}-fx`}
                                                sx={{
                                                    position: 'absolute', top: 3, bottom: 3,
                                                    left: `${extLeft}%`, width: `${extWidth}%`,
                                                    borderRadius: 1,
                                                    background: `repeating-linear-gradient(45deg, ${color}59 0 6px, ${color}1f 6px 12px)`,
                                                    border: `1.5px dashed ${color}`,
                                                    zIndex: 1, pointerEvents: 'none',
                                                }}
                                            />
                                        );
                                    })() : null}
                                    {isRegionAttentionEnabled(overlay.attention_start_sec, overlay.attention_end_sec) ? (() => {
                                        const win = resolveAttentionWindow(
                                            overlay,
                                            beatWords,
                                            beatStartSec,
                                            duration,
                                            sceneBudget,
                                        );
                                        if (!win.enabled) return null;
                                        const attLeft = secToPct(win.start);
                                        const attWidth = Math.max(0.01, secToPct(win.end) - attLeft);
                                        const attLabel = attentionEffectTimelineLabel(win.type);
                                        return (
                                            <Box
                                                key={`${overlay.id}-attention`}
                                                onPointerDown={(e) => handleAttentionPointerDown(e, overlay.id, 'body', 'overlay')}
                                                title={`Gây chú ý · ${attLabel || 'chú ý'} — không sớm hơn lúc ảnh + hiệu ứng sau ảnh kết thúc`}
                                                sx={{
                                                    position: 'absolute', top: 3, bottom: 3,
                                                    left: `${attLeft}%`, width: `${attWidth}%`,
                                                    borderRadius: 1,
                                                    background: 'repeating-linear-gradient(-45deg, rgba(236,64,122,0.35) 0 5px, rgba(236,64,122,0.12) 5px 10px)',
                                                    border: '1.5px solid rgba(236,64,122,0.75)',
                                                    zIndex: 2, cursor: 'grab',
                                                }}
                                            >
                                                {attWidth >= 8 && attLabel ? (
                                                    <Typography sx={{
                                                        position: 'absolute', inset: 0, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 8, fontWeight: 800, color: '#fff',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                                                        pointerEvents: 'none',
                                                    }}>
                                                        {attLabel}
                                                    </Typography>
                                                ) : null}
                                                <Box
                                                    onPointerDown={(e) => handleAttentionPointerDown(e, overlay.id, 'start', 'overlay')}
                                                    sx={{
                                                        position: 'absolute', top: 1, bottom: 1,
                                                        left: `calc(0% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                                        bgcolor: '#fff', border: '2px solid #ec407a', borderRadius: 1,
                                                        cursor: 'ew-resize', zIndex: 3,
                                                    }}
                                                >
                                                    <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                                </Box>
                                                <Box
                                                    onPointerDown={(e) => handleAttentionPointerDown(e, overlay.id, 'end', 'overlay')}
                                                    sx={{
                                                        position: 'absolute', top: 1, bottom: 1,
                                                        left: `calc(100% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                                        bgcolor: '#fff', border: '2px solid #ec407a', borderRadius: 1,
                                                        cursor: 'ew-resize', zIndex: 3,
                                                    }}
                                                >
                                                    <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                                </Box>
                                            </Box>
                                        );
                                    })() : null}
                                </Box>
                            );
                        })}

                        {/* VÙNG ĐỎ CUỐI BEAT = khoảng hiệu ứng chuyển cảnh (độ dài
                            THỰC TẾ theo transition đang chọn — mirror logic PHP).
                            Box bao trọn TẤT CẢ các dòng (từ thanh audio đến dòng vùng
                            cuối), bán trong suốt + pointer-events:none để không chặn
                            kéo/scrub trên timeline. */}
                        {transitionDur > 0.05 ? (
                            <Box sx={{
                                position: 'absolute', top: 0, bottom: 0,
                                left: `${secToPct(Math.max(0, duration - transitionDur))}%`, right: 0,
                                bgcolor: 'rgba(239,68,68,0.28)',
                                borderLeft: '2px solid rgba(239,68,68,0.95)',
                                boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.55)',
                                zIndex: 4, pointerEvents: 'none', overflow: 'hidden',
                            }}>
                                {100 - secToPct(Math.max(0, duration - transitionDur)) >= 7 ? (
                                    <Box sx={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Typography sx={{
                                            fontSize: 9.5, fontWeight: 800, color: '#fff',
                                            whiteSpace: 'nowrap', px: 0.6, py: '1px', borderRadius: 0.5,
                                            bgcolor: 'rgba(185,28,28,0.72)',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                        }}>
                                            {`Chuyển cảnh ${Math.round(transitionDur * 10) / 10}s`}
                                        </Typography>
                                    </Box>
                                ) : null}
                            </Box>
                        ) : null}
                    </Box>
                    </Box>
                    ) : null}

                    {/* PLAYHEAD — thanh đỏ dọc qua hàng audio + các dòng track đang hiển thị */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: LABEL_W,
                            right: 0,
                            px: `${HANDLE_W / 2}px`,
                            pl: 1,
                            pointerEvents: 'none',
                            zIndex: 6,
                            boxSizing: 'border-box',
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${secToPct(playhead)}%`,
                            width: 2,
                            bgcolor: '#f50057',
                        }}>
                            <Box sx={{ position: 'absolute', top: 0, left: -4, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #f50057' }} />
                            {/* Thời gian chính xác tại playhead — tránh ước lượng từ thước giây. */}
                            <Typography
                                component="span"
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    left: '50%',
                                    transform: playhead / Math.max(duration, 0.001) > 0.92
                                        ? 'translateX(calc(-100% - 4px))'
                                        : 'translateX(6px)',
                                    fontSize: 10,
                                    lineHeight: 1,
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: '#f50057',
                                    bgcolor: 'rgba(255,255,255,0.92)',
                                    px: '3px',
                                    py: '1px',
                                    borderRadius: 0.5,
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 0 1px rgba(245,0,87,0.18)',
                                }}
                            >
                                {playhead.toFixed(2)}s
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
        {manualBeatAdj?.open ? (
            <Box sx={{ px: 0.5, pb: 0.5, mt: 0.75 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ mr: 1 }}>
                        <IconButton size="small" onClick={() => onManualBeatAdjSeekActive?.(-1)} disabled={!manualBeatAdj.canSeekPrev}>
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {manualBeatAdj.beatLabel}
                        </Typography>
                        <IconButton size="small" onClick={() => onManualBeatAdjSeekActive?.(1)} disabled={!manualBeatAdj.canSeekNext}>
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                        {manualBeatAdj.selection ? (
                            <>Đã chọn {manualBeatAdj.selection.start} → {manualBeatAdj.selection.end}. Bấm từ BẮT ĐẦU rồi từ KẾT THÚC (bấm lại sẽ đổi).</>
                        ) : (
                            <>Chưa chọn — bấm vào từ ở audio script để chọn BẮT ĐẦU rồi KẾT THÚC.</>
                        )}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        startIcon={<CloseIcon fontSize="small" />}
                        onClick={onManualBeatAdjClose}
                        sx={{ textTransform: 'none' }}
                    >
                        Hủy
                    </Button>
                    <LoadingButton
                        size="small"
                        variant="contained"
                        color="success"
                        loading={manualBeatAdj.confirming}
                        startIcon={<VerifiedIcon fontSize="small" />}
                        onClick={onManualBeatAdjConfirm}
                        sx={{ textTransform: 'none' }}
                    >
                        Xác nhận timeline beat này
                    </LoadingButton>
                </Stack>
            </Box>
        ) : null}
        <Dialog
            open={ungroupConfirmOpen}
            onClose={() => setUngroupConfirmOpen(false)}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>Tách group?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Tất cả item trong group sẽ về timeline chính và không còn thuộc group nào. Bạn chắc chứ?
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={() => setUngroupConfirmOpen(false)}
                    sx={{ textTransform: 'none' }}
                >
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={() => {
                        setUngroupConfirmOpen(false);
                        onUngroupActiveGroup?.();
                    }}
                    sx={{ textTransform: 'none' }}
                >
                    Tách group
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
}
