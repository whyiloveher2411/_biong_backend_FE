import React from 'react';
import type { BeatRegionPoint } from './agentVideoApi';
import {
    REGION_PATH_MIN_POINTS,
    clampPoint01,
    edgeMidpoint,
    insertPointOnEdge,
    moveVertex,
    removeVertex,
    translatePolygon,
} from './regionPathEdit';

type Props = {
    /** Đổi region → reset đỉnh đang chọn (không reset khi chỉ đổi số đỉnh). */
    regionId: string;
    points: BeatRegionPoint[];
    color: string;
    /** Canvas zoom UI (1–8). Delta kéo ÷ (contain × zoom). */
    zoom?: number;
    /** Kích thước contain unscaled (px layout) — dùng quy đổi client → 0–1. */
    containSize: { w: number; h: number };
    /** Bù scale viewBox 1000×1000 → handle tròn trên màn hình. */
    svgScale: { invW: number; invH: number } | null;
    disabled?: boolean;
    onChangePoints: (next: BeatRegionPoint[]) => void;
    /** Gọi khi bắt đầu tương tác (chọn / kéo) — parent có thể selectRegion. */
    onInteract?: () => void;
};

type DragKind = 'vertex' | 'move';

type DragState = {
    kind: DragKind;
    startX: number;
    startY: number;
    origPoints: BeatRegionPoint[];
    vertexIndex: number;
};

function svgPointsAttr(points: BeatRegionPoint[]): string {
    return points.map((p) => `${(p[0] * 1000).toFixed(2)},${(p[1] * 1000).toFixed(2)}`).join(' ');
}

function scaleTpl(
    x: number,
    y: number,
    svgScale: { invW: number; invH: number } | null,
): string {
    if (!svgScale) {
        return `translate(${(x * 1000).toFixed(2)}, ${(y * 1000).toFixed(2)})`;
    }
    return `translate(${(x * 1000).toFixed(2)}, ${(y * 1000).toFixed(2)}) scale(${svgScale.invW.toFixed(6)}, ${svgScale.invH.toFixed(6)})`;
}

