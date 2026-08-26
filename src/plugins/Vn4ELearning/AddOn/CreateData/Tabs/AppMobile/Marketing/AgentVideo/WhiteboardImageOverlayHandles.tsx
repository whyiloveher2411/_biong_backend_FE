import React from 'react';
import { Box } from '@mui/material';
import type { BeatImageOverlay } from './agentVideoApi';

type Props = {
    overlay: BeatImageOverlay;
    /** Rect unscaled trong layer đã `scale(zoom)` — left/top thường 0. */
    containRect: { left: number; top: number; width: number; height: number };
    /** Canvas zoom UI (1–8). Drag delta chia theo pixel *trên màn hình* = width * zoom. */
    zoom?: number;
    selected: boolean;
    /**
     * false khi đang thêm/vẽ vùng hoặc Space — không bắt pointer,
     * để click/kéo xuyên xuống SVG (vẽ vùng / pan ảnh).
     */
    interactive?: boolean;
    /**
     * media = chỉ ảnh (dưới vùng chọn);
     * controls = hit/outline/handle (trên vùng chọn);
     * all = cả hai (mặc định).
     */
    layer?: 'media' | 'controls' | 'all';
    onChange: (patch: Partial<BeatImageOverlay>) => void;
    onSelect: () => void;
    /**
     * Chỉ khi CHƯA chọn: kéo trên thân ảnh (vượt ngưỡng click) → pan canvas.
     * Khi ĐÃ chọn: kéo thân = di chuyển ảnh upload.
     */
    onPanDragStart?: (startX: number, startY: number, currentX: number, currentY: number) => void;
};

type DragKind = 'move' | 'resize-se' | 'rotate';

const CLICK_MOVE_THRESHOLD_PX = 4;

