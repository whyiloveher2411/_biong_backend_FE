import {
    buildPostTypeTableQueryScrollKey,
    scrollPostTypeTableContainerAfterPaint,
    type PostTypeTableScrollQuerySlice,
} from 'helpers/postTypeTableScroll';
import React, { type RefObject } from 'react';

type Options = {
    ready?: boolean;
    enabled?: boolean;
};

/**
 * Khi đổi trang / filter: cuộn TableContainer (ref) về đầu, không cuộn body trang.
 */
export function useScrollPostTypeTableOnQueryChange(
    scrollRef: RefObject<HTMLElement | null>,
    queryUrl: PostTypeTableScrollQuerySlice,
    options?: Options
): void {
    const enabled = options?.enabled ?? true;
    const ready = options?.ready ?? true;
    const skipInitial = React.useRef(true);

    const queryKey = buildPostTypeTableQueryScrollKey(queryUrl);

    React.useEffect(() => {
        if (!enabled) {
            return;
        }
        if (skipInitial.current) {
            skipInitial.current = false;
            return;
        }
        if (!ready) {
            return;
        }

        scrollPostTypeTableContainerAfterPaint(scrollRef.current);
    }, [queryKey, ready, enabled, scrollRef]);
}
