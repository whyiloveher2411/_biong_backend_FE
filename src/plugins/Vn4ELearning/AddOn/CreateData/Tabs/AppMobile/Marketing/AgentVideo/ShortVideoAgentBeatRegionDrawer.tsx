import React from 'react';
import { keyframes } from '@emotion/react';
import {
    Alert,
    Box,
    Button,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UndoIcon from '@mui/icons-material/Undo';
import SaveIcon from '@mui/icons-material/Save';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { LoadingButton } from '@mui/lab';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import type { useAgentVideoContent } from './useAgentVideoContent';
import {
    autoSelectAgentWhiteboardRegion,
    isPlaceHandlessEffect,
    normalizeNeonColor,
    normalizePlaceEffect,
    normalizePlaceHand,
    NEON_COLOR_OPTIONS,
    PLACE_EFFECT_OPTIONS,
    type BeatRegion,
    type BeatRegionPoint,
} from './agentVideoApi';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    open: boolean;
    onClose: () => void;
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

export default function ShortVideoAgentBeatRegionDrawer({
    open,
    onClose,
    state,
    beatId,
    imageUrl,
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
    // Notice nội bộ hiển thị TRONG drawer (floating message bị che bởi DrawerCustom).
    const [notice, setNotice] = React.useState<{
        variant: 'success' | 'warning' | 'error' | 'info';
        text: string;
    } | null>(null);
    const notify = React.useCallback((text: string, variant: 'success' | 'warning' | 'error' | 'info' = 'info') => {
        setNotice({ variant, text });
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
    const prevOpenRef = React.useRef(false);
    React.useEffect(() => {
        if (open && !prevOpenRef.current) {
            const fresh = Array.isArray(savedRegionsRef.current) ? savedRegionsRef.current : [];
            // Khôi phục trạng thái "chỉ vật trong vùng" từ dữ liệu đã lưu:
            // object_points = contour vật (dùng làm points hiển thị), full_points
            // = toàn vùng thủ công (giữ để option đúng + rollback).
            const restoredOrig: Record<string, BeatRegionPoint[]> = {};
            setRegions(
                fresh.map((r) => {
                    if (Array.isArray(r.object_points) && r.object_points.length >= 3) {
                        if (Array.isArray(r.full_points) && r.full_points.length >= 3) {
                            restoredOrig[r.id] = r.full_points;
                        }
                        return { ...r, points: r.object_points };
                    }
                    return r;
                }),
            );
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
            setNotice(null);
        }
        prevOpenRef.current = open;
    }, [open]);

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
        const end = Number(section?.endSec ?? section?.startSec ?? 0) + Number(section?.durationSec ?? 0);
        if (!(end > start)) {
            return all;
        }
        return all.filter((w) => Number(w.start) >= start - 0.1 && Number(w.end) <= end + 0.1);
    }, [beatId, state.beatMap?.sections, state.whisperWords]);

    // Vùng cha tự nhận biết khi đang vẽ (dựa trên centroid điểm đang vẽ).
    const draftParentId = React.useMemo(
        () => (draftPoints.length >= 3 ? resolveParentRegion(draftPoints, regions) : null),
        [draftPoints, regions],
    );
    const draftParent = draftParentId
        ? regions.find((region) => region.id === draftParentId) || null
        : null;

    const colorFor = (index: number) => REGION_COLORS[index % REGION_COLORS.length];

    // Depth (cha→con) + sắp xếp cha trước con để hiển thị cây cha/con.
    const regionDepth = React.useMemo(() => {
        const depth: Record<string, number> = {};
        const compute = (id: string, seen: Set<string>): number => {
            if (depth[id] !== undefined) {
                return depth[id];
            }
            if (seen.has(id)) {
                return 0;
            }
            seen.add(id);
            const region = regions.find((r) => r.id === id);
            const pid = region?.parent_id || null;
            depth[id] = pid ? 1 + compute(pid, seen) : 0;
            return depth[id];
        };
        regions.forEach((r) => compute(r.id, new Set()));
        return depth;
    }, [regions]);

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
        setRegions((prev) => [...prev, region]);
        setSelectedRegionId(region.id);
        setDraftPoints([]);
        setDraftIsDrag(false);
    };

    const handleUndoPoint = () => {
        if (bgSampleMode) {
            setBgSampleDraft((prev) => prev.slice(0, -1));
        } else {
            setDraftPoints((prev) => prev.slice(0, -1));
            setDraftIsDrag(false);
        }
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
        setRegions((prev) => prev.map((region) => (
            region.id === id ? { ...region, ...patch } : region
        )));
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
            // "Chỉ vật trong vùng": gửi kèm full_points (toàn vùng thủ công —
            // FE giữ trong originalPointsByRegion) + object_points (contour vật)
            // để backend lưu riêng: UI mở lại hiển thị đúng option, render dùng
            // vật, rollback về "toàn vùng" bất kỳ lúc nào.
            const regionsToSave: BeatRegion[] = regions.map((r): BeatRegion => {
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
            });
            const saved = await state.handleSaveWhiteboardBeatOverride(beatId, {
                ...currentOverride,
                regions: regionsToSave,
            });
            if (saved) {
                notify(`Đã lưu ${regions.length} vùng cho beat ${beatId}`, 'success');
                onClose();
            }
        } finally {
            setSaving(false);
        }
    };

    const svgPointsFor = (points: [number, number][]) => (
        points.map((p) => `${(p[0] * 1000).toFixed(2)},${(p[1] * 1000).toFixed(2)}`).join(' ')
    );

    const hasRegions = regions.length > 0;
    const totalDraftPoints = bgSampleMode ? bgSampleDraft.length : draftPoints.length;
    const liveDraft = bgSampleMode ? bgSampleDraft : draftPoints;

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={`Chọn vùng ảnh beat — ${beatId}`}
            width={1400}
            PaperProps={{
                sx: { width: '94vw', maxWidth: 1400 },
            }}
            ModalProps={{
                sx: { zIndex: 1400 },
            }}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    display: 'flex',
                    flexDirection: 'column',
                    pt: 2,
                    px: 2,
                    pb: 2,
                    gap: 2,
                    overflow: 'hidden',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    gap: 1.5,
                }}
            >
            <Alert severity="info" sx={{ flexShrink: 0 }}>
                <strong>Vẽ nhanh:</strong> click giữ chuột tại điểm đầu rồi kéo — vùng hình thành từ điểm đầu nối
                với điểm chuột hiện tại, thả chuột = xong. <strong>Vẽ chính xác:</strong> click từng điểm (mỗi điểm
                mới nối vào điểm trước và điểm đầu, tô màu trong suốt), click lại điểm 1 hoặc bấm{' '}
                <strong>Hoàn tất vùng</strong> để kết thúc. Mỗi vùng chọn hành động <strong>Vẽ tay</strong> hoặc{' '}
                <strong>Đưa vào</strong> + chọn 1 từ trong audio script (vùng render hoàn chỉnh khi đọc đến từ đó).
                Vẽ trong vùng nào → vùng đó tự thành vùng cha; hành động vùng con thắng vùng cha.
            </Alert>

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
                            flexShrink: 0,
                            height: 'calc(100vh - 340px)',
                            minHeight: 340,
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
                        <Box
                            component="img"
                            ref={imgRef}
                            src={imageUrl}
                            alt={`Beat ${beatId}`}
                            onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                const img = e.currentTarget;
                                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                                    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
                                    setImageError(false);
                                }
                            }}
                            onError={() => setImageError(true)}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                                bgcolor: 'common.black',
                            }}
                        />
                        {containRect && !imageError ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: containRect.x,
                                    top: containRect.y,
                                    width: containRect.w,
                                    height: containRect.h,
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
                                        cursor: 'crosshair',
                                    }}
                                >
                            {regions.map((region, index) => {
                                const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                                const isSelected = selectedRegionId === region.id;
                                const isChild = Boolean(region.parent_id);
                                const first = region.points[0];
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
                                        {/* Label tên vùng ngay tại điểm đầu tiên — click label để chọn vùng */}
                                        {first ? (
                                            <g
                                                transform={svgScaleTpl(first[0], first[1])}
                                                style={{ cursor: 'pointer' }}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelectedRegionId(region.id);
                                                }}
                                            >
                                                <text
                                                    y={-12}
                                                    textAnchor="middle"
                                                    dominantBaseline="bottom"
                                                    fontSize={isSelected ? 13 : 11.5}
                                                    fontWeight={800}
                                                    fill={color}
                                                    stroke="#ffffff"
                                                    strokeWidth={3.5}
                                                    paintOrder="stroke"
                                                    style={{
                                                        userSelect: 'none',
                                                        pointerEvents: 'visiblePainted',
                                                    }}
                                                >
                                                    {region.name || `Vùng ${index + 1}`}
                                                </text>
                                            </g>
                                        ) : null}
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
                        ) : imageError || !imageUrl ? (
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
                                    {imageUrl ? 'Không load được ảnh beat' : 'Beat chưa có ảnh'}
                                </Typography>
                                {imageUrl ? (
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
                                ) : null}
                            </Box>
                        ) : (
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
                        )}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UndoIcon />}
                            disabled={totalDraftPoints === 0}
                            onClick={handleUndoPoint}
                            sx={{ textTransform: 'none' }}
                        >
                            Lùi điểm
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            disabled={totalDraftPoints < 3}
                            onClick={finishDraft}
                            sx={{ textTransform: 'none' }}
                        >
                            Hoàn tất vùng
                        </Button>
                        {totalDraftPoints > 0 ? (
                            <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                startIcon={<CloseIcon />}
                                onClick={handleCancelDraft}
                                sx={{ textTransform: 'none' }}
                            >
                                Hủy vẽ ({totalDraftPoints} điểm)
                            </Button>
                        ) : null}
                    </Stack>

                    <Box sx={{ width: '100%', maxWidth: 520, mt: 1, mx: 'auto' }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ textAlign: 'center' }}
                        >
                            {addModeRegionId ? (
                                <>
                                    <strong>Đang THÊM VÙNG</strong> cho{' '}
                                    {regions.find((r) => r.id === addModeRegionId)?.name || addModeRegionId}:
                                    vẽ các vùng cần thêm (giống chọn vùng thường) — vẽ xong vùng này{' '}
                                    <strong>tự nối liền ngay</strong> vào vùng hiện tại (mở rộng thêm). Vẽ nhiều
                                    lần tùy ý, click "Thêm vùng" lần nữa để thoát.
                                </>
                            ) : eraseModeRegionId ? (
                                <>
                                    <strong>Đang XÓA THỪA</strong> cho{' '}
                                    {regions.find((r) => r.id === eraseModeRegionId)?.name || eraseModeRegionId}:
                                    vẽ các vùng cần bỏ (giống chọn vùng thường) — vẽ xong vùng này{' '}
                                    <strong>tự thu gọn ngay</strong> (phần giao nhau bị bỏ). Vẽ nhiều lần tùy ý,
                                    click "Xóa thừa" lần nữa để thoát.
                                </>
                            ) : bgSampleMode ? (
                                <>
                                    Đang chọn <strong>background</strong>: <strong>click 1 phát</strong> vào vị trí có màu/
                                    chi tiết nền → tự tạo ô mẫu nhỏ. Mẫu này sẽ lặp lại fill nền vùng đang chọn (thay
                                    vì tile trắng). (Kéo chuột = vẽ vùng mẫu tay.)
                                </>
                            ) : (
                                <>
                                    Vẽ trong vùng nào → vùng đó tự thành <strong>vùng cha</strong> (vùng nhỏ nhất chứa
                                    vùng mới). Hành động vùng con thắng vùng cha.
                                    {draftParent ? (
                                        <>
                                            {' '}
                                            Đang vẽ <strong>vùng con</strong> của: {draftParent.name}
                                        </>
                                    ) : null}
                                </>
                            )}
                        </Typography>
                    </Box>

                    <LoadingButton
                        variant="contained"
                        startIcon={<SaveIcon />}
                        loading={saving}
                        disabled={state.savingWhiteboardBeatOverride}
                        onClick={() => { void handleSave(); }}
                        sx={{ textTransform: 'none', width: '100%', maxWidth: 520, mx: 'auto', mt: 1 }}
                    >
                        Lưu vùng
                    </LoadingButton>
                </Box>

                {/* Cột phải: danh sách vùng + cấu hình */}
                <Box
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
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                        Các vùng ({regions.length})
                    </Typography>
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
                    ) : null}
                    {sortedRegions.map((region, index) => {
                        const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                        const parent = region.parent_id
                            ? regions.find((item) => item.id === region.parent_id)
                            : null;
                        const depth = regionDepth[region.id] ?? 0;
                        const isSelected = selectedRegionId === region.id;
                        return (
                            <Box
                                key={region.id}
                                onClick={(event) => {
                                    const target = event.target as HTMLElement;
                                    if (target.closest('input,button,textarea')) {
                                        return;
                                    }
                                    setSelectedRegionId(region.id);
                                }}
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: isSelected ? color : 'divider',
                                    borderLeft: `4px solid ${color}`,
                                    bgcolor: isSelected ? 'action.selected' : 'background.paper',
                                    ml: depth > 0 ? `${Math.min(depth, 4) * 1.5}rem` : 0,
                                    cursor: 'pointer',
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

                                {depth > 0 ? (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                                        ↳ Vùng con của: {parent?.name || '?'}
                                    </Typography>
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
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
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
                                                            width: 96,
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

                                {/* 6. Thời điểm hoàn thành: từ trong audio script */}
                                <RegionSection title="Thời điểm hoàn thành">
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                    Chọn từ trong audio script (vùng hoàn thành khi đọc đến từ này):
                                </Typography>
                                <Box
                                    sx={{
                                        maxHeight: 120,
                                        overflow: 'auto',
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 0.75,
                                        bgcolor: 'background.paper',
                                        lineHeight: 1.9,
                                    }}
                                >
                                    {beatWords.length === 0 ? (
                                        <Typography variant="caption" color="text.secondary">
                                            Chưa có whisper words cho beat này — mở bỏ trống (hoàn thành cuối beat).
                                        </Typography>
                                    ) : null}
                                    {beatWords.map((word) => {
                                        const wi = word.index ?? 0;
                                        const selected = region.script_end_word === wi;
                                        return (
                                            <Box
                                                component="span"
                                                key={wi}
                                                onClick={() => updateRegion(region.id, {
                                                    script_end_word: selected ? null : wi,
                                                })}
                                                sx={{
                                                    cursor: 'pointer',
                                                    borderRadius: 0.5,
                                                    px: 0.4,
                                                    py: 0.15,
                                                    fontSize: 12.5,
                                                    fontWeight: selected ? 800 : 400,
                                                    color: selected ? '#fff' : 'text.primary',
                                                    bgcolor: selected ? 'primary.main' : 'transparent',
                                                    '&:hover': {
                                                        bgcolor: selected ? 'primary.dark' : 'primary.light',
                                                        color: selected ? '#fff' : '#fff',
                                                    },
                                                }}
                                                title={`Khi đọc từ "${word.text}" → vùng render hoàn chỉnh`}
                                            >
                                                {word.text}
                                                {' '}
                                            </Box>
                                        );
                                    })}
                                </Box>
                                {region.script_end_word != null ? (
                                    <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.75 }}>
                                        Hoàn thành khi đọc: «
                                        {beatWords.find((w) => (w.index ?? 0) === region.script_end_word)?.text || ''}
                                        » — click lại từ để bỏ chọn (hoàn thành cuối beat)
                                    </Typography>
                                ) : (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                                        Chưa chọn từ — vùng hoàn thành cuối beat.
                                    </Typography>
                                )}
                                </RegionSection>
                            </Box>
                        );
                    })}

                    <Divider sx={{ my: 0.5 }} />

                    <Alert severity="info" sx={{ py: 0.5 }}>
                        Vùng chưa chọn sẽ render theo setting toàn beat (vẽ tay / kéo vào / hiện ngay).
                    </Alert>
                    {regions.some((r) => r.action === 'erase') ? (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                            Vùng <strong>Xóa thừa</strong> (màu đỏ): phần này không được đưa vào/vẽ — luôn hiển
                            thị ảnh gốc. Dùng để bỏ phần chọn thừa sau khi tự chọn vật thể.
                        </Alert>
                    ) : null}
                </Box>
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

        </DrawerCustom>
    );
}