export default function WhiteboardImageOverlayHandles({
    overlay,
    containRect,
    zoom = 1,
    selected,
    interactive = true,
    layer = 'all',
    onChange,
    onSelect,
    onPanDragStart,
}: Props) {
    const boxRef = React.useRef<HTMLDivElement | null>(null);
    const dragRef = React.useRef<{
        kind: DragKind;
        startX: number;
        startY: number;
        orig: BeatImageOverlay;
    } | null>(null);

    const z = Math.max(0.001, zoom);
    const rectPx = {
        left: containRect.left + (overlay.x - overlay.width / 2) * containRect.width,
        top: containRect.top + (overlay.y - overlay.height / 2) * containRect.height,
        width: overlay.width * containRect.width,
        height: overlay.height * containRect.height,
    };

    const beginTransformDrag = (e: React.PointerEvent, kind: DragKind) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected) {
            onSelect();
        }
        dragRef.current = {
            kind,
            startX: e.clientX,
            startY: e.clientY,
            orig: { ...overlay },
        };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        // Client px ÷ (layout width × CSS zoom) = normalized trên ảnh beat.
        const screenW = Math.max(1, containRect.width * z);
        const screenH = Math.max(1, containRect.height * z);
        const dx = (e.clientX - drag.startX) / screenW;
        const dy = (e.clientY - drag.startY) / screenH;
        const orig = drag.orig;
        if (drag.kind === 'move') {
            onChange({
                x: Math.max(0, Math.min(1, orig.x + dx)),
                y: Math.max(0, Math.min(1, orig.y + dy)),
            });
            return;
        }
        if (drag.kind === 'resize-se') {
            // Khóa tỉ lệ khung — tránh bóp méo; delta theo cạnh dài hơn.
            const ar = Math.max(0.05, orig.width) / Math.max(0.05, orig.height);
            const delta = Math.abs(dx) >= Math.abs(dy) ? dx * 2 : dy * 2 * ar;
            const width = Math.max(0.04, Math.min(1, orig.width + delta));
            const height = Math.max(0.04, Math.min(1, width / ar));
            onChange({ width, height });
            return;
        }
        if (drag.kind === 'rotate') {
            const box = boxRef.current?.getBoundingClientRect();
            const centerX = box
                ? box.left + box.width / 2
                : containRect.left + orig.x * containRect.width;
            const centerY = box
                ? box.top + box.height / 2
                : containRect.top + orig.y * containRect.height;
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            onChange({ rotation_deg: (angle * 180) / Math.PI + 90 });
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        dragRef.current = null;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    };

    /** Chưa chọn: click = chọn, kéo = pan canvas. */
    const onUnselectedBodyPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const sx = e.clientX;
        const sy = e.clientY;
        let moved = false;
        const onMove = (ev: PointerEvent) => {
            if (moved) {
                return;
            }
            if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < CLICK_MOVE_THRESHOLD_PX) {
                return;
            }
            moved = true;
            onPanDragStart?.(sx, sy, ev.clientX, ev.clientY);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            if (!moved) {
                onSelect();
            }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    const showMedia = layer === 'media' || layer === 'all';
    const showControls = layer === 'controls' || layer === 'all';
    const showHit = showControls && interactive;
    const showHandles = showControls && selected && interactive;
    // media: viền nét đứt; controls (khi chọn): viền đậm trên vùng chọn.
    const outline = (() => {
        if (layer === 'media') {
            return selected ? 'none' : '1px dashed rgba(0,137,123,0.55)';
        }
        if (layer === 'controls') {
            return selected ? '2px solid #00897b' : 'none';
        }
        return selected ? '2px solid #00897b' : '1px dashed rgba(0,137,123,0.55)';
    })();
    const selectedGlow = (layer === 'controls' || layer === 'all') && selected;

    if (layer === 'controls' && !interactive && !selected) {
        return null;
    }

    return (
        <Box
            ref={boxRef}
            sx={{
                position: 'absolute',
                left: rectPx.left,
                top: rectPx.top,
                width: rectPx.width,
                height: rectPx.height,
                transform: `rotate(${overlay.rotation_deg || 0}deg)`,
                transformOrigin: 'center center',
                // Outline / box-shadow — KHÔNG dùng border (border làm co nội dung khi chọn).
                outline,
                outlineOffset: 0,
                boxShadow: selectedGlow ? '0 0 0 2px rgba(0,137,123,0.25)' : 'none',
                boxSizing: 'border-box',
                pointerEvents: 'none',
            }}
        >
            {showMedia ? (
                <Box
                    component="img"
                    src={overlay.image_url}
                    alt=""
                    draggable={false}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        pointerEvents: 'none',
                    }}
                />
            ) : null}
            {showHit ? (
                <Box
                    onPointerDown={selected
                        ? (e) => beginTransformDrag(e, 'move')
                        : onUnselectedBodyPointerDown}
                    onPointerMove={selected ? onPointerMove : undefined}
                    onPointerUp={selected ? onPointerUp : undefined}
                    onPointerCancel={selected ? onPointerUp : undefined}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'auto',
                        cursor: selected ? 'move' : 'pointer',
                    }}
                />
            ) : null}
            {showHandles ? (
                <>
                    <Box
                        onPointerDown={(e) => beginTransformDrag(e, 'resize-se')}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        sx={{
                            position: 'absolute',
                            right: -6,
                            bottom: -6,
                            width: 12,
                            height: 12,
                            bgcolor: '#00897b',
                            borderRadius: '50%',
                            cursor: 'nwse-resize',
                            pointerEvents: 'auto',
                        }}
                    />
                    <Box
                        onPointerDown={(e) => beginTransformDrag(e, 'rotate')}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        sx={{
                            position: 'absolute',
                            left: '50%',
                            top: -18,
                            transform: 'translateX(-50%)',
                            width: 12,
                            height: 12,
                            bgcolor: '#26a69a',
                            borderRadius: '50%',
                            cursor: 'grab',
                            pointerEvents: 'auto',
                        }}
                    />
                </>
            ) : null}
        </Box>
    );
}