export default function WhiteboardRegionPathHandles({
    regionId,
    points,
    color,
    zoom = 1,
    containSize,
    svgScale,
    disabled = false,
    onChangePoints,
    onInteract,
}: Props) {
    const [activeVertex, setActiveVertex] = React.useState<number | null>(null);
    const dragRef = React.useRef<DragState | null>(null);
    const pointsRef = React.useRef(points);
    const onChangeRef = React.useRef(onChangePoints);
    pointsRef.current = points;
    onChangeRef.current = onChangePoints;

    const z = Math.max(0.001, zoom);
    const screenW = Math.max(1, containSize.w * z);
    const screenH = Math.max(1, containSize.h * z);
    // Hit cạnh ~7px màn hình — đủ bấm, không che ảnh.
    const edgeHitStroke = Math.max(5, (7 * 1000) / Math.min(screenW, screenH));

    React.useEffect(() => {
        setActiveVertex(null);
    }, [regionId]);

    React.useEffect(() => {
        if (disabled || activeVertex == null) {
            return undefined;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Delete' && event.key !== 'Backspace') {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }
            }
            const next = removeVertex(pointsRef.current, activeVertex);
            if (!next) {
                return;
            }
            event.preventDefault();
            setActiveVertex(null);
            onChangeRef.current(next);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeVertex, disabled]);

    const beginWindowDrag = React.useCallback((
        e: React.PointerEvent | React.MouseEvent,
        kind: DragKind,
        vertexIndex: number,
        origPoints: BeatRegionPoint[],
    ) => {
        e.preventDefault();
        e.stopPropagation();
        onInteract?.();
        dragRef.current = {
            kind,
            startX: e.clientX,
            startY: e.clientY,
            origPoints,
            vertexIndex,
        };
        const onMove = (ev: PointerEvent | MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) {
                return;
            }
            const dx = (ev.clientX - drag.startX) / screenW;
            const dy = (ev.clientY - drag.startY) / screenH;
            if (drag.kind === 'move') {
                onChangeRef.current(translatePolygon(drag.origPoints, dx, dy));
                return;
            }
            const orig = drag.origPoints[drag.vertexIndex];
            if (!orig) {
                return;
            }
            onChangeRef.current(moveVertex(
                drag.origPoints,
                drag.vertexIndex,
                clampPoint01([orig[0] + dx, orig[1] + dy]),
            ));
        };
        const onUp = () => {
            dragRef.current = null;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }, [onInteract, screenH, screenW]);

    if (disabled || points.length < REGION_PATH_MIN_POINTS) {
        return null;
    }

    const stopBubble = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    const startEdgeInsert = (e: React.PointerEvent, edgeIndex: number) => {
        if (e.button !== 0) {
            return;
        }
        const mid = edgeMidpoint(points, edgeIndex);
        const inserted = insertPointOnEdge(points, edgeIndex, mid);
        if (inserted.insertedIndex < 0) {
            return;
        }
        onChangePoints(inserted.points);
        setActiveVertex(inserted.insertedIndex);
        beginWindowDrag(e, 'vertex', inserted.insertedIndex, inserted.points);
    };

    return (
        <g
            data-region-path-handles="1"
            onMouseDown={stopBubble}
            onClick={stopBubble}
            style={{ pointerEvents: 'auto' }}
        >
            <polygon
                points={svgPointsAttr(points)}
                fill={color}
                fillOpacity={0.01}
                stroke="none"
                style={{ cursor: 'move', pointerEvents: 'fill' }}
                onPointerDown={(e) => {
                    if (e.button !== 0) {
                        return;
                    }
                    setActiveVertex(null);
                    beginWindowDrag(e, 'move', -1, points.slice());
                }}
            />

            {points.map((p, i) => {
                const next = points[(i + 1) % points.length];
                const mid = edgeMidpoint(points, i);
                return (
                    <g key={`edge-${i}`}>
                        <line
                            x1={p[0] * 1000}
                            y1={p[1] * 1000}
                            x2={next[0] * 1000}
                            y2={next[1] * 1000}
                            stroke={color}
                            strokeOpacity={0}
                            strokeWidth={edgeHitStroke}
                            strokeLinecap="round"
                            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                            onPointerDown={(e) => startEdgeInsert(e, i)}
                        />
                        <g
                            transform={scaleTpl(mid[0], mid[1], svgScale)}
                            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                            onPointerDown={(e) => startEdgeInsert(e, i)}
                        >
                            <rect
                                x={-2.5}
                                y={-2.5}
                                width={5}
                                height={5}
                                rx={0.75}
                                fill="#ffffff"
                                stroke={color}
                                strokeWidth={1}
                                opacity={0.85}
                            />
                        </g>
                    </g>
                );
            })}

            {points.map((point, i) => {
                const isActive = activeVertex === i;
                return (
                    <g
                        key={`v-${i}`}
                        transform={scaleTpl(point[0], point[1], svgScale)}
                        style={{ cursor: 'grab', pointerEvents: 'auto' }}
                        onPointerDown={(e) => {
                            if (e.button !== 0) {
                                return;
                            }
                            setActiveVertex(i);
                            beginWindowDrag(e, 'vertex', i, points.slice());
                        }}
                        onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const nextPts = removeVertex(points, i);
                            if (!nextPts) {
                                return;
                            }
                            setActiveVertex(null);
                            onChangePoints(nextPts);
                        }}
                    >
                        <circle
                            r={isActive ? 4.5 : 3.5}
                            fill={isActive ? '#ffffff' : color}
                            stroke={isActive ? color : '#ffffff'}
                            strokeWidth={isActive ? 1.5 : 1}
                        />
                    </g>
                );
            })}
        </g>
    );
}
