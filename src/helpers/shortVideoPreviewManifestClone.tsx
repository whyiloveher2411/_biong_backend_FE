import React from 'react';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';

function previewSuppressIdsEqual(
    current: string[] | undefined,
    next: string[]
): boolean {
    const currentIds = current ?? [];
    if (currentIds.length !== next.length) {
        return false;
    }
    return currentIds.every((id, index) => id === next[index]);
}

/** Giữ cùng reference manifest khi suppress ids không đổi — tránh Remotion Player remount audio mỗi frame. */
export function mergePreviewSuppressIds(
    manifest: ShortVideoRenderManifest,
    field: 'preview_suppress_html_clip_ids' | 'preview_suppress_text_clip_ids',
    nextIds: string[]
): ShortVideoRenderManifest {
    const currentIds = manifest[field];
    if (nextIds.length === 0) {
        if (!currentIds?.length) {
            return manifest;
        }
        return {
            ...manifest,
            [field]: undefined,
        };
    }
    if (previewSuppressIdsEqual(currentIds, nextIds)) {
        return manifest;
    }
    return {
        ...manifest,
        [field]: nextIds,
    };
}

/** Truyền manifest preview xuống cây con — kể cả khi bọc bởi React.Suspense. */
export function clonePreviewManifestIntoTree(
    node: React.ReactNode,
    manifest: ShortVideoRenderManifest
): React.ReactNode {
    if (!React.isValidElement(node)) {
        return node;
    }
    if (node.type === React.Suspense) {
        const inner = node.props.children;
        if (React.isValidElement(inner)) {
            return React.cloneElement(
                node,
                {},
                clonePreviewManifestIntoTree(inner, manifest)
            );
        }
        return node;
    }
    return React.cloneElement(node, { manifest } as { manifest: ShortVideoRenderManifest });
}
