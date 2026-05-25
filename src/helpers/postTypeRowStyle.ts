import type { CSSProperties } from 'react';

export function getPostTypeRowStyle(row: { _row_style?: CSSProperties }): CSSProperties | undefined {
    const style = row?._row_style;
    if (style && typeof style === 'object' && Object.keys(style).length > 0) {
        return style;
    }
    return undefined;
}
