import React from 'react';

export type TimelineBarDragHandle = 'start' | 'end' | 'body';

export type TimelineBarDragState = {
    id: string;
    handle: TimelineBarDragHandle;
    startX: number;
    origStartSec: number;
    origEndSec: number;
};

export type UseTimelineBarDragOptions = {
    durationSec: number;
    minDurSec: number;
    posToSec: (clientX: number) => number;
    getStartSec: (id: string) => number;
    getEndSec: (id: string) => number;
    onCommit: (id: string, startSec: number, endSec: number) => void;
    onSelect?: (id: string) => void;
    constrainStart?: (id: string, startSec: number, endSec: number) => { startSec: number; endSec: number };
};

export function useTimelineBarDrag({
    durationSec,
    minDurSec,
    posToSec,
    getStartSec,
    getEndSec,
    onCommit,
    onSelect,
    constrainStart,
}: UseTimelineBarDragOptions) {
    const dragRef = React.useRef<TimelineBarDragState | null>(null);
    const scrubRef = React.useRef(false);

    const commit = React.useCallback((id: string, start: number, end: number) => {
        let s = Math.max(0, Math.min(durationSec, start));
        let e = Math.max(0, Math.min(durationSec, end));
        if (e - s < minDurSec) {
            if (start >= durationSec - minDurSec) s = Math.max(0, e - minDurSec);
            else e = Math.min(durationSec, s + minDurSec);
        }
        if (constrainStart) {
            const constrained = constrainStart(id, s, e);
            s = constrained.startSec;
            e = constrained.endSec;
        }
        if (e <= s) e = Math.min(durationSec, s + minDurSec);
        onCommit(id, Math.round(s * 100) / 100, Math.round(e * 100) / 100);
    }, [constrainStart, durationSec, minDurSec, onCommit]);

    const handlePointerDown = React.useCallback((
        e: React.PointerEvent,
        id: string,
        handle: TimelineBarDragHandle,
    ) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(id);
        dragRef.current = {
            id,
            handle,
            startX: e.clientX,
            origStartSec: getStartSec(id),
            origEndSec: getEndSec(id),
        };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }, [getEndSec, getStartSec, onSelect]);

    const handlePointerMove = React.useCallback((e: React.PointerEvent, onScrub?: (sec: number) => void) => {
        if (scrubRef.current) {
            onScrub?.(posToSec(e.clientX));
            return;
        }
        const drag = dragRef.current;
        if (!drag) return;
        const dx = posToSec(e.clientX) - posToSec(drag.startX);
        let s = drag.origStartSec;
        let end = drag.origEndSec;
        if (drag.handle === 'body') {
            s = drag.origStartSec + dx;
            end = drag.origEndSec + dx;
        } else if (drag.handle === 'start') {
            s = drag.origStartSec + dx;
        } else {
            end = drag.origEndSec + dx;
        }
        commit(drag.id, s, end);
    }, [commit, posToSec]);

    const endDrag = React.useCallback((e?: React.PointerEvent) => {
        if (e) (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        dragRef.current = null;
        scrubRef.current = false;
    }, []);

    const beginScrub = React.useCallback(() => {
        scrubRef.current = true;
    }, []);

    return {
        handlePointerDown,
        handlePointerMove,
        endDrag,
        beginScrub,
        isDragging: () => Boolean(dragRef.current),
    };
}
