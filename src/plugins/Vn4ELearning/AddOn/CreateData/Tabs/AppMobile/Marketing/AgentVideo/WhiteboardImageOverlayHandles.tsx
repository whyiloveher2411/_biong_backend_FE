import React from 'react';
import { Box } from '@mui/material';
import type { BeatImageOverlay } from './agentVideoApi';

type Props = {
    overlay: BeatImageOverlay;
    containRect: { left: number; top: number; width: number; height: number };
    selected: boolean;
    onChange: (patch: Partial<BeatImageOverlay>) => void;
    onSelect: () => void;
};

type DragKind = 'move' | 'resize-se' | 'rotate';

export default function WhiteboardImageOverlayHandles({
    overlay,
    containRect,
    selected,
    onChange,
    onSelect,
}: Props) {
    const dragRef = React.useRef<{
        kind: DragKind;
        startX: number;
        startY: number;
        orig: BeatImageOverlay;
    } | null>(null);

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
        const dx = (e.clientX - drag.startX) / Math.max(1, containRect.width);
        const dy = (e.clientY - drag.startY) / Math.max(1, containRect.height);
        const orig = drag.orig;
        if (drag.kind === 'move') {
            onChange({
                x: Math.max(0, Math.min(1, orig.x + dx)),
                y: Math.max(0, Math.min(1, orig.y + dy)),
            });
            return;
        }
        if (drag.kind === 'resize-se') {
            onChange({
                width: Math.max(0.04, Math.min(1, orig.width + dx * 2)),
                height: Math.max(0.04, Math.min(1, orig.height + dy * 2)),
            });
            return;
        }
        if (drag.kind === 'rotate') {
            const centerX = containRect.left + orig.x * containRect.width;
            const centerY = containRect.top + orig.y * containRect.height;
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
            sx={{
                position: 'absolute',
                left: rectPx.left,
                top: rectPx.top,
                width: rectPx.width,
                height: rectPx.height,
                transform: `rotate(${overlay.rotation_deg || 0}deg)`,
                transformOrigin: 'center center',
                border: selected ? '2px solid #00897b' : '1px dashed rgba(0,137,123,0.55)',
                boxShadow: selected ? '0 0 0 2px rgba(0,137,123,0.25)' : 'none',
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
