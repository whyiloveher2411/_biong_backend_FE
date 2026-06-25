import React from 'react';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';

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
