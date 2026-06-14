declare module '@spacedev/remotion-short-video/ShortVideoComposition' {
    import type { ComponentType } from 'react';
    import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';

    export const ShortVideoComposition: ComponentType<{
        manifest: ShortVideoRenderManifest;
    }>;

    export function calcCompositionDurationInFrames(
        manifest: ShortVideoRenderManifest
    ): number;
}

declare module '@spacedev/remotion-short-video/types' {
    export type {
        ShortVideoRenderManifest as RenderManifest,
        ShortVideoManifestScene,
        ShortVideoManifestWord,
        ShortVideoManifestSceneLayout,
    } from 'helpers/shortVideoRenderManifestTypes';
}
