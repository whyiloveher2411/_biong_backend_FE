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
    onChange: (patch: Partial<BeatImageOverlay>) => void;
    onSelect: () => void;
};

type DragKind = 'move' | 'resize-se' | 'rotate';

export default function WhiteboardImageOverlayHandles({
    overlay,
    containRect,
    zoom = 1,
    selected,
    onChange,
    onSelect,
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

    const onPointerDown = (e: React.PointerEvent, kind: DragKind) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
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
                outline: selected ? '2px solid #00897b' : '1px dashed rgba(0,137,123,0.55)',
                outlineOffset: 0,
                boxShadow: selected ? '0 0 0 2px rgba(0,137,123,0.25)' : 'none',
                boxSizing: 'border-box',
                zIndex: 4,
                pointerEvents: 'auto',
                cursor: 'move',
            }}
            onPointerDown={(e) => onPointerDown(e, 'move')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
        >
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
            {selected ? (
                <>
                    <Box
                        onPointerDown={(e) => onPointerDown(e, 'resize-se')}
                        sx={{
                            position: 'absolute',
                            right: -6,
                            bottom: -6,
                            width: 12,
                            height: 12,
                            bgcolor: '#00897b',
                            borderRadius: '50%',
                            cursor: 'nwse-resize',
                        }}
                    />
                    <Box
                        onPointerDown={(e) => onPointerDown(e, 'rotate')}
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
                        }}
                    />
                </>
            ) : null}
        </Box>
    );
}
